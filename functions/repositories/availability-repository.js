const fs = require('fs');
const path = require('path');

// フォールバックデータをJSONファイルから読み込み
const FALLBACK_DATA = require('./fallback-data.json');

module.exports = {
  getAvailabilityData: (date) => {
    try {
      // スクレイピングデータのパスを構築
      const scrapedDataPath = path.join(__dirname, '../../shared-data/availability.json');
      
      // スクレイピングデータが存在するか確認
      if (fs.existsSync(scrapedDataPath)) {
        // JSONファイルを読み込む
        const jsonContent = fs.readFileSync(scrapedDataPath, 'utf8');
        const data = JSON.parse(jsonContent);
        
        // 指定された日付のデータを返す
        if (data.data && data.data[date]) {
          console.log(`Returning scraped data for ${date}`);
          return data.data[date];
        }
      }
      
      // スクレイピングデータが存在しないか、該当日付のデータがない場合はフォールバックデータを返す
      console.log(`Returning fallback data for ${date}`);
      return FALLBACK_DATA[date] || [];
      
    } catch (error) {
      console.error('Error reading availability JSON:', error);
      // エラー時はフォールバックデータを返す
      return FALLBACK_DATA[date] || [];
    }
  }
};