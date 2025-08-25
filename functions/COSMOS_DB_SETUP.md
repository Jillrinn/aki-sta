# Cosmos DB接続設定とテスト手順

## 📋 前提条件の確認
- [x] Azure Cosmos DBアカウント作成済み
- [x] .envファイルに接続情報保存済み
- [ ] local.settings.jsonの更新
- [ ] 接続テスト実施

## 🔧 1. 環境変数の設定確認

### .envファイルの確認
```bash
# .envファイルが正しく設定されているか確認
cat .env | grep COSMOS
```

期待される形式：
```env
COSMOS_ENDPOINT=https://aki-sta-cosmos-xxxxx.documents.azure.com:443/
COSMOS_KEY=実際のプライマリキー（88文字のBase64文字列）
COSMOS_DATABASE=studio-reservations
```

### local.settings.jsonの更新
.envファイルと同じ値をlocal.settings.jsonにも設定：

```bash
# 手動で編集するか、以下のようにスクリプトで更新
cd functions
```

編集内容：
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_ENDPOINT": ".envと同じエンドポイント",
    "COSMOS_KEY": ".envと同じキー",
    "COSMOS_DATABASE": "studio-reservations"
  }
}
```

## 🧪 2. 接続テストの実施

### ステップ1: 簡易接続テストスクリプトの作成

`functions/test-cosmos-connection.js`を作成：

```javascript
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
```

### ステップ2: テスト実行

```bash
cd functions
node test-cosmos-connection.js
```

## 🚀 3. データマイグレーションの実行

接続テストが成功したら、既存のJSONデータをCosmos DBに移行：

```bash
# マイグレーションスクリプトの実行
cd functions
node scripts/migrate-to-cosmos.js
```

期待される出力：
```
Starting migration to Cosmos DB...
✓ Migrated: 2025-11-15_あんさんぶるStudio和-本郷-
✓ Migrated: 2025-11-15_あんさんぶるStudio音-初台-
...
Migration completed:
  ✓ Success: X documents
  ✗ Failed: 0 documents
```

## 🧪 4. API経由での動作確認

### Azure Functions起動
```bash
cd functions
npm start
```

### APIテスト
別のターミナルで：
```bash
# 特定日付のデータ取得
curl http://localhost:7071/api/availability/2025-11-15

# 全データ取得
curl http://localhost:7071/api/availability
```

## ✅ 5. Azure Portalでのデータ確認

1. Azure Portal → Cosmos DBアカウント
2. Data Explorer → availability コンテナ
3. 「Items」でデータを確認
4. 「New SQL Query」で以下を実行：

```sql
SELECT * FROM c WHERE c.date = '2025-11-15'
```

## 🔍 トラブルシューティング

### 接続エラーが発生する場合

#### 1. 環境変数の確認
```bash
# .envファイルの内容確認
cat .env

# 環境変数が読み込まれているか確認
node -e "require('dotenv').config(); console.log(process.env.COSMOS_ENDPOINT)"
```

#### 2. Azure側の設定確認
- Cosmos DBのステータスが「オンライン」か
- ファイアウォール設定で接続が許可されているか
- 無料枠が正しく適用されているか

#### 3. キーの再生成
問題が解決しない場合：
1. Azure Portal → Keys
2. 「Regenerate Primary Key」
3. 新しいキーを.envとlocal.settings.jsonに更新

### データが取得できない場合

1. Cosmos DBにデータが存在するか確認：
```bash
node test-cosmos-connection.js
```

2. フォールバック（JSONファイル）が動作しているか確認：
```bash
ls -la ../shared-data/availability.json
```

3. APIログを確認：
```bash
# Azure Functions実行中のログを確認
npm start
# 別ターミナルでAPIを呼び出してログを観察
```

## 📝 チェックリスト

- [ ] .envファイルに正しい接続情報を設定
- [ ] local.settings.jsonを更新
- [ ] test-cosmos-connection.jsで接続テスト成功
- [ ] データマイグレーション実行
- [ ] API経由でデータ取得確認
- [ ] Azure PortalのData Explorerでデータ確認
- [ ] 無料枠内（1000 RU/s、25GB）であることを確認

## 🎉 設定完了

すべてのチェックが完了したら、Cosmos DB統合は成功です！