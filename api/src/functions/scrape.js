const { app } = require('@azure/functions');
const rateLimitsRepository = require('../repositories/rate-limits-repository');
const https = require('https');

async function triggerScraperApi() {
  const scraperApiUrl = process.env.SCRAPER_API_URL;
  
  if (!scraperApiUrl) {
    throw new Error('SCRAPER_API_URL environment variable is not set');
  }

  return new Promise((resolve, reject) => {
    const url = new URL(scraperApiUrl);
    const postData = '';

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: '/api/scrape',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      console.error('Error calling scraper API:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function scrapeHandler(request, context) {
  try {
    // rate_limitsリポジトリを初期化
    await rateLimitsRepository.initialize();

    // 今日の日付でレコードを作成または更新
    const { isAlreadyRunning, record } = await rateLimitsRepository.createOrUpdateRecord('pending');

    // すでに実行中の場合
    if (isAlreadyRunning) {
      return {
        status: 409,
        jsonBody: {
          error: 'Scraping already in progress',
          message: 'スクレイピング処理がすでに実行中です。しばらくお待ちください。',
          status: record.status,
          lastRequestedAt: record.lastRequestedAt
        }
      };
    }

    // 非同期でスクレイパーAPIを呼び出し（結果を待たない）
    triggerScraperApi()
      .then(() => {
        context.log('Scraper API triggered successfully');
      })
      .catch((error) => {
        context.log.error('Failed to trigger scraper API:', error);
      });

    // すぐにフロントエンドへ返答
    return {
      status: 202,
      jsonBody: {
        message: 'Scraping request accepted',
        description: 'スクレイピング処理を開始しました。バックグラウンドで実行中です。',
        date: record.date,
        requestId: record.id,
        status: 'pending'
      }
    };

  } catch (error) {
    context.log.error(`Failed to initiate scraping: ${error.message}`);
    
    return {
      status: 500,
      jsonBody: {
        error: 'Internal Server Error',
        message: 'スクレイピング処理の開始に失敗しました。',
        details: error.message
      }
    };
  }
}

// 関数登録
app.http('scrape', {
  methods: ['POST', 'OPTIONS'],
  route: 'scrape',
  authLevel: 'anonymous',
  handler: scrapeHandler
});

module.exports = app;
module.exports.scrapeHandler = scrapeHandler;