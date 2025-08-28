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
  }

  async initialize() {
    if (this.client) return;

    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;
    const databaseId = process.env.COSMOS_DATABASE || 'studio-reservations';

    if (!endpoint || !key) {
      throw new Error('Cosmos DB connection settings are missing');
    }

    this.client = new CosmosClient({ endpoint, key });
    
    // データベース作成または参照
    const { database } = await this.client.databases.createIfNotExists({ id: databaseId });
    this.database = database;

    // コンテナ作成または参照
    await this.createContainers();
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
    this.containers.targetDates = targetDates;

    // rate_limitsコンテナ
    const { container: rateLimits } = await this.database.containers.createIfNotExists({
      id: 'rate_limits',
      partitionKey: { paths: ['/date'] }
    });
    this.containers.rateLimits = rateLimits;
  }

  getContainer(name) {
    return this.containers[name];
  }
}

// シングルトンインスタンス
const cosmosClient = new CosmosDBClient();

module.exports = cosmosClient;