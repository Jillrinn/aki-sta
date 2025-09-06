const { app } = require('@azure/functions');
const scrapeService = require('../services/scrape-service');

async function scrapeByDateHandler(request, context) {
  try {
    const body = await request.json();
    const { date } = body;

    // 日付の存在チェック
    if (!date) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          message: '日付が指定されていません'
        }
      };
    }

    // 日付フォーマットの検証
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          message: '日付の形式が正しくありません（YYYY-MM-DD形式で指定してください）'
        }
      };
    }

    // 日付の妥当性チェック
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          message: '日付の形式が正しくありません（YYYY-MM-DD形式で指定してください）'
        }
      };
    }

    // スクレイパーAPIを呼び出し
    const scraperResponse = await scrapeService.triggerScraperApi([date]);
    
    // レスポンスデータをパース
    let responseData;
    try {
      responseData = JSON.parse(scraperResponse.data);
    } catch (parseError) {
      console.error('Failed to parse scraper response:', parseError);
      console.error('Raw response:', scraperResponse.data);
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: 'スクレイパーからのレスポンス解析に失敗しました'
        }
      };
    }

    // ステータスコードに基づいてレスポンスを返す
    if (scraperResponse.statusCode === 202 && responseData.success) {
      return {
        status: 202,
        jsonBody: {
          success: true,
          message: `${date}の空き状況取得を開始しました`,
          date
        }
      };
    } else if (scraperResponse.statusCode === 409) {
      // Rate limit error - 実行中
      return {
        status: 409,
        jsonBody: {
          success: false,
          message: responseData.message || '現在スクレイピング処理が実行中です。しばらくお待ちください'
        }
      };
    } else if (scraperResponse.statusCode === 400) {
      // Bad request
      return {
        status: 400,
        jsonBody: {
          success: false,
          message: responseData.message || '不正なリクエストです'
        }
      };
    } else {
      // その他のエラー
      console.error('Unexpected scraper response:', scraperResponse.statusCode, responseData);
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: responseData.message || 'スクレイピング処理でエラーが発生しました'
        }
      };
    }

  } catch (error) {
    context.log.error(`Failed to initiate scraping for date: ${error.message}`);
    
    // タイムアウトエラーの場合
    if (error.message && error.message.includes('timeout')) {
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: 'スクレイパーへの接続がタイムアウトしました。しばらく待ってから再試行してください'
        }
      };
    }
    
    // 接続エラーの場合
    if (error.code === 'ECONNREFUSED') {
      return {
        status: 500,
        jsonBody: {
          success: false,
          message: 'スクレイパーサービスに接続できません。システム管理者にお問い合わせください'
        }
      };
    }
    
    return {
      status: 500,
      jsonBody: {
        success: false,
        message: 'スクレイピング処理でエラーが発生しました'
      }
    };
  }
}

// 関数登録
app.http('scrape-date', {
  methods: ['POST', 'OPTIONS'],
  route: 'scrape/date',
  authLevel: 'anonymous',
  handler: scrapeByDateHandler
});

module.exports = app;
module.exports.scrapeByDateHandler = scrapeByDateHandler;