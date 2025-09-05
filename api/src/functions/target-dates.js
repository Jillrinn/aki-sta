const { app } = require('@azure/functions');
const targetDatesRepository = require('../repositories/target-dates-repository');

// GET: 全ての対象日付を取得
async function getTargetDatesHandler(request, context) {
  try {
    const dates = await targetDatesRepository.getAllTargetDates();
    
    return {
      status: 200,
      jsonBody: {
        dates
      }
    };
  } catch (error) {
    context.log.error(`Failed to get target dates: ${error.message}`);
    
    return {
      status: 503,
      jsonBody: {
        error: 'Service temporarily unavailable',
        details: error.message
      }
    };
  }
}

// POST: 新しい対象日付を追加
async function createTargetDateHandler(request, context) {
  try {
    const body = await request.json();
    const { date, label, memo } = body;
    
    // バリデーション
    if (!date || !label) {
      return {
        status: 400,
        jsonBody: {
          error: 'Bad Request',
          message: 'Date and label are required'
        }
      };
    }
    
    // 日付フォーマットの検証
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return {
        status: 400,
        jsonBody: {
          error: 'Bad Request',
          message: 'Date must be in YYYY-MM-DD format'
        }
      };
    }
    
    // メモの長さ制限（オプショナル）
    if (memo && memo.length > 500) {
      return {
        status: 400,
        jsonBody: {
          error: 'Bad Request',
          message: 'Memo must be 500 characters or less'
        }
      };
    }
    
    // 対象日付を追加
    const result = await targetDatesRepository.insertTargetDate(date, label, memo);
    
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
          error: 'Conflict',
          message: error.message
        }
      };
    }
    
    // バリデーションエラー
    if (error.message.includes('required') || error.message.includes('format')) {
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

// DELETE: 対象日付を削除
async function deleteTargetDateHandler(request, context) {
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

// PATCH: 対象日付の予約状況とメモを更新
async function updateTargetDateHandler(request, context) {
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
    const body = await request.json();
    const { isbooked, memo } = body;
    
    // 少なくとも一つのフィールドが必要
    if (isbooked === undefined && memo === undefined) {
      return {
        status: 400,
        jsonBody: {
          error: 'Bad Request',
          message: 'At least one field (isbooked or memo) must be provided'
        }
      };
    }
    
    // isbookedのバリデーション
    if (isbooked !== undefined && typeof isbooked !== 'boolean') {
      return {
        status: 400,
        jsonBody: {
          error: 'Bad Request',
          message: 'isbooked must be a boolean value'
        }
      };
    }
    
    // memoのバリデーション
    if (memo !== undefined && typeof memo !== 'string') {
      return {
        status: 400,
        jsonBody: {
          error: 'Bad Request',
          message: 'memo must be a string value'
        }
      };
    }
    
    // メモの長さ制限
    if (memo && memo.length > 500) {
      return {
        status: 400,
        jsonBody: {
          error: 'Bad Request',
          message: 'Memo must be 500 characters or less'
        }
      };
    }
    
    // 対象日付を更新
    const updateData = {};
    if (isbooked !== undefined) updateData.isbooked = isbooked;
    if (memo !== undefined) updateData.memo = memo;
    
    const result = await targetDatesRepository.updateTargetDate(id, updateData);
    
    return {
      status: 200,
      jsonBody: result
    };
  } catch (error) {
    context.log.error(`Failed to update target date: ${error.message}`);
    
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
    if (error.message.includes('required') || error.message.includes('boolean') || error.message.includes('string')) {
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

app.http('target-dates-update', {
  methods: ['PATCH'],
  route: 'target-dates/{id}',
  authLevel: 'anonymous',
  handler: updateTargetDateHandler
});

// テスト用にハンドラーをエクスポート
module.exports = {
  getTargetDatesHandler,
  createTargetDateHandler,
  deleteTargetDateHandler,
  updateTargetDateHandler
};