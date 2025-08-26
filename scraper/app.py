"""
Azure Web Apps entry point for Scraper
Flask application for triggering scraper via HTTP
"""

import os
import sys
import json
import logging
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
                logger.info(f"Scraping date: {date}")
                result = scraper.scrape_and_save(date)
                
                if result and result.get('status') == 'success':
                    success_count += 1
                    results.append({
                        'date': date,
                        'status': 'success',
                        'facilities': len(result.get('data', {}).get(date, []))
                    })
                else:
                    error_count += 1
                    results.append({
                        'date': date,
                        'status': 'error',
                        'message': result.get('message', 'Unknown error')
                    })
                    
            except Exception as e:
                logger.error(f"Error scraping {date}: {str(e)}")
                error_count += 1
                results.append({
                    'date': date,
                    'status': 'error',
                    'message': str(e)
                })
        
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
        
        return jsonify(response), 200
        
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