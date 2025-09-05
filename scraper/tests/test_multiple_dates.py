"""
複数日付処理のテストコード
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from src.scrapers.ensemble_studio import EnsembleStudioScraper
from src.scrapers.meguro import MeguroScraper


class TestMultipleDatesScraping(unittest.TestCase):
    """複数日付スクレイピング機能のテスト"""
    
    def test_group_dates_by_month(self):
        """日付のグループ化テスト"""
        scraper = EnsembleStudioScraper()
        
        dates = [
            "2025-01-30",
            "2025-01-31",
            "2025-02-01",
            "2025-02-15",
            "2025-03-01"
        ]
        
        grouped = scraper._group_dates_by_month(dates)
        
        # 3つの月にグループ化されることを確認
        self.assertEqual(len(grouped), 3)
        
        # 各月の日付数を確認
        self.assertEqual(len(grouped["2025-01"]), 2)
        self.assertEqual(len(grouped["2025-02"]), 2)
        self.assertEqual(len(grouped["2025-03"]), 1)
        
        # 正しい日付が含まれているか確認
        self.assertIn("2025-01-30", grouped["2025-01"])
        self.assertIn("2025-01-31", grouped["2025-01"])
        self.assertIn("2025-02-01", grouped["2025-02"])
    
    def test_summarize_results(self):
        """結果サマリー生成のテスト"""
        scraper = EnsembleStudioScraper()
        
        results = {
            "2025-01-30": {"status": "success", "data": []},
            "2025-01-31": {"status": "error", "message": "Test error"},
            "2025-02-01": {"status": "success", "data": []},
        }
        
        summary = scraper._summarize_results(results)
        
        # サマリー構造の確認
        self.assertIn("results", summary)
        self.assertIn("summary", summary)
        
        # カウントの確認
        self.assertEqual(summary["summary"]["total"], 3)
        self.assertEqual(summary["summary"]["success"], 2)
        self.assertEqual(summary["summary"]["failed"], 1)
    
    @patch('src.repositories.cosmos_repository.CosmosWriter')
    def test_save_to_cosmos_immediately(self, mock_cosmos_writer_class):
        """即座のDB保存テスト"""
        scraper = EnsembleStudioScraper()
        
        # モックの設定
        mock_writer = Mock()
        mock_writer.save_availability.return_value = True
        mock_cosmos_writer_class.return_value = mock_writer
        
        facilities = [{"test": "data"}]
        result = scraper._save_to_cosmos_immediately("2025-01-30", facilities)
        
        # DB保存が呼ばれたことを確認
        mock_writer.save_availability.assert_called_once_with("2025-01-30", facilities)
        self.assertTrue(result)
    
    @patch('src.scrapers.ensemble_studio.sync_playwright')
    @patch.object(EnsembleStudioScraper, '_save_to_cosmos_immediately')
    def test_ensemble_multiple_dates_same_month(self, mock_save_db, mock_playwright):
        """Ensemble Studio: 同月内の複数日付処理テスト"""
        scraper = EnsembleStudioScraper()
        
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
        
        # カレンダーモックの設定
        mock_calendar = MagicMock()
        scraper.find_studio_calendars = Mock(return_value=[("Studio1", mock_calendar)])
        scraper.navigate_to_month = Mock(return_value=True)
        scraper.find_date_cell = Mock(return_value=MagicMock())
        scraper.extract_time_slots = Mock(return_value={
            "morning": "available",
            "afternoon": "booked",
            "evening": "unknown"
        })
        
        # DB保存は成功するように設定
        mock_save_db.return_value = True
        
        # 同じ月の2つの日付
        dates = ["2025-01-30", "2025-01-31"]
        result = scraper.scrape_multiple_dates(dates)
        
        # navigate_to_monthは1回だけ呼ばれることを確認（同月なので）
        self.assertEqual(scraper.navigate_to_month.call_count, 1)
        
        # find_date_cellは2回呼ばれることを確認（各日付ごと）
        self.assertEqual(scraper.find_date_cell.call_count, 2)
        
        # 結果の確認
        self.assertEqual(result["summary"]["total"], 2)
        self.assertEqual(result["summary"]["success"], 2)
    
    @patch('src.scrapers.ensemble_studio.sync_playwright')
    @patch.object(EnsembleStudioScraper, '_save_to_cosmos_immediately')
    def test_ensemble_multiple_dates_different_months(self, mock_save_db, mock_playwright):
        """Ensemble Studio: 異なる月の複数日付処理テスト"""
        scraper = EnsembleStudioScraper()
        
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
        
        # カレンダーモックの設定
        mock_calendar = MagicMock()
        scraper.find_studio_calendars = Mock(return_value=[("Studio1", mock_calendar)])
        scraper.navigate_to_month = Mock(return_value=True)
        scraper.find_date_cell = Mock(return_value=MagicMock())
        scraper.extract_time_slots = Mock(return_value={
            "morning": "available",
            "afternoon": "booked",
            "evening": "unknown"
        })
        
        # DB保存は成功するように設定
        mock_save_db.return_value = True
        
        # 異なる月の日付
        dates = ["2025-01-31", "2025-02-01"]
        result = scraper.scrape_multiple_dates(dates)
        
        # navigate_to_monthは2回呼ばれることを確認（月が変わるため）
        self.assertEqual(scraper.navigate_to_month.call_count, 2)
        
        # 結果の確認
        self.assertEqual(result["summary"]["total"], 2)
    
    @patch.object(MeguroScraper, 'scrape_and_save')
    def test_meguro_multiple_dates(self, mock_scrape_and_save):
        """目黒区: 複数日付処理テスト（ループ実装）"""
        scraper = MeguroScraper()
        
        # scrape_and_saveのモック
        mock_scrape_and_save.side_effect = [
            {"status": "success", "data": []},
            {"status": "error", "message": "Test error"}
        ]
        
        dates = ["2025-01-30", "2025-01-31"]
        result = scraper.scrape_multiple_dates(dates)
        
        # scrape_and_saveが各日付で呼ばれることを確認
        self.assertEqual(mock_scrape_and_save.call_count, 2)
        mock_scrape_and_save.assert_any_call("2025-01-30")
        mock_scrape_and_save.assert_any_call("2025-01-31")
        
        # 結果の確認
        self.assertEqual(result["summary"]["total"], 2)
        self.assertEqual(result["summary"]["success"], 1)
        self.assertEqual(result["summary"]["failed"], 1)
    
    def test_invalid_date_format_handling(self):
        """不正な日付フォーマットのハンドリングテスト"""
        scraper = EnsembleStudioScraper()
        
        dates = [
            "2025-01-30",  # 正しい形式
            "2025/01/31",  # スラッシュ区切り（対応可能）
            "invalid",     # 不正な形式
            "30-01-2025"   # 逆順
        ]
        
        grouped = scraper._group_dates_by_month(dates)
        
        # 正しい形式の日付のみがグループ化されることを確認
        self.assertIn("2025-01", grouped)
        self.assertEqual(len(grouped["2025-01"]), 2)
        self.assertIn("2025-01-30", grouped["2025-01"])
        self.assertIn("2025-01-31", grouped["2025-01"])  # スラッシュ区切りも正規化される


if __name__ == '__main__':
    unittest.main()