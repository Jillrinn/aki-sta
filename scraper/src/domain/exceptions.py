"""
Custom exceptions for the scraper application
"""


class ScraperError(Exception):
    """Base exception for scraper errors"""
    def __init__(self, message: str, error_type: str = 'SCRAPER_ERROR', details: str = None):
        super().__init__(message)
        self.message = message
        self.error_type = error_type
        self.details = details


class ValidationError(ScraperError):
    """Validation error"""
    def __init__(self, message: str, details: str = None):
        super().__init__(message, 'VALIDATION_ERROR', details)


class NetworkError(ScraperError):
    """Network-related error"""
    def __init__(self, message: str, details: str = None):
        super().__init__(message, 'NETWORK_ERROR', details)


class BrowserError(ScraperError):
    """Browser-related error"""
    def __init__(self, message: str, details: str = None):
        super().__init__(message, 'BROWSER_ERROR', details)


class DataNotFoundError(ScraperError):
    """Data not found error"""
    def __init__(self, message: str, details: str = None):
        super().__init__(message, 'DATA_NOT_FOUND', details)


class CosmosDBError(ScraperError):
    """Cosmos DB operation error"""
    def __init__(self, message: str, details: str = None):
        super().__init__(message, 'COSMOS_DB_ERROR', details)


class PastDateError(ValidationError):
    """Past date validation error"""
    def __init__(self, date: str, today: str):
        message = f"過去の日付は指定できません: {date}"
        details = f"Today: {today}"
        super().__init__(message, details)
        self.date = date
        self.today = today


class InvalidDateFormatError(ValidationError):
    """Invalid date format error"""
    def __init__(self, date: str):
        message = f"Invalid date format: {date}. Use YYYY-MM-DD"
        super().__init__(message)
        self.date = date


class FacilityNotSupportedError(ValidationError):
    """Facility not supported error"""
    def __init__(self, facility: str):
        message = f"Facility not supported: {facility}"
        super().__init__(message)
        self.facility = facility


class BrowserNotInstalledError(BrowserError):
    """Browser not installed error"""
    def __init__(self):
        message = "Playwright browser not installed"
        details = "Please run: playwright install chromium"
        super().__init__(message, details)