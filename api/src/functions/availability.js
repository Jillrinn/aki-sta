const { app } = require('@azure/functions');
const availabilityRepository = require('../repositories/availability-repository');

// メイン処理関数
async function availabilityHandler(request, context) {
  const date = request.params.date;
  
  try {
    // 日付パラメータがない場合は全データを返す
    if (!date) {
      const allData = await availabilityRepository.getAllAvailabilityData();
      return {
        status: 200,
        jsonBody: allData
      };
    }
    
    // 特定日付のデータを取得
    const data = await availabilityRepository.getAvailabilityData(date);
    
    return {
      status: 200,
      jsonBody: {
        date: date,
        facilities: data
      }
    };
    
  } catch (error) {
    context.log.error(`Failed to get availability data: ${error.message}`);
    
    return {
      status: 503,
      jsonBody: {
        error: "Service temporarily unavailable",
        details: error.message
      }
    };
  }
}

// 関数登録（v4形式）
app.http('availability', {
  methods: ['GET', 'OPTIONS'],
  route: 'availability/{date?}',
  authLevel: 'anonymous',
  handler: availabilityHandler
});

module.exports = app;