"""
Flask APIのテスト
"""
import json
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from src.entrypoints.flask_api import app


@pytest.fixture
def client():
    """Flask test client fixture"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestBasicEndpoints:
    """基本的なエンドポイントのテスト"""
    
    def test_index_endpoint(self, client):
        """ルートエンドポイントのテスト"""
        response = client.get('/')
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert data['service'] == 'Scraper Web App'
        assert data['status'] == 'running'
        assert 'timestamp' in data
    
    def test_health_endpoint(self, client):
        """ヘルスチェックエンドポイントのテスト"""
        response = client.get('/health')
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert data['status'] == 'healthy'
        assert 'timestamp' in data
    
    def test_404_error(self, client):
        """存在しないエンドポイントのテスト"""
        response = client.get('/nonexistent')
        data = json.loads(response.data)
        
        assert response.status_code == 404
        assert data['status'] == 'error'
        assert data['message'] == 'Endpoint not found'


class TestScrapeEndpoint:
    """スクレイピングエンドポイントのテスト"""
    
    @patch('src.entrypoints.flask_api.scraper')
    def test_scrape_with_query_parameter(self, mock_scraper, client):
        """クエリパラメータでの日付指定テスト"""
        # スクレイパーのモック設定
        mock_scraper.scrape_and_save.return_value = {
            'status': 'success',
            'data': {
                '2025-11-15': [
                    {
                        'facilityName': 'テストスタジオ',
                        'timeSlots': {'9-12': 'available'},
                        'lastUpdated': '2025-08-30T10:00:00Z'
                    }
                ]
            }
        }
        
        # リクエスト実行
        response = client.post('/scrape?date=2025-11-15')
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert data['status'] == 'success'
        assert data['total_dates'] == 1
        assert data['success_count'] == 1
        assert data['error_count'] == 0
        assert len(data['results']) == 1
        assert data['results'][0]['date'] == '2025-11-15'
        assert data['results'][0]['status'] == 'success'
    
    @patch('src.entrypoints.flask_api.scraper')
    def test_scrape_with_json_body(self, mock_scraper, client):
        """JSONボディでの日付指定テスト"""
        # スクレイパーのモック設定
        mock_scraper.scrape_and_save.return_value = {
            'status': 'success',
            'data': {
                '2025-11-15': [
                    {
                        'facilityName': 'テストスタジオ',
                        'timeSlots': {'9-12': 'available'}
                    }
                ]
            }
        }
        
        # リクエスト実行
        response = client.post('/scrape',
                             json={'dates': ['2025-11-15']},
                             content_type='application/json')
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert data['status'] == 'success'
        assert data['total_dates'] == 1
        assert data['success_count'] == 1
    
    @patch('src.entrypoints.flask_api.scraper')
    def test_scrape_multiple_dates(self, mock_scraper, client):
        """複数日付のスクレイピングテスト"""
        # スクレイパーのモック設定
        def mock_scrape(date):
            return {
                'status': 'success',
                'data': {
                    date: [
                        {
                            'facilityName': f'スタジオ - {date}',
                            'timeSlots': {'9-12': 'available'}
                        }
                    ]
                }
            }
        
        mock_scraper.scrape_and_save.side_effect = mock_scrape
        
        # リクエスト実行
        response = client.post('/scrape?date=2025-11-15&date=2025-11-16')
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert data['total_dates'] == 2
        assert data['success_count'] == 2
        assert data['error_count'] == 0
        assert len(data['results']) == 2
    
    def test_scrape_without_dates(self, client):
        """日付なしリクエストのテスト"""
        # Content-Typeを明示的に指定
        response = client.post('/scrape',
                             json={},
                             content_type='application/json')
        data = json.loads(response.data)
        
        assert response.status_code == 400
        assert data['status'] == 'error'
        assert 'At least one date is required' in data['message']
    
    def test_scrape_with_past_date(self, client):
        """過去日付のバリデーションテスト"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        
        response = client.post(f'/scrape?date={yesterday}')
        data = json.loads(response.data)
        
        assert response.status_code == 400
        assert data['status'] == 'error'
        assert '過去の日付は指定できません' in data['message']
    
    def test_scrape_with_invalid_date_format(self, client):
        """無効な日付形式のテスト"""
        response = client.post('/scrape?date=2025.11.15')
        data = json.loads(response.data)
        
        assert response.status_code == 400
        assert data['status'] == 'error'
        assert 'Invalid date format' in data['message']
    
    def test_scrape_with_slash_date_format_rejected(self, client):
        """スラッシュ区切り日付形式が拒否されることのテスト"""
        # APIはYYYY-MM-DD形式のみを受け付ける仕様
        slash_date = '2025/11/15'
        
        # スラッシュ形式でリクエスト
        response = client.post('/scrape',
                             json={'dates': [slash_date]},
                             content_type='application/json')
        data = json.loads(response.data)
        
        # 400エラーが返される
        assert response.status_code == 400
        assert data['status'] == 'error'
        assert 'Invalid date format' in data['message']
        assert 'Use YYYY-MM-DD' in data['message']


class TestErrorHandling:
    """エラーハンドリングのテスト"""
    
    @patch('src.entrypoints.flask_api.scraper')
    def test_scraper_error_handling(self, mock_scraper, client):
        """スクレイパーエラー時の処理テスト"""
        # スクレイパーがエラーを返す
        mock_scraper.scrape_and_save.return_value = {
            'status': 'error',
            'error_type': 'NO_DATA_FOUND',
            'message': 'No data found for the specified date'
        }
        
        response = client.post('/scrape?date=2025-11-15')
        data = json.loads(response.data)
        
        # 全て失敗した場合は500を返す
        assert response.status_code == 500
        assert data['status'] == 'partial'
        assert data['error_count'] == 1
        assert data['results'][0]['status'] == 'error'
        assert data['results'][0]['error_type'] == 'NO_DATA_FOUND'
    
    @patch('src.entrypoints.flask_api.scraper')
    def test_playwright_error_handling(self, mock_scraper, client):
        """Playwrightエラー時の処理テスト"""
        from playwright.sync_api import Error as PlaywrightError
        
        # Playwrightエラーを発生させる
        mock_scraper.scrape_and_save.side_effect = PlaywrightError(
            "Executable doesn't exist at /path/to/chromium"
        )
        
        response = client.post('/scrape?date=2025-11-15')
        data = json.loads(response.data)
        
        assert response.status_code == 500  # 全て失敗
        assert data['status'] == 'partial'
        assert data['error_count'] == 1
        assert data['results'][0]['error_type'] == 'BROWSER_NOT_INSTALLED'
    
    @patch('src.entrypoints.flask_api.scraper')
    def test_network_error_handling(self, mock_scraper, client):
        """ネットワークエラー時の処理テスト"""
        # ConnectionErrorを発生させる
        mock_scraper.scrape_and_save.side_effect = ConnectionError(
            "Failed to connect to website"
        )
        
        response = client.post('/scrape?date=2025-11-15')
        data = json.loads(response.data)
        
        assert response.status_code == 500
        assert data['status'] == 'partial'
        assert data['error_count'] == 1
        assert data['results'][0]['error_type'] == 'NETWORK_ERROR'
    
    @patch('src.entrypoints.flask_api.scraper')
    def test_generic_exception_handling(self, mock_scraper, client):
        """一般的な例外の処理テスト"""
        # 一般的な例外を発生させる
        mock_scraper.scrape_and_save.side_effect = Exception(
            "Unexpected error occurred"
        )
        
        response = client.post('/scrape?date=2025-11-15')
        data = json.loads(response.data)
        
        assert response.status_code == 500
        assert data['status'] == 'partial'
        assert data['error_count'] == 1
        assert data['results'][0]['error_type'] == 'SCRAPING_ERROR'
        assert data['results'][0]['error_class'] == 'Exception'
    
    @patch('src.entrypoints.flask_api.scraper')
    def test_partial_success(self, mock_scraper, client):
        """部分的成功のテスト"""
        # 1つ目は成功、2つ目は失敗
        mock_scraper.scrape_and_save.side_effect = [
            {
                'status': 'success',
                'data': {
                    '2025-11-15': [
                        {'facilityName': 'スタジオ', 'timeSlots': {}}
                    ]
                }
            },
            {
                'status': 'error',
                'error_type': 'NO_DATA_FOUND',
                'message': 'No data found'
            }
        ]
        
        response = client.post('/scrape?date=2025-11-15&date=2025-11-16')
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert data['status'] == 'partial'
        assert data['success_count'] == 1
        assert data['error_count'] == 1
        assert data['results'][0]['status'] == 'success'
        assert data['results'][1]['status'] == 'error'


class TestRequestFormats:
    """リクエストフォーマットのテスト"""
    
    @patch('src.entrypoints.flask_api.scraper')
    def test_triggered_by_parameter(self, mock_scraper, client):
        """triggeredByパラメータのテスト"""
        mock_scraper.scrape_and_save.return_value = {
            'status': 'success',
            'data': {'2025-11-15': []}
        }
        
        # クエリパラメータで指定
        response = client.post('/scrape?date=2025-11-15&triggeredBy=timer')
        data = json.loads(response.data)
        
        assert data['triggeredBy'] == 'timer'
        
        # JSONボディで指定
        response = client.post('/scrape',
                             json={'dates': ['2025-11-15'], 'triggeredBy': 'manual'},
                             content_type='application/json')
        data = json.loads(response.data)
        
        assert data['triggeredBy'] == 'manual'
    
    @patch('src.entrypoints.flask_api.scraper')
    def test_query_params_precedence(self, mock_scraper, client):
        """クエリパラメータがJSONボディより優先されることのテスト"""
        mock_scraper.scrape_and_save.return_value = {
            'status': 'success',
            'data': {'2025-11-15': []}
        }
        
        # クエリパラメータとJSONボディの両方を送信
        response = client.post('/scrape?date=2025-11-15',
                             json={'dates': ['2025-11-16', '2025-11-17']},
                             content_type='application/json')
        data = json.loads(response.data)
        
        # クエリパラメータの日付が使用される
        assert data['total_dates'] == 1
        assert data['results'][0]['date'] == '2025-11-15'


class TestDebugMode:
    """デバッグモードのテスト"""
    
    @patch('src.entrypoints.flask_api.scraper')
    @patch.dict(os.environ, {'DEBUG': 'true'})
    def test_debug_mode_traceback(self, mock_scraper, client):
        """デバッグモード時にトレースバックが含まれることのテスト"""
        # 例外を発生させる
        mock_scraper.scrape_and_save.side_effect = Exception("Test error")
        
        response = client.post('/scrape?date=2025-11-15')
        data = json.loads(response.data)
        
        assert 'traceback' in data['results'][0]
        assert 'Test error' in data['results'][0]['details']
    
    @patch('src.entrypoints.flask_api.scraper')
    @patch.dict(os.environ, {'DEBUG': 'false'})
    def test_production_mode_no_traceback(self, mock_scraper, client):
        """本番モード時にトレースバックが含まれないことのテスト"""
        # 例外を発生させる
        mock_scraper.scrape_and_save.side_effect = Exception("Test error")
        
        response = client.post('/scrape?date=2025-11-15')
        data = json.loads(response.data)
        
        assert 'traceback' not in data['results'][0]
        assert 'Test error' in data['results'][0]['details']


class TestEnsembleEndpoint:
    """あんさんぶるスタジオ専用エンドポイントのテスト"""
    
    def test_get_ensemble_with_target_date(self, client):
        """GETリクエストでtarget_dateを使用するテスト"""
        # get_services関数をモック化
        with patch('src.entrypoints.flask_api.get_services') as mock_get_services:
            # モックサービスを作成
            mock_target_service = Mock()
            mock_scrape_service = Mock()
            mock_target_service.get_single_date_to_scrape.return_value = '2025-11-20'
            mock_scrape_service.scrape_facility.return_value = {
                'status': 'success',
                'data': {'2025-11-20': [{'facilityName': 'ensemble', 'timeSlots': {}}]}
            }
            mock_get_services.return_value = (mock_target_service, mock_scrape_service)
            
            response = client.get('/scrape/ensemble')
            data = json.loads(response.data)
            
            assert response.status_code == 200
            assert data['status'] == 'success'
            assert data['facility'] == 'ensemble'
            assert data['date'] == '2025-11-20'
            assert data['source'] == 'target_date'
    
    def test_post_ensemble_with_date(self, client):
        """POSTリクエストで日付指定するテスト"""
        # get_services関数をモック化
        with patch('src.entrypoints.flask_api.get_services') as mock_get_services:
            # モックサービスを作成
            mock_scrape_service = Mock()
            mock_scrape_service.scrape_facility.return_value = {
                'status': 'success',
                'data': {'2025-11-15': [{'facilityName': 'ensemble', 'timeSlots': {}}]}
            }
            mock_get_services.return_value = (Mock(), mock_scrape_service)
            
            response = client.post('/scrape/ensemble?date=2025-11-15')
            data = json.loads(response.data)
            
            assert response.status_code == 200
            assert data['status'] == 'success'
            assert data['facility'] == 'ensemble'
            assert data['date'] == '2025-11-15'
            assert data['source'] == 'request'
    
    def test_post_ensemble_without_date(self, client):
        """POSTリクエストで日付なしエラーテスト"""
        response = client.post('/scrape/ensemble', 
                                content_type='application/json',
                                data='{}')
        data = json.loads(response.data)
        
        assert response.status_code == 400
        assert data['status'] == 'error'
        assert 'Date is required' in data['message']
    
    def test_post_ensemble_with_past_date(self, client):
        """POSTリクエストで過去日付エラーテスト"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        
        response = client.post(f'/scrape/ensemble?date={yesterday}')
        data = json.loads(response.data)
        
        assert response.status_code == 400
        assert data['status'] == 'error'
        assert '過去の日付' in data['message']


if __name__ == '__main__':
    pytest.main([__file__, '-v'])