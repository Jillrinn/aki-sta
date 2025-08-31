"""
Scraper service for orchestrating scraping operations
"""
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from ..domain.entities import FacilityType, ScrapeResult, AvailabilityData
from ..domain.exceptions import (
    ValidationError,
    InvalidDateFormatError,
    PastDateError,
    ScraperError
)
from ..scrapers.factory import ScraperFactory
from .cosmos_service import CosmosService
from .target_dates_service import TargetDatesService


logger = logging.getLogger(__name__)


class ScraperService:
    """Service for managing scraping operations"""
    
    def __init__(self):
        self.cosmos_service = CosmosService()
        self.target_dates_service = TargetDatesService()
    
    def scrape_facility(
        self,
        facility_type: FacilityType,
        dates: Optional[List[str]] = None
    ) -> List[ScrapeResult]:
        """
        Scrape a specific facility for given dates or target dates
        
        Args:
            facility_type: Type of facility to scrape
            dates: Optional list of dates (YYYY-MM-DD). If None, uses target dates.
            
        Returns:
            List of scrape results
        """
        # Get dates to scrape
        if dates is None:
            dates = self._get_target_dates()
            logger.info(f"Using {len(dates)} target dates from Cosmos DB")
        else:
            # Validate dates
            dates = self._validate_dates(dates)
        
        if not dates:
            raise ValidationError("No dates to scrape")
        
        # Create scraper
        scraper = ScraperFactory.create(facility_type)
        
        # Scrape each date
        results = []
        for date in dates:
            result = self._scrape_single_date(scraper, date)
            results.append(result)
        
        return results
    
    def scrape_all_facilities(
        self,
        dates: Optional[List[str]] = None
    ) -> Dict[str, List[ScrapeResult]]:
        """
        Scrape all supported facilities for given dates or target dates
        
        Args:
            dates: Optional list of dates (YYYY-MM-DD). If None, uses target dates.
            
        Returns:
            Dictionary of facility type to list of scrape results
        """
        # Get dates to scrape
        if dates is None:
            dates = self._get_target_dates()
            logger.info(f"Using {len(dates)} target dates from Cosmos DB")
        else:
            # Validate dates
            dates = self._validate_dates(dates)
        
        if not dates:
            raise ValidationError("No dates to scrape")
        
        # Get all scrapers
        scrapers = ScraperFactory.get_all_scrapers()
        
        # Scrape each facility type
        all_results = {}
        for facility_type, scraper in scrapers.items():
            logger.info(f"Scraping {facility_type.value} for {len(dates)} dates")
            
            results = []
            for date in dates:
                result = self._scrape_single_date(scraper, date)
                results.append(result)
            
            all_results[facility_type.value] = results
        
        return all_results
    
    def _scrape_single_date(self, scraper, date: str) -> ScrapeResult:
        """Scrape a single date with error handling"""
        try:
            logger.info(f"Scraping {scraper.facility_type.value} for {date}")
            
            # Perform scraping
            availability_data = scraper.scrape(date)
            
            # Save to Cosmos DB
            save_success = self.cosmos_service.save_availability(availability_data)
            
            if not save_success:
                logger.warning(f"Failed to save data to Cosmos DB for {date}")
            
            # Create success result
            return ScrapeResult(
                status="success",
                date=date,
                facility_type=scraper.facility_type,
                facilities_count=len(availability_data.facilities),
                data=availability_data
            )
            
        except ScraperError as e:
            logger.error(f"Scraping error for {date}: {str(e)}")
            return ScrapeResult(
                status="error",
                date=date,
                facility_type=scraper.facility_type,
                error=e.message,
                error_type=e.error_type,
                details=e.details
            )
        except Exception as e:
            logger.error(f"Unexpected error for {date}: {str(e)}")
            return ScrapeResult(
                status="error",
                date=date,
                facility_type=scraper.facility_type,
                error="Unexpected error occurred",
                error_type="UNKNOWN_ERROR",
                details=str(e)
            )
    
    def _get_target_dates(self) -> List[str]:
        """Get target dates from Cosmos DB"""
        try:
            target_dates = self.target_dates_service.get_all_target_dates()
            return [td.date for td in target_dates]
        except Exception as e:
            logger.error(f"Failed to get target dates: {str(e)}")
            raise ValidationError(f"Failed to get target dates: {str(e)}")
    
    def _validate_dates(self, dates: List[str]) -> List[str]:
        """Validate and normalize date formats"""
        validated_dates = []
        today = datetime.now().date()
        
        for date_str in dates:
            # Validate format
            try:
                # Try parsing with different formats
                parsed_date = None
                for fmt in ['%Y-%m-%d', '%Y/%m/%d']:
                    try:
                        parsed_date = datetime.strptime(date_str, fmt)
                        break
                    except ValueError:
                        continue
                
                if parsed_date is None:
                    raise InvalidDateFormatError(date_str)
                
                # Check if date is in the past
                if parsed_date.date() < today:
                    raise PastDateError(
                        date_str,
                        today.strftime('%Y-%m-%d')
                    )
                
                # Normalize to YYYY-MM-DD format
                normalized_date = parsed_date.strftime('%Y-%m-%d')
                validated_dates.append(normalized_date)
                
            except (InvalidDateFormatError, PastDateError):
                raise
            except Exception as e:
                raise ValidationError(f"Invalid date: {date_str}")
        
        return validated_dates