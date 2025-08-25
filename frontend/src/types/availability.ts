export interface TimeSlotStatus {
  [timeSlot: string]: 'available' | 'booked' | 'lottery' | 'unknown';
}

export interface Facility {
  facilityName: string;
  timeSlots: TimeSlotStatus;
  lastUpdated: string;
}

export interface AvailabilityResponse {
  date: string;
  facilities: Facility[];
  dataSource: 'dummy' | 'scraping';
}

export interface AllAvailabilityResponse {
  [date: string]: Facility[];
}