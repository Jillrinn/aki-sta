const dataStore = require('./data-store');

describe('Data Store', () => {
  test('should return data for known date', () => {
    const data = dataStore.getAvailabilityData('2025-11-15');
    
    expect(data).toHaveLength(2);
    // スクレイピングデータまたはダミーデータのどちらかをテスト
    expect(data[0].facilityName).toMatch(/Ensemble Studio 本郷|あんさんぶるStudio和\(本郷\)/);
    expect(data[1].facilityName).toMatch(/Ensemble Studio 初台|あんさんぶるStudio音\(初台\)/);
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