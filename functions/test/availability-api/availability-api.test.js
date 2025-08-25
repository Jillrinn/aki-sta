const httpFunction = require('../../src/functions/availability-api');
const mockFallbackData = require('../../src/repositories/fallback-data.json');

// リポジトリをモック化
jest.mock('../../src/repositories/availability-repository', () => ({
  getAvailabilityData: jest.fn(),
  getAllAvailabilityData: jest.fn()
}));

jest.mock('../../src/repositories/availability-repository-cosmos', () => ({
  getAvailabilityData: jest.fn(),
  getAllAvailabilityData: jest.fn()
}));

const availabilityRepository = require('../../src/repositories/availability-repository');
const availabilityRepositoryCosmos = require('../../src/repositories/availability-repository-cosmos');

describe('Availability API', () => {
  let context;
  let request;

  beforeEach(() => {
    context = {
      log: {
        error: jest.fn()
      },
      bindingData: {},
      res: null
    };
    request = {};
    // モックをリセット
    jest.clearAllMocks();
    // 環境変数をクリア
    delete process.env.COSMOS_ENDPOINT;
    delete process.env.COSMOS_KEY;
  });

  test('should return data for valid date', async () => {
    // モックデータを設定
    availabilityRepository.getAvailabilityData.mockReturnValue(mockFallbackData['2025-11-15']);
    
    context.bindingData.date = '2025-11-15';
    
    await httpFunction(context, request);
    
    expect(context.res.status).toBe(200);
    expect(context.res.body.date).toBe('2025-11-15');
    expect(context.res.body.facilities).toHaveLength(2);
    expect(context.res.body.facilities[0].facilityName).toBe('Ensemble Studio 本郷');
    expect(context.res.body.facilities[1].facilityName).toBe('Ensemble Studio 初台');
  });

  test('should return empty array for date with no data', async () => {
    // 空配列を返すようにモック設定
    availabilityRepository.getAvailabilityData.mockReturnValue([]);
    
    context.bindingData.date = '2025-12-01';
    
    await httpFunction(context, request);
    
    expect(context.res.status).toBe(200);
    expect(context.res.body.date).toBe('2025-12-01');
    expect(context.res.body.facilities).toEqual([]);
  });

  test('should return all data when date is missing', async () => {
    // 全データを返すようにモック設定
    const mockAllData = {
      '2025-11-15': mockFallbackData['2025-11-15'],
      '2025-11-16': mockFallbackData['2025-11-16']
    };
    availabilityRepository.getAllAvailabilityData.mockResolvedValue(mockAllData);
    
    context.bindingData.date = null;
    
    await httpFunction(context, request);
    
    expect(context.res.status).toBe(200);
    expect(context.res.body).toEqual(mockAllData);
    expect(context.res.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  test('should return 503 when getAllAvailabilityData throws error', async () => {
    // リポジトリがエラーをスローするようにモック設定
    availabilityRepository.getAllAvailabilityData.mockRejectedValue(
      new Error('Data source not available')
    );
    
    context.bindingData.date = null;
    
    await httpFunction(context, request);
    
    expect(context.res.status).toBe(503);
    expect(context.res.body.error).toBe('Service temporarily unavailable');
    expect(context.res.body.details).toBe('Data source not available');
    expect(context.log.error).toHaveBeenCalledWith(
      'Failed to get all availability data:',
      'Data source not available'
    );
  });

  test('should return 503 when repository throws error', async () => {
    // リポジトリがエラーをスローするようにモック設定
    availabilityRepository.getAvailabilityData.mockImplementation(() => {
      throw new Error('Data source not available');
    });
    
    context.bindingData.date = '2025-11-15';
    
    await httpFunction(context, request);
    
    expect(context.res.status).toBe(503);
    expect(context.res.body.error).toBe('Service temporarily unavailable');
    expect(context.res.body.details).toBe('Data source not available');
    expect(context.log.error).toHaveBeenCalledWith(
      'Failed to get availability data for 2025-11-15:',
      'Data source not available'
    );
  });

  test('should include CORS headers in all responses', async () => {
    // 成功ケース
    availabilityRepository.getAvailabilityData.mockReturnValue([]);
    context.bindingData.date = '2025-11-15';
    
    await httpFunction(context, request);
    
    expect(context.res.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(context.res.headers['Content-Type']).toBe('application/json');
    
    // エラーケース
    context.bindingData.date = null;
    await httpFunction(context, request);
    
    expect(context.res.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(context.res.headers['Content-Type']).toBe('application/json');
  });

  test('should handle JSON parse errors from repository', async () => {
    // JSONパースエラーをシミュレート
    availabilityRepository.getAvailabilityData.mockImplementation(() => {
      throw new Error('Failed to read availability data: Unexpected token');
    });
    
    context.bindingData.date = '2025-11-15';
    
    await httpFunction(context, request);
    
    expect(context.res.status).toBe(503);
    expect(context.res.body.error).toBe('Service temporarily unavailable');
    expect(context.res.body.details).toContain('Failed to read availability data');
  });

  test('should use Cosmos DB repository when environment variables are set', async () => {
    // Cosmos DB環境変数を設定
    process.env.COSMOS_ENDPOINT = 'https://test.documents.azure.com:443/';
    process.env.COSMOS_KEY = 'test-key';
    
    // Cosmos DBリポジトリのモックデータを設定
    availabilityRepositoryCosmos.getAvailabilityData.mockResolvedValue(mockFallbackData['2025-11-15']);
    
    context.bindingData.date = '2025-11-15';
    
    await httpFunction(context, request);
    
    expect(context.res.status).toBe(200);
    expect(context.res.body.date).toBe('2025-11-15');
    expect(context.res.body.facilities).toHaveLength(2);
    
    // Cosmos DBリポジトリが呼ばれたことを確認
    expect(availabilityRepositoryCosmos.getAvailabilityData).toHaveBeenCalledWith('2025-11-15');
    // 通常のリポジトリが呼ばれていないことを確認
    expect(availabilityRepository.getAvailabilityData).not.toHaveBeenCalled();
  });

  test('should use file repository when Cosmos DB environment variables are not set', async () => {
    // Cosmos DB環境変数が設定されていない状態（beforeEachでクリア済み）
    
    // ファイルリポジトリのモックデータを設定
    availabilityRepository.getAvailabilityData.mockReturnValue(mockFallbackData['2025-11-15']);
    
    context.bindingData.date = '2025-11-15';
    
    await httpFunction(context, request);
    
    expect(context.res.status).toBe(200);
    expect(context.res.body.date).toBe('2025-11-15');
    
    // ファイルリポジトリが呼ばれたことを確認
    expect(availabilityRepository.getAvailabilityData).toHaveBeenCalledWith('2025-11-15');
    // Cosmos DBリポジトリが呼ばれていないことを確認  
    expect(availabilityRepositoryCosmos.getAvailabilityData).not.toHaveBeenCalled();
  });
});