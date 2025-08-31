"""
Domain models and exceptions
"""
from .entities import (
    FacilityType,
    TimeSlot,
    Facility,
    AvailabilityData,
    TargetDate,
    ScrapeResult
)
from .exceptions import (
    ScraperError,
    ValidationError,
    NetworkError,
    BrowserError,
    DataNotFoundError,
    CosmosDBError
)

__all__ = [
    # Entities
    'FacilityType',
    'TimeSlot',
    'Facility',
    'AvailabilityData',
    'TargetDate',
    'ScrapeResult',
    # Exceptions
    'ScraperError',
    'ValidationError',
    'NetworkError',
    'BrowserError',
    'DataNotFoundError',
    'CosmosDBError'
]