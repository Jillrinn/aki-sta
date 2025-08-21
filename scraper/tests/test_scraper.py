"""
あんさんぶるスタジオスクレイパーのテスト
"""
import json
import os
import pytest
from datetime import datetime
from unittest.mock import Mock, patch, mock_open
from src.scraper import (
    EnsembleStudioScraper,
    convert_time_slot,
    parse_availability
)


class TestTimeSlotConversion:
    """時間帯変換のテスト"""
    
    def test_morning_slot(self):
        """9:00 → 9-12 への変換"""
        assert convert_time_slot("09:00") == "9-12"
        assert convert_time_slot("9:00") == "9-12"
    
    def test_afternoon_slot(self):
        """13:00 → 13-17 への変換"""
        assert convert_time_slot("13:00") == "13-17"
    
    def test_evening_slot(self):
        """18:00 → 18-21 への変換"""
        assert convert_time_slot("18:00") == "18-21"
    
    def test_invalid_time(self):
        """無効な時間の処理"""
        assert convert_time_slot("10:00") is None
        assert convert_time_slot("invalid") is None


class TestAvailabilityParsing:
    """空き状況パースのテスト"""
    
    def test_parse_available(self):
        """○ → available への変換"""
        assert parse_availability("○") == "available"
    
    def test_parse_booked(self):
        """× → booked への変換"""
        assert parse_availability("×") == "booked"
    
    def test_parse_unknown(self):
        """不明な記号の処理"""
        assert parse_availability("?") == "unknown"
        assert parse_availability("") == "unknown"


class TestEnsembleStudioScraper:
    """スクレイパークラスのテスト"""
    
    @pytest.fixture
    def scraper(self):
        """スクレイパーインスタンスを作成"""
        return EnsembleStudioScraper()
    
    @patch('src.scraper.sync_playwright')
    def test_fetch_page_success(self, mock_playwright, scraper):
        """ページ取得成功のテスト"""
        # モックの設定
        mock_page = Mock()
        mock_page.content.return_value = "<html>test content</html>"
        mock_browser = Mock()
        mock_browser.new_page.return_value = mock_page
        mock_chromium = Mock()
        mock_chromium.launch.return_value = mock_browser
        mock_p = Mock()
        mock_p.chromium = mock_chromium
        mock_playwright.return_value.__enter__.return_value = mock_p
        
        # 実行
        content = scraper.fetch_page("https://ensemble-studio.com/schedule/")
        
        # 検証
        assert content == "<html>test content</html>"
        mock_page.goto.assert_called_once_with("https://ensemble-studio.com/schedule/", wait_until="networkidle")
    
    def test_extract_studio_data(self, scraper):
        """スタジオデータ抽出のテスト"""
        html_content = """
        <div class="studio-schedule">
            <h3>あんさんぶるStudio和(本郷)</h3>
            <div class="time-slot">
                <span class="time">09:00</span>
                <span class="status">○</span>
            </div>
            <div class="time-slot">
                <span class="time">13:00</span>
                <span class="status">×</span>
            </div>
            <div class="time-slot">
                <span class="time">18:00</span>
                <span class="status">○</span>
            </div>
        </div>
        """
        
        result = scraper.extract_studio_data(html_content, "あんさんぶるStudio和(本郷)")
        
        assert result["facilityName"] == "あんさんぶるStudio和(本郷)"
        assert result["timeSlots"]["9-12"] == "available"
        assert result["timeSlots"]["13-17"] == "booked"
        assert result["timeSlots"]["18-21"] == "available"
        assert "lastUpdated" in result
    
    @patch('src.scraper.sync_playwright')
    def test_scrape_availability(self, mock_playwright, scraper):
        """全体のスクレイピング処理のテスト"""
        # モックの設定
        mock_page = Mock()
        mock_page.content.return_value = """
        <html>
            <div>Mock calendar content</div>
        </html>
        """
        mock_browser = Mock()
        mock_browser.new_page.return_value = mock_page
        mock_chromium = Mock()
        mock_chromium.launch.return_value = mock_browser
        mock_p = Mock()
        mock_p.chromium = mock_chromium
        mock_playwright.return_value.__enter__.return_value = mock_p
        
        # extract_studio_dataをモック
        with patch.object(scraper, 'extract_studio_data') as mock_extract:
            mock_extract.side_effect = [
                {
                    "facilityName": "あんさんぶるStudio和(本郷)",
                    "timeSlots": {"9-12": "available", "13-17": "booked", "18-21": "available"},
                    "lastUpdated": "2025-08-21T12:00:00Z"
                },
                {
                    "facilityName": "あんさんぶるStudio音(初台)",
                    "timeSlots": {"9-12": "booked", "13-17": "available", "18-21": "booked"},
                    "lastUpdated": "2025-08-21T12:00:00Z"
                }
            ]
            
            result = scraper.scrape_availability("2025-11-15")
            
            assert len(result) == 2
            assert result[0]["facilityName"] == "あんさんぶるStudio和(本郷)"
            assert result[1]["facilityName"] == "あんさんぶるStudio音(初台)"
    
    def test_save_to_json(self, scraper, tmp_path):
        """JSON保存のテスト"""
        data = {
            "lastScraped": "2025-08-21T12:00:00Z",
            "data": {
                "2025-11-15": [
                    {
                        "facilityName": "あんさんぶるStudio和(本郷)",
                        "timeSlots": {"9-12": "available"},
                        "lastUpdated": "2025-08-21T12:00:00Z"
                    }
                ]
            }
        }
        
        filepath = tmp_path / "test_availability.json"
        scraper.save_to_json(data, str(filepath))
        
        # ファイルが作成されたか確認
        assert filepath.exists()
        
        # 内容を確認
        with open(filepath, 'r', encoding='utf-8') as f:
            saved_data = json.load(f)
        
        assert saved_data == data
    
    @patch('src.scraper.sync_playwright')
    def test_retry_on_failure(self, mock_playwright, scraper):
        """リトライ機能のテスト"""
        # 最初の2回は失敗、3回目で成功
        mock_page = Mock()
        mock_page.content.side_effect = [
            Exception("Network error"),
            Exception("Timeout"),
            "<html>success</html>"
        ]
        mock_page.goto.return_value = None
        mock_browser = Mock()
        mock_browser.new_page.return_value = mock_page
        mock_chromium = Mock()
        mock_chromium.launch.return_value = mock_browser
        mock_p = Mock()
        mock_p.chromium = mock_chromium
        mock_playwright.return_value.__enter__.return_value = mock_p
        
        content = scraper.fetch_page_with_retry("https://ensemble-studio.com/schedule/", max_retries=3)
        
        assert content == "<html>success</html>"
        assert mock_page.content.call_count == 3