const fs = require('fs');
const availabilityRepository = require('../../src/repositories/availability-repository');

// モック用のオリジナル関数を保存
const originalExistsSync = fs.existsSync;
const originalReadFileSync = fs.readFileSync;

describe('Availability Repository', () => {
  afterEach(() => {
    // モックをリセット
    fs.existsSync = originalExistsSync;
    fs.readFileSync = originalReadFileSync;
  });
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
    
    test('should throw error when file does not exist', () => {
      // ファイルが存在しない場合をモック
      fs.existsSync = jest.fn().mockReturnValue(false);
      
      expect(() => {
        availabilityRepository.getAvailabilityData('2025-11-15');
      }).toThrow('Data source not available');
    });
    
    test('should throw error when data structure is invalid', () => {
      // 無効なデータ構造をモック
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('{"invalid": "structure"}');
      
      expect(() => {
        availabilityRepository.getAvailabilityData('2025-11-15');
      }).toThrow('Invalid data structure');
    });
    
    test('should throw error when JSON is invalid', () => {
      // 無効なJSONをモック
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('invalid json');
      
      expect(() => {
        availabilityRepository.getAvailabilityData('2025-11-15');
      }).toThrow('Failed to read availability data');
    });
  });
  
  describe('getAllAvailabilityData error cases', () => {
    test('should throw error when file does not exist', () => {
      // ファイルが存在しない場合をモック
      fs.existsSync = jest.fn().mockReturnValue(false);
      
      expect(() => {
        availabilityRepository.getAllAvailabilityData();
      }).toThrow('Data source not available');
    });
    
    test('should throw error when data structure is invalid', () => {
      // 無効なデータ構造をモック
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('{"invalid": "structure"}');
      
      expect(() => {
        availabilityRepository.getAllAvailabilityData();
      }).toThrow('Invalid data structure');
    });
    
    test('should throw error when JSON is invalid', () => {
      // 無効なJSONをモック
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('invalid json');
      
      expect(() => {
        availabilityRepository.getAllAvailabilityData();
      }).toThrow('Failed to read all availability data');
    });
  });
});