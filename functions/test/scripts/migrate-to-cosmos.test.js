const fs = require('fs');
const { migrateAvailabilityData } = require('../../scripts/migrate-to-cosmos');
const cosmosClient = require('../../src/repositories/cosmos-client');

// モックの設定
jest.mock('../../src/repositories/cosmos-client');
jest.mock('fs');

describe('Data Migration to Cosmos DB', () => {
  let mockContainer;
  let consoleLogSpy;
  let consoleErrorSpy;
  
  beforeEach(() => {
    // console出力を抑制
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Cosmos DBコンテナのモック
    mockContainer = {
      items: {
        upsert: jest.fn().mockResolvedValue({ resource: {} })
      }
    };
    
    cosmosClient.initialize = jest.fn().mockResolvedValue();
    cosmosClient.getContainer = jest.fn().mockReturnValue(mockContainer);
    
    // fsのモック
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readFileSync = jest.fn();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
  
  test('should migrate all data from JSON to Cosmos DB', async () => {
    // JSONファイルのモックデータ
    const mockJsonData = {
      data: {
        '2025-11-15': [
          {
            facilityName: 'あんさんぶるStudio和(本郷)',
            timeSlots: { '9-12': 'available', '13-17': 'booked', '18-21': 'available' },
            lastUpdated: '2025-08-25T10:00:00Z'
          }
        ],
        '2025-11-16': [
          {
            facilityName: 'あんさんぶるStudio音(初台)',
            timeSlots: { '9-12': 'booked', '13-17': 'booked', '18-21': 'available' },
            lastUpdated: '2025-08-25T10:00:00Z'
          }
        ]
      }
    };
    
    fs.readFileSync.mockReturnValue(JSON.stringify(mockJsonData));
    
    await migrateAvailabilityData();
    
    // Cosmos DBの初期化が呼ばれたことを確認
    expect(cosmosClient.initialize).toHaveBeenCalled();
    expect(cosmosClient.getContainer).toHaveBeenCalledWith('availability');
    
    // 各ドキュメントがupsertされたことを確認
    expect(mockContainer.items.upsert).toHaveBeenCalledTimes(2);
    
    // 最初のドキュメント
    expect(mockContainer.items.upsert).toHaveBeenCalledWith({
      id: '2025-11-15_あんさんぶるStudio和-本郷-',
      date: '2025-11-15',
      facilityName: 'あんさんぶるStudio和(本郷)',
      timeSlots: { '9-12': 'available', '13-17': 'booked', '18-21': 'available' },
      updatedAt: '2025-08-25T10:00:00Z',
      partitionKey: '2025-11-15'
    });
    
    // 2番目のドキュメント
    expect(mockContainer.items.upsert).toHaveBeenCalledWith({
      id: '2025-11-16_あんさんぶるStudio音-初台-',
      date: '2025-11-16',
      facilityName: 'あんさんぶるStudio音(初台)',
      timeSlots: { '9-12': 'booked', '13-17': 'booked', '18-21': 'available' },
      updatedAt: '2025-08-25T10:00:00Z',
      partitionKey: '2025-11-16'
    });
  });
  
  test('should handle missing data file gracefully', async () => {
    fs.existsSync.mockReturnValue(false);
    
    await migrateAvailabilityData();
    
    // Cosmos DBの初期化が呼ばれていることを確認
    expect(cosmosClient.initialize).toHaveBeenCalled();
    
    // upsertが呼ばれていないことを確認
    expect(mockContainer.items.upsert).not.toHaveBeenCalled();
  });
  
  test('should handle invalid JSON structure', async () => {
    fs.readFileSync.mockReturnValue(JSON.stringify({ invalid: 'structure' }));
    
    await migrateAvailabilityData();
    
    // Cosmos DBの初期化が呼ばれていることを確認
    expect(cosmosClient.initialize).toHaveBeenCalled();
    
    // upsertが呼ばれていないことを確認
    expect(mockContainer.items.upsert).not.toHaveBeenCalled();
  });
  
  test('should handle Cosmos DB upsert errors', async () => {
    const mockJsonData = {
      data: {
        '2025-11-15': [
          {
            facilityName: 'あんさんぶるStudio和(本郷)',
            timeSlots: { '9-12': 'available', '13-17': 'booked', '18-21': 'available' }
          }
        ]
      }
    };
    
    fs.readFileSync.mockReturnValue(JSON.stringify(mockJsonData));
    
    // upsertでエラーをスロー
    mockContainer.items.upsert.mockRejectedValue(new Error('Upsert failed'));
    
    await migrateAvailabilityData();
    
    // エラーがキャッチされて処理が続行されることを確認
    expect(mockContainer.items.upsert).toHaveBeenCalled();
  });
  
  test('should handle missing lastUpdated field', async () => {
    const mockJsonData = {
      data: {
        '2025-11-15': [
          {
            facilityName: 'あんさんぶるStudio和(本郷)',
            timeSlots: { '9-12': 'available', '13-17': 'booked', '18-21': 'available' }
            // lastUpdatedが存在しない
          }
        ]
      }
    };
    
    fs.readFileSync.mockReturnValue(JSON.stringify(mockJsonData));
    
    await migrateAvailabilityData();
    
    // upsertが呼ばれたことを確認
    expect(mockContainer.items.upsert).toHaveBeenCalled();
    
    // updatedAtフィールドが自動生成されることを確認
    const callArg = mockContainer.items.upsert.mock.calls[0][0];
    expect(callArg.updatedAt).toBeDefined();
    expect(callArg.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});