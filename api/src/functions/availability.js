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
        date,
        facilities: data
      }
    };
    
  } catch (error) {
    context.log.error(`Failed to get availability data: ${error.message}`);
    
    return {
      status: 503,
      jsonBody: {
        error: 'Service temporarily unavailable',
        details: error.message
      }
    };
  }
}

// DELETE: IDで空き状況データを削除
async function deleteAvailabilityHandler(request, context) {
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
    const result = await availabilityRepository.deleteAvailabilityById(id);
    
    return {
      status: 200,
      jsonBody: result
    };
  } catch (error) {
    context.log.error(`Failed to delete availability data: ${error.message}`);
    
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

// DELETE: 日付で空き状況データを削除
async function deleteAvailabilityByDateHandler(request, context) {
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
    const result = await availabilityRepository.deleteAvailabilityByDate(date);
    
    return {
      status: 200,
      jsonBody: result
    };
  } catch (error) {
    context.log.error(`Failed to delete availability data by date: ${error.message}`);
    
    // バリデーションエラー
    if (error.message.includes('Invalid date format')) {
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
app.http('availability', {
  methods: ['GET', 'OPTIONS'],
  route: 'availability/{date?}',
  authLevel: 'anonymous',
  handler: availabilityHandler
});

app.http('availability-delete', {
  methods: ['DELETE'],
  route: 'availability/{id}',
  authLevel: 'anonymous',
  handler: deleteAvailabilityHandler
});

app.http('availability-delete-by-date', {
  methods: ['DELETE'],
  route: 'availability/date/{date}',
  authLevel: 'anonymous',
  handler: deleteAvailabilityByDateHandler
});

module.exports = app;
module.exports.availabilityHandler = availabilityHandler;
module.exports.deleteAvailabilityHandler = deleteAvailabilityHandler;
module.exports.deleteAvailabilityByDateHandler = deleteAvailabilityByDateHandler;