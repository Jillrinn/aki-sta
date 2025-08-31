"""
TargetDateRepositoryのテスト
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from azure.cosmos import exceptions
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from src.repositories.target_date_repository import TargetDateRepository


class TestTargetDateRepository:
    """TargetDateRepositoryのテスト"""
    
    @patch('src.repositories.target_date_repository.CosmosClient')
    def test_init_with_valid_env(self, mock_cosmos_client):
        """正常な環境変数での初期化テスト"""
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test_key',
            'COSMOS_DATABASE': 'test_db'
        }):
            repo = TargetDateRepository()
            
            # CosmosClientが正しく初期化されたか確認
            mock_cosmos_client.assert_called_once_with(
                'https://test.documents.azure.com:443/',
                'test_key'
            )
            assert repo.client is not None
    
    @patch('src.repositories.target_date_repository.CosmosClient')
    def test_init_without_env(self, mock_cosmos_client):
        """環境変数なしでの初期化テスト"""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="Cosmos DB connection settings are missing"):
                TargetDateRepository()
    
    @patch('src.repositories.target_date_repository.CosmosClient')
    def test_get_target_dates_success(self, mock_cosmos_client):
        """正常なtarget_dates取得テスト"""
        # モックセットアップ
        mock_container = Mock()
        mock_container.query_items.return_value = [
            {'date': '2025-11-15', 'active': True, 'priority': 1},
            {'date': '2025-11-16', 'active': True, 'priority': 2},
            {'date': '2025-11-17', 'active': True, 'priority': 3}
        ]
        
        mock_database = Mock()
        mock_database.get_container_client.return_value = mock_container
        
        mock_client_instance = Mock()
        mock_client_instance.get_database_client.return_value = mock_database
        mock_cosmos_client.return_value = mock_client_instance
        
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test_key'
        }):
            repo = TargetDateRepository()
            dates = repo.get_target_dates()
            
            assert len(dates) == 3
            assert dates[0] == '2025-11-15'
            assert dates[1] == '2025-11-16'
            assert dates[2] == '2025-11-17'
            
            # クエリが正しく実行されたか確認
            mock_container.query_items.assert_called_once()
    
    @patch('src.repositories.target_date_repository.CosmosClient')
    def test_get_target_dates_empty(self, mock_cosmos_client):
        """データがない場合のデフォルト日付取得テスト"""
        # モックセットアップ
        mock_container = Mock()
        mock_container.query_items.return_value = []
        
        mock_database = Mock()
        mock_database.get_container_client.return_value = mock_container
        
        mock_client_instance = Mock()
        mock_client_instance.get_database_client.return_value = mock_database
        mock_cosmos_client.return_value = mock_client_instance
        
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test_key'
        }):
            repo = TargetDateRepository()
            dates = repo.get_target_dates()
            
            # デフォルトで7日分の日付が返される
            assert len(dates) == 7
            
            # 今日から始まる日付か確認
            today = datetime.now().date()
            first_date = datetime.strptime(dates[0], '%Y-%m-%d').date()
            assert first_date == today
    
    @patch('src.repositories.target_date_repository.CosmosClient')
    def test_get_target_dates_cosmos_error(self, mock_cosmos_client):
        """Cosmos DBエラー時のフォールバックテスト"""
        # モックセットアップ
        mock_container = Mock()
        mock_container.query_items.side_effect = exceptions.CosmosHttpResponseError(
            status_code=503,
            message="Service Unavailable"
        )
        
        mock_database = Mock()
        mock_database.get_container_client.return_value = mock_container
        
        mock_client_instance = Mock()
        mock_client_instance.get_database_client.return_value = mock_database
        mock_cosmos_client.return_value = mock_client_instance
        
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test_key'
        }):
            repo = TargetDateRepository()
            dates = repo.get_target_dates()
            
            # エラー時もデフォルト日付が返される
            assert len(dates) == 7
    
    @patch('src.repositories.target_date_repository.CosmosClient')
    def test_get_single_target_date(self, mock_cosmos_client):
        """単一日付取得テスト"""
        # モックセットアップ
        mock_container = Mock()
        mock_container.query_items.return_value = [
            {'date': '2025-11-15', 'active': True, 'priority': 1},
            {'date': '2025-11-16', 'active': True, 'priority': 2}
        ]
        
        mock_database = Mock()
        mock_database.get_container_client.return_value = mock_container
        
        mock_client_instance = Mock()
        mock_client_instance.get_database_client.return_value = mock_database
        mock_cosmos_client.return_value = mock_client_instance
        
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test_key'
        }):
            repo = TargetDateRepository()
            date = repo.get_single_target_date()
            
            # 最初の日付が返される
            assert date == '2025-11-15'
    
    @patch('src.repositories.target_date_repository.CosmosClient')
    def test_add_target_date_success(self, mock_cosmos_client):
        """日付追加成功テスト"""
        # モックセットアップ
        mock_container = Mock()
        mock_container.upsert_item.return_value = {'id': 'target_2025-11-20'}
        
        mock_database = Mock()
        mock_database.get_container_client.return_value = mock_container
        
        mock_client_instance = Mock()
        mock_client_instance.get_database_client.return_value = mock_database
        mock_cosmos_client.return_value = mock_client_instance
        
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test_key'
        }):
            repo = TargetDateRepository()
            result = repo.add_target_date('2025-11-20', priority=1)
            
            assert result is True
            
            # upsert_itemが呼ばれたか確認
            mock_container.upsert_item.assert_called_once()
            call_args = mock_container.upsert_item.call_args
            body = call_args.kwargs['body']
            
            assert body['id'] == 'target_2025-11-20'
            assert body['date'] == '2025-11-20'
            assert body['priority'] == 1
            assert body['active'] is True
    
    @patch('src.repositories.target_date_repository.CosmosClient')
    def test_add_target_date_invalid_format(self, mock_cosmos_client):
        """不正な日付フォーマットでの追加テスト"""
        # モックセットアップ
        mock_container = Mock()
        mock_database = Mock()
        mock_database.get_container_client.return_value = mock_container
        
        mock_client_instance = Mock()
        mock_client_instance.get_database_client.return_value = mock_database
        mock_cosmos_client.return_value = mock_client_instance
        
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test_key'
        }):
            repo = TargetDateRepository()
            result = repo.add_target_date('2025/11/20')  # 不正なフォーマット
            
            assert result is False
            # upsert_itemが呼ばれていないことを確認
            mock_container.upsert_item.assert_not_called()
    
    @patch('src.repositories.target_date_repository.CosmosClient')
    def test_remove_target_date_success(self, mock_cosmos_client):
        """日付削除（非アクティブ化）成功テスト"""
        # モックセットアップ
        mock_container = Mock()
        existing_item = {
            'id': 'target_2025-11-15',
            'date': '2025-11-15',
            'active': True
        }
        mock_container.read_item.return_value = existing_item
        mock_container.replace_item.return_value = {'id': 'target_2025-11-15'}
        
        mock_database = Mock()
        mock_database.get_container_client.return_value = mock_container
        
        mock_client_instance = Mock()
        mock_client_instance.get_database_client.return_value = mock_database
        mock_cosmos_client.return_value = mock_client_instance
        
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test_key'
        }):
            repo = TargetDateRepository()
            result = repo.remove_target_date('2025-11-15')
            
            assert result is True
            
            # replace_itemが呼ばれたか確認
            mock_container.replace_item.assert_called_once()
            call_args = mock_container.replace_item.call_args
            body = call_args.kwargs['body']
            
            assert body['active'] is False
            assert 'updatedAt' in body
    
    @patch('src.repositories.target_date_repository.CosmosClient')
    def test_remove_target_date_not_found(self, mock_cosmos_client):
        """存在しない日付の削除テスト"""
        # モックセットアップ
        mock_container = Mock()
        mock_container.read_item.side_effect = exceptions.CosmosResourceNotFoundError(
            status_code=404,
            message="Not Found"
        )
        
        mock_database = Mock()
        mock_database.get_container_client.return_value = mock_container
        
        mock_client_instance = Mock()
        mock_client_instance.get_database_client.return_value = mock_database
        mock_cosmos_client.return_value = mock_client_instance
        
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test_key'
        }):
            repo = TargetDateRepository()
            result = repo.remove_target_date('2025-11-99')
            
            assert result is False
            # replace_itemが呼ばれていないことを確認
            mock_container.replace_item.assert_not_called()
    
    def test_get_default_dates(self):
        """デフォルト日付生成のテスト"""
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test_key'
        }):
            with patch('src.repositories.target_date_repository.CosmosClient'):
                repo = TargetDateRepository()
                dates = repo._get_default_dates()
                
                assert len(dates) == 7
                
                # 日付が連続しているか確認
                today = datetime.now().date()
                for i, date_str in enumerate(dates):
                    expected_date = today + timedelta(days=i)
                    actual_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                    assert actual_date == expected_date


if __name__ == '__main__':
    pytest.main([__file__, '-v'])