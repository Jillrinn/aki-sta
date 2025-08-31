"""
Ensemble Studio scraper v2 - inherits from BaseScraper
"""
import logging
import re
from datetime import datetime
from typing import List, Optional, Tuple
from playwright.sync_api import Locator
from .base import BaseScraper
from ..domain.entities import Facility, FacilityType, TimeSlot
from ..domain.exceptions import ScraperError, DataNotFoundError


logger = logging.getLogger(__name__)


class EnsembleStudioScraperV2(BaseScraper):
    """Ensemble Studio scraper with human-like interaction"""
    
    @property
    def facility_type(self) -> FacilityType:
        return FacilityType.ENSEMBLE_STUDIO
    
    @property
    def base_url(self) -> str:
        return "https://ensemble-studio.com/schedule/"
    
    def __init__(self):
        super().__init__()
        self.studios = [
            "あんさんぶるStudio和(本郷)",
            "あんさんぶるStudio音(初台)"
        ]
    
    def scrape_date(self, date: str) -> List[Facility]:
        """
        Scrape availability for a specific date
        
        Args:
            date: Date in YYYY-MM-DD format
            
        Returns:
            List of facilities with availability data
        """
        try:
            # Navigate to the schedule page
            self._navigate_to_url(self.base_url)
            
            # Find studio calendars
            calendars = self._find_studio_calendars()
            
            if not calendars:
                raise DataNotFoundError("No studio calendars found on page")
            
            # Navigate to the target date
            self._navigate_to_date(date)
            
            # Extract availability for each studio
            facilities = []
            for studio_name, calendar in calendars:
                facility = self._extract_facility_data(studio_name, calendar, date)
                if facility:
                    facilities.append(facility)
            
            logger.info(f"Scraped {len(facilities)} facilities for {date}")
            return facilities
            
        except Exception as e:
            logger.error(f"Failed to scrape Ensemble Studio for {date}: {str(e)}")
            if isinstance(e, ScraperError):
                raise
            raise ScraperError(f"Scraping failed: {str(e)}")
    
    def _find_studio_calendars(self) -> List[Tuple[str, Locator]]:
        """Find calendar elements for each studio"""
        logger.debug("Finding studio calendars...")
        calendars = []
        
        # Get all calendar elements
        all_calendars = self.page.locator(".timetable-calendar")
        calendar_count = all_calendars.count()
        logger.debug(f"Found {calendar_count} calendars on page")
        
        if calendar_count == 0:
            return calendars
        
        # Map calendars to studios (typically first is 本郷, second is 初台)
        for i, studio_name in enumerate(self.studios):
            if i < calendar_count:
                calendar = all_calendars.nth(i)
                calendars.append((studio_name, calendar))
                logger.debug(f"Mapped calendar {i} to {studio_name}")
        
        return calendars
    
    def _navigate_to_date(self, target_date: str):
        """Navigate to the target date on the calendar"""
        try:
            # Parse target date
            target = datetime.strptime(target_date, '%Y-%m-%d')
            target_year = target.year
            target_month = target.month
            target_day = target.day
            
            logger.debug(f"Navigating to date: {target_date}")
            
            # Find and navigate to the correct month
            max_attempts = 12  # Maximum months to navigate
            for attempt in range(max_attempts):
                # Get current displayed month
                month_text = self._get_current_month()
                if month_text:
                    current = self._parse_japanese_year_month(month_text)
                    if current:
                        if current.year == target_year and current.month == target_month:
                            logger.debug(f"Found target month: {month_text}")
                            break
                        elif current < datetime(target_year, target_month, 1):
                            # Need to go forward
                            self._click_next_month()
                        else:
                            # Need to go backward
                            self._click_prev_month()
                
                if attempt == max_attempts - 1:
                    raise ScraperError(f"Could not navigate to {target_year}-{target_month:02d}")
            
            # Click on the target day
            self._click_day(target_day)
            
        except Exception as e:
            logger.error(f"Failed to navigate to date {target_date}: {str(e)}")
            if not isinstance(e, ScraperError):
                raise ScraperError(f"Date navigation failed: {str(e)}")
            raise
    
    def _get_current_month(self) -> Optional[str]:
        """Get the currently displayed month text"""
        try:
            # Look for month text in calendar header
            month_elements = self.page.locator(".calendar-header, .month-title, h2, h3").all()
            for element in month_elements:
                text = element.text_content()
                if text and re.search(r'\d{4}年\d{1,2}月', text):
                    return text
            return None
        except Exception as e:
            logger.warning(f"Could not get current month: {str(e)}")
            return None
    
    def _parse_japanese_year_month(self, text: str) -> Optional[datetime]:
        """Parse Japanese year-month text to datetime"""
        match = re.search(r'(\d{4})年(\d{1,2})月', text)
        if match:
            year = int(match.group(1))
            month = int(match.group(2))
            return datetime(year, month, 1)
        return None
    
    def _click_next_month(self):
        """Click next month button"""
        try:
            next_btn = self.page.locator("button:has-text('次'), a:has-text('次'), .next-month").first
            next_btn.click()
            self.page.wait_for_timeout(500)  # Wait for animation
        except Exception as e:
            logger.warning(f"Failed to click next month: {str(e)}")
    
    def _click_prev_month(self):
        """Click previous month button"""
        try:
            prev_btn = self.page.locator("button:has-text('前'), a:has-text('前'), .prev-month").first
            prev_btn.click()
            self.page.wait_for_timeout(500)  # Wait for animation
        except Exception as e:
            logger.warning(f"Failed to click previous month: {str(e)}")
    
    def _click_day(self, day: int):
        """Click on a specific day in the calendar"""
        try:
            # Look for day cell
            day_selector = f"td:has-text('{day}'), .day-{day}, [data-day='{day}']"
            day_element = self.page.locator(day_selector).first
            day_element.click()
            self.page.wait_for_timeout(1000)  # Wait for data to load
        except Exception as e:
            logger.warning(f"Failed to click day {day}: {str(e)}")
    
    def _extract_facility_data(self, studio_name: str, calendar: Locator, date: str) -> Optional[Facility]:
        """Extract facility availability data from calendar"""
        try:
            # Create facility object
            facility = Facility(
                facility_id=self._generate_facility_id(studio_name),
                facility_name=studio_name,
                facility_type=self.facility_type,
                time_slots=[],
                last_updated=datetime.utcnow()
            )
            
            # Extract time slots
            time_slots = self._extract_time_slots(calendar)
            facility.time_slots = time_slots
            
            logger.debug(f"Extracted {len(time_slots)} time slots for {studio_name}")
            return facility
            
        except Exception as e:
            logger.error(f"Failed to extract data for {studio_name}: {str(e)}")
            return None
    
    def _extract_time_slots(self, calendar: Locator) -> List[TimeSlot]:
        """Extract time slot availability from calendar"""
        time_slots = []
        
        try:
            # Look for time slot elements
            slot_elements = calendar.locator(".time-slot, .reservation-slot, td").all()
            
            for element in slot_elements:
                text = element.text_content()
                if not text:
                    continue
                
                # Check for time patterns
                if "09:00" in text or "9:00" in text:
                    is_available = self._is_slot_available(element)
                    time_slots.append(TimeSlot.from_time("09:00", is_available))
                elif "13:00" in text:
                    is_available = self._is_slot_available(element)
                    time_slots.append(TimeSlot.from_time("13:00", is_available))
                elif "18:00" in text:
                    is_available = self._is_slot_available(element)
                    time_slots.append(TimeSlot.from_time("18:00", is_available))
            
            # If no time slots found, use default unavailable slots
            if not time_slots:
                logger.warning("No time slots found, using defaults")
                time_slots = [
                    TimeSlot("9-12", False, "09:00", "12:00"),
                    TimeSlot("13-17", False, "13:00", "17:00"),
                    TimeSlot("18-21", False, "18:00", "21:00")
                ]
                
        except Exception as e:
            logger.error(f"Failed to extract time slots: {str(e)}")
            
        return time_slots
    
    def _is_slot_available(self, element: Locator) -> bool:
        """Check if a time slot is available"""
        try:
            # Check various indicators of availability
            text = element.text_content().lower()
            classes = element.get_attribute("class") or ""
            
            # Common patterns for unavailable slots
            unavailable_patterns = ["×", "済", "予約済", "満", "closed", "booked", "unavailable"]
            for pattern in unavailable_patterns:
                if pattern in text or pattern in classes.lower():
                    return False
            
            # Common patterns for available slots
            available_patterns = ["○", "空", "available", "open", "free"]
            for pattern in available_patterns:
                if pattern in text or pattern in classes.lower():
                    return True
            
            # Default to unavailable if unclear
            return False
            
        except Exception:
            return False
    
    def _generate_facility_id(self, facility_name: str) -> str:
        """Generate facility ID from name"""
        if "本郷" in facility_name:
            return "ensemble-hongo"
        elif "初台" in facility_name:
            return "ensemble-hatsudai"
        else:
            return facility_name.lower().replace(' ', '-').replace('(', '').replace(')', '')