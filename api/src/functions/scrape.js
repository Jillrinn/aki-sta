const { app } = require('@azure/functions');
const scrapeService = require('../services/scrape-service');

async function scrapeHandler(request, context) {
  try {
    const result = await scrapeService.executeSingleScraping();
    
    return {
      status: result.success ? 202 : 500,
      jsonBody: {
        success: result.success,
        message: result.message
      }
    };

  } catch (error) {
    context.log.error(`Failed to initiate scraping: ${error.message}`);
    
    return {
      status: 500,
      jsonBody: {
        success: false,
        message: 'スクレイピングの開始に失敗しました'
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