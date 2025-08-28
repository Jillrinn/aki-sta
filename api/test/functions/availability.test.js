const app = require('../../src/functions/availability');
const mockFallbackData = require('../../../functions/src/repositories/fallback-data.json');

// Cosmos DBリポジトリをモック化
jest.mock('../../src/repositories/availability-repository', () => ({
  getAvailabilityData: jest.fn(),
  getAllAvailabilityData: jest.fn()
}));

const availabilityRepository = require('../../src/repositories/availability-repository');

describe('Availability API v4', () => {
  let context;
  let request;
  let consoleErrorSpy;

  beforeEach(() => {
    context = {
      log: {
        error: jest.fn()
      }
    };
    request = {
      method: 'GET',
      params: {},
      headers: {}
    };
    // モックをリセット
    jest.clearAllMocks();
    // console.errorをモック化
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // console.errorのモックを復元
    consoleErrorSpy.mockRestore();
  });

  test('should return data for valid date', async () => {
    // モックデータを設定
    availabilityRepository.getAvailabilityData.mockResolvedValue(mockFallbackData['2025-11-15']);
    
    request.params.date = '2025-11-15';
    
    // availability関数を直接呼び出し（v4では関数を手動でテスト）
    const availabilityHandler = app._registrations.find(r => r.functionName === 'availability').handler;
    const response = await availabilityHandler(request, context);
    
    expect(response.status).toBe(200);
    expect(response.jsonBody.date).toBe('2025-11-15');
    expect(response.jsonBody.facilities).toHaveLength(2);
    expect(response.jsonBody.facilities[0].facilityName).toBe('Ensemble Studio 本郷');
    expect(response.jsonBody.facilities[1].facilityName).toBe('Ensemble Studio 初台');
  });

  test('should return empty array for date with no data', async () => {
    // 空配列を返すようにモック設定
    availabilityRepository.getAvailabilityData.mockResolvedValue([]);
    
    request.params.date = '2025-12-01';
    
    const availabilityHandler = app._registrations.find(r => r.functionName === 'availability').handler;
    const response = await availabilityHandler(request, context);
    
    expect(response.status).toBe(200);
    expect(response.jsonBody.date).toBe('2025-12-01');
    expect(response.jsonBody.facilities).toEqual([]);
  });

  test('should return all data when date is missing', async () => {
    // 全データを返すようにモック設定
    const mockAllData = {
      '2025-11-15': mockFallbackData['2025-11-15'],
      '2025-11-16': mockFallbackData['2025-11-16']
    };
    availabilityRepository.getAllAvailabilityData.mockResolvedValue(mockAllData);
    
    // dateパラメータを設定しない（undefined）
    
    const availabilityHandler = app._registrations.find(r => r.functionName === 'availability').handler;
    const response = await availabilityHandler(request, context);
    
    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual(mockAllData);
  });

  test('should return 503 when getAllAvailabilityData throws error', async () => {
    // リポジトリがエラーをスローするようにモック設定
    availabilityRepository.getAllAvailabilityData.mockRejectedValue(
      new Error('Data source not available')
    );
    
    // dateパラメータを設定しない（undefined）
    
    const availabilityHandler = app._registrations.find(r => r.functionName === 'availability').handler;
    const response = await availabilityHandler(request, context);
    
    expect(response.status).toBe(503);
    expect(response.jsonBody.error).toBe('Service temporarily unavailable');
    expect(response.jsonBody.details).toBe('Data source not available');
    expect(context.log.error).toHaveBeenCalledWith(
      'Failed to get availability data: Data source not available'
    );
  });

  test('should return 503 when repository throws error', async () => {
    // リポジトリがエラーをスローするようにモック設定
    availabilityRepository.getAvailabilityData.mockRejectedValue(
      new Error('Data source not available')
    );
    
    request.params.date = '2025-11-15';
    
    const availabilityHandler = app._registrations.find(r => r.functionName === 'availability').handler;
    const response = await availabilityHandler(request, context);
    
    expect(response.status).toBe(503);
    expect(response.jsonBody.error).toBe('Service temporarily unavailable');
    expect(response.jsonBody.details).toBe('Data source not available');
    expect(context.log.error).toHaveBeenCalledWith(
      'Failed to get availability data: Data source not available'
    );
  });

  test('should use Cosmos DB repository (Pure Cosmos DB architecture)', async () => {
    // Cosmos DBリポジトリのモックデータを設定
    availabilityRepository.getAvailabilityData.mockResolvedValue(mockFallbackData['2025-11-15']);
    
    request.params.date = '2025-11-15';
    
    const availabilityHandler = app._registrations.find(r => r.functionName === 'availability').handler;
    const response = await availabilityHandler(request, context);
    
    expect(response.status).toBe(200);
    expect(response.jsonBody.date).toBe('2025-11-15');
    expect(response.jsonBody.facilities).toHaveLength(2);
    
    // Cosmos DBリポジトリが呼ばれたことを確認
    expect(availabilityRepository.getAvailabilityData).toHaveBeenCalledWith('2025-11-15');
  });
});