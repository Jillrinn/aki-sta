"""
Health check endpoints
"""
from flask import Blueprint, jsonify, g
from datetime import datetime


health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Scraper API',
        'timestamp': g.get('timestamp', datetime.utcnow().isoformat() + 'Z')
    }), 200


@health_bp.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        'service': 'Scraper Web App',
        'status': 'running',
        'version': '2.0.0',
        'timestamp': g.get('timestamp', datetime.utcnow().isoformat() + 'Z')
    }), 200