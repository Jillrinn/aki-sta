const { app } = require('@azure/functions');
const cosmosClient = require('../repositories/cosmos-client');

/**
 * Warm-up関数
 * 5分ごとに実行して接続を維持
 */
async function warmUpHandler(myTimer, context) {
  const timestamp = new Date().toISOString();
  context.log(`Warm-up function executed at ${timestamp}`);

  try {
    // Cosmos DBへの接続を維持
    await cosmosClient.initializeWithRetry();
    
    // 軽量なヘルスチェッククエリを実行
    const container = cosmosClient.getContainer('availability');
    
    // 最小限のデータを取得（1件のみ）
    const { resources } = await container.items
      .query({
        query: 'SELECT TOP 1 c.id FROM c',
        parameters: []
      })
      .fetchAll();
    
    context.log(`Warm-up successful. Connection is active. Found ${resources.length} items.`);
    
    return {
      status: 'success',
      timestamp,
      message: 'Connection warmed up successfully'
    };
  } catch (error) {
    context.log.error(`Warm-up failed: ${error.message}`);
    
    // エラーが発生しても関数の実行は継続
    return {
      status: 'error',
      timestamp,
      message: error.message
    };
  }
}

// Timer Trigger: 5分ごとに実行
// Cron式: */5 * * * * （5分ごと）
app.timer('warm-up', {
  schedule: '0 */5 * * * *',
  handler: warmUpHandler,
  runOnStartup: false
});

module.exports = { warmUpHandler };