const cosmosClient = require('./cosmos-client');

module.exports = {
  getAllTargetDates: async () => {
    try {
      await cosmosClient.initialize();
      const container = cosmosClient.getContainer('targetDates');
      
      const { resources } = await container.items
        .readAll()
        .fetchAll();
      
      if (resources && resources.length > 0) {
        // 日付でソートして返す
        return resources.sort((a, b) => a.date.localeCompare(b.date));
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get all target dates:', error);
      throw new Error(`Failed to get target dates from Cosmos DB: ${error.message}`);
    }
  },

  deleteTargetDate: async (id) => {
    try {
      await cosmosClient.initialize();
      const container = cosmosClient.getContainer('targetDates');
      
      // IDとパーティションキーが同じ（日付）
      await container.item(id, id).delete();
      
      return { 
        success: true, 
        message: `Target date ${id} deleted successfully` 
      };
    } catch (error) {
      if (error.code === 404) {
        console.warn(`Target date not found: ${id}`);
        throw new Error(`Target date ${id} not found`);
      }
      console.error('Failed to delete target date:', error);
      throw new Error(`Failed to delete target date from Cosmos DB: ${error.message}`);
    }
  },

  insertTargetDate: async (date, label) => {
    try {
      // バリデーション
      if (!date || !label) {
        throw new Error('Date and label are required');
      }
      
      // 日付フォーマットの検証（YYYY-MM-DD）
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        throw new Error('Date must be in YYYY-MM-DD format');
      }
      
      await cosmosClient.initialize();
      const container = cosmosClient.getContainer('targetDates');
      
      const targetDate = {
        id: date,
        date: date,
        label: label,
        updatedAt: new Date().toISOString()
      };
      
      // upsertではなくcreateを使用（重複時はエラー）
      const { resource } = await container.items.create(targetDate);
      
      return resource;
    } catch (error) {
      if (error.code === 409) {
        console.warn(`Target date already exists: ${date}`);
        throw new Error(`Target date ${date} already exists`);
      }
      console.error('Failed to insert target date:', error);
      throw new Error(`Failed to insert target date to Cosmos DB: ${error.message}`);
    }
  }
};