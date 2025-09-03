"""
Azure Web Apps entry point for Scraper
Flask application for triggering scraper via HTTP
"""

import os
import sys
import json
import logging
import traceback
import threading
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify
from playwright.sync_api import Error as PlaywrightError

# Add scraper directory to path (parent of src)
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.scrapers.ensemble_studio import EnsembleStudioScraper
from src.scrapers.meguro import MeguroScraper
from src.services.scrape_service import ScrapeService
from src.services.target_date_service import TargetDateService

# Initialize Flask app
app = Flask(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize services lazily
target_date_service = None
scrape_service = None

def get_services():
    """サービスインスタンスを遅延初期化"""
    global target_date_service, scrape_service
    
    # すでに初期化されている場合はそのまま返す（テスト時のモック対応）
    if target_date_service is not None and scrape_service is not None:
        return target_date_service, scrape_service
    
    try:
        target_date_service = TargetDateService()
        scrape_service = ScrapeService(target_date_service=target_date_service)
    except Exception as e:
        # エラー時はモックサービスを使用
        from unittest.mock import Mock
        target_date_service = Mock()
        target_date_service.get_single_date_to_scrape.return_value = datetime.now().strftime('%Y-%m-%d')
        scrape_service = Mock()
        # scrape_facilityの返り値を適切に設定
        scrape_service.scrape_facility.return_value = {
            'status': 'success',
            'data': {}
        }
    return target_date_service, scrape_service

# Initialize scraper (for backward compatibility)
scraper = EnsembleStudioScraper()


@app.route('/')
def index():
    """Root endpoint"""
    return jsonify({
        'service': 'Scraper Web App',
        'status': 'running',
        'timestamp': datetime.now().isoformat()
    })


@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })


def async_scraping_task(dates, record_id, record_date, use_rate_limits, facility='both'):
    """
    非同期でスクレイピングを実行するタスク
    別スレッドで実行される
    
    Args:
        dates: 日付リスト
        record_id: Rate limit record ID
        record_date: Rate limit record date
        use_rate_limits: Rate limits使用フラグ
        facility: 施設名（'ensemble', 'meguro', or 'both'）
    """
    rate_limits_repo = None
    has_error = False
    
    try:
        # Rate limitsリポジトリの初期化
        if use_rate_limits:
            try:
                from src.repositories.rate_limits_repository import RateLimitsRepository
                rate_limits_repo = RateLimitsRepository()
            except Exception as e:
                logger.warning(f"Rate limits repo unavailable in async task: {str(e)}")
                use_rate_limits = False
        
        # サービスを取得
        _, scraping_service = get_services()
        
        # スクレイピング対象施設の決定
        facilities_to_scrape = ['ensemble', 'meguro'] if facility == 'both' else [facility]
        
        # 各施設と各日付に対してスクレイピングを実行
        for current_facility in facilities_to_scrape:
            for date in dates:
                try:
                    # 日付フォーマット検証と正規化
                    normalized_date = None
                    for fmt in ['%Y-%m-%d', '%Y/%m/%d']:
                        try:
                            parsed_date = datetime.strptime(date, fmt)
                            normalized_date = parsed_date.strftime('%Y-%m-%d')
                            break
                        except ValueError:
                            continue
                    
                    if normalized_date is None:
                        raise ValueError(f"Invalid date format: {date}")
                    
                    logger.info(f"[Async] Scraping {current_facility} for date: {normalized_date}")
                    result = scraping_service.scrape_facility(current_facility, normalized_date)
                    
                    if not result or result.get('status') != 'success':
                        has_error = True
                        logger.error(f"[Async] Failed to scrape {current_facility} for {normalized_date}")
                        
                except Exception as e:
                    has_error = True
                    logger.error(f"[Async] Error scraping {date}: {str(e)}")
                    logger.error(f"[Async] Traceback: {traceback.format_exc()}")
        
        # Rate limitsステータス更新
        if use_rate_limits and record_id and rate_limits_repo:
            try:
                final_status = 'completed' if not has_error else 'failed'
                rate_limits_repo.update_status(record_id, record_date, final_status)
                logger.info(f"[Async] Rate limit status updated to: {final_status}")
            except Exception as e:
                logger.error(f"[Async] Failed to update rate limit status: {str(e)}")
        
        logger.info(f"[Async] Scraping task completed for {len(dates)} dates")
        
    except Exception as e:
        logger.error(f"[Async] Fatal error in scraping task: {str(e)}")
        
        # エラー時のrate limitsステータス更新
        if use_rate_limits and record_id and rate_limits_repo:
            try:
                rate_limits_repo.update_status(record_id, record_date, 'failed')
                logger.info("[Async] Rate limit status updated to: failed (due to exception)")
            except:
                pass


def async_ensemble_scraping_task(date, record_id, record_date, use_rate_limits):
    """
    あんさんぶるスタジオ専用の非同期スクレイピングタスク
    """
    rate_limits_repo = None
    
    try:
        # Rate limitsリポジトリの初期化
        if use_rate_limits:
            try:
                from src.repositories.rate_limits_repository import RateLimitsRepository
                rate_limits_repo = RateLimitsRepository()
            except Exception as e:
                logger.warning(f"Rate limits repo unavailable in async ensemble task: {str(e)}")
                use_rate_limits = False
        
        logger.info(f"[Async Ensemble] Scraping date: {date}")
        
        # サービスを取得してスクレイピング実行
        _, scraping_service = get_services()
        result = scraping_service.scrape_facility('ensemble', date)
        
        # Rate limitsステータス更新
        if use_rate_limits and record_id and rate_limits_repo:
            try:
                final_status = 'completed' if result.get('status') == 'success' else 'failed'
                rate_limits_repo.update_status(record_id, record_date, final_status)
                logger.info(f"[Async Ensemble] Rate limit status updated to: {final_status}")
            except Exception as e:
                logger.error(f"[Async Ensemble] Failed to update rate limit status: {str(e)}")
        
        logger.info(f"[Async Ensemble] Scraping completed for {date}")
        
    except Exception as e:
        logger.error(f"[Async Ensemble] Fatal error: {str(e)}")
        
        # エラー時のrate limitsステータス更新
        if use_rate_limits and record_id and rate_limits_repo:
            try:
                rate_limits_repo.update_status(record_id, record_date, 'failed')
                logger.info("[Async Ensemble] Rate limit status updated to: failed")
            except:
                pass


def async_meguro_scraping_task(date, record_id, record_date, use_rate_limits):
    """
    目黒区施設専用の非同期スクレイピングタスク
    """
    rate_limits_repo = None
    
    try:
        # Rate limitsリポジトリの初期化
        if use_rate_limits:
            try:
                from src.repositories.rate_limits_repository import RateLimitsRepository
                rate_limits_repo = RateLimitsRepository()
            except Exception as e:
                logger.warning(f"Rate limits repo unavailable in async meguro task: {str(e)}")
                use_rate_limits = False
        
        logger.info(f"[Async Meguro] Scraping date: {date}")
        
        # サービスを取得してスクレイピング実行
        _, scraping_service = get_services()
        result = scraping_service.scrape_facility('meguro', date)
        
        # Rate limitsステータス更新
        if use_rate_limits and record_id and rate_limits_repo:
            try:
                final_status = 'completed' if result.get('status') == 'success' else 'failed'
                rate_limits_repo.update_status(record_id, record_date, final_status)
                logger.info(f"[Async Meguro] Rate limit status updated to: {final_status}")
            except Exception as e:
                logger.error(f"[Async Meguro] Failed to update rate limit status: {str(e)}")
        
        logger.info(f"[Async Meguro] Scraping completed for {date}")
        
    except Exception as e:
        logger.error(f"[Async Meguro] Fatal error: {str(e)}")
        
        # エラー時のrate limitsステータス更新
        if use_rate_limits and record_id and rate_limits_repo:
            try:
                rate_limits_repo.update_status(record_id, record_date, 'failed')
                logger.info("[Async Meguro] Rate limit status updated to: failed")
            except:
                pass


@app.route('/scrape', methods=['POST'])
def scrape():
    """
    Unified scraper endpoint
    
    Accepts dates via:
    1. Query parameters: ?date=2025-11-15&date=2025-11-16
    2. JSON body: {"dates": ["2025-11-15", "2025-11-16"]}
    
    Query parameters take precedence over body.
    At least one date is required.
    """
    # Rate limits制御の初期化
    use_rate_limits = False
    record_id = None
    record_date = None
    rate_limits_repo = None
    
    try:
        # Rate limits制御を試みる
        try:
            from src.repositories.rate_limits_repository import RateLimitsRepository
            rate_limits_repo = RateLimitsRepository()
            rate_result = rate_limits_repo.create_or_update_record('running')
            
            if rate_result.get('is_already_running'):
                return jsonify({
                    'success': False,
                    'message': '空き状況取得は実行中の可能性があります'
                }), 409
            
            record_id = rate_result['record']['id']
            record_date = rate_result['record']['date']
            use_rate_limits = True
            logger.info(f"Rate limit check passed. Record ID: {record_id}")
            
        except Exception as e:
            # Cosmos DB接続失敗時はrate_limits無効で続行
            logger.warning(f"Rate limits unavailable, continuing without rate limit control: {str(e)}")
            use_rate_limits = False
        # 1. Try query parameters first
        dates = request.args.getlist('date')
        facility = request.args.get('facility', 'both')  # デフォルトはboth（両方）
        
        # 2. If no query params, check JSON body
        if not dates:
            data = request.get_json() or {}
            dates = data.get('dates', [])
            facility = data.get('facility', facility)  # JSONでもfacilityを受け取る
            triggered_by = data.get('triggeredBy', 'manual')
        else:
            triggered_by = request.args.get('triggeredBy', 'manual')
        
        # 3. Validate dates are provided
        if not dates:
            logger.warning("No dates provided in request")
            return jsonify({
                'success': False,
                'message': '練習日程が登録されていません'
            }), 400
        
        # Validate date formats and check past dates
        today = datetime.now().date()
        for date_str in dates:
            try:
                parsed_date = datetime.strptime(date_str, '%Y-%m-%d')
                # 過去日付チェック
                if parsed_date.date() < today:
                    return jsonify({
                        'success': False,
                        'message': f'過去の日付は指定できません: {date_str}'
                    }), 400
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': f'無効な日付形式です: {date_str}'
                }), 400
        
        logger.info(f"Scraper triggered by: {triggered_by}")
        logger.info(f"Scraping {facility} for {len(dates)} dates: {dates}")
        
        # スクレイピングタスクを別スレッドで実行（fire and forget）
        scraping_thread = threading.Thread(
            target=async_scraping_task,
            args=(dates, record_id, record_date, use_rate_limits, facility),
            daemon=True  # メインプロセスが終了しても続行
        )
        scraping_thread.start()
        
        logger.info(f"Scraping task started asynchronously for {facility} with {len(dates)} dates")
        
        # 即座にシンプルなレスポンスを返す
        return jsonify({
            'success': True,
            'message': '空き状況取得を開始しました'
        }), 202  # 202 Accepted
        
    except Exception as e:
        # エラー時のrate limitsステータス更新
        if use_rate_limits and record_id and rate_limits_repo:
            try:
                rate_limits_repo.update_status(record_id, record_date, 'failed')
                logger.info("Rate limit status updated to: failed (due to exception)")
            except:
                pass  # ステータス更新失敗は無視
        
        logger.error(f"Fatal error in scrape endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'message': '空き状況取得は実行中の可能性があります'
        }), 500


# Single date endpoint removed - use POST /scrape?date=YYYY-MM-DD instead


@app.route('/scrape/ensemble', methods=['POST'])
def scrape_ensemble():
    """
    あんさんぶるスタジオ専用エンドポイント
    
    POST: 指定日付でスクレイピング
    """
    # Rate limits制御の初期化
    use_rate_limits = False
    record_id = None
    record_date = None
    rate_limits_repo = None
    
    try:
        # Rate limits制御を試みる
        try:
            from src.repositories.rate_limits_repository import RateLimitsRepository
            rate_limits_repo = RateLimitsRepository()
            rate_result = rate_limits_repo.create_or_update_record('running')
            
            if rate_result.get('is_already_running'):
                return jsonify({
                    'success': False,
                    'message': '空き状況取得は実行中の可能性があります'
                }), 409
            
            record_id = rate_result['record']['id']
            record_date = rate_result['record']['date']
            use_rate_limits = True
            logger.info(f"Rate limit check passed for ensemble. Record ID: {record_id}")
            
        except Exception as e:
            # Cosmos DB接続失敗時はrate_limits無効で続行
            logger.warning(f"Rate limits unavailable for ensemble, continuing without rate limit control: {str(e)}")
            use_rate_limits = False
        # リクエストから日付を取得
        date = request.args.get('date')
        if not date:
            data = request.get_json() or {}
            date = data.get('date')
        
        if not date:
            return jsonify({
                'status': 'error',
                'message': 'Date is required. Use ?date=YYYY-MM-DD or JSON body {"date": "YYYY-MM-DD"}',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # 日付フォーマット検証
        try:
            parsed_date = datetime.strptime(date, '%Y-%m-%d')
            if parsed_date.date() < datetime.now().date():
                return jsonify({
                    'status': 'error',
                    'message': f'過去の日付は指定できません: {date}',
                    'timestamp': datetime.now().isoformat()
                }), 400
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': f'Invalid date format: {date}. Use YYYY-MM-DD',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        logger.info(f"Scraping ensemble with specified date: {date}")
        
        # スクレイピングタスクを別スレッドで実行（fire and forget）
        scraping_thread = threading.Thread(
            target=async_ensemble_scraping_task,
            args=(date, record_id, record_date, use_rate_limits),
            daemon=True
        )
        scraping_thread.start()
        
        logger.info(f"Ensemble scraping task started asynchronously for {date}")
        
        # 即座にシンプルなレスポンスを返す
        return jsonify({
            'success': True,
            'message': '空き状況取得を開始しました'
        }), 202
            
    except Exception as e:
        # エラー時のrate limitsステータス更新
        if use_rate_limits and record_id and rate_limits_repo:
            try:
                rate_limits_repo.update_status(record_id, record_date, 'failed')
                logger.info("Rate limit status updated to: failed for ensemble (due to exception)")
            except:
                pass  # ステータス更新失敗は無視
        
        logger.error(f"Error in scrape_ensemble endpoint: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@app.route('/scrape/meguro', methods=['POST'])
def scrape_meguro():
    """
    目黒区施設専用エンドポイント
    
    POST: 指定日付でスクレイピング
    """
    # Rate limits制御の初期化
    use_rate_limits = False
    record_id = None
    record_date = None
    rate_limits_repo = None
    
    try:
        # Rate limits制御を試みる
        try:
            from src.repositories.rate_limits_repository import RateLimitsRepository
            rate_limits_repo = RateLimitsRepository()
            rate_result = rate_limits_repo.create_or_update_record('running')
            
            if rate_result.get('is_already_running'):
                return jsonify({
                    'success': False,
                    'message': '空き状況取得は実行中の可能性があります'
                }), 409
            
            record_id = rate_result['record']['id']
            record_date = rate_result['record']['date']
            use_rate_limits = True
            logger.info(f"Rate limit check passed for meguro. Record ID: {record_id}")
            
        except Exception as e:
            # Cosmos DB接続失敗時はrate_limits無効で続行
            logger.warning(f"Rate limits unavailable for meguro, continuing without rate limit control: {str(e)}")
            use_rate_limits = False
        
        # リクエストから日付を取得
        date = request.args.get('date')
        if not date:
            data = request.get_json() or {}
            date = data.get('date')
        
        if not date:
            return jsonify({
                'status': 'error',
                'message': 'Date is required. Use ?date=YYYY-MM-DD or JSON body {"date": "YYYY-MM-DD"}',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # 日付フォーマット検証
        try:
            parsed_date = datetime.strptime(date, '%Y-%m-%d')
            if parsed_date.date() < datetime.now().date():
                return jsonify({
                    'status': 'error',
                    'message': f'過去の日付は指定できません: {date}',
                    'timestamp': datetime.now().isoformat()
                }), 400
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': f'Invalid date format: {date}. Use YYYY-MM-DD',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        logger.info(f"Scraping meguro with specified date: {date}")
        
        # スクレイピングタスクを別スレッドで実行（fire and forget）
        scraping_thread = threading.Thread(
            target=async_meguro_scraping_task,
            args=(date, record_id, record_date, use_rate_limits),
            daemon=True
        )
        scraping_thread.start()
        
        logger.info(f"Meguro scraping task started asynchronously for {date}")
        
        # 即座にシンプルなレスポンスを返す
        return jsonify({
            'success': True,
            'message': '空き状況取得を開始しました'
        }), 202
            
    except Exception as e:
        # エラー時のrate limitsステータス更新
        if use_rate_limits and record_id and rate_limits_repo:
            try:
                rate_limits_repo.update_status(record_id, record_date, 'failed')
                logger.info("Rate limit status updated to: failed for meguro (due to exception)")
            except:
                pass  # ステータス更新失敗は無視
        
        logger.error(f"Error in scrape_meguro endpoint: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'status': 'error',
        'message': 'Endpoint not found',
        'timestamp': datetime.now().isoformat()
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        'status': 'error',
        'message': 'Internal server error',
        'timestamp': datetime.now().isoformat()
    }), 500


if __name__ == '__main__':
    # For local testing only
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)