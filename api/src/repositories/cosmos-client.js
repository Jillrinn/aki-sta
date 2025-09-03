const { CosmosClient } = require('@azure/cosmos');

// ローカル開発時のみdotenvを読み込み
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
}

class CosmosDBClient {
  constructor() {
    this.client = null;
    this.database = null;
    this.containers = {};
    this.lastInitialized = null;
    this.connectionTimeout = 30000; // 30秒のタイムアウト
  }

  async initialize() {
    // 接続の有効性をチェック
    if (this.client && await this.isConnectionValid()) {
      return;
    }

    // 再接続を試みる
    await this.reconnect();
  }

  async isConnectionValid() {
    if (!this.client || !this.database) {
      return false;
    }

    try {
      // 簡単なヘルスチェッククエリを実行
      await this.database.read();
      return true;
    } catch (error) {
      console.log('Connection validation failed:', error.message);
      return false;
    }
  }

  async reconnect() {
    console.log('Reconnecting to Cosmos DB...');
    
    // 既存の接続をリセット
    this.client = null;
    this.database = null;
    this.containers = {};

    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;
    const databaseId = process.env.COSMOS_DATABASE || 'studio-reservations';

    if (!endpoint || !key) {
      const missingVars = [];
      if (!endpoint) missingVars.push('COSMOS_ENDPOINT');
      if (!key) missingVars.push('COSMOS_KEY');
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    this.client = new CosmosClient({ 
      endpoint, 
      key,
      connectionPolicy: {
        requestTimeout: this.connectionTimeout,
        enableEndpointDiscovery: true,
        useMultipleWriteLocations: false,
        retryOptions: {
          maxRetryAttemptCount: 3,
          fixedRetryIntervalInMilliseconds: 1000,
          maxWaitTimeInSeconds: 30
        }
      }
    });
    
    // データベース作成または参照
    const { database } = await this.client.databases.createIfNotExists({ id: databaseId });
    this.database = database;

    // コンテナ作成または参照
    await this.createContainers();
    
    this.lastInitialized = new Date();
    console.log('Successfully reconnected to Cosmos DB');
  }

  async initializeWithRetry(maxRetries = 3) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.initialize();
        return;
      } catch (error) {
        lastError = error;
        console.error(`Initialization attempt ${i + 1} failed:`, error.message);
        
        if (i < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, i) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed to initialize Cosmos DB after ${maxRetries} attempts: ${lastError?.message}`);
  }

  async createContainers() {
    // availabilityコンテナ
    const { container: availability } = await this.database.containers.createIfNotExists({
      id: 'availability',
      partitionKey: { paths: ['/date'] }
    });
    this.containers.availability = availability;

    // target_datesコンテナ
    const { container: targetDates } = await this.database.containers.createIfNotExists({
      id: 'target_dates',
      partitionKey: { paths: ['/date'] }
    });
    this.containers.target_dates = targetDates;

    // rate_limitsコンテナ
    const { container: rateLimits } = await this.database.containers.createIfNotExists({
      id: 'rate_limits',
      partitionKey: { paths: ['/date'] }
    });
    this.containers.rate_limits = rateLimits;
  }

  getContainer(name) {
    return this.containers[name];
  }
}

// シングルトンインスタンス
const cosmosClient = new CosmosDBClient();

module.exports = cosmosClient;