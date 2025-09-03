export interface TimeSlotStatus {
  [timeSlot: string]: 'available' | 'booked' | 'booked_1' | 'booked_2' | 'lottery' | 'unknown';
}

export interface Facility {
  centerName: string;
  facilityName: string;
  roomName: string;
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