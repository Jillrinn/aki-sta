"""
BaseScraperクラスの共通機能をテスト
"""
import pytest
from datetime import datetime
from unittest.mock import Mock, patch
from src.scrapers.ensemble_studio import EnsembleStudioScraper


class TestBaseScraperUtilities:
    """BaseScraperの共通util処理のテスト"""
    
    @pytest.fixture
    def scraper(self):
        """スクレイパーインスタンスを作成"""
        return EnsembleStudioScraper()
    
    def test_convert_time_to_slot_morning(self, scraper):
        """9:00 → morning への変換"""
        assert scraper.convert_time_to_slot("09:00") == "morning"
        assert scraper.convert_time_to_slot("9:00") == "morning"
    
    def test_convert_time_to_slot_afternoon(self, scraper):
        """13:00 → afternoon への変換"""
        assert scraper.convert_time_to_slot("13:00") == "afternoon"
    
    def test_convert_time_to_slot_evening(self, scraper):
        """18:00 → evening への変換"""
        assert scraper.convert_time_to_slot("18:00") == "evening"
    
    def test_convert_time_to_slot_invalid(self, scraper):
        """無効な時間の処理"""
        assert scraper.convert_time_to_slot("10:00") is None
        assert scraper.convert_time_to_slot("invalid") is None
        assert scraper.convert_time_to_slot("") is None
    
    def test_parse_japanese_year_month_valid(self, scraper):
        """有効な年月文字列のパース"""
        result = scraper.parse_japanese_year_month("2025年8月")
        assert result.year == 2025
        assert result.month == 8
        assert result.day == 1
    
    def test_parse_japanese_year_month_double_digit(self, scraper):
        """2桁月のパース"""
        result = scraper.parse_japanese_year_month("2025年12月")
        assert result.year == 2025
        assert result.month == 12
    
    def test_parse_japanese_year_month_invalid(self, scraper):
        """無効な形式の処理"""
        assert scraper.parse_japanese_year_month("invalid") is None
        assert scraper.parse_japanese_year_month("2025/08") is None
    
    def test_save_to_json(self, scraper, tmp_path):
        """JSON保存のテスト"""
        import json
        
        data = {
            "lastScraped": "2025-08-21T12:00:00Z",
            "data": {
                "2025-11-15": [
                    {
                        "facilityName": "あんさんぶるStudio和(本郷)",
                        "timeSlots": {"morning": "available"},
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
    
    @patch('src.scrapers.base.sync_playwright')
    def test_scrape_availability_error_handling(self, mock_playwright, scraper):
        """エラー時の例外再発生テスト"""
        # Playwrightがエラーを発生させる
        mock_playwright.side_effect = Exception("Connection error")
        
        # 例外が再発生することを確認
        with pytest.raises(Exception) as exc_info:
            scraper.scrape_availability("2025-11-15")
        
        assert str(exc_info.value) == "Connection error"