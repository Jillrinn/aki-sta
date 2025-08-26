const cosmosClient = require('../../src/repositories/cosmos-client');
const availabilityRepository = require('../../src/repositories/availability-repository');

// 環境変数を使った実DBテストの場合はモックしない
const isRealDBTest = process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY && process.env.COSMOS_DATABASE;

// CosmosClientをモック化（実DBテスト以外）
if (!isRealDBTest) {
  jest.mock('../../src/repositories/cosmos-client');
}

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
                    '9-12': 'available',
                    '13-17': 'booked',
                    '18-21': 'available'
                  },
                  updatedAt: '2025-08-24T14:18:03Z'
                }
              ]
            })
          })
        }
      };

      cosmosClient.initialize = jest.fn().mockResolvedValue();
      cosmosClient.getContainer = jest.fn().mockReturnValue(mockContainer);

      const result = await availabilityRepository.getAvailabilityData('2025-11-15');
      
      expect(result).toHaveLength(1);
      expect(result[0].facilityName).toBe('あんさんぶるStudio和(本郷)');
      expect(result[0].timeSlots).toEqual({
        '9-12': 'available',
        '13-17': 'booked',
        '18-21': 'available'
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

      cosmosClient.initialize = jest.fn().mockResolvedValue();
      cosmosClient.getContainer = jest.fn().mockReturnValue(mockContainer);

      const result = await availabilityRepository.getAvailabilityData('2025-12-31');
      expect(result).toEqual([]);
    });

    test('should throw error when Cosmos DB fails', async () => {
      cosmosClient.initialize = jest.fn().mockRejectedValue(new Error('Connection failed'));

      await expect(availabilityRepository.getAvailabilityData('2025-11-15'))
        .rejects.toThrow('Failed to read availability data from Cosmos DB');
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
                  timeSlots: { '9-12': 'available' },
                  updatedAt: '2025-08-24T14:18:03Z'
                },
                {
                  date: '2025-11-16',
                  facilityName: 'あんさんぶるStudio音(初台)',
                  timeSlots: { '9-12': 'booked' },
                  updatedAt: '2025-08-24T14:20:03Z'
                }
              ]
            })
          })
        }
      };

      cosmosClient.initialize = jest.fn().mockResolvedValue();
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

      cosmosClient.initialize = jest.fn().mockResolvedValue();
      cosmosClient.getContainer = jest.fn().mockReturnValue(mockContainer);

      const result = await availabilityRepository.getAllAvailabilityData();
      expect(result).toEqual({});
    });

    test('should throw error when Cosmos DB fails', async () => {
      cosmosClient.initialize = jest.fn().mockRejectedValue(new Error('Connection failed'));

      await expect(availabilityRepository.getAllAvailabilityData())
        .rejects.toThrow('Failed to read all availability data from Cosmos DB');
    });
  });

  // 実DB接続テスト（環境変数が設定されている場合のみ実行）
  describe('getAllAvailabilityData with real DB connection', () => {
    const hasCosmosConfig = process.env.COSMOS_ENDPOINT && 
                           process.env.COSMOS_KEY && 
                           process.env.COSMOS_DATABASE;

    // 環境変数が設定されていない場合はスキップ
    const testOrSkip = hasCosmosConfig ? test : test.skip;

    testOrSkip('should retrieve all data from real Cosmos DB and validate structure', async () => {
      // 実際のCosmos DBリポジトリを使用（モックなし）
      const realRepository = require('../../src/repositories/availability-repository');
      
      // 実際のDBからデータ取得
      const result = await realRepository.getAllAvailabilityData();
      
      // 戻り値の型を検証
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
      
      // データが存在する場合の構造検証
      const dates = Object.keys(result);
      
      if (dates.length > 0) {
        // 各日付エントリの検証
        dates.forEach(date => {
          // 日付形式の検証（YYYY-MM-DD）
          expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          
          const facilities = result[date];
          expect(Array.isArray(facilities)).toBe(true);
          
          // 各施設データの構造検証
          facilities.forEach(facility => {
            // 必須フィールドの存在確認
            expect(facility).toHaveProperty('facilityName');
            expect(typeof facility.facilityName).toBe('string');
            
            expect(facility).toHaveProperty('timeSlots');
            expect(typeof facility.timeSlots).toBe('object');
            
            // 時間帯スロットの検証
            expect(facility.timeSlots).toHaveProperty('9-12');
            expect(facility.timeSlots).toHaveProperty('13-17');
            expect(facility.timeSlots).toHaveProperty('18-21');
            
            // 各スロットの値が有効か検証
            ['9-12', '13-17', '18-21'].forEach(slot => {
              const value = facility.timeSlots[slot];
              expect(['available', 'booked', 'unknown']).toContain(value);
            });
            
            // lastUpdatedフィールドの検証（オプション）
            if (facility.lastUpdated) {
              expect(typeof facility.lastUpdated).toBe('string');
              // ISO 8601形式の検証
              expect(facility.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/);
            }
          });
        });
        
        console.log(`✅ Successfully validated ${dates.length} date(s) with ${dates.reduce((sum, date) => sum + result[date].length, 0)} facility record(s)`);
      } else {
        console.log('⚠️ No data in database, but connection successful');
      }
    }, 30000); // タイムアウトを30秒に設定（DBアクセスのため）

    testOrSkip('should handle getAvailabilityData with real DB for specific date', async () => {
      const realRepository = require('../../src/repositories/availability-repository');
      
      // テスト用の未来の日付
      const testDate = '2025-12-31';
      
      // 実際のDBからデータ取得
      const result = await realRepository.getAvailabilityData(testDate);
      
      // 戻り値の型を検証
      expect(Array.isArray(result)).toBe(true);
      
      // データが存在する場合の構造検証
      if (result.length > 0) {
        result.forEach(facility => {
          expect(facility).toHaveProperty('facilityName');
          expect(facility).toHaveProperty('timeSlots');
          expect(facility.timeSlots).toHaveProperty('9-12');
          expect(facility.timeSlots).toHaveProperty('13-17');
          expect(facility.timeSlots).toHaveProperty('18-21');
        });
        console.log(`✅ Retrieved ${result.length} facility record(s) for ${testDate}`);
      } else {
        console.log(`⚠️ No data for ${testDate}, but query successful`);
      }
    }, 30000);
  });
});