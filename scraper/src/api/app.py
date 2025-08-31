"""
Flask application factory
"""
import logging
from flask import Flask
from flask_cors import CORS
from ..config.settings import get_settings
from .routes import health_bp, scrape_bp
from .middleware import setup_middleware
from .error_handlers import register_error_handlers


def create_app(config=None):
    """
    Create and configure Flask application
    
    Args:
        config: Optional configuration dictionary
        
    Returns:
        Configured Flask application
    """
    app = Flask(__name__)
    
    # Load configuration
    settings = get_settings()
    app.config['DEBUG'] = settings.debug
    app.config['ENV'] = settings.environment
    
    # Apply custom config if provided
    if config:
        app.config.update(config)
    
    # Configure logging
    logging.basicConfig(
        level=getattr(logging, settings.log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Enable CORS for all routes
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Setup middleware
    setup_middleware(app)
    
    # Register blueprints
    app.register_blueprint(health_bp, url_prefix='/api')
    app.register_blueprint(scrape_bp, url_prefix='/api')
    
    # Register error handlers
    register_error_handlers(app)
    
    # Log startup
    logger = logging.getLogger(__name__)
    logger.info(f"Flask app created in {settings.environment} mode")
    
    return app