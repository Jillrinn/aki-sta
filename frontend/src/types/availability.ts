export interface TimeSlotStatus {
  [timeSlot: string]: 'available' | 'booked' | 'lottery' | 'unknown';
}

export interface Facility {
  facilityName: string;
  timeSlots: TimeSlotStatus;
}

export interface AvailabilityResponse {
  date: string;
  facilities: Facility[];
  lastUpdated: string;
  dataSource: 'dummy' | 'scraping';
}