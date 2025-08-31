"""
Domain entities and data models
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Dict, Optional, Any


class FacilityType(Enum):
    """Facility type enumeration"""
    ENSEMBLE_STUDIO = "ensemble_studio"
    # Future facility types can be added here
    # KAWASAKI_CULTURE = "kawasaki_culture"
    # YOKOHAMA_HALL = "yokohama_hall"
    
    @classmethod
    def from_string(cls, value: str) -> 'FacilityType':
        """Create FacilityType from string"""
        value_lower = value.lower()
        if 'ensemble' in value_lower:
            return cls.ENSEMBLE_STUDIO
        raise ValueError(f"Unknown facility type: {value}")


@dataclass
class TimeSlot:
    """Time slot representation"""
    slot_id: str  # "9-12", "13-17", "18-21"
    is_available: bool
    start_time: str  # "09:00"
    end_time: str  # "12:00"
    
    @classmethod
    def from_time(cls, time_str: str, is_available: bool) -> 'TimeSlot':
        """Create TimeSlot from time string"""
        if "09:00" in time_str or "9:00" in time_str:
            return cls("9-12", is_available, "09:00", "12:00")
        elif "13:00" in time_str:
            return cls("13-17", is_available, "13:00", "17:00")
        elif "18:00" in time_str:
            return cls("18-21", is_available, "18:00", "21:00")
        else:
            raise ValueError(f"Unknown time slot: {time_str}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'slot': self.slot_id,
            'available': self.is_available
        }


@dataclass
class Facility:
    """Facility information"""
    facility_id: str
    facility_name: str
    facility_type: FacilityType
    time_slots: List[TimeSlot] = field(default_factory=list)
    last_updated: Optional[datetime] = None
    
    def generate_id(self) -> str:
        """Generate facility ID from name"""
        if "本郷" in self.facility_name:
            return "ensemble-hongo"
        elif "初台" in self.facility_name:
            return "ensemble-hatsudai"
        else:
            return self.facility_name.lower().replace(' ', '-').replace('(', '').replace(')', '')
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        return {
            'facilityId': self.facility_id,
            'facilityName': self.facility_name,
            'facilityType': self.facility_type.value,
            'timeSlots': [slot.to_dict() for slot in self.time_slots],
            'lastUpdated': self.last_updated.isoformat() + 'Z' if self.last_updated else None
        }
    
    def to_cosmos_dict(self, date: str) -> Dict[str, Any]:
        """Convert to Cosmos DB format"""
        return {
            'id': f"{date}_{self.facility_id}",
            'partitionKey': date,
            'date': date,
            'facility': self.facility_id,
            'facilityName': self.facility_name,
            'timeSlots': [slot.to_dict() for slot in self.time_slots],
            'updatedAt': self.last_updated.isoformat() + 'Z' if self.last_updated else datetime.utcnow().isoformat() + 'Z',
            'dataSource': 'scraping'
        }


@dataclass
class AvailabilityData:
    """Availability data for a specific date"""
    date: str  # YYYY-MM-DD
    facilities: List[Facility] = field(default_factory=list)
    scraped_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        return {
            'date': self.date,
            'facilities': [f.to_dict() for f in self.facilities],
            'scrapedAt': self.scraped_at.isoformat() + 'Z' if self.scraped_at else None
        }


@dataclass
class TargetDate:
    """Target date from Cosmos DB"""
    id: str
    date: str  # YYYY-MM-DD
    label: str
    updated_at: Optional[datetime] = None
    
    @classmethod
    def from_cosmos(cls, data: Dict[str, Any]) -> 'TargetDate':
        """Create TargetDate from Cosmos DB data"""
        updated_at = None
        if 'updatedAt' in data:
            try:
                updated_at = datetime.fromisoformat(data['updatedAt'].replace('Z', '+00:00'))
            except:
                pass
        
        return cls(
            id=data['id'],
            date=data['date'],
            label=data['label'],
            updated_at=updated_at
        )


@dataclass
class ScrapeResult:
    """Result of scraping operation"""
    status: str  # "success", "error", "partial"
    date: str
    facility_type: Optional[FacilityType] = None
    facilities_count: int = 0
    data: Optional[AvailabilityData] = None
    error: Optional[str] = None
    error_type: Optional[str] = None
    details: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        result = {
            'status': self.status,
            'date': self.date,
            'facilitiesCount': self.facilities_count
        }
        
        if self.facility_type:
            result['facilityType'] = self.facility_type.value
            
        if self.data:
            result['data'] = self.data.to_dict()
            
        if self.error:
            result['error'] = self.error
            
        if self.error_type:
            result['errorType'] = self.error_type
            
        if self.details:
            result['details'] = self.details
            
        return result