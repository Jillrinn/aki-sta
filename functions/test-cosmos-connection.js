require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

async function testConnection() {
  console.log('🔍 Cosmos DB接続テスト開始...\n');
  
  // 1. 環境変数の確認
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const databaseId = process.env.COSMOS_DATABASE;
  
  console.log('📋 環境変数チェック:');
  console.log(`  COSMOS_ENDPOINT: ${endpoint ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  COSMOS_KEY: ${key ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  COSMOS_DATABASE: ${databaseId || 'studio-reservations'}\n`);
  
  if (!endpoint || !key) {
    console.error('❌ エラー: 環境変数が設定されていません');
    console.log('\n💡 解決方法:');
    console.log('1. .envファイルに正しい値を設定');
    console.log('2. COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/');
    console.log('3. COSMOS_KEY=実際のプライマリキー');
    process.exit(1);
  }
  
  try {
    // 2. Cosmos DB接続
    console.log('🔌 Cosmos DBに接続中...');
    const client = new CosmosClient({ endpoint, key });
    
    // 3. データベース確認
    const database = client.database(databaseId || 'studio-reservations');
    const { resource: dbInfo } = await database.read();
    console.log(`✅ データベース接続成功: ${dbInfo.id}\n`);
    
    // 4. コンテナ確認
    console.log('📦 コンテナ確認:');
    const containers = ['availability', 'target_dates', 'rate_limits'];
    
    for (const containerName of containers) {
      try {
        const container = database.container(containerName);
        const { resource: containerInfo } = await container.read();
        console.log(`  ✅ ${containerName}: 存在確認OK`);
      } catch (error) {
        if (error.code === 404) {
          console.log(`  ⚠️  ${containerName}: 未作成（自動作成されます）`);
        } else {
          console.log(`  ❌ ${containerName}: エラー - ${error.message}`);
        }
      }
    }
    
    // 5. スループット確認
    console.log('\n📊 スループット情報:');
    const { resource: offer } = await database.readOffer();
    console.log(`  設定値: ${offer.content.offerThroughput} RU/s`);
    console.log(`  ${offer.content.offerThroughput <= 1000 ? '✅ 無料枠内' : '⚠️ 無料枠超過の可能性'}`);
    
    console.log('\n✨ 接続テスト成功！Cosmos DBが正しく設定されています。');
    
  } catch (error) {
    console.error('\n❌ 接続エラー:', error.message);
    console.log('\n💡 トラブルシューティング:');
    
    if (error.code === 401) {
      console.log('- プライマリキーが正しいか確認');
      console.log('- Azure PortalのKeys画面から再度コピー');
    } else if (error.code === 404) {
      console.log('- エンドポイントURLが正しいか確認');
      console.log('- データベース名が正しいか確認');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('- インターネット接続を確認');
      console.log('- エンドポイントURLのタイポを確認');
    } else {
      console.log('- Azure PortalでCosmos DBのステータスを確認');
      console.log('- ファイアウォール設定を確認');
    }
    
    process.exit(1);
  }
}

testConnection().catch(console.error);