"""
ScrapeServiceのテスト
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from src.services.scrape_service import ScrapeService
from src.scrapers.ensemble_studio import EnsembleStudioScraper


class TestScrapeService:
    """ScrapeServiceのテスト"""
    
    def test_init_with_dependencies(self):
        """依存性注入でのテスト"""
        mock_writer = Mock()
        mock_date_service = Mock()
        
        service = ScrapeService(
            cosmos_writer=mock_writer,
            target_date_service=mock_date_service
        )
        
        assert service.cosmos_writer == mock_writer
        assert service.target_date_service == mock_date_service
    
    def test_get_scraper_class_exact_match(self):
        """完全一致でスクレイパークラス取得テスト"""
        mock_writer = Mock()
        mock_date_service = Mock()
        service = ScrapeService(cosmos_writer=mock_writer, target_date_service=mock_date_service)
        
        scraper_class = service._get_scraper_class('ensemble')
        assert scraper_class == EnsembleStudioScraper
        
        scraper_class = service._get_scraper_class('ensemble_studio')
        assert scraper_class == EnsembleStudioScraper
    
    def test_get_scraper_class_case_insensitive(self):
        """大文字小文字を無視したマッチングテスト"""
        mock_writer = Mock()
        mock_date_service = Mock()
        service = ScrapeService(cosmos_writer=mock_writer, target_date_service=mock_date_service)
        
        scraper_class = service._get_scraper_class('ENSEMBLE')
        assert scraper_class == EnsembleStudioScraper
        
        scraper_class = service._get_scraper_class('Ensemble_Studio')
        assert scraper_class == EnsembleStudioScraper
    
    def test_get_scraper_class_partial_match(self):
        """部分一致でのマッチングテスト"""
        mock_writer = Mock()
        mock_date_service = Mock()
        service = ScrapeService(cosmos_writer=mock_writer, target_date_service=mock_date_service)
        
        scraper_class = service._get_scraper_class('ensem')
        assert scraper_class == EnsembleStudioScraper
    
    def test_get_scraper_class_not_found(self):
        """存在しない施設名のテスト"""
        mock_writer = Mock()
        mock_date_service = Mock()
        service = ScrapeService(cosmos_writer=mock_writer, target_date_service=mock_date_service)
        
        scraper_class = service._get_scraper_class('unknown_facility')
        assert scraper_class is None
    
    def test_scrape_facility_success(self):
        """特定施設スクレイピング成功テスト"""
        # モック設定
        mock_scraper_class = Mock()
        mock_scraper = Mock()
        mock_scraper.scrape_and_save.return_value = {
            'status': 'success',
            'data': {
                '2025-11-15': [
                    {'facilityName': 'テストスタジオ', 'timeSlots': {}}
                ]
            }
        }
        mock_scraper_class.return_value = mock_scraper
        
        mock_date_service = Mock()
        mock_date_service.get_single_date_to_scrape.return_value = '2025-11-15'
        
        mock_writer = Mock()
        service = ScrapeService(cosmos_writer=mock_writer, target_date_service=mock_date_service)
        
        # スクレイパークラスをモックに置き換え
        with patch.object(service, 'SCRAPERS', {'ensemble': mock_scraper_class}):
            result = service.scrape_facility('ensemble', '2025-11-15')
        
        assert result['status'] == 'success'
        assert result['facility'] == 'ensemble'
        assert result['date'] == '2025-11-15'
        mock_scraper.scrape_and_save.assert_called_once_with('2025-11-15')
    
    def test_scrape_facility_unknown(self):
        """未知の施設スクレイピングテスト"""
        mock_writer = Mock()
        mock_date_service = Mock()
        service = ScrapeService(cosmos_writer=mock_writer, target_date_service=mock_date_service)
        
        result = service.scrape_facility('unknown_facility')
        
        assert result['status'] == 'error'
        assert result['error_type'] == 'INVALID_FACILITY'
        assert 'Unknown facility' in result['message']
    
    def test_scrape_facility_error(self):
        """スクレイピングエラーテスト"""
        # モック設定
        mock_scraper_class = Mock()
        mock_scraper = Mock()
        mock_scraper.scrape_and_save.side_effect = Exception("Scraping failed")
        mock_scraper_class.return_value = mock_scraper
        
        mock_date_service = Mock()
        mock_date_service.get_single_date_to_scrape.return_value = '2025-11-15'
        
        mock_writer = Mock()
        service = ScrapeService(cosmos_writer=mock_writer, target_date_service=mock_date_service)
        
        with patch.object(service, 'SCRAPERS', {'ensemble': mock_scraper_class}):
            result = service.scrape_facility('ensemble')
        
        assert result['status'] == 'error'
        assert result['error_type'] == 'SCRAPING_ERROR'
        assert 'Scraping failed' in result['details']
    
    def test_scrape_all_facilities(self):
        """全施設スクレイピングテスト"""
        # モック設定
        mock_scraper = Mock()
        mock_scraper.scrape_and_save.return_value = {
            'status': 'success',
            'data': {
                '2025-11-15': [
                    {'facilityName': 'テストスタジオ', 'timeSlots': {}}
                ]
            }
        }
        mock_scraper_class = Mock()
        mock_scraper_class.return_value = mock_scraper
        
        mock_date_service = Mock()
        mock_date_service.get_dates_to_scrape.return_value = ['2025-11-15', '2025-11-16']
        mock_date_service.get_single_date_to_scrape.side_effect = ['2025-11-15', '2025-11-16']
        
        mock_writer = Mock()
        service = ScrapeService(cosmos_writer=mock_writer, target_date_service=mock_date_service)
        
        with patch.object(service, 'SCRAPERS', {'ensemble': mock_scraper_class}):
            result = service.scrape_all_facilities()
        
        assert result['status'] == 'success'
        assert result['total_dates'] == 2
        assert result['success_count'] == 2  # 2日分成功
        assert result['error_count'] == 0
        assert len(result['results']) == 2
    
    def test_scrape_with_dates_specific_facility(self):
        """特定施設の複数日付スクレイピングテスト"""
        # モック設定
        mock_scraper = Mock()
        mock_scraper.scrape_and_save.return_value = {
            'status': 'success',
            'data': {'2025-11-15': []}
        }
        mock_scraper_class = Mock()
        mock_scraper_class.return_value = mock_scraper
        
        mock_date_service = Mock()
        mock_date_service.get_single_date_to_scrape.side_effect = ['2025-11-15', '2025-11-16']
        
        mock_writer = Mock()
        service = ScrapeService(cosmos_writer=mock_writer, target_date_service=mock_date_service)
        
        dates = ['2025-11-15', '2025-11-16']
        with patch.object(service, 'SCRAPERS', {'ensemble': mock_scraper_class}):
            result = service.scrape_with_dates(dates, facility='ensemble')
        
        assert result['status'] == 'success'
        assert result['facility'] == 'ensemble'
        assert result['total_dates'] == 2
        assert result['success_count'] == 2
        assert result['error_count'] == 0
    
    def test_scrape_with_dates_all_facilities(self):
        """全施設の複数日付スクレイピングテスト"""
        # モック設定
        mock_scraper = Mock()
        mock_scraper.scrape_and_save.return_value = {
            'status': 'success',
            'data': {'2025-11-15': []}
        }
        mock_scraper_class = Mock()
        mock_scraper_class.return_value = mock_scraper
        
        mock_date_service = Mock()
        mock_date_service.get_dates_to_scrape.return_value = ['2025-11-15', '2025-11-16']
        mock_date_service.get_single_date_to_scrape.side_effect = ['2025-11-15', '2025-11-16']
        
        mock_writer = Mock()
        service = ScrapeService(cosmos_writer=mock_writer, target_date_service=mock_date_service)
        
        dates = ['2025-11-15', '2025-11-16']
        with patch.object(service, 'SCRAPERS', {'ensemble': mock_scraper_class}):
            result = service.scrape_with_dates(dates)
        
        assert result['status'] == 'success'
        assert result['total_dates'] == 2
        # 施設名の処理は実装に依存
    
    def test_get_available_facilities(self):
        """利用可能施設リスト取得テスト"""
        mock_writer = Mock()
        mock_date_service = Mock()
        service = ScrapeService(cosmos_writer=mock_writer, target_date_service=mock_date_service)
        
        facilities = service.get_available_facilities()
        
        assert 'ensemble' in facilities
        # 現在はあんさんぶるStudioのみ
        assert len(facilities) == 1


if __name__ == '__main__':
    pytest.main([__file__, '-v'])