const cosmosClient = require('../../src/repositories/cosmos-client');

jest.mock('@azure/cosmos');

describe('Cosmos DB Client', () => {
  beforeEach(() => {
    // 環境変数の設定
    process.env.COSMOS_ENDPOINT = 'https://test.documents.azure.com:443/';
    process.env.COSMOS_KEY = 'test-key';
    process.env.COSMOS_DATABASE = 'test-database';
    
    // クライアントをリセット
    cosmosClient.client = null;
    cosmosClient.database = null;
    cosmosClient.containers = {};
  });

  afterEach(() => {
    // クリーンアップ
    delete process.env.COSMOS_ENDPOINT;
    delete process.env.COSMOS_KEY;
    delete process.env.COSMOS_DATABASE;
    
    // クライアントをリセット
    cosmosClient.client = null;
    cosmosClient.database = null;
    cosmosClient.containers = {};
  });

  test('should throw error when connection settings are missing', async () => {
    delete process.env.COSMOS_ENDPOINT;
    
    await expect(cosmosClient.initialize()).rejects.toThrow(
      'Missing environment variables: COSMOS_ENDPOINT'
    );
  });

  test('should throw error with all missing environment variables', async () => {
    delete process.env.COSMOS_ENDPOINT;
    delete process.env.COSMOS_KEY;
    delete process.env.COSMOS_DATABASE;
    
    await expect(cosmosClient.initialize()).rejects.toThrow(
      'Missing environment variables: COSMOS_ENDPOINT, COSMOS_KEY'
    );
  });

  test('should throw error when only COSMOS_KEY is missing', async () => {
    delete process.env.COSMOS_KEY;
    
    await expect(cosmosClient.initialize()).rejects.toThrow(
      'Missing environment variables: COSMOS_KEY'
    );
  });

  test('should throw error when only COSMOS_ENDPOINT is missing', async () => {
    delete process.env.COSMOS_ENDPOINT;
    
    await expect(cosmosClient.initialize()).rejects.toThrow(
      'Missing environment variables: COSMOS_ENDPOINT'
    );
  });

  test('should get container by name', () => {
    // コンテナのモック設定
    cosmosClient.containers = {
      availability: { id: 'availability' },
      target_dates: { id: 'target_dates' },
      rate_limits: { id: 'rate_limits' }
    };

    const container = cosmosClient.getContainer('availability');
    expect(container).toBeDefined();
    expect(container.id).toBe('availability');
  });
  
  test('should reinitialize when connection validation fails', async () => {
    const { CosmosClient } = require('@azure/cosmos');
    
    // モックの設定
    const mockDatabase = {
      containers: {
        createIfNotExists: jest.fn().mockResolvedValue({
          container: { id: 'test-container' }
        })
      },
      read: jest.fn()
        .mockRejectedValueOnce(new Error('Connection lost')) // First validation fails
        .mockResolvedValue({}) // Second validation succeeds
    };
    
    const mockClient = {
      databases: {
        createIfNotExists: jest.fn().mockResolvedValue({
          database: mockDatabase
        })
      }
    };
    
    CosmosClient.mockImplementation(() => mockClient);
    
    // 最初の初期化
    await cosmosClient.initialize();
    expect(cosmosClient.client).toBe(mockClient);
    expect(CosmosClient).toHaveBeenCalledTimes(1);
    
    // 2回目の初期化（接続検証が失敗するため再初期化される）
    await cosmosClient.initialize();
    expect(CosmosClient).toHaveBeenCalledTimes(2); // 接続検証失敗により再初期化
    expect(cosmosClient.client).toBe(mockClient);
  });
});