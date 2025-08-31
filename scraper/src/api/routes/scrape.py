"""
Scraping API endpoints
"""
import logging
from flask import Blueprint, request, jsonify, g
from ...domain.entities import FacilityType
from ...services.scraper_service import ScraperService
from ...domain.exceptions import ValidationError


logger = logging.getLogger(__name__)
scrape_bp = Blueprint('scrape', __name__)


@scrape_bp.route('/scrape/ensemble', methods=['POST'])
def scrape_ensemble():
    """
    Scrape Ensemble Studio
    
    Query Parameters:
        date: Specific date to scrape (YYYY-MM-DD)
    
    If no date is provided, uses target dates from Cosmos DB
    """
    try:
        # Get date from query parameter
        date = request.args.get('date')
        dates = [date] if date else None
        
        # Get triggered by info
        triggered_by = request.args.get('triggeredBy', 'manual')
        
        logger.info(f"Ensemble scraping triggered by: {triggered_by}")
        
        # Create service and scrape
        service = ScraperService()
        results = service.scrape_facility(FacilityType.ENSEMBLE_STUDIO, dates)
        
        # Build response
        success_count = sum(1 for r in results if r.status == 'success')
        error_count = sum(1 for r in results if r.status == 'error')
        
        response = {
            'status': 'success' if error_count == 0 else 'partial',
            'timestamp': g.get('timestamp'),
            'triggeredBy': triggered_by,
            'facilityType': FacilityType.ENSEMBLE_STUDIO.value,
            'totalDates': len(results),
            'successCount': success_count,
            'errorCount': error_count,
            'results': [r.to_dict() for r in results]
        }
        
        # Determine status code
        if error_count == len(results):
            status_code = 500
        elif any(r.error_type == 'VALIDATION_ERROR' for r in results):
            status_code = 400
        else:
            status_code = 200
        
        return jsonify(response), status_code
        
    except ValidationError as e:
        logger.warning(f"Validation error: {e.message}")
        return jsonify({
            'status': 'error',
            'error': 'Validation Error',
            'message': e.message,
            'timestamp': g.get('timestamp')
        }), 400
    except Exception as e:
        logger.error(f"Unexpected error in scrape_ensemble: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'timestamp': g.get('timestamp')
        }), 500


@scrape_bp.route('/scrape', methods=['POST'])
def scrape_all():
    """
    Scrape all supported facilities
    
    Query Parameters:
        date: Specific date to scrape (YYYY-MM-DD)
    
    If no date is provided, uses target dates from Cosmos DB
    """
    try:
        # Get date from query parameter
        date = request.args.get('date')
        dates = [date] if date else None
        
        # Get triggered by info
        triggered_by = request.args.get('triggeredBy', 'manual')
        
        logger.info(f"All facilities scraping triggered by: {triggered_by}")
        
        # Create service and scrape
        service = ScraperService()
        all_results = service.scrape_all_facilities(dates)
        
        # Build summary
        total_success = 0
        total_error = 0
        facility_summaries = []
        
        for facility_type, results in all_results.items():
            success_count = sum(1 for r in results if r.status == 'success')
            error_count = sum(1 for r in results if r.status == 'error')
            total_success += success_count
            total_error += error_count
            
            facility_summaries.append({
                'facilityType': facility_type,
                'successCount': success_count,
                'errorCount': error_count,
                'results': [r.to_dict() for r in results]
            })
        
        response = {
            'status': 'success' if total_error == 0 else 'partial',
            'timestamp': g.get('timestamp'),
            'triggeredBy': triggered_by,
            'totalSuccess': total_success,
            'totalError': total_error,
            'facilities': facility_summaries
        }
        
        # Determine status code
        if total_error > 0 and total_success == 0:
            status_code = 500
        else:
            status_code = 200
        
        return jsonify(response), status_code
        
    except ValidationError as e:
        logger.warning(f"Validation error: {e.message}")
        return jsonify({
            'status': 'error',
            'error': 'Validation Error',
            'message': e.message,
            'timestamp': g.get('timestamp')
        }), 400
    except Exception as e:
        logger.error(f"Unexpected error in scrape_all: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'timestamp': g.get('timestamp')
        }), 500


@scrape_bp.route('/scrape/status', methods=['GET'])
def scrape_status():
    """Get scraper status and supported facilities"""
    from ...scrapers.factory import ScraperFactory
    
    supported_facilities = [ft.value for ft in ScraperFactory.get_supported_types()]
    
    return jsonify({
        'status': 'ready',
        'supportedFacilities': supported_facilities,
        'timestamp': g.get('timestamp')
    }), 200