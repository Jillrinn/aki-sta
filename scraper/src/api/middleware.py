"""
Flask middleware configuration
"""
import logging
import time
from datetime import datetime
from flask import request, g


logger = logging.getLogger(__name__)


def setup_middleware(app):
    """
    Setup middleware for the Flask application
    
    Args:
        app: Flask application instance
    """
    
    @app.before_request
    def before_request():
        """Log request and start timer"""
        g.start_time = time.time()
        logger.info(f"{request.method} {request.path} - Started")
        
        # Log request body for POST requests (excluding sensitive data)
        if request.method == 'POST':
            content_type = request.headers.get('Content-Type', '')
            if 'application/json' in content_type:
                try:
                    data = request.get_json()
                    # Don't log sensitive fields
                    safe_data = {k: v for k, v in (data or {}).items() 
                                if k not in ['password', 'token', 'key']}
                    if safe_data:
                        logger.debug(f"Request data: {safe_data}")
                except Exception:
                    pass
    
    @app.after_request
    def after_request(response):
        """Log response and execution time"""
        if hasattr(g, 'start_time'):
            elapsed = time.time() - g.start_time
            logger.info(
                f"{request.method} {request.path} - "
                f"Status: {response.status_code} - "
                f"Time: {elapsed:.3f}s"
            )
        
        # Add standard headers
        response.headers['X-Request-ID'] = g.get('request_id', 'unknown')
        response.headers['X-Response-Time'] = str(int((time.time() - g.get('start_time', time.time())) * 1000))
        
        return response
    
    @app.before_request
    def add_request_id():
        """Add unique request ID for tracking"""
        import uuid
        g.request_id = str(uuid.uuid4())
    
    @app.before_request
    def add_timestamp():
        """Add request timestamp"""
        g.timestamp = datetime.utcnow().isoformat() + 'Z'