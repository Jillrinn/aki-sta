const { app } = require('@azure/functions');
const targetDatesRepository = require('../repositories/target-dates-repository');

// GET: 全ての対象日付を取得
async function getTargetDatesHandler(request, context) {
  try {
    const dates = await targetDatesRepository.getAllTargetDates();
    
    return {
      status: 200,
      jsonBody: {
        dates: dates
      }
    };
  } catch (error) {
    context.log.error(`Failed to get target dates: ${error.message}`);
    
    return {
      status: 503,
      jsonBody: {
        error: "Service temporarily unavailable",
        details: error.message
      }
    };
  }
}

// POST: 新しい対象日付を追加
async function createTargetDateHandler(request, context) {
  try {
    const body = await request.json();
    const { date, label } = body;
    
    // バリデーション
    if (!date || !label) {
      return {
        status: 400,
        jsonBody: {
          error: "Bad Request",
          message: "Date and label are required"
        }
      };
    }
    
    // 日付フォーマットの検証
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return {
        status: 400,
        jsonBody: {
          error: "Bad Request",
          message: "Date must be in YYYY-MM-DD format"
        }
      };
    }
    
    // 対象日付を追加
    const result = await targetDatesRepository.insertTargetDate(date, label);
    
    return {
      status: 201,
      jsonBody: result
    };
  } catch (error) {
    context.log.error(`Failed to create target date: ${error.message}`);
    
    // 既に存在する場合
    if (error.message.includes('already exists')) {
      return {
        status: 409,
        jsonBody: {
          error: "Conflict",
          message: error.message
        }
      };
    }
    
    // バリデーションエラー
    if (error.message.includes('required') || error.message.includes('format')) {
      return {
        status: 400,
        jsonBody: {
          error: "Bad Request",
          message: error.message
        }
      };
    }
    
    // その他のエラー
    return {
      status: 503,
      jsonBody: {
        error: "Service temporarily unavailable",
        details: error.message
      }
    };
  }
}

// DELETE: 対象日付を削除
async function deleteTargetDateHandler(request, context) {
  const id = request.params.id;
  
  if (!id) {
    return {
      status: 400,
      jsonBody: {
        error: "Bad Request",
        message: "ID is required"
      }
    };
  }
  
  try {
    const result = await targetDatesRepository.deleteTargetDate(id);
    
    return {
      status: 200,
      jsonBody: result
    };
  } catch (error) {
    context.log.error(`Failed to delete target date: ${error.message}`);
    
    // 存在しない場合
    if (error.message.includes('not found')) {
      return {
        status: 404,
        jsonBody: {
          error: "Not Found",
          message: error.message
        }
      };
    }
    
    // その他のエラー
    return {
      status: 503,
      jsonBody: {
        error: "Service temporarily unavailable",
        details: error.message
      }
    };
  }
}

// 関数登録
app.http('target-dates-get', {
  methods: ['GET'],
  route: 'target-dates',
  authLevel: 'anonymous',
  handler: getTargetDatesHandler
});

app.http('target-dates-create', {
  methods: ['POST'],
  route: 'target-dates',
  authLevel: 'anonymous',
  handler: createTargetDateHandler
});

app.http('target-dates-delete', {
  methods: ['DELETE'],
  route: 'target-dates/{id}',
  authLevel: 'anonymous',
  handler: deleteTargetDateHandler
});

// テスト用にハンドラーをエクスポート
module.exports = {
  getTargetDatesHandler,
  createTargetDateHandler,
  deleteTargetDateHandler
};