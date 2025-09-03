// 環境変数を読み込み（テスト実行時）
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

// CosmosClientをモック化（jest.mockは常にトップレベルで実行する必要がある）
jest.mock('../../src/repositories/cosmos-client');
// retry-helperをモック化
jest.mock('../../src/utils/retry-helper', () => ({
  retryWithBackoff: jest.fn((fn) => fn())
}));

const cosmosClient = require('../../src/repositories/cosmos-client');
const availabilityRepository = require('../../src/repositories/availability-repository');

describe('Availability Repository with Cosmos DB (Pure)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAvailabilityData', () => {
    test('should return data from Cosmos DB when available', async () => {
      // モックの設定
      const mockContainer = {
        items: {
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({
              resources: [
                {
                  facilityName: 'あんさんぶるStudio和(本郷)',
                  timeSlots: {
                    'morning': 'available',
                    'afternoon': 'booked',
                    'evening': 'available'
                  },
                  updatedAt: '2025-08-24T14:18:03Z'
                }
              ]
            })
          })
        }
      };

      cosmosClient.initializeWithRetry = jest.fn().mockResolvedValue();
      cosmosClient.getContainer = jest.fn().mockReturnValue(mockContainer);

      const result = await availabilityRepository.getAvailabilityData('2025-11-15');
      
      expect(result).toHaveLength(1);
      expect(result[0].facilityName).toBe('あんさんぶるStudio和(本郷)');
      expect(result[0].timeSlots).toEqual({
        'morning': 'available',
        'afternoon': 'booked',
        'evening': 'available'
      });
      expect(result[0].lastUpdated).toBe('2025-08-24T14:18:03Z');
    });

    test('should return empty array when no data exists', async () => {
      const mockContainer = {
        items: {
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({ resources: [] })
          })
        }
      };

      cosmosClient.initializeWithRetry = jest.fn().mockResolvedValue();
      cosmosClient.getContainer = jest.fn().mockReturnValue(mockContainer);

      const result = await availabilityRepository.getAvailabilityData('2025-12-31');
      expect(result).toEqual([]);
    });

    test('should throw error when Cosmos DB fails', async () => {
      cosmosClient.initializeWithRetry = jest.fn().mockRejectedValue(new Error('Connection failed'));

      await expect(availabilityRepository.getAvailabilityData('2025-11-15'))
        .rejects.toThrow('Failed to read availability data from Cosmos DB after retries');
    });
  });

  describe('getAllAvailabilityData', () => {
    test('should return all data from Cosmos DB', async () => {
      const mockContainer = {
        items: {
          readAll: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({
              resources: [
                {
                  date: '2025-11-15',
                  facilityName: 'あんさんぶるStudio和(本郷)',
                  timeSlots: { 'morning': 'available' },
                  updatedAt: '2025-08-24T14:18:03Z'
                },
                {
                  date: '2025-11-16',
                  facilityName: 'あんさんぶるStudio音(初台)',
                  timeSlots: { 'morning': 'booked' },
                  updatedAt: '2025-08-24T14:20:03Z'
                }
              ]
            })
          })
        }
      };

      cosmosClient.initializeWithRetry = jest.fn().mockResolvedValue();
      cosmosClient.getContainer = jest.fn().mockReturnValue(mockContainer);

      const result = await availabilityRepository.getAllAvailabilityData();
      
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['2025-11-15']).toBeDefined();
      expect(result['2025-11-16']).toBeDefined();
    });

    test('should return empty object when no data exists', async () => {
      const mockContainer = {
        items: {
          readAll: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({ resources: [] })
          })
        }
      };

      cosmosClient.initializeWithRetry = jest.fn().mockResolvedValue();
      cosmosClient.getContainer = jest.fn().mockReturnValue(mockContainer);

      const result = await availabilityRepository.getAllAvailabilityData();
      expect(result).toEqual({});
    });

    test('should throw error when Cosmos DB fails', async () => {
      cosmosClient.initializeWithRetry = jest.fn().mockRejectedValue(new Error('Connection failed'));

      await expect(availabilityRepository.getAllAvailabilityData())
        .rejects.toThrow('Failed to read all availability data from Cosmos DB after retries');
    });
  });
});