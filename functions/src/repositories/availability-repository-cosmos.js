const fs = require('fs');
const path = require('path');
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
    } catch (error) {
      console.error('Cosmos DB read error:', error);
    }

    // フォールバック: JSONファイルから読み込み（移行期間中の暫定対応）
    const scrapedDataPath = path.join(__dirname, '../../../shared-data/availability.json');
    
    if (!fs.existsSync(scrapedDataPath)) {
      return [];
    }
    
    try {
      const jsonContent = fs.readFileSync(scrapedDataPath, 'utf8');
      const data = JSON.parse(jsonContent);
      
      if (data.data && data.data[date]) {
        console.log(`Returning data from JSON file for ${date}`);
        return data.data[date];
      }
      
      return [];
    } catch (error) {
      console.error('JSON file read error:', error);
      throw new Error(`Failed to read availability data: ${error.message}`);
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
    } catch (error) {
      console.error('Cosmos DB read all error:', error);
    }

    // フォールバック: JSONファイルから読み込み
    const scrapedDataPath = path.join(__dirname, '../../../shared-data/availability.json');
    
    if (!fs.existsSync(scrapedDataPath)) {
      throw new Error('Data source not available');
    }
    
    try {
      const jsonContent = fs.readFileSync(scrapedDataPath, 'utf8');
      const data = JSON.parse(jsonContent);
      
      if (!data.data) {
        throw new Error('Invalid data structure');
      }
      
      console.log('Returning all data from JSON file');
      return data.data;
      
    } catch (error) {
      console.error('JSON file read all error:', error);
      throw new Error(`Failed to read all availability data: ${error.message}`);
    }
  }
};