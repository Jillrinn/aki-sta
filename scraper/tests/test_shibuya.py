"""
渋谷区スクレイピングのテストコード
"""
import unittest
from unittest.mock import Mock, patch, MagicMock, PropertyMock
from datetime import datetime
from src.scrapers.shibuya import ShibuyaScraper


class TestShibuyaScraper(unittest.TestCase):
    """渋谷区スクレイピングのテスト"""
    
    def setUp(self):
        """テストの初期化"""
        self.scraper = ShibuyaScraper()
    
    def test_get_base_url(self):
        """ベースURLの取得テスト"""
        url = self.scraper.get_base_url()
        self.assertEqual(url, "https://www.yoyaku.city.shibuya.tokyo.jp/")
    
    def test_get_studios(self):
        """施設リストの取得テスト"""
        studios = self.scraper.get_studios()
        self.assertIn("文化総合センター大和田", studios)
        self.assertEqual(len(studios), 1)
    
    def test_get_center_name(self):
        """センター名の取得テスト"""
        center_name = self.scraper.get_center_name()
        self.assertEqual(center_name, "渋谷区民センター")
    
    def test_get_room_name(self):
        """部屋名の取得テスト"""
        room_name = self.scraper.get_room_name("文化総合センター大和田")
        self.assertEqual(room_name, "練習室")
    
    def test_navigate_to_search(self):
        """検索画面への遷移テスト"""
        # Pageオブジェクトのモック
        mock_page = MagicMock()
        
        # タブが存在する場合
        mock_tab = MagicMock()
        mock_tab.count.return_value = 1
        mock_page.locator.return_value = mock_tab
        
        result = self.scraper.navigate_to_search(mock_page)
        self.assertTrue(result)
        
        # wait_for_react_loadが呼ばれたことを確認
        mock_page.wait_for_load_state.assert_called()
        mock_page.wait_for_selector.assert_called_with("#root", timeout=10000)
    
    def test_select_search_criteria(self):
        """検索条件選択のテスト"""
        mock_page = MagicMock()
        
        # セレクトボックスのモック
        mock_select = MagicMock()
        mock_select.count.return_value = 1
        
        # オプションのモック
        mock_option = MagicMock()
        mock_option.count.return_value = 1
        
        # locatorチェーンのモック設定
        mock_page.locator.return_value.nth.return_value = mock_select
        mock_page.locator.return_value.first = mock_option
        mock_page.locator.return_value.filter.return_value.first = mock_option
        
        target_date = datetime(2025, 9, 20)
        result = self.scraper.select_search_criteria(mock_page, target_date)
        
        self.assertTrue(result)
        # クリックが呼ばれたことを確認
        mock_select.click.assert_called()
        mock_option.click.assert_called()
    
    def test_execute_search(self):
        """検索実行のテスト"""
        mock_page = MagicMock()
        
        # 検索ボタンのモック
        mock_button = MagicMock()
        mock_button.count.return_value = 1
        mock_button.is_visible.return_value = True
        mock_page.locator.return_value.first = mock_button
        
        result = self.scraper.execute_search(mock_page)
        
        self.assertTrue(result)
        mock_button.click.assert_called_once()
    
    def test_wait_for_loading_complete(self):
        """ローディング待機のテスト"""
        mock_page = MagicMock()
        
        # spinnerのモック
        mock_spinner = MagicMock()
        mock_spinner.count.return_value = 1
        mock_page.locator.return_value.first = mock_spinner
        
        # エラーを発生させないように実行
        self.scraper.wait_for_loading_complete(mock_page)
        
        # wait_forが呼ばれたことを確認
        mock_spinner.wait_for.assert_called_with(state="hidden", timeout=30000)
    
    def test_navigate_to_date_with_availability(self):
        """日付選択のテスト（空きあり）"""
        mock_page = MagicMock()
        
        # 月表示のモック
        mock_month_display = MagicMock()
        mock_month_display.count.return_value = 1
        mock_month_display.text_content.return_value = "2025年9月"
        
        # 日付セルのモック
        mock_cell = MagicMock()
        # text_contentメソッドが適切な文字列を返すよう設定
        text_content_mock = MagicMock()
        text_content_mock.strip.return_value = "20"
        mock_cell.text_content.return_value = text_content_mock
        
        # 親要素のモック
        mock_parent = MagicMock()
        mock_parent.inner_html.return_value = "20 ○"  # 丸があることを示す
        mock_parent.count.return_value = 1
        
        # 子要素のlocator（imgタグ）のモック
        mock_img_locator = MagicMock()
        mock_img_locator.count.return_value = 0  # 画像は存在しない
        
        # date_cellのlocatorメソッドのモック設定
        def locator_side_effect(selector):
            if selector == "..":
                return mock_parent
            elif "img" in selector:
                return mock_img_locator
            else:
                return MagicMock()
        
        mock_cell.locator.side_effect = locator_side_effect
        
        # inner_htmlも設定
        mock_cell.inner_html.return_value = "20 ○"
        
        # pageのlocatorメソッドのモック設定
        def page_locator_side_effect(selector):
            if "month" in selector or "caption" in selector or "h2" in selector or "h3" in selector:
                mock_locator = MagicMock()
                mock_locator.first = mock_month_display
                return mock_locator
            else:
                mock_locator = MagicMock()
                mock_locator.all.return_value = [mock_cell]
                return mock_locator
        
        mock_page.locator.side_effect = page_locator_side_effect
        
        target_date = datetime(2025, 9, 20)
        result = self.scraper.navigate_to_date(mock_page, target_date)
        
        self.assertTrue(result)
        mock_cell.click.assert_called_once()
    
    def test_navigate_to_date_without_availability(self):
        """日付選択のテスト（空きなし）"""
        mock_page = MagicMock()
        
        # 月表示のモック
        mock_month_display = MagicMock()
        mock_month_display.count.return_value = 1
        mock_month_display.text_content.return_value = "2025年9月"
        
        # 日付セルのモック（丸なし）
        mock_cell = MagicMock()
        # text_contentメソッドが適切な文字列を返すよう設定
        text_content_mock = MagicMock()
        text_content_mock.strip.return_value = "20"
        mock_cell.text_content.return_value = text_content_mock
        
        # 親要素のモック
        mock_parent = MagicMock()
        mock_parent.inner_html.return_value = "20"  # 丸がない
        mock_parent.count.return_value = 1
        
        # 子要素のlocator（imgタグ）のモック
        mock_img_locator = MagicMock()
        mock_img_locator.count.return_value = 0  # 画像も存在しない
        
        # date_cellのlocatorメソッドのモック設定
        def locator_side_effect(selector):
            if selector == "..":
                return mock_parent
            elif "img" in selector:
                return mock_img_locator
            else:
                return MagicMock()
        
        mock_cell.locator.side_effect = locator_side_effect
        mock_cell.inner_html.return_value = "20"
        
        # pageのlocatorメソッドのモック設定
        def page_locator_side_effect(selector):
            if "month" in selector or "caption" in selector or "h2" in selector or "h3" in selector:
                mock_locator = MagicMock()
                mock_locator.first = mock_month_display
                return mock_locator
            else:
                mock_locator = MagicMock()
                mock_locator.all.return_value = [mock_cell]
                return mock_locator
        
        mock_page.locator.side_effect = page_locator_side_effect
        
        target_date = datetime(2025, 9, 20)
        result = self.scraper.navigate_to_date(mock_page, target_date)
        
        self.assertFalse(result)
        # クリックされていないことを確認
        mock_cell.click.assert_not_called()
    
    def test_extract_room_availability_table_format(self):
        """空き状況抽出のテスト（テーブル形式）"""
        mock_page = MagicMock()
        
        # テーブルとセルのモック
        mock_table = MagicMock()
        mock_row = MagicMock()
        
        # セルのモックを作成（text_contentが適切に動作するよう設定）
        def make_cell_mock(text):
            cell = MagicMock()
            content = MagicMock()
            content.strip.return_value = text
            cell.text_content.return_value = content
            return cell
        
        mock_cells = [
            make_cell_mock("練習室A"),
            make_cell_mock("○"),  # 午前
            make_cell_mock("×"),  # 午後
            make_cell_mock("○")   # 夜間
        ]
        
        mock_row.locator.return_value.all.return_value = mock_cells
        mock_table.locator.return_value.all.return_value = [mock_row]
        mock_page.locator.return_value.all.return_value = [mock_table]
        
        results = self.scraper.extract_room_availability(mock_page, "2025-09-20")
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["roomName"], "練習室A")
        self.assertEqual(results[0]["timeSlots"]["morning"], "available")
        self.assertEqual(results[0]["timeSlots"]["afternoon"], "booked")
        self.assertEqual(results[0]["timeSlots"]["evening"], "available")
    
    def test_extract_room_availability_no_data(self):
        """空き状況抽出のテスト（データなし）"""
        mock_page = MagicMock()
        
        # テーブルなし
        mock_page.locator.return_value.all.return_value = []
        
        results = self.scraper.extract_room_availability(mock_page, "2025-09-20")
        
        # デフォルトデータが返ることを確認
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["timeSlots"]["morning"], "unknown")
        self.assertEqual(results[0]["timeSlots"]["afternoon"], "unknown")
        self.assertEqual(results[0]["timeSlots"]["evening"], "unknown")
    
    @patch('src.scrapers.shibuya.sync_playwright')
    def test_scrape_availability_success(self, mock_playwright):
        """全体フローのテスト（成功）"""
        # Playwrightのモック設定
        mock_page = MagicMock()
        mock_browser = MagicMock()
        mock_context = MagicMock()
        mock_context.new_page.return_value = mock_page
        mock_browser.new_context.return_value = mock_context
        
        mock_p = MagicMock()
        mock_p.webkit.launch.return_value = mock_browser
        mock_p.chromium.launch.return_value = mock_browser
        mock_playwright.return_value.__enter__.return_value = mock_p
        
        # 各メソッドのモック
        self.scraper.navigate_to_search = Mock(return_value=True)
        self.scraper.select_search_criteria = Mock(return_value=True)
        self.scraper.execute_search = Mock(return_value=True)
        self.scraper.navigate_to_date = Mock(return_value=True)
        self.scraper.extract_room_availability = Mock(return_value=[{
            "centerName": "渋谷区民センター",
            "facilityName": "文化総合センター大和田",
            "roomName": "練習室",
            "date": "2025-09-20",
            "timeSlots": {
                "morning": "available",
                "afternoon": "booked",
                "evening": "available"
            },
            "lastUpdated": "2025-09-20T10:00:00Z"
        }])
        
        results = self.scraper.scrape_availability("2025-09-20")
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["centerName"], "渋谷区民センター")
        
        # 各メソッドが呼ばれたことを確認
        self.scraper.navigate_to_search.assert_called_once()
        self.scraper.select_search_criteria.assert_called_once()
        self.scraper.execute_search.assert_called_once()
        self.scraper.navigate_to_date.assert_called_once()
        self.scraper.extract_room_availability.assert_called_once()
    
    @patch('src.scrapers.shibuya.sync_playwright')
    def test_scrape_availability_no_availability(self, mock_playwright):
        """全体フローのテスト（予約不可）"""
        # Playwrightのモック設定
        mock_page = MagicMock()
        mock_browser = MagicMock()
        mock_context = MagicMock()
        mock_context.new_page.return_value = mock_page
        mock_browser.new_context.return_value = mock_context
        
        mock_p = MagicMock()
        mock_p.webkit.launch.return_value = mock_browser
        mock_p.chromium.launch.return_value = mock_browser
        mock_playwright.return_value.__enter__.return_value = mock_p
        
        # navigate_to_dateで失敗（丸なし）
        self.scraper.navigate_to_search = Mock(return_value=True)
        self.scraper.select_search_criteria = Mock(return_value=True)
        self.scraper.execute_search = Mock(return_value=True)
        self.scraper.navigate_to_date = Mock(return_value=False)  # 丸なし
        
        results = self.scraper.scrape_availability("2025-09-20")
        
        # unavailableが返ることを確認
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["timeSlots"]["morning"], "unavailable")
        self.assertEqual(results[0]["timeSlots"]["afternoon"], "unavailable")
        self.assertEqual(results[0]["timeSlots"]["evening"], "unavailable")
    
    def test_abstract_methods_not_used(self):
        """使用しない抽象メソッドのテスト"""
        mock_page = MagicMock()
        mock_locator = MagicMock()
        
        # これらのメソッドは渋谷区では使用しない
        calendars = self.scraper.find_studio_calendars(mock_page)
        self.assertEqual(calendars, [])
        
        result = self.scraper.navigate_to_month(mock_page, mock_locator, datetime(2025, 9, 1))
        self.assertFalse(result)
        
        cell = self.scraper.find_date_cell(mock_locator, 20)
        self.assertIsNone(cell)
        
        slots = self.scraper.extract_time_slots(mock_locator)
        self.assertEqual(slots["morning"], "unknown")
        self.assertEqual(slots["afternoon"], "unknown")
        self.assertEqual(slots["evening"], "unknown")


if __name__ == '__main__':
    unittest.main()