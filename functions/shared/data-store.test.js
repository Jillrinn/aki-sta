const dataStore = require('./data-store');

describe('Data Store', () => {
  test('should return data for known date', () => {
    const data = dataStore.getAvailabilityData('2025-11-15');
    
    expect(data).toHaveLength(2);
    expect(data[0].facilityName).toBe('Ensemble Studio 本郷');
    expect(data[0].timeSlots['13-17']).toBe('available');
    expect(data[1].facilityName).toBe('Ensemble Studio 初台');
    expect(data[1].timeSlots['13-17']).toBe('booked');
  });

  test('should return empty array for unknown date', () => {
    const data = dataStore.getAvailabilityData('2025-12-01');
    
    expect(data).toEqual([]);
  });

  test('should handle null date', () => {
    const data = dataStore.getAvailabilityData(null);
    
    expect(data).toEqual([]);
  });

  test('should handle undefined date', () => {
    const data = dataStore.getAvailabilityData(undefined);
    
    expect(data).toEqual([]);
  });
});