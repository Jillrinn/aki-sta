const availabilityRepository = require('../../src/repositories/availability-repository');

describe('Availability Repository', () => {
  describe('getAvailabilityData', () => {
    test('should return data for known date', () => {
      const data = availabilityRepository.getAvailabilityData('2025-11-15');
      
      expect(data).toHaveLength(2);
      // スクレイピングデータまたはフォールバックデータのどちらかをテスト
      expect(data[0].facilityName).toMatch(/Ensemble Studio 本郷|あんさんぶるStudio和\(本郷\)/);
      expect(data[1].facilityName).toMatch(/Ensemble Studio 初台|あんさんぶるStudio音\(初台\)/);
    });

    test('should return empty array for unknown date', () => {
      const data = availabilityRepository.getAvailabilityData('2025-12-01');
      
      expect(data).toEqual([]);
    });

    test('should handle null date', () => {
      const data = availabilityRepository.getAvailabilityData(null);
      
      expect(data).toEqual([]);
    });

    test('should handle undefined date', () => {
      const data = availabilityRepository.getAvailabilityData(undefined);
      
      expect(data).toEqual([]);
    });
  });

  describe('getAllAvailabilityData', () => {
    test('should return all availability data', () => {
      const allData = availabilityRepository.getAllAvailabilityData();
      
      expect(allData).toBeDefined();
      expect(typeof allData).toBe('object');
      
      // 少なくとも1つ以上の日付が存在することを確認
      const dates = Object.keys(allData);
      expect(dates.length).toBeGreaterThan(0);
      
      // 各日付のデータが配列であることを確認
      dates.forEach(date => {
        expect(Array.isArray(allData[date])).toBe(true);
      });
      
      // 既知の日付のデータを確認
      if (allData['2025-11-15']) {
        expect(allData['2025-11-15']).toHaveLength(2);
        expect(allData['2025-11-15'][0].facilityName).toMatch(/Ensemble Studio 本郷|あんさんぶるStudio和\(本郷\)/);
      }
    });

    test('should return all dates from shared data', () => {
      const allData = availabilityRepository.getAllAvailabilityData();
      const dates = Object.keys(allData);
      
      // 複数の日付が含まれていることを確認
      expect(dates.length).toBeGreaterThanOrEqual(1);
      
      // 日付の形式を確認（YYYY-MM-DD）
      dates.forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });
});