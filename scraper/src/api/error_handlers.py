"""
Error handlers for Flask application
"""
import logging
from flask import jsonify, g
from ..domain.exceptions import (
    ScraperError,
    ValidationError,
    NetworkError,
    BrowserError,
    DataNotFoundError,
    CosmosDBError,
    PastDateError,
    InvalidDateFormatError,
    FacilityNotSupportedError
)


logger = logging.getLogger(__name__)


def register_error_handlers(app):
    """
    Register error handlers for the Flask application
    
    Args:
        app: Flask application instance
    """
    
    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        """Handle validation errors"""
        logger.warning(f"Validation error: {error.message}")
        return jsonify({
            'status': 'error',
            'error': 'Validation Error',
            'message': error.message,
            'details': error.details,
            'timestamp': g.get('timestamp')
        }), 400
    
    @app.errorhandler(PastDateError)
    def handle_past_date_error(error):
        """Handle past date errors"""
        logger.warning(f"Past date error: {error.message}")
        return jsonify({
            'status': 'error',
            'error': 'Past Date Error',
            'message': error.message,
            'date': error.date,
            'today': error.today,
            'timestamp': g.get('timestamp')
        }), 400
    
    @app.errorhandler(InvalidDateFormatError)
    def handle_invalid_date_format(error):
        """Handle invalid date format errors"""
        logger.warning(f"Invalid date format: {error.message}")
        return jsonify({
            'status': 'error',
            'error': 'Invalid Date Format',
            'message': error.message,
            'timestamp': g.get('timestamp')
        }), 400
    
    @app.errorhandler(FacilityNotSupportedError)
    def handle_facility_not_supported(error):
        """Handle facility not supported errors"""
        logger.warning(f"Facility not supported: {error.message}")
        return jsonify({
            'status': 'error',
            'error': 'Facility Not Supported',
            'message': error.message,
            'timestamp': g.get('timestamp')
        }), 400
    
    @app.errorhandler(NetworkError)
    def handle_network_error(error):
        """Handle network errors"""
        logger.error(f"Network error: {error.message}")
        return jsonify({
            'status': 'error',
            'error': 'Network Error',
            'message': error.message,
            'details': error.details,
            'timestamp': g.get('timestamp')
        }), 503
    
    @app.errorhandler(BrowserError)
    def handle_browser_error(error):
        """Handle browser errors"""
        logger.error(f"Browser error: {error.message}")
        return jsonify({
            'status': 'error',
            'error': 'Browser Error',
            'message': error.message,
            'details': error.details,
            'timestamp': g.get('timestamp')
        }), 503
    
    @app.errorhandler(DataNotFoundError)
    def handle_data_not_found(error):
        """Handle data not found errors"""
        logger.warning(f"Data not found: {error.message}")
        return jsonify({
            'status': 'error',
            'error': 'Data Not Found',
            'message': error.message,
            'timestamp': g.get('timestamp')
        }), 404
    
    @app.errorhandler(CosmosDBError)
    def handle_cosmos_db_error(error):
        """Handle Cosmos DB errors"""
        logger.error(f"Cosmos DB error: {error.message}")
        return jsonify({
            'status': 'error',
            'error': 'Database Error',
            'message': 'A database error occurred',
            'timestamp': g.get('timestamp')
        }), 503
    
    @app.errorhandler(ScraperError)
    def handle_scraper_error(error):
        """Handle generic scraper errors"""
        logger.error(f"Scraper error: {error.message}")
        return jsonify({
            'status': 'error',
            'error': error.error_type,
            'message': error.message,
            'details': error.details,
            'timestamp': g.get('timestamp')
        }), 500
    
    @app.errorhandler(404)
    def handle_not_found(error):
        """Handle 404 errors"""
        logger.warning(f"404 Not Found: {error}")
        return jsonify({
            'status': 'error',
            'error': 'Not Found',
            'message': 'The requested resource was not found',
            'timestamp': g.get('timestamp')
        }), 404
    
    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        """Handle 405 errors"""
        logger.warning(f"405 Method Not Allowed: {error}")
        return jsonify({
            'status': 'error',
            'error': 'Method Not Allowed',
            'message': 'The method is not allowed for the requested URL',
            'timestamp': g.get('timestamp')
        }), 405
    
    @app.errorhandler(500)
    def handle_internal_error(error):
        """Handle 500 errors"""
        logger.error(f"500 Internal Server Error: {error}")
        return jsonify({
            'status': 'error',
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'timestamp': g.get('timestamp')
        }), 500
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        """Handle unexpected errors"""
        logger.error(f"Unexpected error: {str(error)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': 'Unexpected Error',
            'message': 'An unexpected error occurred',
            'timestamp': g.get('timestamp')
        }), 500