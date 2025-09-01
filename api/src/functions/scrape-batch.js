const { app } = require('@azure/functions');
const scrapeService = require('../services/scrape-service');

async function scrapeBatchHandler(request, context) {
  try {
    const body = await request.json().catch(() => ({}));
    const { source = 'logic-app', includeAllTargetDates = true } = body;
    
    if (!includeAllTargetDates) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          message: 'This endpoint is designed for batch processing with all target dates. Set includeAllTargetDates to true.'
        }
      };
    }

    const result = await scrapeService.executeBatchScraping(source);
    
    return {
      status: result.success ? 202 : 500,
      jsonBody: {
        success: result.success,
        message: result.message,
        ...(result.targetDates && { targetDates: result.targetDates })
      }
    };

  } catch (error) {
    context.log.error(`Failed to initiate batch scraping: ${error.message}`);
    
    return {
      status: 500,
      jsonBody: {
        success: false,
        message: '空き状況取得は実行中の可能性があります'
      }
    };
  }
}

app.http('scrape-batch', {
  methods: ['POST', 'OPTIONS'],
  route: 'scrape/batch',
  authLevel: 'anonymous',
  handler: scrapeBatchHandler
});

module.exports = app;
module.exports.scrapeBatchHandler = scrapeBatchHandler;