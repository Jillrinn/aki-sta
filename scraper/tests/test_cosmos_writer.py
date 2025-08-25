"""
CosmosWriterのテスト
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.cosmos_writer import CosmosWriter


class TestCosmosWriter(unittest.TestCase):
    
    @patch.dict(os.environ, {
        'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
        'COSMOS_KEY': 'test-key',
        'COSMOS_DATABASE': 'test-db'
    })
    @patch('src.cosmos_writer.CosmosClient')
    def setUp(self, mock_cosmos_client):
        """テスト用のセットアップ"""
        # Cosmos DBクライアントのモック
        self.mock_client = MagicMock()
        self.mock_database = MagicMock()
        self.mock_container = MagicMock()
        
        mock_cosmos_client.return_value = self.mock_client
        self.mock_client.get_database_client.return_value = self.mock_database
        self.mock_database.get_container_client.return_value = self.mock_container
        
        self.writer = CosmosWriter()
    
    def test_save_availability_success(self):
        """正常にデータが保存できることを確認"""
        # テストデータ
        test_date = '2025-11-15'
        test_facilities = [
            {
                'facilityName': 'あんさんぶるStudio和(本郷)',
                'timeSlots': {
                    '9-12': 'available',
                    '13-17': 'booked',
                    '18-21': 'available'
                },
                'lastUpdated': '2025-08-25T10:00:00Z'
            }
        ]
        
        # upsert_itemが成功することをモック
        self.mock_container.upsert_item.return_value = {'id': 'test'}
        
        # 実行
        result = self.writer.save_availability(test_date, test_facilities)
        
        # 検証
        self.assertTrue(result)
        self.mock_container.upsert_item.assert_called_once()
        
        # upsertに渡されたデータを検証
        call_args = self.mock_container.upsert_item.call_args
        saved_item = call_args.kwargs['body']
        
        self.assertEqual(saved_item['id'], '2025-11-15_ensemble-hongo')
        self.assertEqual(saved_item['date'], '2025-11-15')
        self.assertEqual(saved_item['facilityName'], 'あんさんぶるStudio和(本郷)')
        self.assertEqual(saved_item['timeSlots']['13-17'], 'booked')
    
    def test_save_availability_cosmos_error(self):
        """Cosmos DBエラー時の処理を確認"""
        from azure.cosmos import exceptions
        
        # エラーをシミュレート
        self.mock_container.upsert_item.side_effect = exceptions.CosmosHttpResponseError(
            status_code=500,
            message='Internal Server Error'
        )
        
        test_facilities = [{'facilityName': 'test', 'timeSlots': {}}]
        
        # 実行
        result = self.writer.save_availability('2025-11-15', test_facilities)
        
        # エラー時はFalseが返される
        self.assertFalse(result)
    
    def test_generate_facility_id(self):
        """施設IDの生成ロジックを確認"""
        test_cases = [
            ('あんさんぶるStudio和(本郷)', 'ensemble-hongo'),
            ('あんさんぶるStudio音(初台)', 'ensemble-hatsudai'),
            ('Other Studio Name', 'other-studio-name')
        ]
        
        for facility_name, expected_id in test_cases:
            result = self.writer._generate_facility_id(facility_name)
            self.assertEqual(result, expected_id)
    
    @patch.dict(os.environ, {}, clear=True)
    @patch('src.cosmos_writer.load_dotenv')
    def test_missing_connection_settings(self, mock_load_dotenv):
        """接続設定が不足している場合のエラー"""
        # dotenvのロードを無効化
        mock_load_dotenv.return_value = None
        
        with self.assertRaises(ValueError) as context:
            CosmosWriter()
        
        self.assertIn('Cosmos DB connection settings are missing', str(context.exception))


if __name__ == '__main__':
    unittest.main()