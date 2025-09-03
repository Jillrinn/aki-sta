const { app } = require('@azure/functions');
const rateLimitsRepository = require('../repositories/rate-limits-repository');

// GET: 全てのrate limitレコードを取得
async function getAllRateLimitsHandler(request, context) {
  try {
    const records = await rateLimitsRepository.getAllRecords();
    
    return {
      status: 200,
      jsonBody: {
        records
      }
    };
  } catch (error) {
    context.log.error(`Failed to get rate limit records: ${error.message}`);
    
    return {
      status: 503,
      jsonBody: {
        error: 'Service temporarily unavailable',
        details: error.message
      }
    };
  }
}

// GET: 特定日付のrate limitレコードを取得
async function getRateLimitHandler(request, context) {
  const date = request.params.date;
  
  if (!date) {
    return {
      status: 400,
      jsonBody: {
        error: 'Bad Request',
        message: 'Date is required'
      }
    };
  }
  
  try {
    const record = await rateLimitsRepository.getRecord(date);
    
    return {
      status: 200,
      jsonBody: record
    };
  } catch (error) {
    context.log.error(`Failed to get rate limit record: ${error.message}`);
    
    // 存在しない場合
    if (error.message.includes('not found')) {
      return {
        status: 404,
        jsonBody: {
          error: 'Not Found',
          message: error.message
        }
      };
    }
    
    // その他のエラー
    return {
      status: 503,
      jsonBody: {
        error: 'Service temporarily unavailable',
        details: error.message
      }
    };
  }
}

// DELETE: IDでrate limitレコードを削除
async function deleteRateLimitHandler(request, context) {
  const id = request.params.id;
  
  if (!id) {
    return {
      status: 400,
      jsonBody: {
        error: 'Bad Request',
        message: 'ID is required'
      }
    };
  }
  
  try {
    const result = await rateLimitsRepository.deleteRecordById(id);
    
    return {
      status: 200,
      jsonBody: result
    };
  } catch (error) {
    context.log.error(`Failed to delete rate limit record: ${error.message}`);
    
    // 存在しない場合
    if (error.message.includes('not found')) {
      return {
        status: 404,
        jsonBody: {
          error: 'Not Found',
          message: error.message
        }
      };
    }
    
    // バリデーションエラー
    if (error.message.includes('Invalid ID format')) {
      return {
        status: 400,
        jsonBody: {
          error: 'Bad Request',
          message: error.message
        }
      };
    }
    
    // その他のエラー
    return {
      status: 503,
      jsonBody: {
        error: 'Service temporarily unavailable',
        details: error.message
      }
    };
  }
}

// 関数登録
app.http('rate-limits-get-all', {
  methods: ['GET'],
  route: 'rate-limits',
  authLevel: 'anonymous',
  handler: getAllRateLimitsHandler
});

app.http('rate-limits-get', {
  methods: ['GET'],
  route: 'rate-limits/{date}',
  authLevel: 'anonymous',
  handler: getRateLimitHandler
});

app.http('rate-limits-delete', {
  methods: ['DELETE'],
  route: 'rate-limits/{id}',
  authLevel: 'anonymous',
  handler: deleteRateLimitHandler
});

// テスト用にハンドラーをエクスポート
module.exports = {
  getAllRateLimitsHandler,
  getRateLimitHandler,
  deleteRateLimitHandler
};