"""
Unit tests for domain entities
"""
import pytest
from datetime import datetime
from src.domain.entities import (
    FacilityType,
    TimeSlot,
    Facility,
    AvailabilityData,
    TargetDate,
    ScrapeResult
)


class TestFacilityType:
    """Test FacilityType enum"""
    
    def test_from_string_ensemble(self):
        """Test creating FacilityType from ensemble string"""
        facility_type = FacilityType.from_string("ensemble studio")
        assert facility_type == FacilityType.ENSEMBLE_STUDIO
        
        facility_type = FacilityType.from_string("ENSEMBLE")
        assert facility_type == FacilityType.ENSEMBLE_STUDIO
    
    def test_from_string_unknown(self):
        """Test creating FacilityType from unknown string"""
        with pytest.raises(ValueError, match="Unknown facility type"):
            FacilityType.from_string("unknown facility")


class TestTimeSlot:
    """Test TimeSlot entity"""
    
    def test_from_time_morning(self):
        """Test creating TimeSlot for morning"""
        slot = TimeSlot.from_time("09:00", True)
        assert slot.slot_id == "9-12"
        assert slot.is_available is True
        assert slot.start_time == "09:00"
        assert slot.end_time == "12:00"
    
    def test_from_time_afternoon(self):
        """Test creating TimeSlot for afternoon"""
        slot = TimeSlot.from_time("13:00", False)
        assert slot.slot_id == "13-17"
        assert slot.is_available is False
        assert slot.start_time == "13:00"
        assert slot.end_time == "17:00"
    
    def test_from_time_evening(self):
        """Test creating TimeSlot for evening"""
        slot = TimeSlot.from_time("18:00", True)
        assert slot.slot_id == "18-21"
        assert slot.is_available is True
        assert slot.start_time == "18:00"
        assert slot.end_time == "21:00"
    
    def test_from_time_unknown(self):
        """Test creating TimeSlot from unknown time"""
        with pytest.raises(ValueError, match="Unknown time slot"):
            TimeSlot.from_time("10:00", True)
    
    def test_to_dict(self):
        """Test converting TimeSlot to dictionary"""
        slot = TimeSlot("9-12", True, "09:00", "12:00")
        result = slot.to_dict()
        assert result == {
            'slot': '9-12',
            'available': True
        }


class TestFacility:
    """Test Facility entity"""
    
    def test_generate_id_hongo(self):
        """Test generating ID for Hongo facility"""
        facility = Facility(
            facility_id="",
            facility_name="あんさんぶるStudio和(本郷)",
            facility_type=FacilityType.ENSEMBLE_STUDIO
        )
        assert facility.generate_id() == "ensemble-hongo"
    
    def test_generate_id_hatsudai(self):
        """Test generating ID for Hatsudai facility"""
        facility = Facility(
            facility_id="",
            facility_name="あんさんぶるStudio音(初台)",
            facility_type=FacilityType.ENSEMBLE_STUDIO
        )
        assert facility.generate_id() == "ensemble-hatsudai"
    
    def test_to_dict(self):
        """Test converting Facility to dictionary"""
        now = datetime.utcnow()
        facility = Facility(
            facility_id="ensemble-hongo",
            facility_name="あんさんぶるStudio和(本郷)",
            facility_type=FacilityType.ENSEMBLE_STUDIO,
            time_slots=[
                TimeSlot("9-12", True, "09:00", "12:00"),
                TimeSlot("13-17", False, "13:00", "17:00")
            ],
            last_updated=now
        )
        
        result = facility.to_dict()
        assert result['facilityId'] == "ensemble-hongo"
        assert result['facilityName'] == "あんさんぶるStudio和(本郷)"
        assert result['facilityType'] == "ensemble_studio"
        assert len(result['timeSlots']) == 2
        assert result['timeSlots'][0]['slot'] == "9-12"
        assert result['timeSlots'][0]['available'] is True
        assert result['lastUpdated'] == now.isoformat() + 'Z'
    
    def test_to_cosmos_dict(self):
        """Test converting Facility to Cosmos DB format"""
        now = datetime.utcnow()
        facility = Facility(
            facility_id="ensemble-hongo",
            facility_name="あんさんぶるStudio和(本郷)",
            facility_type=FacilityType.ENSEMBLE_STUDIO,
            time_slots=[TimeSlot("9-12", True, "09:00", "12:00")],
            last_updated=now
        )
        
        result = facility.to_cosmos_dict("2025-08-31")
        assert result['id'] == "2025-08-31_ensemble-hongo"
        assert result['partitionKey'] == "2025-08-31"
        assert result['date'] == "2025-08-31"
        assert result['facility'] == "ensemble-hongo"
        assert result['facilityName'] == "あんさんぶるStudio和(本郷)"
        assert result['dataSource'] == "scraping"
        assert len(result['timeSlots']) == 1


class TestTargetDate:
    """Test TargetDate entity"""
    
    def test_from_cosmos(self):
        """Test creating TargetDate from Cosmos DB data"""
        data = {
            'id': '2025-08-31',
            'date': '2025-08-31',
            'label': 'Practice Day',
            'updatedAt': '2025-08-31T12:00:00Z'
        }
        
        target_date = TargetDate.from_cosmos(data)
        assert target_date.id == '2025-08-31'
        assert target_date.date == '2025-08-31'
        assert target_date.label == 'Practice Day'
        assert target_date.updated_at is not None
    
    def test_from_cosmos_without_updated_at(self):
        """Test creating TargetDate without updatedAt"""
        data = {
            'id': '2025-08-31',
            'date': '2025-08-31',
            'label': 'Practice Day'
        }
        
        target_date = TargetDate.from_cosmos(data)
        assert target_date.id == '2025-08-31'
        assert target_date.updated_at is None


class TestScrapeResult:
    """Test ScrapeResult entity"""
    
    def test_to_dict_success(self):
        """Test converting successful ScrapeResult to dictionary"""
        result = ScrapeResult(
            status="success",
            date="2025-08-31",
            facility_type=FacilityType.ENSEMBLE_STUDIO,
            facilities_count=2
        )
        
        data = result.to_dict()
        assert data['status'] == "success"
        assert data['date'] == "2025-08-31"
        assert data['facilityType'] == "ensemble_studio"
        assert data['facilitiesCount'] == 2
        assert 'error' not in data
    
    def test_to_dict_error(self):
        """Test converting error ScrapeResult to dictionary"""
        result = ScrapeResult(
            status="error",
            date="2025-08-31",
            facility_type=FacilityType.ENSEMBLE_STUDIO,
            error="Failed to scrape",
            error_type="NETWORK_ERROR",
            details="Connection timeout"
        )
        
        data = result.to_dict()
        assert data['status'] == "error"
        assert data['date'] == "2025-08-31"
        assert data['error'] == "Failed to scrape"
        assert data['errorType'] == "NETWORK_ERROR"
        assert data['details'] == "Connection timeout"