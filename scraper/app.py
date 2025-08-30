"""
Azure Web Apps entry point for Scraper
Flask application for triggering scraper via HTTP
"""

import os
import sys
import json
import logging
import traceback
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent))

from src.scraper import EnsembleStudioScraper

# Initialize Flask app
app = Flask(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize scraper
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
    try:
        # 1. Try query parameters first
        dates = request.args.getlist('date')
        
        # 2. If no query params, check JSON body
        if not dates:
            data = request.get_json() or {}
            dates = data.get('dates', [])
            triggered_by = data.get('triggeredBy', 'manual')
        else:
            triggered_by = request.args.get('triggeredBy', 'manual')
        
        # 3. Validate dates are provided
        if not dates:
            logger.warning("No dates provided in request")
            return jsonify({
                'status': 'error',
                'message': 'At least one date is required. Use query parameter ?date=YYYY-MM-DD or JSON body {"dates": ["YYYY-MM-DD"]}',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Validate date formats
        for date in dates:
            try:
                datetime.strptime(date, '%Y-%m-%d')
            except ValueError:
                return jsonify({
                    'status': 'error',
                    'message': f'Invalid date format: {date}. Use YYYY-MM-DD',
                    'timestamp': datetime.now().isoformat()
                }), 400
        
        logger.info(f"Scraper triggered by: {triggered_by}")
        logger.info(f"Scraping {len(dates)} dates: {dates}")
        
        # Execute scraping for each date
        results = []
        success_count = 0
        error_count = 0
        
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
                    raise ValueError(f"Date must be in YYYY-MM-DD or YYYY/MM/DD format, got: {date}")
                
                logger.info(f"Scraping date: {normalized_date}")
                result = scraper.scrape_and_save(normalized_date)
                
                if result and result.get('status') == 'success':
                    success_count += 1
                    results.append({
                        'date': normalized_date,
                        'status': 'success',
                        'facilities': len(result.get('data', {}).get(normalized_date, []))
                    })
                else:
                    error_count += 1
                    error_info = {
                        'date': normalized_date,
                        'status': 'error',
                        'error_type': result.get('error_type', 'SCRAPING_ERROR'),
                        'message': result.get('message', 'Unknown error')
                    }
                    if result.get('details'):
                        error_info['details'] = result.get('details')
                    results.append(error_info)
                    
            except ValueError as e:
                # 日付フォーマットエラー
                logger.error(f"Invalid date format {date}: {str(e)}")
                error_count += 1
                results.append({
                    'date': date,
                    'status': 'error',
                    'error_type': 'INVALID_DATE_FORMAT',
                    'message': f'Invalid date format. Expected YYYY-MM-DD or YYYY/MM/DD, got: {date}',
                    'details': str(e)
                })
            except ConnectionError as e:
                # ネットワークエラー
                logger.error(f"Network error for {date}: {str(e)}")
                error_count += 1
                results.append({
                    'date': date,
                    'status': 'error',
                    'error_type': 'NETWORK_ERROR',
                    'message': 'Failed to connect to target website',
                    'details': str(e)
                })
            except Exception as e:
                # その他のエラー
                logger.error(f"Error scraping {date}: {str(e)}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                error_count += 1
                error_details = {
                    'date': date,
                    'status': 'error',
                    'error_type': 'SCRAPING_ERROR',
                    'message': 'Failed to scrape data',
                    'details': str(e),
                    'error_class': e.__class__.__name__
                }
                # デバッグモードの場合はトレースバックを含める
                if app.debug or os.environ.get('DEBUG', '').lower() == 'true':
                    error_details['traceback'] = traceback.format_exc()
                results.append(error_details)
        
        # Summary response
        response = {
            'status': 'success' if error_count == 0 else 'partial',
            'timestamp': datetime.now().isoformat(),
            'triggeredBy': triggered_by,
            'total_dates': len(dates),
            'success_count': success_count,
            'error_count': error_count,
            'results': results
        }
        
        logger.info(f"Scraping completed: {success_count}/{len(dates)} successful")
        
        # HTTPステータスコードの決定
        if error_count == len(dates):
            # 全て失敗した場合
            status_code = 500
        elif any(r.get('error_type') == 'INVALID_DATE_FORMAT' for r in results):
            # バリデーションエラーがある場合
            status_code = 400
        else:
            # 成功または部分的成功
            status_code = 200
            
        return jsonify(response), status_code
        
    except Exception as e:
        logger.error(f"Fatal error in scrape endpoint: {str(e)}")
        return jsonify({
            'status': 'error',
            'timestamp': datetime.now().isoformat(),
            'error': str(e)
        }), 500


# Single date endpoint removed - use POST /scrape?date=YYYY-MM-DD instead


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