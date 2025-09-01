const cosmosClient = require('./cosmos-client');

class RateLimitsRepository {
  async initialize() {
    await cosmosClient.initialize();
    this.container = cosmosClient.getContainer('rateLimits');
  }

  async getTodayRecord() {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const { resources } = await this.container.items
        .query({
          query: 'SELECT * FROM c WHERE c.date = @date',
          parameters: [{ name: '@date', value: today }]
        })
        .fetchAll();
      
      return resources.length > 0 ? resources[0] : null;
    } catch (error) {
      console.error('Error fetching rate limit record:', error);
      throw error;
    }
  }

  async createOrUpdateRecord(status) {
    const today = new Date().toISOString().split('T')[0];
    const existingRecord = await this.getTodayRecord();

    if (existingRecord) {
      // 既存レコードがある場合
      if (existingRecord.status === 'pending' || existingRecord.status === 'running') {
        // すでに実行中の場合はそのまま返す
        return {
          isAlreadyRunning: true,
          record: existingRecord
        };
      }

      // completed状態の場合はcountを増やして新しいリクエストとして処理
      const updatedRecord = {
        ...existingRecord,
        count: (existingRecord.count || 0) + 1,
        status: status,
        lastRequestedAt: new Date().toISOString()
      };

      const { resource } = await this.container
        .item(existingRecord.id, today)
        .replace(updatedRecord);

      return {
        isAlreadyRunning: false,
        record: resource
      };
    } else {
      // 新規レコードを作成
      const newRecord = {
        id: `rate-limit-${today}`,
        date: today,
        count: 1,
        status: status,
        lastRequestedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      const { resource } = await this.container.items.create(newRecord);
      
      return {
        isAlreadyRunning: false,
        record: resource
      };
    }
  }

  async updateStatus(recordId, date, status) {
    try {
      const { resource: existingRecord } = await this.container
        .item(recordId, date)
        .read();

      if (!existingRecord) {
        throw new Error(`Record not found: ${recordId}`);
      }

      const updatedRecord = {
        ...existingRecord,
        status: status,
        updatedAt: new Date().toISOString()
      };

      const { resource } = await this.container
        .item(recordId, date)
        .replace(updatedRecord);

      return resource;
    } catch (error) {
      console.error('Error updating rate limit status:', error);
      throw error;
    }
  }

  async getAllRecords() {
    try {
      await this.initialize();
      const { resources } = await this.container.items
        .readAll()
        .fetchAll();
      
      // 日付でソートして返す
      return resources.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('Error fetching all rate limit records:', error);
      throw new Error(`Failed to get rate limit records from Cosmos DB: ${error.message}`);
    }
  }

  async getRecord(date) {
    try {
      await this.initialize();
      const { resources } = await this.container.items
        .query({
          query: 'SELECT * FROM c WHERE c.date = @date',
          parameters: [{ name: '@date', value: date }]
        })
        .fetchAll();
      
      if (resources.length === 0) {
        throw new Error(`Rate limit record for ${date} not found`);
      }
      
      return resources[0];
    } catch (error) {
      if (error.message.includes('not found')) {
        throw error;
      }
      console.error('Error fetching rate limit record:', error);
      throw new Error(`Failed to get rate limit record from Cosmos DB: ${error.message}`);
    }
  }

  async deleteRecordById(id) {
    try {
      await this.initialize();
      
      // IDから日付部分を抽出（パーティションキー用）
      // ID形式: rate-limit-YYYY-MM-DD
      const match = id.match(/^rate-limit-(\d{4}-\d{2}-\d{2})$/);
      if (!match) {
        throw new Error(`Invalid ID format: ${id}`);
      }
      const date = match[1];
      
      // 削除実行（パーティションキーはdate）
      await this.container.item(id, date).delete();
      
      return { 
        success: true, 
        message: `Rate limit record with ID ${id} deleted successfully` 
      };
    } catch (error) {
      if (error.code === 404) {
        console.warn(`Rate limit record not found: ${id}`);
        throw new Error(`Rate limit record with ID ${id} not found`);
      }
      console.error('Failed to delete rate limit record:', error);
      throw new Error(`Failed to delete rate limit record from Cosmos DB: ${error.message}`);
    }
  }
}

const rateLimitsRepository = new RateLimitsRepository();
module.exports = rateLimitsRepository;