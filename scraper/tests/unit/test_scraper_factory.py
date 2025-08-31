"""
Unit tests for scraper factory
"""
import pytest
from src.domain.entities import FacilityType
from src.domain.exceptions import FacilityNotSupportedError
from src.scrapers.factory import ScraperFactory
from src.scrapers.base import BaseScraper


class TestScraperFactory:
    """Test ScraperFactory"""
    
    def test_create_ensemble_scraper(self):
        """Test creating Ensemble Studio scraper"""
        scraper = ScraperFactory.create(FacilityType.ENSEMBLE_STUDIO)
        assert scraper is not None
        assert isinstance(scraper, BaseScraper)
        assert scraper.facility_type == FacilityType.ENSEMBLE_STUDIO
    
    def test_create_from_string(self):
        """Test creating scraper from string"""
        scraper = ScraperFactory.create_from_string("ensemble")
        assert scraper is not None
        assert scraper.facility_type == FacilityType.ENSEMBLE_STUDIO
    
    def test_is_supported(self):
        """Test checking if facility type is supported"""
        assert ScraperFactory.is_supported(FacilityType.ENSEMBLE_STUDIO) is True
    
    def test_get_supported_types(self):
        """Test getting supported facility types"""
        supported = ScraperFactory.get_supported_types()
        assert FacilityType.ENSEMBLE_STUDIO in supported
        assert len(supported) >= 1