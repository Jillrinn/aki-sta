"""
あんさんぶるスタジオスクレイパーのテスト（施設固有の処理）
"""
import pytest
from unittest.mock import Mock
from src.scrapers.ensemble_studio import EnsembleStudioScraper


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
            "morning": "unknown",
            "afternoon": "unknown",
            "evening": "unknown"
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
        assert result["morning"] == "booked"
        assert result["afternoon"] == "available"
        assert result["evening"] == "booked"
    
