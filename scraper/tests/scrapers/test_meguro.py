"""
目黒区スクレイパーの単体テスト
"""
import pytest
from unittest.mock import Mock, MagicMock, patch, call
from datetime import datetime
from src.scrapers.meguro import MeguroScraper


class TestMeguroScraper:
    """目黒区スクレイパーのテストクラス"""
    
    @pytest.fixture
    def scraper(self):
        """スクレイパーインスタンスを生成"""
        return MeguroScraper()
    
    def test_get_base_url(self, scraper):
        """ベースURLが正しいことを確認"""
        assert scraper.get_base_url() == "https://resv.city.meguro.tokyo.jp/Web/Home/WgR_ModeSelect"
    
    def test_get_studios(self, scraper):
        """施設リストが正しいことを確認"""
        studios = scraper.get_studios()
        assert len(studios) == 6
        assert "田道住区センター三田分室" in studios
        assert "上目黒住区センター" in studios
        assert "めぐろパーシモンホール" in studios
        assert "東山社会教育館" in studios
        assert "中央町社会教育館" in studios
        assert "緑が丘文化会館" in studios
    
    def test_navigate_to_facility_search_success(self, scraper):
        """施設検索画面への遷移成功テスト"""
        mock_page = MagicMock()
        
        # モックの設定
        mock_breadcrumb = MagicMock()
        mock_breadcrumb.count.return_value = 1
        mock_breadcrumb.text_content.return_value = "メニュー > 施設の検索"
        mock_page.locator.return_value.first = mock_breadcrumb
        
        # テスト実行
        result = scraper.navigate_to_facility_search(mock_page)
        
        # 検証
        assert result is True
        # 必要なクリックが行われたことを確認
        mock_page.click.assert_any_call("text=施設種類から探す")
        mock_page.click.assert_any_call("text=集会施設・学校施設")
        mock_page.click.assert_any_call("text=音楽室")
    
    def test_navigate_to_facility_search_failure(self, scraper):
        """施設検索画面への遷移失敗テスト"""
        mock_page = MagicMock()
        
        # エラーを発生させる
        mock_page.wait_for_selector.side_effect = Exception("Timeout")
        
        # テスト実行
        result = scraper.navigate_to_facility_search(mock_page)
        
        # 検証
        assert result is False
    
    def test_select_facilities_success(self, scraper):
        """施設選択成功テスト"""
        mock_page = MagicMock()
        
        # モックの設定
        mock_element = MagicMock()
        mock_element.count.return_value = 1
        mock_locator = MagicMock()
        mock_locator.first = mock_element
        mock_page.locator.return_value = mock_locator
        
        # テスト実行
        result = scraper.select_facilities(mock_page)
        
        # 検証
        assert result is True
        # 各施設のチェックボックスがクリックされたことを確認
        assert mock_element.click.call_count >= 1
    
    def test_select_facilities_no_selection(self, scraper):
        """施設が選択できない場合のテスト"""
        mock_page = MagicMock()
        
        # モックの設定（要素が見つからない）
        mock_element = MagicMock()
        mock_element.count.return_value = 0
        mock_locator = MagicMock()
        mock_locator.first = mock_element
        mock_page.locator.return_value = mock_locator
        
        # テスト実行
        result = scraper.select_facilities(mock_page)
        
        # 検証
        assert result is False
    
    def test_navigate_to_calendar_success(self, scraper):
        """カレンダー画面への遷移成功テスト"""
        mock_page = MagicMock()
        
        # モックの設定
        mock_button = MagicMock()
        mock_button.count.return_value = 1
        
        mock_breadcrumb = MagicMock()
        mock_breadcrumb.count.return_value = 1
        mock_breadcrumb.text_content.return_value = "施設別空き状況"
        
        # locatorは異なるオブジェクトを返すように設定
        def locator_side_effect(selector):
            mock_locator = MagicMock()
            if "次へ進む" in selector or "button" in selector or "input" in selector:
                mock_locator.first = mock_button
            elif "breadcrumbs" in selector:
                mock_locator.first = mock_breadcrumb
            return mock_locator
        
        mock_page.locator.side_effect = locator_side_effect
        
        # テスト実行
        result = scraper.navigate_to_calendar(mock_page)
        
        # 検証
        assert result is True
        mock_button.click.assert_called_once()
    
    def test_navigate_to_target_month_same_month(self, scraper):
        """同じ月の場合は移動しないテスト"""
        mock_page = MagicMock()
        target_date = datetime(2025, 10, 15)
        
        # モックの設定
        mock_header = MagicMock()
        mock_header.text_content.return_value = "2025年10月5日(日)"
        mock_page.locator.return_value.all.return_value = [mock_header]
        
        # テスト実行
        result = scraper.navigate_to_target_month(mock_page, target_date)
        
        # 検証
        assert result is True
        # クリックが発生していないことを確認
        mock_header.click.assert_not_called()
    
    def test_navigate_to_target_month_next_month(self, scraper):
        """次月への移動テスト"""
        mock_page = MagicMock()
        target_date = datetime(2025, 11, 15)
        
        # モックの設定
        mock_header = MagicMock()
        # 最初は10月、次に11月を返す
        mock_header.text_content.side_effect = [
            "2025年10月5日(日)",
            "2025年11月5日(水)"
        ]
        mock_page.locator.return_value.all.return_value = [mock_header]
        
        # 次へボタンのモック
        mock_next_button = MagicMock()
        mock_page.locator.return_value.all.side_effect = [
            [mock_header],  # 1回目のヘッダー取得
            [mock_next_button],  # 次へボタン
            [mock_header],  # 2回目のヘッダー取得
        ]
        
        # テスト実行
        result = scraper.navigate_to_target_month(mock_page, target_date)
        
        # 検証
        assert result is True
        mock_next_button.click.assert_called_once()
    
    def test_select_date_and_navigate_success(self, scraper):
        """日付選択と画面遷移成功テスト"""
        mock_page = MagicMock()
        target_date = datetime(2025, 10, 15)
        
        # モックの設定
        mock_date_link = MagicMock()
        
        mock_button = MagicMock()
        mock_button.count.return_value = 1
        
        mock_breadcrumb = MagicMock()
        mock_breadcrumb.count.return_value = 1
        mock_breadcrumb.text_content.return_value = "時間帯別空き状況"
        
        # locatorは異なるオブジェクトを返すように設定
        def locator_side_effect(selector):
            mock_locator = MagicMock()
            if "a:has-text" in selector and "15" in selector:
                mock_locator.all.return_value = [mock_date_link]
            elif "次へ進む" in selector or "button" in selector or "input" in selector:
                mock_locator.first = mock_button
            elif "breadcrumbs" in selector:
                mock_locator.first = mock_breadcrumb
            else:
                mock_locator.all.return_value = []
            return mock_locator
        
        mock_page.locator.side_effect = locator_side_effect
        
        # テスト実行
        result = scraper.select_date_and_navigate(mock_page, target_date)
        
        # 検証
        assert result is True
        mock_date_link.click.assert_called_once()
    
    def test_extract_all_time_slots_with_data(self, scraper):
        """時間帯情報抽出テスト（データあり）"""
        mock_page = MagicMock()
        
        # モックの設定
        mock_section = MagicMock()
        
        # 施設名のモック
        mock_facility_name = MagicMock()
        mock_facility_name.count.return_value = 1
        mock_facility_name.text_content.return_value = "田道住区センター三田分室"
        mock_section.locator.return_value.first = mock_facility_name
        
        # 部屋名のモック
        mock_room_header = MagicMock()
        mock_room_header.text_content.return_value = "別館B101（音楽室）"
        
        # 時間帯ヘッダーのモック
        mock_time_header1 = MagicMock()
        mock_time_header1.text_content.return_value = "午前"
        mock_time_header2 = MagicMock()
        mock_time_header2.text_content.return_value = "午後1"
        mock_time_header3 = MagicMock()
        mock_time_header3.text_content.return_value = "午後2"
        mock_time_header4 = MagicMock()
        mock_time_header4.text_content.return_value = "夜間"
        
        # テーブルのモック
        mock_table = MagicMock()
        mock_table.locator.return_value.all.side_effect = [
            [mock_time_header1, mock_time_header2, mock_time_header3, mock_time_header4],  # headers
            [  # status cells
                MagicMock(text_content=lambda: "田道住区センター三田分室"),
                MagicMock(text_content=lambda: "50人"),
                MagicMock(text_content=lambda: "○"),  # 午前
                MagicMock(text_content=lambda: "×"),  # 午後1
                MagicMock(text_content=lambda: "×"),  # 午後2
                MagicMock(text_content=lambda: "○"),  # 夜間
            ]
        ]
        
        mock_section.locator.return_value.all.side_effect = [
            [mock_room_header],  # room headers
            [mock_table],  # room tables
        ]
        
        mock_page.locator.return_value.all.return_value = [mock_section]
        
        # テスト実行
        result = scraper.extract_all_time_slots(mock_page)
        
        # 検証
        assert "田道住区センター三田分室" in result
        assert "別館B101（音楽室）" in result["田道住区センター三田分室"]
        room_slots = result["田道住区センター三田分室"]["別館B101（音楽室）"]
        assert room_slots["morning"] == "available"
        assert room_slots["afternoon"] == "booked"  # 午後1と午後2が統合される
        assert room_slots["evening"] == "available"
    
    def test_extract_all_time_slots_empty(self, scraper):
        """時間帯情報抽出テスト（データなし）"""
        mock_page = MagicMock()
        
        # モックの設定（施設セクションが見つからない）
        mock_page.locator.return_value.all.return_value = []
        
        # テスト実行
        result = scraper.extract_all_time_slots(mock_page)
        
        # 検証
        assert result == {}
    
    @patch('src.scrapers.base.sync_playwright')
    @patch.object(MeguroScraper, 'extract_all_time_slots')
    @patch.object(MeguroScraper, 'select_date_and_navigate')
    @patch.object(MeguroScraper, 'navigate_to_target_month')
    @patch.object(MeguroScraper, 'navigate_to_calendar')
    @patch.object(MeguroScraper, 'select_facilities')
    @patch.object(MeguroScraper, 'navigate_to_facility_search')
    @patch.object(MeguroScraper, 'create_browser_context')
    @patch.object(MeguroScraper, 'setup_browser')
    def test_scrape_availability_success(self, mock_setup_browser, mock_create_context,
                                        mock_navigate_search, mock_select_facilities,
                                        mock_navigate_calendar, mock_navigate_month,
                                        mock_select_date, mock_extract_slots,
                                        mock_playwright, scraper):
        """スクレイピング成功テスト"""
        
        # Playwrightのモック設定
        mock_p = MagicMock()
        mock_playwright.return_value.__enter__.return_value = mock_p
        
        mock_browser = MagicMock()
        mock_context = MagicMock()
        mock_page = MagicMock()
        
        mock_setup_browser.return_value = mock_browser
        mock_create_context.return_value = mock_context
        mock_context.new_page.return_value = mock_page
        
        # 各メソッドのモック
        mock_navigate_search.return_value = True
        mock_select_facilities.return_value = True
        mock_navigate_calendar.return_value = True
        mock_navigate_month.return_value = True
        mock_select_date.return_value = True
        mock_extract_slots.return_value = {
            "田道住区センター三田分室": {
                "別館B101（音楽室）": {
                    "morning": "available",
                    "afternoon": "booked",
                    "evening": "available"
                }
            }
        }
        
        # テスト実行
        result = scraper.scrape_availability("2025-10-15")
        
        # 検証
        assert len(result) == 1
        assert result[0]["facilityName"] == "田道住区センター三田分室"
        assert result[0]["timeSlots"]["9-12"] == "available"
        assert result[0]["timeSlots"]["13-17"] == "booked"
        assert result[0]["timeSlots"]["18-21"] == "available"
        
        # 各メソッドが呼ばれたことを確認
        mock_navigate_search.assert_called_once_with(mock_page)
        mock_select_facilities.assert_called_once_with(mock_page)
        mock_navigate_calendar.assert_called_once_with(mock_page)
        mock_navigate_month.assert_called_once()
        mock_select_date.assert_called_once()
        mock_extract_slots.assert_called_once_with(mock_page)
    
    @patch('src.scrapers.base.sync_playwright')
    @patch.object(MeguroScraper, 'navigate_to_facility_search')
    @patch.object(MeguroScraper, 'create_browser_context')
    @patch.object(MeguroScraper, 'setup_browser')
    def test_scrape_availability_navigation_failure(self, mock_setup_browser, mock_create_context,
                                                   mock_navigate_search, mock_playwright, scraper):
        """スクレイピング失敗テスト（ナビゲーションエラー）"""
        
        # Playwrightのモック設定
        mock_p = MagicMock()
        mock_playwright.return_value.__enter__.return_value = mock_p
        
        mock_browser = MagicMock()
        mock_context = MagicMock()
        mock_page = MagicMock()
        
        mock_setup_browser.return_value = mock_browser
        mock_create_context.return_value = mock_context
        mock_context.new_page.return_value = mock_page
        
        # 施設検索画面への遷移で失敗
        mock_navigate_search.return_value = False
        
        # テスト実行
        result = scraper.scrape_availability("2025-10-15")
        
        # 検証（デフォルトデータが返される）
        assert len(result) == 6  # 全施設分のデフォルトデータ
        for facility_data in result:
            assert facility_data["timeSlots"]["9-12"] == "unknown"
            assert facility_data["timeSlots"]["13-17"] == "unknown"
            assert facility_data["timeSlots"]["18-21"] == "unknown"