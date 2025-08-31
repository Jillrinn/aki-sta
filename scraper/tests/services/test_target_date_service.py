"""
TargetDateServiceのテスト
"""
import pytest
from datetime import datetime
from unittest.mock import Mock, patch
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from src.services.target_date_service import TargetDateService


class TestTargetDateService:
    """TargetDateServiceのテスト"""
    
    def test_get_dates_to_scrape_with_requested_dates(self):
        """ユーザー指定日付がある場合のテスト"""
        mock_repo = Mock()
        service = TargetDateService(repository=mock_repo)
        
        requested = ['2025-11-15', '2025-11-16']
        result = service.get_dates_to_scrape(requested)
        
        assert result == requested
        # repositoryが呼ばれないことを確認
        mock_repo.get_target_dates.assert_not_called()
    
    def test_get_dates_to_scrape_from_repository(self):
        """repositoryから日付を取得するテスト"""
        mock_repo = Mock()
        mock_repo.get_target_dates.return_value = ['2025-11-20', '2025-11-21']
        service = TargetDateService(repository=mock_repo)
        
        result = service.get_dates_to_scrape()
        
        assert result == ['2025-11-20', '2025-11-21']
        mock_repo.get_target_dates.assert_called_once()
    
    def test_get_dates_to_scrape_default(self):
        """デフォルト日付（今日）を返すテスト"""
        mock_repo = Mock()
        mock_repo.get_target_dates.return_value = []
        service = TargetDateService(repository=mock_repo)
        
        result = service.get_dates_to_scrape()
        
        today = datetime.now().strftime('%Y-%m-%d')
        assert result == [today]
    
    def test_get_dates_to_scrape_repository_error(self):
        """repository エラー時のフォールバックテスト"""
        mock_repo = Mock()
        mock_repo.get_target_dates.side_effect = Exception("DB Error")
        service = TargetDateService(repository=mock_repo)
        
        result = service.get_dates_to_scrape()
        
        today = datetime.now().strftime('%Y-%m-%d')
        assert result == [today]
    
    def test_get_single_date_to_scrape_with_requested(self):
        """ユーザー指定の単一日付テスト"""
        mock_repo = Mock()
        service = TargetDateService(repository=mock_repo)
        
        result = service.get_single_date_to_scrape('2025-11-15')
        
        assert result == '2025-11-15'
        mock_repo.get_single_target_date.assert_not_called()
    
    def test_get_single_date_to_scrape_from_repository(self):
        """repositoryから単一日付を取得するテスト"""
        mock_repo = Mock()
        mock_repo.get_single_target_date.return_value = '2025-11-20'
        service = TargetDateService(repository=mock_repo)
        
        result = service.get_single_date_to_scrape()
        
        assert result == '2025-11-20'
        mock_repo.get_single_target_date.assert_called_once()
    
    def test_validate_dates_multiple_formats(self):
        """複数フォーマットの日付バリデーションテスト"""
        mock_repo = Mock()
        service = TargetDateService(repository=mock_repo)
        
        dates = ['2025-11-15', '2025/11/16', '2025-11-17']
        result = service._validate_dates(dates)
        
        # 全てYYYY-MM-DD形式に正規化される
        assert result == ['2025-11-15', '2025-11-16', '2025-11-17']
    
    def test_validate_dates_invalid_format(self):
        """無効な日付フォーマットのテスト"""
        mock_repo = Mock()
        service = TargetDateService(repository=mock_repo)
        
        dates = ['2025.11.15', 'invalid', '2025-11-15']
        result = service._validate_dates(dates)
        
        # 有効な日付のみ返される
        assert result == ['2025-11-15']
    
    def test_add_target_date_success(self):
        """日付追加成功テスト"""
        mock_repo = Mock()
        mock_repo.add_target_date.return_value = True
        service = TargetDateService(repository=mock_repo)
        
        result = service.add_target_date('2025-11-15', priority=1)
        
        assert result is True
        mock_repo.add_target_date.assert_called_once_with('2025-11-15', 1)
    
    def test_add_target_date_error(self):
        """日付追加エラーテスト"""
        mock_repo = Mock()
        mock_repo.add_target_date.side_effect = Exception("DB Error")
        service = TargetDateService(repository=mock_repo)
        
        result = service.add_target_date('2025-11-15')
        
        assert result is False
    
    def test_remove_target_date_success(self):
        """日付削除成功テスト"""
        mock_repo = Mock()
        mock_repo.remove_target_date.return_value = True
        service = TargetDateService(repository=mock_repo)
        
        result = service.remove_target_date('2025-11-15')
        
        assert result is True
        mock_repo.remove_target_date.assert_called_once_with('2025-11-15')
    
    def test_remove_target_date_error(self):
        """日付削除エラーテスト"""
        mock_repo = Mock()
        mock_repo.remove_target_date.side_effect = Exception("DB Error")
        service = TargetDateService(repository=mock_repo)
        
        result = service.remove_target_date('2025-11-15')
        
        assert result is False


if __name__ == '__main__':
    pytest.main([__file__, '-v'])