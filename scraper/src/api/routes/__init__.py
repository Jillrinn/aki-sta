"""
API routes
"""
from .health import health_bp
from .scrape import scrape_bp

__all__ = ['health_bp', 'scrape_bp']