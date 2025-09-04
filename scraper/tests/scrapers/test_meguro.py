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
        mock_element = MagicMock()
        mock_element.count.return_value = 1
        mock_element.is_visible.return_value = True
        mock_element.text_content.return_value = "テストボタン"
        
        mock_locator = MagicMock()
        mock_locator.first = mock_element
        mock_locator.count.return_value = 1
        
        mock_page.locator.return_value = mock_locator
        mock_page.url = "https://resv.city.meguro.tokyo.jp/Web/Home/FacilitySearch"
        mock_page.title.return_value = "目黒区施設予約システム"
        
        # テスト実行
        result = scraper.navigate_to_facility_search(mock_page)
        
        # 検証
        assert result is True
        # locatorが呼ばれたことを確認
        assert mock_page.locator.called
        # clickメソッドが呼ばれたことを確認  
        assert mock_element.click.called
    
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
        
        # 次へ進むボタンのモック
        mock_next_button = MagicMock()
        mock_next_button.is_visible.return_value = True
        mock_next_button.text_content.return_value = "次へ進む"
        mock_next_button.get_attribute.return_value = ""
        mock_next_button.evaluate.return_value = "BUTTON"
        mock_next_button.count.return_value = 1
        
        # チェックされた施設のモック
        mock_checked_facility = MagicMock()
        
        # breadcrumbのモック
        mock_breadcrumb = MagicMock()
        mock_breadcrumb.count.return_value = 1
        mock_breadcrumb.is_visible.return_value = True
        mock_breadcrumb.text_content.return_value = "施設別空き状況"
        
        # locatorのモック設定
        def locator_side_effect(selector):
            mock_locator = MagicMock()
            if "button, input[type='submit'], input[type='button'], a" in selector:
                # all_buttonsのモック
                mock_locator.all.return_value = [mock_next_button]
            elif "input[name='checkShisetsu']:checked" in selector:
                mock_locator.all.return_value = [mock_checked_facility] * 6
            elif "*:has-text('次へ'):visible" in selector or "*:has-text('進む'):visible" in selector:
                mock_locator.first = mock_next_button
                mock_locator.first.count.return_value = 1
            elif "breadcrumbs" in selector or ".title:has-text('施設別空き状況')" in selector:
                mock_locator.first = mock_breadcrumb
            else:
                mock_locator.all.return_value = []
                mock_locator.first = MagicMock()
                mock_locator.first.count.return_value = 0
            return mock_locator
        
        mock_page.locator.side_effect = locator_side_effect
        mock_page.content.return_value = "施設別空き状況"
        mock_page.wait_for_function.return_value = None
        
        # テスト実行
        result = scraper.navigate_to_calendar(mock_page)
        
        # 検証
        assert result is True
        mock_next_button.click.assert_called()
    
    def test_navigate_to_target_month_same_month(self, scraper):
        """表示開始日を入力するテスト"""
        mock_page = MagicMock()
        target_date = datetime(2025, 10, 15)
        
        # 日付入力フィールドのモック
        mock_date_input = MagicMock()
        mock_date_input.count.return_value = 1
        
        # 表示ボタンのモック
        mock_display_button = MagicMock()
        mock_display_button.count.return_value = 1
        mock_display_button.is_visible.return_value = True
        mock_display_button.text_content.return_value = "表示"
        mock_display_button.get_attribute.return_value = "表示"
        
        # locatorのモック設定
        def locator_side_effect(selector):
            mock_locator = MagicMock()
            if "#dpStartDate" in selector:
                return mock_date_input
            elif "*:has-text('表示')" in selector or "button" in selector:
                mock_locator.first = mock_display_button
                return mock_locator
            else:
                mock_locator.all.return_value = [mock_display_button]
                return mock_locator
        
        mock_page.locator.side_effect = locator_side_effect
        mock_page.wait_for_selector.return_value = None
        mock_page.content.return_value = "施設別空き状況"
        
        # テスト実行
        result = scraper.navigate_to_target_month(mock_page, target_date)
        
        # 検証
        assert result is True
        # 日付入力が行われたことを確認
        mock_date_input.fill.assert_called_once_with("2025/10/15")
        # 表示ボタンがクリックされたことを確認
        mock_display_button.click.assert_called()
    
    def test_navigate_to_target_month_next_month(self, scraper):
        """別の日付を入力するテスト"""
        mock_page = MagicMock()
        target_date = datetime(2025, 11, 15)
        
        # 日付入力フィールドのモック
        mock_date_input = MagicMock()
        mock_date_input.count.return_value = 1
        
        # 表示ボタンのモック
        mock_display_button = MagicMock()
        mock_display_button.count.return_value = 1
        mock_display_button.is_visible.return_value = True
        mock_display_button.text_content.return_value = "表示"
        mock_display_button.get_attribute.return_value = "表示"
        
        # locatorのモック設定
        def locator_side_effect(selector):
            mock_locator = MagicMock()
            if "#dpStartDate" in selector:
                return mock_date_input
            elif "*:has-text('表示')" in selector or "button" in selector:
                mock_locator.first = mock_display_button
                return mock_locator
            else:
                mock_locator.all.return_value = [mock_display_button]
                return mock_locator
        
        mock_page.locator.side_effect = locator_side_effect
        mock_page.wait_for_selector.return_value = None
        mock_page.content.return_value = "施設別空き状況"
        
        # テスト実行
        result = scraper.navigate_to_target_month(mock_page, target_date)
        
        # 検証
        assert result is True
        # 日付入力が行われたことを確認
        mock_date_input.fill.assert_called_once_with("2025/11/15")
        # 表示ボタンがクリックされたことを確認
        mock_display_button.click.assert_called()
    
    def test_select_date_and_navigate_success(self, scraper):
        """日付選択と画面遷移成功テスト"""
        mock_page = MagicMock()
        target_date = datetime(2025, 10, 15)
        
        # カレンダーテーブルのモック
        mock_table = MagicMock()
        
        # ヘッダーセルのモック（日付列を含む）
        mock_header1 = MagicMock()
        mock_header1.text_content.return_value = "2025年10月"
        mock_header2 = MagicMock()
        mock_header2.text_content.return_value = "定員"
        mock_header3 = MagicMock()
        mock_header3.text_content.return_value = "15水"  # 15日
        
        # 施設名のモック
        mock_facility_name = MagicMock()
        mock_facility_name.count.return_value = 1
        mock_facility_name.text_content.return_value = "田道住区センター三田分室"
        
        # チェックボックスを持つセルのモック
        mock_checkbox = MagicMock()
        mock_checkbox.count.return_value = 1
        mock_checkbox.is_checked.side_effect = [False, True]  # クリック前後
        
        mock_label = MagicMock()
        mock_label.count.return_value = 1
        mock_label.is_visible.return_value = True
        mock_label.text_content.return_value = "○"
        
        mock_cell = MagicMock()
        mock_cell.text_content.return_value = "○"
        mock_cell.locator.side_effect = lambda sel: mock_checkbox if "checkbox" in sel else mock_label
        
        # 部屋名のあるセル
        mock_room_cell = MagicMock()
        mock_room_cell.text_content.return_value = "別館B101（音楽室）"
        
        # テーブルのヘッダー設定
        mock_table.locator.side_effect = lambda sel: MagicMock(all=lambda: [mock_header1, mock_header2, mock_header3]) if "thead th" in sel else MagicMock()
        
        # 行のモック
        mock_row = MagicMock()
        mock_row.locator.side_effect = lambda sel: MagicMock(all=lambda: [mock_room_cell, MagicMock(), mock_cell]) if "td" in sel else MagicMock()
        
        mock_tbody = MagicMock()
        mock_tbody.locator.return_value.all.return_value = [mock_row]
        mock_table.locator.side_effect = lambda sel: mock_tbody if "tbody" in sel else MagicMock(all=lambda: [mock_header1, mock_header2, mock_header3])
        
        # 次へボタンのモック
        mock_next_button = MagicMock()
        mock_next_button.count.return_value = 1
        mock_next_button.is_visible.return_value = True
        mock_next_button.is_enabled.return_value = True
        mock_next_button.text_content.return_value = "次へ進む"
        
        # breadcrumbのモック
        mock_breadcrumb = MagicMock()
        mock_breadcrumb.text_content.side_effect = ["施設別空き状況", "時間帯別空き状況"]
        
        # clicked_roomsの初期化
        scraper.clicked_rooms = {}
        
        # ページロケーターのモック設定
        def locator_side_effect(selector):
            mock_locator = MagicMock()
            if "table.calendar" in selector:
                mock_locator.all.return_value = [mock_table]
            elif "a:has-text('次へ進む')" in selector:
                mock_locator.first = mock_next_button
            elif "input[type='checkbox']:checked" in selector:
                mock_locator.all.return_value = [mock_checkbox] * 3
            elif ".breadcrumbs" in selector or "ol.step" in selector:
                mock_locator.first = MagicMock(text_content=lambda: "時間帯別空き状況")
            else:
                mock_locator.all.return_value = []
                mock_locator.first = MagicMock(count=lambda: 0)
            return mock_locator
        
        mock_page.locator.side_effect = locator_side_effect
        mock_table.locator.return_value.first = mock_facility_name
        
        # テスト実行
        result = scraper.select_date_and_navigate(mock_page, target_date)
        
        # 検証
        assert result is True
        mock_next_button.click.assert_called()
    
    def test_extract_all_time_slots_with_data(self, scraper):
        """時間帯情報抽出テスト（データあり）"""
        mock_page = MagicMock()
        
        # clicked_roomsを設定（新しい実装では必須）
        scraper.clicked_rooms = {
            ("田道住区センター三田分室", "別館B101（音楽室）"): {
                'table_idx': 0,
                'is_closed': False
            }
        }
        
        # モック行の設定
        mock_row = MagicMock()
        
        # 最初のセル（部屋名）のモック - JavaScriptの評価をシミュレート
        mock_first_cell = MagicMock()
        # evaluate メソッドは JavaScript を評価して部屋名を返す
        mock_first_cell.evaluate.return_value = "別館B101（音楽室）"
        mock_first_cell.text_content.return_value = "別館B101（音楽室）"
        
        # 定員セルのモック
        mock_capacity_cell = MagicMock()
        mock_capacity_cell.text_content.return_value = "50人"
        
        # 時間帯セルのモック
        mock_morning_cell = MagicMock()
        mock_morning_cell.text_content.return_value = "○"
        
        mock_afternoon1_cell = MagicMock()
        mock_afternoon1_cell.text_content.return_value = "×"
        
        mock_afternoon2_cell = MagicMock()
        mock_afternoon2_cell.text_content.return_value = "×"
        
        mock_evening_cell = MagicMock()
        mock_evening_cell.text_content.return_value = "○"
        
        # セルのリスト
        mock_cells = [
            mock_first_cell,      # 部屋名
            mock_capacity_cell,   # 定員
            mock_morning_cell,    # 午前
            mock_afternoon1_cell, # 午後1
            mock_afternoon2_cell, # 午後2
            mock_evening_cell     # 夜間
        ]
        
        mock_row.locator.return_value.all.return_value = mock_cells
        
        # テーブルヘッダーのモック
        mock_header1 = MagicMock()
        mock_header1.text_content.return_value = "部屋名"
        mock_header2 = MagicMock()
        mock_header2.text_content.return_value = "定員"
        mock_header3 = MagicMock()
        mock_header3.text_content.return_value = "午前"
        mock_header4 = MagicMock()
        mock_header4.text_content.return_value = "午後１"
        mock_header5 = MagicMock()
        mock_header5.text_content.return_value = "午後２"
        mock_header6 = MagicMock()
        mock_header6.text_content.return_value = "夜間"
        
        mock_headers = [mock_header1, mock_header2, mock_header3, mock_header4, mock_header5, mock_header6]
        
        # 親テーブルのモック
        mock_parent_table = MagicMock()
        mock_parent_table.locator.return_value.all.return_value = mock_headers
        
        # 行の親要素設定
        mock_row.locator.return_value = mock_parent_table
        
        # ページのモック設定
        mock_page.locator.return_value.all.return_value = [mock_row]
        
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
        
        # clicked_roomsが空の場合
        scraper.clicked_rooms = {}
        
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
        assert result[0]["roomName"] == "別館B101（音楽室）"  # roomNameも確認
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
        # 新しい実装では、施設ごとに複数の部屋が返されるため、
        # resultの長さは施設数 × 部屋数になります
        assert len(result) >= 6  # 最低6施設分のデータ
        for facility_data in result:
            assert facility_data["timeSlots"]["9-12"] == "unknown"
            assert facility_data["timeSlots"]["13-17"] == "unknown"
            assert facility_data["timeSlots"]["18-21"] == "unknown"
            # roomNameフィールドも存在することを確認
            assert "roomName" in facility_data