const fs = require('fs');
const path = require('path');

const DUMMY_DATA = {
  "2025-11-15": [
    {
      facilityName: "Ensemble Studio 本郷",
      timeSlots: { 
        "13-17": "available" 
      },
      lastUpdated: "2025-08-20T08:00:00Z"
    },
    {
      facilityName: "Ensemble Studio 初台", 
      timeSlots: { 
        "13-17": "booked" 
      },
      lastUpdated: "2025-08-20T08:30:00Z"
    }
  ]
};

module.exports = {
  getAvailabilityData: (date) => {
    try {
      // JSONファイルのパスを構築
      const jsonPath = path.join(__dirname, '../../shared-data/availability.json');
      
      // ファイルが存在するか確認
      if (fs.existsSync(jsonPath)) {
        // JSONファイルを読み込む
        const jsonContent = fs.readFileSync(jsonPath, 'utf8');
        const data = JSON.parse(jsonContent);
        
        // 指定された日付のデータを返す
        if (data.data && data.data[date]) {
          console.log(`Returning scraped data for ${date}`);
          return data.data[date];
        }
      }
      
      // ファイルが存在しないか、該当日付のデータがない場合はダミーデータを返す
      console.log(`Returning dummy data for ${date}`);
      return DUMMY_DATA[date] || [];
      
    } catch (error) {
      console.error('Error reading availability JSON:', error);
      // エラー時はダミーデータを返す
      return DUMMY_DATA[date] || [];
    }
  }
};