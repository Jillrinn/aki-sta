"""
Base scraper class with common functionality
"""
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Optional
from playwright.sync_api import sync_playwright, Page, Browser, BrowserContext, Playwright
from ..domain.entities import AvailabilityData, Facility, FacilityType
from ..domain.exceptions import BrowserError, NetworkError, ScraperError
from ..config.settings import get_settings


logger = logging.getLogger(__name__)


class BaseScraper(ABC):
    """Abstract base class for all scrapers"""
    
    def __init__(self):
        self.settings = get_settings()
        self.playwright: Optional[Playwright] = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
    @property
    @abstractmethod
    def facility_type(self) -> FacilityType:
        """Get the facility type this scraper handles"""
        pass
    
    @property
    @abstractmethod
    def base_url(self) -> str:
        """Get the base URL for the facility"""
        pass
    
    @abstractmethod
    def scrape_date(self, date: str) -> List[Facility]:
        """
        Scrape availability for a specific date
        
        Args:
            date: Date in YYYY-MM-DD format
            
        Returns:
            List of facilities with availability data
        """
        pass
    
    def scrape(self, date: str) -> AvailabilityData:
        """
        Main scraping method with error handling
        
        Args:
            date: Date in YYYY-MM-DD format
            
        Returns:
            AvailabilityData object
        """
        try:
            self._init_browser()
            facilities = self.scrape_date(date)
            
            return AvailabilityData(
                date=date,
                facilities=facilities,
                scraped_at=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Scraping failed for {self.facility_type.value} on {date}: {str(e)}")
            if isinstance(e, ScraperError):
                raise
            else:
                raise ScraperError(f"Scraping failed: {str(e)}")
        finally:
            self._cleanup_browser()
    
    def _init_browser(self):
        """Initialize Playwright browser"""
        try:
            self.playwright = sync_playwright().start()
            
            browser_type = getattr(self.playwright, self.settings.playwright_browser)
            
            launch_options = {
                'headless': self.settings.scraper_headless
            }
            
            if self.settings.playwright_slow_mo > 0:
                launch_options['slow_mo'] = self.settings.playwright_slow_mo
                
            self.browser = browser_type.launch(**launch_options)
            
            # Create context with viewport and user agent
            self.context = self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            
            self.page = self.context.new_page()
            self.page.set_default_timeout(self.settings.scraper_timeout)
            
            logger.debug(f"Browser initialized: {self.settings.playwright_browser}")
            
        except FileNotFoundError as e:
            if "Executable doesn't exist" in str(e):
                raise BrowserError(
                    "Playwright browser not installed",
                    "Please run: playwright install chromium"
                )
            raise BrowserError(f"Failed to initialize browser: {str(e)}")
        except Exception as e:
            raise BrowserError(f"Failed to initialize browser: {str(e)}")
    
    def _cleanup_browser(self):
        """Cleanup browser resources"""
        try:
            if self.page:
                self.page.close()
            if self.context:
                self.context.close()
            if self.browser:
                self.browser.close()
            if self.playwright:
                self.playwright.stop()
                
            logger.debug("Browser cleaned up")
        except Exception as e:
            logger.warning(f"Browser cleanup warning: {str(e)}")
    
    def _navigate_to_url(self, url: str):
        """Navigate to URL with error handling"""
        try:
            response = self.page.goto(url, wait_until='networkidle')
            if not response or response.status >= 400:
                raise NetworkError(f"Failed to load page: HTTP {response.status if response else 'No response'}")
                
            logger.debug(f"Navigated to: {url}")
        except TimeoutError:
            raise NetworkError(f"Timeout loading page: {url}")
        except Exception as e:
            if isinstance(e, NetworkError):
                raise
            raise NetworkError(f"Failed to navigate to {url}: {str(e)}")
    
    def _wait_for_element(self, selector: str, timeout: Optional[int] = None):
        """Wait for element to appear with error handling"""
        try:
            timeout = timeout or self.settings.scraper_timeout
            self.page.wait_for_selector(selector, timeout=timeout)
            logger.debug(f"Element found: {selector}")
        except TimeoutError:
            raise ScraperError(f"Element not found: {selector}")
    
    def _retry_operation(self, operation, max_retries: Optional[int] = None, delay: Optional[int] = None):
        """Retry an operation with exponential backoff"""
        import time
        
        max_retries = max_retries or self.settings.scraper_retry_count
        delay = delay or self.settings.scraper_retry_delay / 1000  # Convert to seconds
        
        last_error = None
        for attempt in range(max_retries):
            try:
                return operation()
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    wait_time = delay * (2 ** attempt)  # Exponential backoff
                    logger.warning(f"Attempt {attempt + 1} failed: {str(e)}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"All {max_retries} attempts failed")
                    
        raise last_error