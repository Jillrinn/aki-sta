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
        // Cosmos DBからデータを整形して返す
        return resources.map(item => ({
          facilityName: item.facilityName,
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
            facilityName: item.facilityName,
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
  }
};