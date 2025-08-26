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
      'Cosmos DB connection settings are missing'
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
  
  test('should not reinitialize if already initialized', async () => {
    const { CosmosClient } = require('@azure/cosmos');
    
    // モックの設定
    const mockDatabase = {
      containers: {
        createIfNotExists: jest.fn().mockResolvedValue({
          container: { id: 'test-container' }
        })
      }
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
    
    // 2回目の初期化（早期リターンのテスト）
    await cosmosClient.initialize();
    expect(CosmosClient).toHaveBeenCalledTimes(1); // 新しいクライアントが作成されていないことを確認
    expect(cosmosClient.client).toBe(mockClient); // 同じクライアントインスタンスを保持
  });
});