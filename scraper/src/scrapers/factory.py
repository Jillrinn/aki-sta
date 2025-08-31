"""
Scraper factory for creating appropriate scraper instances
"""
import logging
from typing import Dict, Type, Optional
from ..domain.entities import FacilityType
from ..domain.exceptions import FacilityNotSupportedError
from .base import BaseScraper
from .ensemble_studio import EnsembleStudioScraperV2


logger = logging.getLogger(__name__)


class ScraperFactory:
    """Factory class for creating scraper instances"""
    
    # Registry of available scrapers
    _scrapers: Dict[FacilityType, Type[BaseScraper]] = {
        FacilityType.ENSEMBLE_STUDIO: EnsembleStudioScraperV2,
        # Future scrapers can be registered here
        # FacilityType.KAWASAKI_CULTURE: KawasakiCultureScraper,
        # FacilityType.YOKOHAMA_HALL: YokohamaHallScraper,
    }
    
    @classmethod
    def create(cls, facility_type: FacilityType) -> BaseScraper:
        """
        Create a scraper instance for the specified facility type
        
        Args:
            facility_type: Type of facility to scrape
            
        Returns:
            Scraper instance
            
        Raises:
            FacilityNotSupportedError: If facility type is not supported
        """
        scraper_class = cls._scrapers.get(facility_type)
        
        if not scraper_class:
            supported = [ft.value for ft in cls._scrapers.keys()]
            raise FacilityNotSupportedError(
                f"Facility type '{facility_type.value}' is not supported. "
                f"Supported types: {', '.join(supported)}"
            )
        
        logger.debug(f"Creating scraper for {facility_type.value}")
        return scraper_class()
    
    @classmethod
    def create_from_string(cls, facility_name: str) -> BaseScraper:
        """
        Create a scraper instance from facility name string
        
        Args:
            facility_name: Name of the facility
            
        Returns:
            Scraper instance
        """
        facility_type = FacilityType.from_string(facility_name)
        return cls.create(facility_type)
    
    @classmethod
    def get_all_scrapers(cls) -> Dict[FacilityType, BaseScraper]:
        """
        Get instances of all available scrapers
        
        Returns:
            Dictionary of facility type to scraper instance
        """
        scrapers = {}
        for facility_type in cls._scrapers.keys():
            try:
                scrapers[facility_type] = cls.create(facility_type)
            except Exception as e:
                logger.error(f"Failed to create scraper for {facility_type.value}: {str(e)}")
                
        return scrapers
    
    @classmethod
    def register(cls, facility_type: FacilityType, scraper_class: Type[BaseScraper]):
        """
        Register a new scraper class
        
        Args:
            facility_type: Type of facility
            scraper_class: Scraper class to register
        """
        if not issubclass(scraper_class, BaseScraper):
            raise ValueError(f"{scraper_class.__name__} must inherit from BaseScraper")
            
        cls._scrapers[facility_type] = scraper_class
        logger.info(f"Registered scraper {scraper_class.__name__} for {facility_type.value}")
    
    @classmethod
    def is_supported(cls, facility_type: FacilityType) -> bool:
        """
        Check if a facility type is supported
        
        Args:
            facility_type: Type of facility
            
        Returns:
            True if supported, False otherwise
        """
        return facility_type in cls._scrapers
    
    @classmethod
    def get_supported_types(cls) -> list[FacilityType]:
        """
        Get list of supported facility types
        
        Returns:
            List of supported facility types
        """
        return list(cls._scrapers.keys())