"""
Integration tests for Flask API
"""
import pytest
import json
from unittest.mock import patch, MagicMock
from src.api import create_app
from src.domain.entities import FacilityType, ScrapeResult, TargetDate


@pytest.fixture
def client():
    """Create test client"""
    app = create_app({'TESTING': True})
    with app.test_client() as client:
        yield client


class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_health_check(self, client):
        """Test /api/health endpoint"""
        response = client.get('/api/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'
        assert data['service'] == 'Scraper API'
        assert 'timestamp' in data
    
    def test_index(self, client):
        """Test root endpoint"""
        response = client.get('/api/')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'running'
        assert data['service'] == 'Scraper Web App'
        assert data['version'] == '2.0.0'


class TestScrapeEndpoints:
    """Test scraping endpoints"""
    
    @patch('src.api.routes.scrape.ScraperService')
    def test_scrape_ensemble_with_date(self, mock_service_class, client):
        """Test /api/scrape/ensemble with specific date"""
        # Setup mock
        mock_service = MagicMock()
        mock_service_class.return_value = mock_service
        mock_service.scrape_facility.return_value = [
            ScrapeResult(
                status="success",
                date="2025-08-31",
                facility_type=FacilityType.ENSEMBLE_STUDIO,
                facilities_count=2
            )
        ]
        
        # Make request
        response = client.post('/api/scrape/ensemble?date=2025-08-31')
        assert response.status_code == 200
        
        # Verify response
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['facilityType'] == 'ensemble_studio'
        assert data['totalDates'] == 1
        assert data['successCount'] == 1
        assert data['errorCount'] == 0
        
        # Verify service was called correctly
        mock_service.scrape_facility.assert_called_once_with(
            FacilityType.ENSEMBLE_STUDIO,
            ['2025-08-31']
        )
    
    @patch('src.api.routes.scrape.ScraperService')
    def test_scrape_ensemble_without_date(self, mock_service_class, client):
        """Test /api/scrape/ensemble without date (uses target dates)"""
        # Setup mock
        mock_service = MagicMock()
        mock_service_class.return_value = mock_service
        mock_service.scrape_facility.return_value = [
            ScrapeResult(
                status="success",
                date="2025-08-31",
                facility_type=FacilityType.ENSEMBLE_STUDIO,
                facilities_count=2
            ),
            ScrapeResult(
                status="success",
                date="2025-09-01",
                facility_type=FacilityType.ENSEMBLE_STUDIO,
                facilities_count=2
            )
        ]
        
        # Make request
        response = client.post('/api/scrape/ensemble')
        assert response.status_code == 200
        
        # Verify response
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['totalDates'] == 2
        assert data['successCount'] == 2
        assert data['errorCount'] == 0
        
        # Verify service was called with None (to use target dates)
        mock_service.scrape_facility.assert_called_once_with(
            FacilityType.ENSEMBLE_STUDIO,
            None
        )
    
    @patch('src.api.routes.scrape.ScraperService')
    def test_scrape_all_with_date(self, mock_service_class, client):
        """Test /api/scrape with specific date"""
        # Setup mock
        mock_service = MagicMock()
        mock_service_class.return_value = mock_service
        mock_service.scrape_all_facilities.return_value = {
            'ensemble_studio': [
                ScrapeResult(
                    status="success",
                    date="2025-08-31",
                    facility_type=FacilityType.ENSEMBLE_STUDIO,
                    facilities_count=2
                )
            ]
        }
        
        # Make request
        response = client.post('/api/scrape?date=2025-08-31')
        assert response.status_code == 200
        
        # Verify response
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['totalSuccess'] == 1
        assert data['totalError'] == 0
        assert len(data['facilities']) == 1
        assert data['facilities'][0]['facilityType'] == 'ensemble_studio'
        
        # Verify service was called correctly
        mock_service.scrape_all_facilities.assert_called_once_with(['2025-08-31'])
    
    @patch('src.scrapers.factory.ScraperFactory')
    def test_scrape_status(self, mock_factory, client):
        """Test /api/scrape/status endpoint"""
        # Setup mock
        mock_factory.get_supported_types.return_value = [FacilityType.ENSEMBLE_STUDIO]
        
        # Make request
        response = client.get('/api/scrape/status')
        assert response.status_code == 200
        
        # Verify response
        data = json.loads(response.data)
        assert data['status'] == 'ready'
        assert 'ensemble_studio' in data['supportedFacilities']
        assert 'timestamp' in data


class TestErrorHandling:
    """Test error handling"""
    
    def test_404_error(self, client):
        """Test 404 error handling"""
        response = client.get('/api/nonexistent')
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert data['error'] == 'Not Found'
    
    @patch('src.api.routes.scrape.ScraperService')
    def test_validation_error(self, mock_service_class, client):
        """Test validation error handling"""
        from src.domain.exceptions import InvalidDateFormatError
        
        # Setup mock to raise validation error
        mock_service = MagicMock()
        mock_service_class.return_value = mock_service
        mock_service.scrape_facility.side_effect = InvalidDateFormatError("invalid-date")
        
        # Make request
        response = client.post('/api/scrape/ensemble?date=invalid-date')
        assert response.status_code == 400
        
        # Verify response
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'Invalid date format' in data['message']