module.exports = async function (context, req) {
  const date = context.bindingData.date;
  
  // 日付パラメータの検証
  if (!date) {
    context.res = {
      status: 400,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: {
        error: "Date parameter is required"
      }
    };
    return;
  }

  try {
    // データリポジトリから情報を取得
    const availabilityRepository = require('../repositories/availability-repository');
    const data = availabilityRepository.getAvailabilityData(date);
    
    // 成功レスポンス
    context.res = {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: {
        date: date,
        facilities: data
      }
    };
    
  } catch (error) {
    // エラーログ出力
    context.log.error(`Failed to get availability data for ${date}:`, error.message);
    
    // サービス利用不可エラー
    context.res = {
      status: 503,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: {
        error: "Service temporarily unavailable",
        details: error.message
      }
    };
  }
};