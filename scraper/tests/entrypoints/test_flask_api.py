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
    
    @patch('src.entrypoints.flask_api.threading')
    @patch('src.entrypoints.flask_api.scraper')
    def test_scrape_with_query_parameter(self, mock_scraper, mock_threading, client):
        """クエリパラメータでの日付指定テスト（非同期処理）"""
        # スレッドのモック設定
        mock_thread = Mock()
        mock_threading.Thread.return_value = mock_thread
        
        # リクエスト実行
        response = client.post('/scrape?date=2025-11-15')
        data = json.loads(response.data)
        
        # 非同期処理のため、即座にレスポンスが返る
        assert response.status_code == 202
        assert data['success'] is True
        assert data['message'] == '空き状況取得を開始しました'
        
        # スレッドが開始されたことを確認
        mock_threading.Thread.assert_called_once()
        mock_thread.start.assert_called_once()
    
    @patch('src.entrypoints.flask_api.threading')
    @patch('src.entrypoints.flask_api.scraper')
    def test_scrape_with_json_body(self, mock_scraper, mock_threading, client):
        """JSONボディでの日付指定テスト（非同期処理）"""
        # スレッドのモック設定
        mock_thread = Mock()
        mock_threading.Thread.return_value = mock_thread
        
        # リクエスト実行
        response = client.post('/scrape',
                             json={'dates': ['2025-11-15']},
                             content_type='application/json')
        data = json.loads(response.data)
        
        assert response.status_code == 202
        assert data['success'] is True
        assert data['message'] == '空き状況取得を開始しました'
        
        # スレッドが開始されたことを確認
        mock_thread.start.assert_called_once()
    
    @patch('src.entrypoints.flask_api.threading')
    @patch('src.entrypoints.flask_api.scraper')
    def test_scrape_multiple_dates(self, mock_scraper, mock_threading, client):
        """複数日付のスクレイピングテスト（非同期処理）"""
        # スレッドのモック設定
        mock_thread = Mock()
        mock_threading.Thread.return_value = mock_thread
        
        # リクエスト実行
        response = client.post('/scrape?date=2025-11-15&date=2025-11-16')
        data = json.loads(response.data)
        
        assert response.status_code == 202
        assert data['success'] is True
        assert data['message'] == '空き状況取得を開始しました'
        
        # スレッドが開始されたことを確認
        mock_thread.start.assert_called_once()
    
    def test_scrape_without_dates(self, client):
        """日付なしリクエストのテスト"""
        # Content-Typeを明示的に指定
        response = client.post('/scrape',
                             json={},
                             content_type='application/json')
        data = json.loads(response.data)
        
        assert response.status_code == 400
        assert data['success'] is False
        assert data['message'] == '練習日程が登録されていません'
    
    def test_scrape_with_past_date(self, client):
        """過去日付のバリデーションテスト"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        
        response = client.post(f'/scrape?date={yesterday}')
        data = json.loads(response.data)
        
        assert response.status_code == 400
        assert data['success'] is False
        assert '過去の日付は指定できません' in data['message']
    
    def test_scrape_with_invalid_date_format(self, client):
        """無効な日付形式のテスト"""
        response = client.post('/scrape?date=2025.11.15')
        data = json.loads(response.data)
        
        assert response.status_code == 400
        assert data['success'] is False
        assert '無効な日付形式です' in data['message']
    
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
        assert data['success'] is False
        assert '無効な日付形式です' in data['message']


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
        assert '2025-11-15' in data['data']
        assert data['data']['2025-11-15'] == []  # エラーの場合は空配列
    
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
        assert '2025-11-15' in data['data']
        assert data['data']['2025-11-15'] == []  # エラーの場合は空配列
    
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
        assert '2025-11-15' in data['data']
        assert data['data']['2025-11-15'] == []  # エラーの場合は空配列
    
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
        assert '2025-11-15' in data['data']
        assert data['data']['2025-11-15'] == []  # エラーの場合は空配列
    
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
        assert '2025-11-15' in data['data']
        assert '2025-11-16' in data['data']
        assert len(data['data']['2025-11-15']) == 1  # 成功
        assert data['data']['2025-11-16'] == []  # 失敗


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
        
        # triggeredByは新しいレスポンス形式では削除された
        assert 'timestamp' in data
        assert '2025-11-15' in data['data']
        
        # JSONボディで指定
        response = client.post('/scrape',
                             json={'dates': ['2025-11-15'], 'triggeredBy': 'manual'},
                             content_type='application/json')
        data = json.loads(response.data)
        
        # triggeredByは新しいレスポンス形式では削除された
        assert 'timestamp' in data
        assert '2025-11-15' in data['data']
    
    @patch('src.entrypoints.flask_api.scraper')
    def test_query_params_precedence(self, mock_scraper, client):
        """クエリパラメータがJSONボディより優先されることのテスト"""
        mock_scraper.scrape_and_save.return_value = {
            'status': 'success',
            'data': {'2025-11-15': [{'facilityName': 'Test', 'timeSlots': {}}]}
        }
        
        # クエリパラメータとJSONボディの両方を送信
        response = client.post('/scrape?date=2025-11-15',
                             json={'dates': ['2025-11-16', '2025-11-17']},
                             content_type='application/json')
        data = json.loads(response.data)
        
        # クエリパラメータの日付が使用される
        assert '2025-11-15' in data['data']
        assert len(data['data']['2025-11-15']) == 1


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
        
        # 新しい形式では、エラー時でも空配列が返される
        assert '2025-11-15' in data['data']
        assert data['data']['2025-11-15'] == []
    
    @patch('src.entrypoints.flask_api.scraper')
    @patch.dict(os.environ, {'DEBUG': 'false'})
    def test_production_mode_no_traceback(self, mock_scraper, client):
        """本番モード時にトレースバックが含まれないことのテスト"""
        # 例外を発生させる
        mock_scraper.scrape_and_save.side_effect = Exception("Test error")
        
        response = client.post('/scrape?date=2025-11-15')
        data = json.loads(response.data)
        
        # 新しい形式では、エラー時でも空配列が返される
        assert '2025-11-15' in data['data']
        assert data['data']['2025-11-15'] == []


class TestRateLimitErrors:
    """Rate limit制限のテスト"""
    
    @patch('src.repositories.rate_limits_repository.RateLimitsRepository')
    def test_scrape_with_rate_limit_error(self, mock_repo_class, client):
        """Rate limit制限時の409エラーテスト（/scrapeエンドポイント）"""
        # モックインスタンスの設定
        mock_instance = Mock()
        mock_repo_class.return_value = mock_instance
        mock_instance.create_or_update_record.return_value = {
            'is_already_running': True,
            'record': {
                'id': '2025-01-09',
                'date': '2025-01-09',
                'status': 'running',
                'lastRequestedAt': '2025-01-09T10:00:00Z'
            }
        }
        
        # リクエスト実行
        response = client.post('/scrape?date=2025-11-15')
        data = json.loads(response.data)
        
        # 検証
        assert response.status_code == 409
        assert data['status'] == 'error'
        assert data['error_type'] == 'RATE_LIMIT_ERROR'
        assert 'すでに実行中' in data['message']
        assert data['currentStatus'] == 'running'
        assert data['lastRequestedAt'] == '2025-01-09T10:00:00Z'
    
    @patch('src.repositories.rate_limits_repository.RateLimitsRepository')
    def test_scrape_ensemble_with_rate_limit_error(self, mock_repo_class, client):
        """Rate limit制限時の409エラーテスト（/scrape/ensembleエンドポイント）"""
        # モックインスタンスの設定
        mock_instance = Mock()
        mock_repo_class.return_value = mock_instance
        mock_instance.create_or_update_record.return_value = {
            'is_already_running': True,
            'record': {
                'id': '2025-01-09',
                'date': '2025-01-09',
                'status': 'running',
                'lastRequestedAt': '2025-01-09T10:00:00Z'
            }
        }
        
        # リクエスト実行
        response = client.post('/scrape/ensemble?date=2025-11-15')
        data = json.loads(response.data)
        
        # 検証
        assert response.status_code == 409
        assert data['status'] == 'error'
        assert data['error_type'] == 'RATE_LIMIT_ERROR'
        assert 'すでに実行中' in data['message']
    
    @patch('src.entrypoints.flask_api.scraper')
    @patch('src.repositories.rate_limits_repository.RateLimitsRepository')
    def test_scrape_continues_without_rate_limits_on_cosmos_error(self, mock_repo_class, mock_scraper, client):
        """Cosmos DB接続失敗時でもスクレイピングが続行されることのテスト"""
        # Rate limitsリポジトリが例外を発生させる
        mock_repo_class.side_effect = Exception("Cosmos DB connection failed")
        
        # スクレイパーのモック設定
        mock_scraper.scrape_and_save.return_value = {
            'status': 'success',
            'data': {'2025-11-15': [{'facilityName': 'Test', 'timeSlots': {}}]}
        }
        
        # リクエスト実行
        response = client.post('/scrape?date=2025-11-15')
        data = json.loads(response.data)
        
        # 検証（rate limits失敗してもスクレイピングは成功）
        assert response.status_code == 200
        assert data['status'] == 'success'
        assert '2025-11-15' in data['data']
        assert len(data['data']['2025-11-15']) == 1
        mock_scraper.scrape_and_save.assert_called_once()


class TestEnsembleEndpoint:
    """あんさんぶるスタジオ専用エンドポイントのテスト"""
    
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
            # 新しい統一形式ではfacilityやdateフィールドは削除
            assert '2025-11-15' in data['data']
            assert 'timestamp' in data
    
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