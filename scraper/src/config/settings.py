"""
Application settings and configuration
"""
import os
from pathlib import Path
from typing import Optional
from functools import lru_cache
from dotenv import load_dotenv


class Settings:
    """Application settings loaded from environment variables"""
    
    def __init__(self):
        # Load .env file from project root
        root_path = Path(__file__).parent.parent.parent
        env_path = root_path / '.env'
        load_dotenv(env_path)
        
        # Cosmos DB settings
        self.cosmos_endpoint = os.getenv('COSMOS_ENDPOINT')
        self.cosmos_key = os.getenv('COSMOS_KEY')
        self.cosmos_database = os.getenv('COSMOS_DATABASE', 'studio-reservations')
        
        # Azure settings
        self.azure_storage_connection = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
        
        # Application settings
        self.environment = os.getenv('ENVIRONMENT', 'development')
        self.debug = os.getenv('DEBUG', 'false').lower() == 'true'
        self.log_level = os.getenv('LOG_LEVEL', 'INFO')
        
        # Flask settings
        self.flask_host = os.getenv('FLASK_HOST', '0.0.0.0')
        self.flask_port = int(os.getenv('FLASK_PORT', '8000'))
        
        # Scraper settings
        self.scraper_timeout = int(os.getenv('SCRAPER_TIMEOUT', '30000'))  # milliseconds
        self.scraper_headless = os.getenv('SCRAPER_HEADLESS', 'true').lower() == 'true'
        self.scraper_retry_count = int(os.getenv('SCRAPER_RETRY_COUNT', '3'))
        self.scraper_retry_delay = int(os.getenv('SCRAPER_RETRY_DELAY', '1000'))  # milliseconds
        
        # Playwright settings
        self.playwright_browser = os.getenv('PLAYWRIGHT_BROWSER', 'chromium')
        self.playwright_slow_mo = int(os.getenv('PLAYWRIGHT_SLOW_MO', '0'))  # milliseconds
        
    def validate(self) -> bool:
        """Validate required settings"""
        required_settings = [
            ('COSMOS_ENDPOINT', self.cosmos_endpoint),
            ('COSMOS_KEY', self.cosmos_key)
        ]
        
        missing = []
        for name, value in required_settings:
            if not value:
                missing.append(name)
        
        if missing:
            raise ValueError(f"Missing required settings: {', '.join(missing)}")
        
        return True
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment.lower() == 'production'
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment.lower() == 'development'
    
    @property
    def cosmos_availability_container(self) -> str:
        """Get Cosmos DB availability container name"""
        return 'availability'
    
    @property
    def cosmos_target_dates_container(self) -> str:
        """Get Cosmos DB target dates container name"""
        return 'targetDates'


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance (singleton)"""
    settings = Settings()
    settings.validate()
    return settings