const { app } = require('@azure/functions');
const cosmosClient = require('../repositories/cosmos-client');

/**
 * ヘルスチェックエンドポイント
 * システムとCosmosDBの接続状態を確認
 */
async function healthHandler(request, context) {
  const startTime = Date.now();
  
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      api: 'ok',
      cosmosDb: 'checking'
    },
    details: {}
  };

  try {
    // Cosmos DB接続チェック
    const isConnected = await cosmosClient.isConnectionValid();
    
    if (isConnected) {
      healthStatus.checks.cosmosDb = 'ok';
      healthStatus.details.cosmosDb = {
        status: 'connected',
        lastInitialized: cosmosClient.lastInitialized
      };
    } else {
      // 再接続を試みる
      await cosmosClient.initializeWithRetry();
      healthStatus.checks.cosmosDb = 'reconnected';
      healthStatus.details.cosmosDb = {
        status: 'reconnected',
        message: 'Connection was restored'
      };
    }

    // 簡単なクエリでパフォーマンスチェック
    const container = cosmosClient.getContainer('availability');
    const queryStart = Date.now();
    
    const { resources } = await container.items
      .query({
        query: "SELECT VALUE COUNT(1) FROM c",
        parameters: []
      })
      .fetchAll();
    
    const queryTime = Date.now() - queryStart;
    
    healthStatus.details.performance = {
      queryResponseTime: `${queryTime}ms`,
      totalRecords: resources[0] || 0
    };

  } catch (error) {
    healthStatus.status = 'unhealthy';
    healthStatus.checks.cosmosDb = 'failed';
    healthStatus.details.error = {
      message: error.message,
      type: error.constructor.name
    };
    
    context.log.error(`Health check failed: ${error.message}`);
  }

  const totalTime = Date.now() - startTime;
  healthStatus.details.checkDuration = `${totalTime}ms`;

  // ステータスコードを決定
  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

  return {
    status: statusCode,
    jsonBody: healthStatus,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  };
}

// HTTP Trigger: GET /api/health
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthHandler
});

module.exports = { healthHandler };