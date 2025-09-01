"""
rate_limits_repositoryのテスト
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from src.repositories.rate_limits_repository import RateLimitsRepository


class TestRateLimitsRepository:
    """RateLimitsRepositoryのテスト"""
    
    @patch('src.repositories.rate_limits_repository.CosmosClient')
    def test_init_with_valid_env(self, mock_cosmos_client):
        """有効な環境変数での初期化テスト"""
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test-key',
            'COSMOS_DATABASE': 'test-db'
        }):
            # モックの設定
            mock_client_instance = Mock()
            mock_database = Mock()
            mock_container = Mock()
            
            mock_cosmos_client.return_value = mock_client_instance
            mock_client_instance.get_database_client.return_value = mock_database
            mock_database.get_container_client.return_value = mock_container
            
            # リポジトリ初期化
            repo = RateLimitsRepository()
            
            # 検証
            assert repo.client == mock_client_instance
            assert repo.database == mock_database
            assert repo.container == mock_container
            mock_client_instance.get_database_client.assert_called_with('test-db')
            mock_database.get_container_client.assert_called_with('rateLimits')
    
    def test_init_without_env(self):
        """環境変数なしでの初期化エラーテスト"""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="Cosmos DB connection settings are missing"):
                RateLimitsRepository()
    
    @patch('src.repositories.rate_limits_repository.CosmosClient')
    def test_get_today_record_success(self, mock_cosmos_client):
        """本日のレコード取得成功テスト"""
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test-key'
        }):
            # モックの設定
            mock_container = Mock()
            mock_cosmos_client.return_value.get_database_client.return_value.get_container_client.return_value = mock_container
            
            today = datetime.now().strftime('%Y-%m-%d')
            mock_record = {
                'id': today,
                'date': today,
                'count': 2,
                'status': 'completed',
                'updatedAt': '2025-01-09T10:00:00Z'
            }
            
            mock_container.query_items.return_value = [mock_record]
            
            # テスト実行
            repo = RateLimitsRepository()
            result = repo.get_today_record()
            
            # 検証
            assert result == mock_record
            mock_container.query_items.assert_called_once()
    
    @patch('src.repositories.rate_limits_repository.CosmosClient')
    def test_get_today_record_not_found(self, mock_cosmos_client):
        """本日のレコードが存在しない場合のテスト"""
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test-key'
        }):
            # モックの設定
            mock_container = Mock()
            mock_cosmos_client.return_value.get_database_client.return_value.get_container_client.return_value = mock_container
            mock_container.query_items.return_value = []
            
            # テスト実行
            repo = RateLimitsRepository()
            result = repo.get_today_record()
            
            # 検証
            assert result is None
    
    @patch('src.repositories.rate_limits_repository.CosmosClient')
    def test_create_or_update_record_new(self, mock_cosmos_client):
        """新規レコード作成テスト"""
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test-key'
        }):
            # モックの設定
            mock_container = Mock()
            mock_cosmos_client.return_value.get_database_client.return_value.get_container_client.return_value = mock_container
            
            # get_today_recordが呼ばれた時はNoneを返す（新規作成）
            with patch.object(RateLimitsRepository, 'get_today_record', return_value=None):
                repo = RateLimitsRepository()
                
                # テスト実行
                result = repo.create_or_update_record('running')
                
                # 検証
                assert result['is_already_running'] is False
                assert result['record']['status'] == 'running'
                assert result['record']['count'] == 1
                mock_container.create_item.assert_called_once()
    
    @patch('src.repositories.rate_limits_repository.CosmosClient')
    def test_create_or_update_record_already_running(self, mock_cosmos_client):
        """すでに実行中の場合のテスト"""
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test-key'
        }):
            # モックの設定
            mock_container = Mock()
            mock_cosmos_client.return_value.get_database_client.return_value.get_container_client.return_value = mock_container
            
            today = datetime.now().strftime('%Y-%m-%d')
            existing_record = {
                'id': today,
                'date': today,
                'count': 1,
                'status': 'running',
                'lastRequestedAt': '2025-01-09T09:00:00Z'
            }
            
            # get_today_recordが呼ばれた時は実行中のレコードを返す
            with patch.object(RateLimitsRepository, 'get_today_record', return_value=existing_record):
                repo = RateLimitsRepository()
                
                # テスト実行
                result = repo.create_or_update_record('running')
                
                # 検証
                assert result['is_already_running'] is True
                assert result['record'] == existing_record
                mock_container.upsert_item.assert_not_called()
    
    @patch('src.repositories.rate_limits_repository.CosmosClient')
    def test_create_or_update_record_completed(self, mock_cosmos_client):
        """completedステータスの場合の更新テスト"""
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test-key'
        }):
            # モックの設定
            mock_container = Mock()
            mock_cosmos_client.return_value.get_database_client.return_value.get_container_client.return_value = mock_container
            
            today = datetime.now().strftime('%Y-%m-%d')
            existing_record = {
                'id': today,
                'date': today,
                'count': 1,
                'status': 'completed',
                'lastRequestedAt': '2025-01-09T09:00:00Z'
            }
            
            # get_today_recordが呼ばれた時はcompletedのレコードを返す
            with patch.object(RateLimitsRepository, 'get_today_record', return_value=existing_record):
                repo = RateLimitsRepository()
                
                # テスト実行
                result = repo.create_or_update_record('running')
                
                # 検証
                assert result['is_already_running'] is False
                assert result['record']['count'] == 2  # カウントが増加
                assert result['record']['status'] == 'running'
                mock_container.upsert_item.assert_called_once()
    
    @patch('src.repositories.rate_limits_repository.CosmosClient')
    def test_update_status_success(self, mock_cosmos_client):
        """ステータス更新成功テスト"""
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test-key'
        }):
            # モックの設定
            mock_container = Mock()
            mock_cosmos_client.return_value.get_database_client.return_value.get_container_client.return_value = mock_container
            
            today = datetime.now().strftime('%Y-%m-%d')
            existing_record = {
                'id': today,
                'date': today,
                'count': 1,
                'status': 'running',
                'lastRequestedAt': '2025-01-09T09:00:00Z'
            }
            
            mock_container.read_item.return_value = existing_record
            
            # テスト実行
            repo = RateLimitsRepository()
            result = repo.update_status(today, today, 'completed')
            
            # 検証
            mock_container.read_item.assert_called_once_with(item=today, partition_key=today)
            mock_container.replace_item.assert_called_once()
            
            # replace_itemに渡された引数を確認
            call_args = mock_container.replace_item.call_args
            assert call_args[1]['body']['status'] == 'completed'
            assert 'updatedAt' in call_args[1]['body']
    
    @patch('src.repositories.rate_limits_repository.CosmosClient')
    def test_update_status_not_found(self, mock_cosmos_client):
        """レコードが見つからない場合のテスト"""
        with patch.dict(os.environ, {
            'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
            'COSMOS_KEY': 'test-key'
        }):
            # モックの設定
            mock_container = Mock()
            mock_cosmos_client.return_value.get_database_client.return_value.get_container_client.return_value = mock_container
            
            from azure.cosmos import exceptions
            mock_container.read_item.side_effect = exceptions.CosmosResourceNotFoundError(
                status_code=404,
                message="Resource not found"
            )
            
            # テスト実行
            repo = RateLimitsRepository()
            
            with pytest.raises(ValueError, match="Record not found"):
                repo.update_status('non-existent', '2025-01-09', 'completed')