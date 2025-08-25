const cosmosClient = require('../../src/repositories/cosmos-client');

describe('Cosmos DB Client', () => {
  beforeEach(() => {
    // 環境変数の設定
    process.env.COSMOS_ENDPOINT = 'https://test.documents.azure.com:443/';
    process.env.COSMOS_KEY = 'test-key';
    process.env.COSMOS_DATABASE = 'test-database';
  });

  afterEach(() => {
    // クリーンアップ
    delete process.env.COSMOS_ENDPOINT;
    delete process.env.COSMOS_KEY;
    delete process.env.COSMOS_DATABASE;
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
});