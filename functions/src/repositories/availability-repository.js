const fs = require('fs');
const path = require('path');

module.exports = {
  getAvailabilityData: (date) => {
    // スクレイピングデータのパスを構築
    const scrapedDataPath = path.join(__dirname, '../../../shared-data/availability.json');
    
    // データソースが存在しない場合はエラー
    if (!fs.existsSync(scrapedDataPath)) {
      throw new Error('Data source not available');
    }
    
    try {
      // JSONファイルを読み込む
      const jsonContent = fs.readFileSync(scrapedDataPath, 'utf8');
      const data = JSON.parse(jsonContent);
      
      // データ構造を検証
      if (!data.data) {
        throw new Error('Invalid data structure');
      }
      
      // 指定された日付のデータを返す（存在しない場合は空配列）
      if (data.data[date]) {
        console.log(`Returning data for ${date}`);
        return data.data[date];
      } else {
        console.log(`No data available for ${date}`);
        return [];
      }
      
    } catch (error) {
      console.error('Error reading availability data:', error);
      throw new Error(`Failed to read availability data: ${error.message}`);
    }
  },
  
  getAllAvailabilityData: () => {
    // スクレイピングデータのパスを構築
    const scrapedDataPath = path.join(__dirname, '../../../shared-data/availability.json');
    
    // データソースが存在しない場合はエラー
    if (!fs.existsSync(scrapedDataPath)) {
      throw new Error('Data source not available');
    }
    
    try {
      // JSONファイルを読み込む
      const jsonContent = fs.readFileSync(scrapedDataPath, 'utf8');
      const data = JSON.parse(jsonContent);
      
      // データ構造を検証
      if (!data.data) {
        throw new Error('Invalid data structure');
      }
      
      console.log('Returning all availability data');
      return data.data;
      
    } catch (error) {
      console.error('Error reading all availability data:', error);
      throw new Error(`Failed to read all availability data: ${error.message}`);
    }
  }
};