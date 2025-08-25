const fs = require('fs');
const availabilityRepository = require('../../src/repositories/availability-repository-cosmos');
const cosmosClient = require('../../src/repositories/cosmos-client');

// Cosmos DBモック
jest.mock('../../src/repositories/cosmos-client');

describe('Availability Repository with Cosmos DB', () => {
  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    
    // console出力を抑制
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Cosmos DBモックの設定
    cosmosClient.initialize = jest.fn().mockResolvedValue();
    cosmosClient.getContainer = jest.fn().mockReturnValue({
      items: {
        query: jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: [] })
        }),
        readAll: jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: [] })
        })
      }
    });
  });

  afterEach(() => {
    // console出力のモックを復元
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('getAvailabilityData', () => {
    test('should return data from Cosmos DB when available', async () => {
      const mockData = [
        {
          id: '2025-11-15_ensemble-hongo',
          date: '2025-11-15',
          facilityName: 'あんさんぶるStudio和(本郷)',
          timeSlots: { '9-12': 'available', '13-17': 'booked', '18-21': 'available' },
          updatedAt: '2025-08-25T10:00:00Z'
        }
      ];

      cosmosClient.getContainer.mockReturnValue({
        items: {
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({ resources: mockData })
          })
        }
      });

      const result = await availabilityRepository.getAvailabilityData('2025-11-15');
      
      expect(result).toHaveLength(1);
      expect(result[0].facilityName).toBe('あんさんぶるStudio和(本郷)');
      expect(result[0].timeSlots['13-17']).toBe('booked');
      expect(cosmosClient.initialize).toHaveBeenCalled();
    });

    test('should fallback to JSON file when Cosmos DB fails', async () => {
      // Cosmos DBエラーをシミュレート
      cosmosClient.initialize.mockRejectedValue(new Error('Connection failed'));
      
      // JSONファイル存在確認モック
      const originalExistsSync = fs.existsSync;
      const originalReadFileSync = fs.readFileSync;
      
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
        data: {
          '2025-11-15': [
            {
              facilityName: 'あんさんぶるStudio和(本郷)',
              timeSlots: { '9-12': 'available', '13-17': 'available', '18-21': 'booked' }
            }
          ]
        }
      }));

      const result = await availabilityRepository.getAvailabilityData('2025-11-15');
      
      expect(result).toHaveLength(1);
      expect(result[0].facilityName).toBe('あんさんぶるStudio和(本郷)');
      
      // クリーンアップ
      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
    });

    test('should return empty array when no data exists', async () => {
      const result = await availabilityRepository.getAvailabilityData('2025-12-31');
      expect(result).toEqual([]);
    });

    test('should fallback to JSON when Cosmos DB returns empty', async () => {
      // Cosmos DBが空のデータを返す
      cosmosClient.getContainer.mockReturnValue({
        items: {
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({ resources: [] })
          })
        }
      });

      // JSONファイルにデータがある
      const originalExistsSync = fs.existsSync;
      const originalReadFileSync = fs.readFileSync;
      
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
        data: {
          '2025-11-15': [
            {
              facilityName: 'あんさんぶるStudio和(本郷)',
              timeSlots: { '9-12': 'available', '13-17': 'booked', '18-21': 'available' }
            }
          ]
        }
      }));

      const result = await availabilityRepository.getAvailabilityData('2025-11-15');
      
      expect(result).toHaveLength(1);
      expect(result[0].facilityName).toBe('あんさんぶるStudio和(本郷)');
      
      // クリーンアップ
      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
    });
  });

  describe('getAllAvailabilityData', () => {
    test('should return all data from Cosmos DB', async () => {
      const mockData = [
        {
          date: '2025-11-15',
          facilityName: 'あんさんぶるStudio和(本郷)',
          timeSlots: { '9-12': 'available', '13-17': 'booked', '18-21': 'available' },
          updatedAt: '2025-08-25T10:00:00Z'
        },
        {
          date: '2025-11-16',
          facilityName: 'あんさんぶるStudio音(初台)',
          timeSlots: { '9-12': 'booked', '13-17': 'booked', '18-21': 'available' },
          updatedAt: '2025-08-25T10:00:00Z'
        }
      ];

      cosmosClient.getContainer.mockReturnValue({
        items: {
          readAll: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({ resources: mockData })
          })
        }
      });

      const result = await availabilityRepository.getAllAvailabilityData();
      
      expect(result['2025-11-15']).toBeDefined();
      expect(result['2025-11-16']).toBeDefined();
      expect(result['2025-11-15'][0].facilityName).toBe('あんさんぶるStudio和(本郷)');
    });

    test('should fallback to JSON file when Cosmos DB fails', async () => {
      // Cosmos DBエラーをシミュレート
      cosmosClient.initialize.mockRejectedValue(new Error('Connection failed'));
      
      // JSONファイルモック
      const originalExistsSync = fs.existsSync;
      const originalReadFileSync = fs.readFileSync;
      
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
        data: {
          '2025-11-15': [
            {
              facilityName: 'あんさんぶるStudio和(本郷)',
              timeSlots: { '9-12': 'available', '13-17': 'booked', '18-21': 'available' }
            }
          ],
          '2025-11-16': [
            {
              facilityName: 'あんさんぶるStudio音(初台)',
              timeSlots: { '9-12': 'booked', '13-17': 'booked', '18-21': 'available' }
            }
          ]
        }
      }));

      const result = await availabilityRepository.getAllAvailabilityData();
      
      expect(result['2025-11-15']).toBeDefined();
      expect(result['2025-11-16']).toBeDefined();
      
      // クリーンアップ
      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
    });

    test('should throw error when no data source is available', async () => {
      // Cosmos DBエラー
      cosmosClient.initialize.mockRejectedValue(new Error('Connection failed'));
      
      // JSONファイルも存在しない
      const originalExistsSync = fs.existsSync;
      fs.existsSync = jest.fn().mockReturnValue(false);

      await expect(availabilityRepository.getAllAvailabilityData()).rejects.toThrow(
        'Data source not available'
      );
      
      // クリーンアップ
      fs.existsSync = originalExistsSync;
    });
  });
});