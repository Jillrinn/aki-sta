"""
エラーハンドリングのテスト
"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime
from src.scrapers.ensemble_studio import EnsembleStudioScraper


class TestErrorHandling:
    """エラーハンドリングのテストクラス"""
    
    @pytest.fixture
    def scraper(self):
        """テスト用スクレイパーインスタンス"""
        return EnsembleStudioScraper()
    
    @pytest.fixture
    def mock_page(self):
        """モックページオブジェクト"""
        page = MagicMock()
        page.goto.return_value = Mock(status=200)
        page.wait_for_selector = Mock()
        page.wait_for_timeout = Mock()
        return page
    
    @pytest.fixture
    def mock_browser(self):
        """モックブラウザオブジェクト"""
        browser = MagicMock()
        context = MagicMock()
        browser.new_context.return_value = context
        return browser, context
    
    @patch('src.scrapers.ensemble_studio.sync_playwright')
    def test_skip_studio_when_navigate_fails(self, mock_playwright, scraper):
        """navigate_to_monthが失敗した場合、そのスタジオをスキップすることを確認"""
        # Playwrightのモック設定
        mock_p = MagicMock()
        mock_playwright.return_value.__enter__.return_value = mock_p
        
        # ブラウザとページのモック
        browser = MagicMock()
        context = MagicMock()
        page = MagicMock()
        
        mock_p.chromium.launch.return_value = browser
        mock_p.webkit.launch.return_value = browser
        browser.new_context.return_value = context
        context.new_page.return_value = page
        
        # ページの基本設定
        page.goto.return_value = Mock(status=200)
        page.wait_for_selector = Mock()
        page.wait_for_timeout = Mock()
        
        # カレンダーのモック（2つのスタジオ）
        calendar1 = MagicMock()
        calendar2 = MagicMock()
        
        # find_studio_calendarsのモック
        with patch.object(scraper, 'find_studio_calendars') as mock_find:
            mock_find.return_value = [
                ("スタジオ1", calendar1),
                ("スタジオ2", calendar2)
            ]
            
            # navigate_to_monthのモック（スタジオ1は失敗、スタジオ2は成功）
            with patch.object(scraper, 'navigate_to_month') as mock_navigate:
                mock_navigate.side_effect = [False, True]  # 1つ目失敗、2つ目成功
                
                # find_date_cellのモック
                date_cell = MagicMock()
                with patch.object(scraper, 'find_date_cell') as mock_find_date:
                    mock_find_date.return_value = date_cell
                    
                    # extract_time_slotsのモック
                    with patch.object(scraper, 'extract_time_slots') as mock_extract:
                        mock_extract.return_value = {
                            "morning": "available",
                            "afternoon": "booked",
                            "evening": "available"
                        }
                        
                        # テスト実行
                        results = scraper.scrape_availability("2025-11-15")
                        
                        # スタジオ1はスキップされ、スタジオ2のみ結果に含まれることを確認
                        assert len(results) == 1
                        assert results[0]["facilityName"] == "スタジオ2"
                        assert results[0]["timeSlots"]["morning"] == "available"
    
    @patch('src.scrapers.ensemble_studio.sync_playwright')
    def test_skip_studio_when_date_cell_not_found(self, mock_playwright, scraper):
        """find_date_cellが失敗した場合、そのスタジオをスキップすることを確認"""
        # Playwrightのモック設定
        mock_p = MagicMock()
        mock_playwright.return_value.__enter__.return_value = mock_p
        
        # ブラウザとページのモック
        browser = MagicMock()
        context = MagicMock()
        page = MagicMock()
        
        mock_p.chromium.launch.return_value = browser
        mock_p.webkit.launch.return_value = browser
        browser.new_context.return_value = context
        context.new_page.return_value = page
        
        # ページの基本設定
        page.goto.return_value = Mock(status=200)
        page.wait_for_selector = Mock()
        page.wait_for_timeout = Mock()
        
        # カレンダーのモック（2つのスタジオ）
        calendar1 = MagicMock()
        calendar2 = MagicMock()
        
        # find_studio_calendarsのモック
        with patch.object(scraper, 'find_studio_calendars') as mock_find:
            mock_find.return_value = [
                ("スタジオA", calendar1),
                ("スタジオB", calendar2)
            ]
            
            # navigate_to_monthのモック（両方成功）
            with patch.object(scraper, 'navigate_to_month') as mock_navigate:
                mock_navigate.return_value = True
                
                # find_date_cellのモック（スタジオAは失敗、スタジオBは成功）
                with patch.object(scraper, 'find_date_cell') as mock_find_date:
                    mock_find_date.side_effect = [None, MagicMock()]  # 1つ目None、2つ目成功
                    
                    # extract_time_slotsのモック
                    with patch.object(scraper, 'extract_time_slots') as mock_extract:
                        mock_extract.return_value = {
                            "morning": "booked",
                            "afternoon": "booked",
                            "evening": "available"
                        }
                        
                        # テスト実行
                        results = scraper.scrape_availability("2025-11-15")
                        
                        # スタジオAはスキップされ、スタジオBのみ結果に含まれることを確認
                        assert len(results) == 1
                        assert results[0]["facilityName"] == "スタジオB"
                        assert results[0]["timeSlots"]["evening"] == "available"
    
    @patch('src.scrapers.ensemble_studio.sync_playwright')
    def test_empty_result_when_all_studios_fail(self, mock_playwright, scraper):
        """すべてのスタジオでエラーが発生した場合、空の結果を返すことを確認"""
        # Playwrightのモック設定
        mock_p = MagicMock()
        mock_playwright.return_value.__enter__.return_value = mock_p
        
        # ブラウザとページのモック
        browser = MagicMock()
        context = MagicMock()
        page = MagicMock()
        
        mock_p.chromium.launch.return_value = browser
        mock_p.webkit.launch.return_value = browser
        browser.new_context.return_value = context
        context.new_page.return_value = page
        
        # ページの基本設定
        page.goto.return_value = Mock(status=200)
        page.wait_for_selector = Mock()
        page.wait_for_timeout = Mock()
        
        # カレンダーのモック（2つのスタジオ）
        calendar1 = MagicMock()
        calendar2 = MagicMock()
        
        # find_studio_calendarsのモック
        with patch.object(scraper, 'find_studio_calendars') as mock_find:
            mock_find.return_value = [
                ("スタジオX", calendar1),
                ("スタジオY", calendar2)
            ]
            
            # navigate_to_monthのモック（両方失敗）
            with patch.object(scraper, 'navigate_to_month') as mock_navigate:
                mock_navigate.return_value = False
                
                # テスト実行
                results = scraper.scrape_availability("2025-11-15")
                
                # 結果が空のリストであることを確認
                assert results == []
    
    @patch('src.scrapers.ensemble_studio.sync_playwright')
    def test_scrape_and_save_with_no_valid_data(self, mock_playwright, scraper):
        """有効なデータがない場合、scrape_and_saveがエラーを返すことを確認"""
        # Playwrightのモック設定
        mock_p = MagicMock()
        mock_playwright.return_value.__enter__.return_value = mock_p
        
        # ブラウザとページのモック
        browser = MagicMock()
        context = MagicMock()
        page = MagicMock()
        
        mock_p.chromium.launch.return_value = browser
        mock_p.webkit.launch.return_value = browser
        browser.new_context.return_value = context
        context.new_page.return_value = page
        
        # ページの基本設定
        page.goto.return_value = Mock(status=200)
        page.wait_for_selector = Mock()
        page.wait_for_timeout = Mock()
        
        # find_studio_calendarsのモック（カレンダーあり）
        with patch.object(scraper, 'find_studio_calendars') as mock_find:
            mock_find.return_value = [("スタジオ", MagicMock())]
            
            # navigate_to_monthのモック（失敗）
            with patch.object(scraper, 'navigate_to_month') as mock_navigate:
                mock_navigate.return_value = False
                
                # scrape_and_save実行
                result = scraper.scrape_and_save("2025-11-15")
                
                # エラーが返されることを確認
                assert result["status"] == "error"
                assert result["error_type"] == "NO_DATA_FOUND"
                assert "No data found" in result["message"]
    
    @patch('src.scrapers.ensemble_studio.sync_playwright')
    def test_time_slot_unknown_preserved(self, mock_playwright, scraper):
        """時間帯が見つからない場合はunknownとして扱われることを確認"""
        # Playwrightのモック設定
        mock_p = MagicMock()
        mock_playwright.return_value.__enter__.return_value = mock_p
        
        # ブラウザとページのモック
        browser = MagicMock()
        context = MagicMock()
        page = MagicMock()
        
        mock_p.chromium.launch.return_value = browser
        mock_p.webkit.launch.return_value = browser
        browser.new_context.return_value = context
        context.new_page.return_value = page
        
        # ページの基本設定
        page.goto.return_value = Mock(status=200)
        page.wait_for_selector = Mock()
        page.wait_for_timeout = Mock()
        
        # カレンダーのモック
        calendar = MagicMock()
        
        # find_studio_calendarsのモック
        with patch.object(scraper, 'find_studio_calendars') as mock_find:
            mock_find.return_value = [("テストスタジオ", calendar)]
            
            # navigate_to_monthのモック（成功）
            with patch.object(scraper, 'navigate_to_month') as mock_navigate:
                mock_navigate.return_value = True
                
                # find_date_cellのモック（成功）
                date_cell = MagicMock()
                with patch.object(scraper, 'find_date_cell') as mock_find_date:
                    mock_find_date.return_value = date_cell
                    
                    # extract_time_slotsのモック（一部unknownを含む）
                    with patch.object(scraper, 'extract_time_slots') as mock_extract:
                        mock_extract.return_value = {
                            "morning": "available",
                            "afternoon": "unknown",  # 時間帯が見つからない場合
                            "evening": "booked"
                        }
                        
                        # テスト実行
                        results = scraper.scrape_availability("2025-11-15")
                        
                        # unknownが保持されていることを確認
                        assert len(results) == 1
                        assert results[0]["timeSlots"]["afternoon"] == "unknown"
                        assert results[0]["timeSlots"]["morning"] == "available"
                        assert results[0]["timeSlots"]["evening"] == "booked"