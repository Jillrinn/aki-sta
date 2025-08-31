"""
Azure Web Apps entry point for Scraper v2
Flask application using the new architecture
"""
import os
import sys
from pathlib import Path

# Add scraper directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.api import create_app

# Create Flask application
app = create_app()

if __name__ == '__main__':
    # For local testing only
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)