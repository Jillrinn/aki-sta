const cosmosClient = require('./cosmos-client');

module.exports = {
  getAvailabilityData: async (date) => {
    try {
      // Cosmos DBから取得を試みる
      await cosmosClient.initialize();
      const container = cosmosClient.getContainer('availability');
      
      const querySpec = {
        query: "SELECT * FROM c WHERE c.date = @date",
        parameters: [{ name: "@date", value: date }]
      };
      
      const { resources } = await container.items
        .query(querySpec)
        .fetchAll();
      
      if (resources && resources.length > 0) {
        // Cosmos DBからデータを整形して返す（3層構造）
        return resources.map(item => ({
          centerName: item.centerName,
          facilityName: item.facilityName,
          roomName: item.roomName,
          timeSlots: item.timeSlots,
          lastUpdated: item.updatedAt
        }));
      }
      
      // データが存在しない場合は空配列を返す
      return [];
    } catch (error) {
      console.error('Cosmos DB read error:', error);
      throw new Error(`Failed to read availability data from Cosmos DB: ${error.message}`);
    }
  },
  
  getAllAvailabilityData: async () => {
    try {
      // Cosmos DBから全データ取得
      await cosmosClient.initialize();
      const container = cosmosClient.getContainer('availability');
      
      const { resources } = await container.items
        .readAll()
        .fetchAll();
      
      if (resources && resources.length > 0) {
        // 日付でグループ化
        const groupedData = {};
        resources.forEach(item => {
          if (!groupedData[item.date]) {
            groupedData[item.date] = [];
          }
          groupedData[item.date].push({
            centerName: item.centerName,
            facilityName: item.facilityName,
            roomName: item.roomName,
            timeSlots: item.timeSlots,
            lastUpdated: item.updatedAt
          });
        });
        return groupedData;
      }
      
      // データが存在しない場合は空オブジェクトを返す
      return {};
    } catch (error) {
      console.error('Cosmos DB read all error:', error);
      throw new Error(`Failed to read all availability data from Cosmos DB: ${error.message}`);
    }
  },

  deleteAvailabilityById: async (id) => {
    try {
      await cosmosClient.initialize();
      const container = cosmosClient.getContainer('availability');
      
      // IDから日付部分を抽出（パーティションキー用）
      // ID形式: date_facilityName (例: 2025-12-25_あんさんぶるStudio和(本郷))
      const datePart = id.split('_')[0];
      
      if (!datePart || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        throw new Error(`Invalid ID format: ${id}`);
      }
      
      // 削除実行（パーティションキーはdate）
      await container.item(id, datePart).delete();
      
      return { 
        success: true, 
        message: `Availability data with ID ${id} deleted successfully` 
      };
    } catch (error) {
      if (error.code === 404) {
        console.warn(`Availability data not found: ${id}`);
        throw new Error(`Availability data with ID ${id} not found`);
      }
      console.error('Failed to delete availability data:', error);
      throw new Error(`Failed to delete availability data from Cosmos DB: ${error.message}`);
    }
  }
};