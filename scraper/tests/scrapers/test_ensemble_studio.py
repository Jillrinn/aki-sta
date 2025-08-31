"""
あんさんぶるスタジオスクレイパーのテスト（人間の操作を模倣した版）
"""
import json
import os
import pytest
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
from src.scrapers.ensemble_studio import EnsembleStudioScraper


class TestTimeSlotConversion:
    """時間帯変換のテスト"""
    
    @pytest.fixture
    def scraper(self):
        """スクレイパーインスタンスを作成"""
        return EnsembleStudioScraper()
    
    def test_morning_slot(self, scraper):
        """9:00 → 9-12 への変換"""
        assert scraper.convert_time_to_slot("09:00") == "9-12"
        assert scraper.convert_time_to_slot("9:00") == "9-12"
    
    def test_afternoon_slot(self, scraper):
        """13:00 → 13-17 への変換"""
        assert scraper.convert_time_to_slot("13:00") == "13-17"
    
    def test_evening_slot(self, scraper):
        """18:00 → 18-21 への変換"""
        assert scraper.convert_time_to_slot("18:00") == "18-21"
    
    def test_invalid_time(self, scraper):
        """無効な時間の処理"""
        assert scraper.convert_time_to_slot("10:00") is None
        assert scraper.convert_time_to_slot("invalid") is None
        assert scraper.convert_time_to_slot("") is None


class TestJapaneseYearMonthParsing:
    """日本語年月パースのテスト"""
    
    @pytest.fixture
    def scraper(self):
        """スクレイパーインスタンスを作成"""
        return EnsembleStudioScraper()
    
    def test_parse_valid_year_month(self, scraper):
        """有効な年月文字列のパース"""
        result = scraper.parse_japanese_year_month("2025年8月")
        assert result.year == 2025
        assert result.month == 8
        assert result.day == 1
    
    def test_parse_double_digit_month(self, scraper):
        """2桁月のパース"""
        result = scraper.parse_japanese_year_month("2025年12月")
        assert result.year == 2025
        assert result.month == 12
    
    def test_parse_invalid_format(self, scraper):
        """無効な形式の処理"""
        assert scraper.parse_japanese_year_month("invalid") is None
        assert scraper.parse_japanese_year_month("2025/08") is None


class TestEnsembleStudioScraper:
    """スクレイパークラスのテスト"""
    
    @pytest.fixture
    def scraper(self):
        """スクレイパーインスタンスを作成"""
        return EnsembleStudioScraper()
    
    def test_find_date_cell(self, scraper):
        """日付セルの特定テスト"""
        # モックのLocatorを作成
        mock_day_box = Mock()
        mock_day_number = Mock()
        mock_day_number.text_content.return_value = "15"
        mock_day_number.count.return_value = 1
        
        # locatorメソッドが.firstを返すように設定
        mock_day_box.locator.return_value.first = mock_day_number
        
        mock_calendar = Mock()
        mock_day_boxes = Mock()
        mock_day_boxes.count.return_value = 1
        mock_day_boxes.nth.return_value = mock_day_box
        mock_calendar.locator.return_value = mock_day_boxes
        
        result = scraper.find_date_cell(mock_calendar, 15)
        assert result == mock_day_box
    
    def test_extract_time_slots_disabled(self, scraper):
        """営業していない日の時刻情報抽出テスト"""
        # モックのday_boxを作成
        mock_day_box = Mock()
        mock_disable = Mock()
        mock_disable.count.return_value = 1
        mock_disable.first.text_content.return_value = "－"
        mock_day_box.locator.return_value = mock_disable
        
        result = scraper.extract_time_slots(mock_day_box)
        assert result == {
            "9-12": "unknown",
            "13-17": "unknown",
            "18-21": "unknown"
        }
    
    def test_extract_time_slots_with_marks(self, scraper):
        """時刻マークがある日の時刻情報抽出テスト"""
        # 時刻マークのモックを作成
        mock_day_box = Mock()
        
        # calendar-time-disableは存在しない
        mock_disable = Mock()
        mock_disable.count.return_value = 0
        
        # 時刻マークを設定
        mock_time_marks = Mock()
        mock_time_marks.count.return_value = 3
        
        # 各時刻マークのモック
        mock_marks = []
        time_data = [
            ("09:00", "×", False),  # リンクなし、×
            ("13:00", "○", True),   # リンクあり、○
            ("18:00", "×", False),  # リンクなし、×
        ]
        
        for time_str, symbol, has_link in time_data:
            mock_mark = Mock()
            mock_time_string = Mock()
            mock_time_string.count.return_value = 1
            mock_time_string.text_content.return_value = time_str
            
            # locatorメソッドの設定
            def create_locator_func(ts_mock, has_link_val, symbol_val):
                def locator_func(selector):
                    if selector == ".time-string":
                        return Mock(first=ts_mock)
                    elif selector == "a":
                        link_mock = Mock()
                        link_mock.count.return_value = 1 if has_link_val else 0
                        link_mock.text_content.return_value = symbol_val if has_link_val else ""
                        return Mock(first=link_mock)
                    return Mock()
                return locator_func
            
            mock_mark.locator = create_locator_func(mock_time_string, has_link, symbol)
            mock_mark.text_content.return_value = f"{time_str}{symbol}"
            mock_marks.append(mock_mark)
        
        mock_time_marks.nth = lambda i: mock_marks[i]
        
        # day_boxのlocatorメソッドを設定
        def day_box_locator(selector):
            if selector == ".calendar-time-disable":
                return mock_disable
            elif selector == ".calendar-time-mark":
                return mock_time_marks
            return Mock()
        
        mock_day_box.locator = day_box_locator
        
        result = scraper.extract_time_slots(mock_day_box)
        assert result["9-12"] == "booked"
        assert result["13-17"] == "available"
        assert result["18-21"] == "booked"
    
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
    
    @patch('src.scrapers.ensemble_studio.sync_playwright')
    def test_scrape_availability_error_handling(self, mock_playwright, scraper):
        """エラー時の例外再発生テスト"""
        # Playwrightがエラーを発生させる
        mock_playwright.side_effect = Exception("Connection error")
        
        # 例外が再発生することを確認
        with pytest.raises(Exception) as exc_info:
            scraper.scrape_availability("2025-11-15")
        
        assert str(exc_info.value) == "Connection error"