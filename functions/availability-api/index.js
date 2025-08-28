module.exports = async function (context, req) {
  // CORS設定
  const allowedOrigins = [
    'https://delightful-smoke-0d4827500.1.azurestaticapps.net',
    'https://delightful-smoke-0d4827500.azurestaticapps.net',
    'http://localhost:3300', // ローカル開発用
    'http://localhost:3000'  // ローカル開発用（デフォルトポート）
  ];
  
  const origin = (req.headers && (req.headers.origin || req.headers.Origin)) || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  // OPTIONSリクエスト（プリフライト）の処理
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400"
      },
      body: null
    };
    return;
  }
  
  const date = context.bindingData.date;
  
  // Cosmos DB専用リポジトリを使用
  const availabilityRepository = require('../src/repositories/availability-repository');
  
  // 日付パラメータがない場合は全データを返す
  if (!date) {
    try {
      const allData = await availabilityRepository.getAllAvailabilityData();
      
      context.res = {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        body: allData
      };
      return;
    } catch (error) {
      context.log.error('Failed to get all availability data:', error.message);
      
      context.res = {
        status: 503,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": corsOrigin,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        },
        body: {
          error: "Service temporarily unavailable",
          details: error.message
        }
      };
      return;
    }
  }

  try {
    // データリポジトリから情報を取得
    const data = await availabilityRepository.getAvailabilityData(date);
    
    // 成功レスポンス
    context.res = {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
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
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: {
        error: "Service temporarily unavailable",
        details: error.message
      }
    };
  }
};