# Cosmos DB移行手順書

## 概要
本ドキュメントは、空きスタサーチくんのデータストレージをJSONファイルベースからAzure Cosmos DBへ移行する手順を記載したものです。

## 移行方針
- **NoSQLデータベースとして使用**（Azure Cosmos DBの強みを活かす）
- **段階的移行**（Backend → Scraper → クリーンアップ）
- **ダウンタイムゼロ**（フォールバック機構により無停止移行）

## 前提条件
- Azureアカウント（無料アカウント可）
- Node.js 18以上、Python 3.9以上がインストール済み

---

## フェーズ0: Azure Cosmos DB無料枠セットアップ（約30分）

### 0-1. Azure Portalでの Cosmos DBアカウント作成（15分）

#### 作成前の準備
1. **Azureアカウントの確認**
   - 無料アカウントの場合: $200クレジットが残っているか確認
   - 既存アカウントの場合: 他にCosmos DB無料枠を使用していないか確認
   - ⚠️ 1つのAzureアカウントにつき、Cosmos DB無料枠は1つのみ

2. **命名規則の決定**
   - アカウント名: `aki-sta-cosmos-{環境}-{年月}`
   - 例: `aki-sta-cosmos-dev-202508`
   - グローバルで一意である必要があるため、事前に決めておく

#### 1. Azure Portalにアクセス
1. [Azure Portal](https://portal.azure.com) にログイン
2. サブスクリプションを確認（無料試用版でも可）

#### 2. Cosmos DBリソース作成
1. 「リソースの作成」をクリック
2. 「データベース」カテゴリから「Azure Cosmos DB」を選択
3. 「作成」をクリック

#### 3. アカウント設定の詳細
**重要: 無料枠を適用するための設定**

##### 基本タブ

| 設定項目 | 値 | 説明 |
|---------|-----|------|
| **サブスクリプション** | お使いのサブスクリプション | 無料試用版でもOK |
| **リソースグループ** | 新規作成: `aki-sta-rg` | プロジェクト用グループ |
| **アカウント名** | `aki-sta-cosmos-2025` | グローバルで一意、3-44文字、小文字と数字とハイフンのみ |
| **API** | **Core (SQL)** | NoSQL API（最も汎用的） |
| **場所** | **Japan East** | 東日本リージョン（低レイテンシー） |
| **容量モード** | **プロビジョニング済みスループット** | 無料枠はこちらのみ |
| **アカウントの種類** | **非運用** | 開発用（SLAなし、コスト削減） |
| **地理冗長性** | **無効** | バックアップ冗長性なし（コスト削減） |
| **マルチリージョン書き込み** | **無効** | 単一リージョンのみ（コスト削減） |
| **可用性ゾーン** | **無効** | ゾーン冗長性なし（コスト削減） |

##### グローバル分散タブ（デフォルトのまま）

| 設定項目 | 値 | 理由 |
|---------|-----|------|
| **地理冗長性** | 無効 | 無料枠では単一リージョンのみ |
| **マルチリージョン書き込み** | 無効 | 追加料金が発生するため |
| **可用性ゾーン** | 無効 | 追加料金が発生するため |

##### バックアップポリシータブ

| 設定項目 | 値 | 理由 |
|---------|-----|------|
| **バックアップポリシー** | **定期的** | 無料枠はこれのみ対応 |
| **バックアップ間隔** | 240分（4時間） | デフォルト値を使用 |
| **バックアップ保有期間** | 8時間 | 最小値（コスト削減） |
| **バックアップストレージの冗長性** | **ローカル冗長** | 最も安価なオプション |

##### 暗号化タブ

| 設定項目 | 値 | 理由 |
|---------|-----|------|
| **データ暗号化** | **サービス管理キー** | デフォルト、追加費用なし |

##### タグタブ（オプション、管理用）

| 名前 | 値 | 用途 |
|------|-----|------|
| Environment | Development | 環境識別 |
| Project | aki-sta | プロジェクト識別 |
| Owner | あなたの名前 | 責任者識別 |
| CreatedDate | 2025-08-25 | 作成日記録 |

#### 4. 無料枠の適用（最重要）
「基本」タブの下部にある：
- ✅ **「Free Tier Discount を適用する」にチェック**
  - これにより最初の1000 RU/秒と25GBストレージが永続的に無料
  - ⚠️ Azureアカウントごとに1つのCosmos DBアカウントのみ無料枠適用可能

#### 5. ネットワーク設定
「ネットワーク」タブ：
- **接続方法**: すべてのネットワーク（開発用）
  - 本番環境では適切なファイアウォール設定を推奨

#### 6. 確認と作成
1. 「確認および作成」をクリック
2. **必須確認項目**（これらが正しくないと課金される）：
   - ✅ **Free Tier Discount: 適用済み** と緑色で表示
   - ✅ 推定月額コスト: **$0.00 USD**
   - ✅ アカウントの種類: **非運用**
   - ✅ 容量モード: **プロビジョニング済みスループット**
   - ❌ もし「$24.00 USD/月」などと表示されたら、無料枠が適用されていない
3. 「作成」をクリック
4. デプロイ完了まで約5-10分待機

#### よくある作成時の間違いと対処法

| 間違い | 症状 | 対処法 |
|--------|------|--------|
| **Free Tier未チェック** | 月額$24表示 | 作成をキャンセルし、最初からやり直す |
| **サーバーレス選択** | 無料枠適用不可 | プロビジョニング済みスループットを選択 |
| **複数リージョン有効** | 追加料金表示 | グローバル分散タブですべて無効化 |
| **2つ目のDB作成** | 無料枠適用不可 | 既存の無料枠DBを削除するか、有料で作成 |
| **運用アカウント選択** | SLA料金追加 | 非運用を選択 |

### 0-2. データベースとコンテナの作成（10分）

#### 1. Data Explorerでデータベース作成

##### 推奨方式: データベース共有スループット（コスト効率重視）

1. Cosmos DBアカウントのリソースページを開く
2. 左メニューから「Data Explorer」を選択
3. 「New Database」をクリック
4. 以下を設定：
   - **Database id**: `studio-reservations`
   - **Provision database throughput**: ✅ チェック（重要）
   - **Throughput type**: Manual
   - **Throughput**: **1000 RU/s**（無料枠の上限）
   - 「OK」をクリック

⚠️ **重要**: データベースレベルで1000 RU/sを設定することで、3つのコンテナで動的に共有されます

#### 2. コンテナ作成（共有スループット使用）

Data Explorerで「studio-reservations」データベースを展開し、以下の3つのコンテナを作成：

##### availabilityコンテナ（メインデータ）
1. 「New Container」をクリック
2. 設定：
   - **Database id**: 既存の使用 - `studio-reservations`
   - **Container id**: `availability`
   - **Partition key**: `/date`
   - **Container throughput**: **データベーススループットを使用**（追加料金なし）
   - **Indexing policy**: デフォルト
3. 「OK」をクリック

##### target_datesコンテナ（管理データ）
同様の手順で作成：
- **Container id**: `target_dates`
- **Partition key**: `/date`
- **Container throughput**: **データベーススループットを使用**

##### rate_limitsコンテナ（制限管理）
同様の手順で作成：
- **Container id**: `rate_limits`
- **Partition key**: `/date`
- **Container throughput**: **データベーススループットを使用**

#### スループット配分の考え方

##### 共有スループットのメリット
- **動的配分**: 使用量に応じて自動的にRU/sが配分される
- **コスト効率**: 1000 RU/s全体を無駄なく活用
- **柔軟性**: トラフィックパターンの変化に自動対応

##### 想定される使用パターン
| 時間帯 | availability | target_dates | rate_limits | 合計使用 |
|--------|-------------|--------------|-------------|----------|
| **日中（API中心）** | 700-800 RU/s | 50 RU/s | 50 RU/s | 800-900 RU/s |
| **夜間（スクレイピング）** | 400 RU/s | 100 RU/s | 200 RU/s | 700 RU/s |
| **深夜（アイドル）** | 100 RU/s | 10 RU/s | 10 RU/s | 120 RU/s |

#### 代替方式: 個別スループット設定（細かい制御が必要な場合）

もし個別に制御したい場合の推奨配分：

| コンテナ | 推奨RU/s | 理由 |
|---------|----------|------|
| **availability** | 700 RU/s | メインAPI、最も高頻度 |
| **target_dates** | 150 RU/s | 低頻度の読み書き |
| **rate_limits** | 150 RU/s | スクレイピング時のみ使用 |

⚠️ **注意**: 個別設定の場合、各コンテナごとに料金が発生する可能性があるため、共有スループットを推奨

### 0-3. 接続情報の取得（5分）

#### 1. キーの取得
1. Cosmos DBアカウントのリソースページ
2. 左メニューから「キー」を選択
3. 以下の情報をコピー：
   - **URI**: `https://aki-sta-cosmos-{unique}.documents.azure.com:443/`
   - **プライマリキー**: 長い文字列（Base64形式）
   - **プライマリ接続文字列**: 完全な接続文字列

#### 2. 接続情報の保管
セキュリティのため、以下の方法で保管：

```bash
# ローカル開発用: .envファイルに保存
echo "COSMOS_ENDPOINT=https://aki-sta-cosmos-{unique}.documents.azure.com:443/" >> .env
echo "COSMOS_KEY=your-primary-key-here" >> .env
echo "COSMOS_DATABASE=studio-reservations" >> .env
```

⚠️ **重要**: `.env`ファイルは`.gitignore`に含まれていることを確認

### 0-4. 作成完了後の確認

#### 作成直後の確認（重要）
1. **リソースページの概要タブ**で以下を確認：
   - ステータス: **オンライン**（緑色のチェック）
   - 無料利用枠: **適用済み**
   - 場所: **Japan East**
   - API: **Core (SQL)**

2. **コストの分析タブ**で以下を確認：
   - 現在のコスト: **$0.00**
   - 予測月額コスト: **$0.00**
   - ⚠️ もし料金が表示される場合は設定ミス

3. **メトリックタブ**で以下を確認：
   - 最大スループット: **1000 RU/秒**（無料枠の上限）
   - ストレージ使用量: **0 GB**（25GBまで無料）

#### Azure Portal上での接続テスト
1. Data Explorerで「New SQL Query」
2. 以下のクエリを実行：
```sql
SELECT VALUE COUNT(1) FROM c
```
3. 結果が「0」と表示されれば接続成功
4. エラーが出る場合は、コンテナが正しく作成されているか確認

#### ローカルからの接続テスト
後述のフェーズ1-2で実施するため、ここではスキップ可能

### 無料枠の制限と注意事項

#### 無料枠の内容
- **1000 RU/秒**: 最初の1000 RU/秒が無料（自動スケーリングなし）
- **25 GB ストレージ**: データ + インデックス
- **永続的**: 12ヶ月後も継続（Azureアカウントが有効な限り）
- **リージョン**: 1リージョンのみ

#### 超過時の料金
- RU/秒: 1000を超えた分は従量課金（約$0.008/RU/時間）
- ストレージ: 25GBを超えた分は従量課金（約$0.25/GB/月）

#### RU使用量の監視と最適化
Azure Portalで：
1. **メトリック** → **Total Request Units**で各コンテナの使用量を確認
2. **Insights** → **Throughput**で時間帯別の使用パターンを分析
3. **アラート設定**で以下を監視：
   - RU使用率が900 RU/秒を超えた場合（警告）
   - RU使用率が1000 RU/秒に達した場合（クリティカル）
   - 429エラー（レート制限）が発生した場合

##### コンテナ別使用量の確認方法
1. Data Explorer → 対象コンテナを選択
2. 「Settings」→「Metrics」
3. 「Request Units」グラフで実際の使用量を確認
4. 必要に応じてインデックスポリシーを最適化

---

## フェーズ1: Backend完全移行（約1.5時間）


### 1-1. 環境設定とパッケージインストール（10分）

#### パッケージインストール
```bash
cd functions
npm install @azure/cosmos dotenv
```

#### 環境変数設定

**フェーズ0-3で取得した接続情報を使用**

`.env`ファイルを作成（既にフェーズ0で作成済みの場合はスキップ）:
```env
# フェーズ0-3で取得した値を使用
COSMOS_ENDPOINT=https://aki-sta-cosmos-{unique}.documents.azure.com:443/
COSMOS_KEY=実際のプライマリキーをここに貼り付け
COSMOS_DATABASE=studio-reservations
```

`local.settings.json`を更新:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_ENDPOINT": "https://aki-sta-cosmos-{unique}.documents.azure.com:443/",
    "COSMOS_KEY": "実際のプライマリキーをここに貼り付け",
    "COSMOS_DATABASE": "studio-reservations"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

⚠️ **重要**: 
- `{unique}`部分は実際のアカウント名に置き換え
- プライマリキーは実際の値を使用
- これらのファイルは絶対にGitにコミットしない

### 1-2. Cosmos DBクライアント作成とテスト（20分）

#### 実装
`functions/src/repositories/cosmos-client.js`を新規作成:

```javascript
const { CosmosClient } = require('@azure/cosmos');

class CosmosDBClient {
  constructor() {
    this.client = null;
    this.database = null;
    this.containers = {};
  }

  async initialize() {
    if (this.client) return;

    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;
    const databaseId = process.env.COSMOS_DATABASE || 'studio-reservations';

    if (!endpoint || !key) {
      throw new Error('Cosmos DB connection settings are missing');
    }

    this.client = new CosmosClient({ endpoint, key });
    
    // データベース作成または参照
    const { database } = await this.client.databases.createIfNotExists({ id: databaseId });
    this.database = database;

    // コンテナ作成または参照
    await this.createContainers();
  }

  async createContainers() {
    // availabilityコンテナ
    const { container: availability } = await this.database.containers.createIfNotExists({
      id: 'availability',
      partitionKey: { paths: ['/date'] }
    });
    this.containers.availability = availability;

    // target_datesコンテナ
    const { container: targetDates } = await this.database.containers.createIfNotExists({
      id: 'target_dates',
      partitionKey: { paths: ['/date'] }
    });
    this.containers.targetDates = targetDates;

    // rate_limitsコンテナ
    const { container: rateLimits } = await this.database.containers.createIfNotExists({
      id: 'rate_limits',
      partitionKey: { paths: ['/date'] }
    });
    this.containers.rateLimits = rateLimits;
  }

  getContainer(name) {
    return this.containers[name];
  }
}

// シングルトンインスタンス
const cosmosClient = new CosmosDBClient();

module.exports = cosmosClient;
```

#### テスト実装
`functions/test/repositories/cosmos-client.test.js`を新規作成:

```javascript
const cosmosClient = require('../../src/repositories/cosmos-client');

describe('Cosmos DB Client', () => {
  beforeEach(() => {
    // 環境変数の設定
    process.env.COSMOS_ENDPOINT = 'https://test.documents.azure.com:443/';
    process.env.COSMOS_KEY = 'test-key';
    process.env.COSMOS_DATABASE = 'test-database';
  });

  afterEach(() => {
    // クリーンアップ
    delete process.env.COSMOS_ENDPOINT;
    delete process.env.COSMOS_KEY;
    delete process.env.COSMOS_DATABASE;
  });

  test('should throw error when connection settings are missing', async () => {
    delete process.env.COSMOS_ENDPOINT;
    
    await expect(cosmosClient.initialize()).rejects.toThrow(
      'Cosmos DB connection settings are missing'
    );
  });

  test('should get container by name', () => {
    // コンテナのモック設定
    cosmosClient.containers = {
      availability: { id: 'availability' },
      target_dates: { id: 'target_dates' },
      rate_limits: { id: 'rate_limits' }
    };

    const container = cosmosClient.getContainer('availability');
    expect(container).toBeDefined();
    expect(container.id).toBe('availability');
  });
});
```

#### テスト実行と確認
```bash
cd functions
npm test -- cosmos-client.test.js

# 期待される結果:
# PASS test/repositories/cosmos-client.test.js
#   Cosmos DB Client
#     ✓ should throw error when connection settings are missing
#     ✓ should get container by name
```

### 1-3. リポジトリ層の実装とテスト（35分）

#### 実装

`functions/src/repositories/availability-repository.js`を更新:

```javascript
const fs = require('fs');
const path = require('path');
const cosmosClient = require('./cosmos-client');

module.exports = {
  getAvailabilityData: async (date) => {
    try {
      // Cosmos DBから取得を試みる
      await cosmosClient.initialize();
      const container = cosmosClient.getContainer('availability');
      
      const querySpec = {
        query: "SELECT * FROM c WHERE c.date = @date",
        parameters: [{ name: "@date", value: date }]
      };
      
      const { resources } = await container.items
        .query(querySpec)
        .fetchAll();
      
      if (resources && resources.length > 0) {
        // Cosmos DBからデータを整形して返す
        return resources.map(item => ({
          facilityName: item.facilityName,
          timeSlots: item.timeSlots,
          lastUpdated: item.updatedAt
        }));
      }
    } catch (error) {
      console.error('Cosmos DB read error:', error);
    }

    // フォールバック: JSONファイルから読み込み（移行期間中の暫定対応）
    const scrapedDataPath = path.join(__dirname, '../../../shared-data/availability.json');
    
    if (!fs.existsSync(scrapedDataPath)) {
      return [];
    }
    
    try {
      const jsonContent = fs.readFileSync(scrapedDataPath, 'utf8');
      const data = JSON.parse(jsonContent);
      
      if (data.data && data.data[date]) {
        console.log(`Returning data from JSON file for ${date}`);
        return data.data[date];
      }
      
      return [];
    } catch (error) {
      console.error('JSON file read error:', error);
      throw new Error(`Failed to read availability data: ${error.message}`);
    }
  },
  
  getAllAvailabilityData: async () => {
    try {
      // Cosmos DBから全データ取得
      await cosmosClient.initialize();
      const container = cosmosClient.getContainer('availability');
      
      const { resources } = await container.items
        .readAll()
        .fetchAll();
      
      if (resources && resources.length > 0) {
        // 日付でグループ化
        const groupedData = {};
        resources.forEach(item => {
          if (!groupedData[item.date]) {
            groupedData[item.date] = [];
          }
          groupedData[item.date].push({
            facilityName: item.facilityName,
            timeSlots: item.timeSlots,
            lastUpdated: item.updatedAt
          });
        });
        return groupedData;
      }
    } catch (error) {
      console.error('Cosmos DB read all error:', error);
    }

    // フォールバック: JSONファイルから読み込み
    const scrapedDataPath = path.join(__dirname, '../../../shared-data/availability.json');
    
    if (!fs.existsSync(scrapedDataPath)) {
      throw new Error('Data source not available');
    }
    
    try {
      const jsonContent = fs.readFileSync(scrapedDataPath, 'utf8');
      const data = JSON.parse(jsonContent);
      
      if (!data.data) {
        throw new Error('Invalid data structure');
      }
      
      console.log('Returning all data from JSON file');
      return data.data;
      
    } catch (error) {
      console.error('JSON file read all error:', error);
      throw new Error(`Failed to read all availability data: ${error.message}`);
    }
  }
};
```

### 1-4. データマイグレーション（10分）

`functions/scripts/migrate-to-cosmos.js`を作成:

```javascript
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { CosmosClient } = require('@azure/cosmos');

async function migrate() {
  console.log('Starting migration to Cosmos DB...');
  
  // Cosmos DB接続
  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY
  });
  
  const database = client.database(process.env.COSMOS_DATABASE || 'studio-reservations');
  const container = database.container('availability');
  
  // JSONファイル読み込み
  const jsonPath = path.join(__dirname, '../../shared-data/availability.json');
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(jsonContent);
  
  if (!data.data) {
    console.error('No data found in JSON file');
    return;
  }
  
  // 各日付・施設のデータをCosmos DBに投入
  for (const [date, facilities] of Object.entries(data.data)) {
    for (const facility of facilities) {
      const facilityId = facility.facilityName
        .toLowerCase()
        .replace(/[()（）]/g, '')
        .replace(/\s+/g, '-')
        .replace('あんさんぶるstudio和-本郷', 'ensemble-hongo')
        .replace('あんさんぶるstudio音-初台', 'ensemble-hatsudai');
      
      const cosmosItem = {
        id: `${date}_${facilityId}`,
        partitionKey: date,
        date: date,
        facility: facilityId,
        facilityName: facility.facilityName,
        timeSlots: facility.timeSlots,
        updatedAt: facility.lastUpdated || new Date().toISOString(),
        dataSource: 'migration'
      };
      
      try {
        await container.items.upsert(cosmosItem);
        console.log(`Migrated: ${date} - ${facility.facilityName}`);
      } catch (error) {
        console.error(`Failed to migrate ${date} - ${facility.facilityName}:`, error);
      }
    }
  }
  
  console.log('Migration completed!');
}

migrate().catch(console.error);
```

実行:
```bash
cd functions
node scripts/migrate-to-cosmos.js
```

#### テスト実装
`functions/test/repositories/availability-repository.test.js`を更新:

```javascript
const fs = require('fs');
const availabilityRepository = require('../../src/repositories/availability-repository');
const cosmosClient = require('../../src/repositories/cosmos-client');

// Cosmos DBモック
jest.mock('../../src/repositories/cosmos-client');

describe('Availability Repository with Cosmos DB', () => {
  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    
    // Cosmos DBモックの設定
    cosmosClient.initialize = jest.fn().mockResolvedValue();
    cosmosClient.getContainer = jest.fn().mockReturnValue({
      items: {
        query: jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: [] })
        }),
        readAll: jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: [] })
        })
      }
    });
  });

  describe('getAvailabilityData', () => {
    test('should return data from Cosmos DB when available', async () => {
      const mockData = [
        {
          id: '2025-11-15_ensemble-hongo',
          date: '2025-11-15',
          facilityName: 'あんさんぶるStudio和(本郷)',
          timeSlots: { '9-12': 'available', '13-17': 'booked', '18-21': 'available' },
          updatedAt: '2025-08-25T10:00:00Z'
        }
      ];

      cosmosClient.getContainer.mockReturnValue({
        items: {
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({ resources: mockData })
          })
        }
      });

      const result = await availabilityRepository.getAvailabilityData('2025-11-15');
      
      expect(result).toHaveLength(1);
      expect(result[0].facilityName).toBe('あんさんぶるStudio和(本郷)');
      expect(result[0].timeSlots['13-17']).toBe('booked');
      expect(cosmosClient.initialize).toHaveBeenCalled();
    });

    test('should fallback to JSON file when Cosmos DB fails', async () => {
      // Cosmos DBエラーをシミュレート
      cosmosClient.initialize.mockRejectedValue(new Error('Connection failed'));
      
      // JSONファイル存在確認モック
      const originalExistsSync = fs.existsSync;
      const originalReadFileSync = fs.readFileSync;
      
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
        data: {
          '2025-11-15': [
            {
              facilityName: 'あんさんぶるStudio和(本郷)',
              timeSlots: { '9-12': 'available', '13-17': 'available', '18-21': 'booked' }
            }
          ]
        }
      }));

      const result = await availabilityRepository.getAvailabilityData('2025-11-15');
      
      expect(result).toHaveLength(1);
      expect(result[0].facilityName).toBe('あんさんぶるStudio和(本郷)');
      
      // クリーンアップ
      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
    });

    test('should return empty array when no data exists', async () => {
      const result = await availabilityRepository.getAvailabilityData('2025-12-31');
      expect(result).toEqual([]);
    });
  });

  describe('getAllAvailabilityData', () => {
    test('should return all data from Cosmos DB', async () => {
      const mockData = [
        {
          date: '2025-11-15',
          facilityName: 'あんさんぶるStudio和(本郷)',
          timeSlots: { '9-12': 'available', '13-17': 'booked', '18-21': 'available' },
          updatedAt: '2025-08-25T10:00:00Z'
        },
        {
          date: '2025-11-16',
          facilityName: 'あんさんぶるStudio音(初台)',
          timeSlots: { '9-12': 'booked', '13-17': 'booked', '18-21': 'available' },
          updatedAt: '2025-08-25T10:00:00Z'
        }
      ];

      cosmosClient.getContainer.mockReturnValue({
        items: {
          readAll: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({ resources: mockData })
          })
        }
      });

      const result = await availabilityRepository.getAllAvailabilityData();
      
      expect(result['2025-11-15']).toBeDefined();
      expect(result['2025-11-16']).toBeDefined();
      expect(result['2025-11-15'][0].facilityName).toBe('あんさんぶるStudio和(本郷)');
    });
  });
});
```

#### テスト実行と確認
```bash
cd functions
npm test -- availability-repository.test.js

# 期待される結果:
# PASS test/repositories/availability-repository.test.js
#   Availability Repository with Cosmos DB
#     getAvailabilityData
#       ✓ should return data from Cosmos DB when available
#       ✓ should fallback to JSON file when Cosmos DB fails
#       ✓ should return empty array when no data exists
#     getAllAvailabilityData
#       ✓ should return all data from Cosmos DB
```

### 1-4. データマイグレーション（10分）

`functions/scripts/migrate-to-cosmos.js`を作成（前述のコードと同じ）

### 1-5. API層の調整（10分）

`functions/src/functions/availability-api.js`は変更不要（リポジトリ層が吸収）

### 1-6. 統合テストの実装と実行（20分）

#### E2Eテスト実装
`functions/test/integration/backend-cosmos-integration.test.js`を新規作成:

```javascript
const axios = require('axios');

describe('Backend Cosmos DB Integration Test', () => {
  const baseUrl = 'http://localhost:7071/api';
  
  beforeAll(() => {
    console.log('Starting integration tests...');
    console.log('Make sure Azure Functions is running: npm start');
  });

  describe('Availability API', () => {
    test('should return availability data for specific date', async () => {
      const response = await axios.get(`${baseUrl}/availability/2025-11-15`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('date', '2025-11-15');
      expect(response.data).toHaveProperty('facilities');
      expect(Array.isArray(response.data.facilities)).toBe(true);
    });

    test('should return all availability data', async () => {
      const response = await axios.get(`${baseUrl}/availability`);
      
      expect(response.status).toBe(200);
      expect(typeof response.data).toBe('object');
      
      // 少なくとも1つの日付データが存在することを確認
      const dates = Object.keys(response.data);
      expect(dates.length).toBeGreaterThan(0);
    });

    test('should handle non-existent date gracefully', async () => {
      const response = await axios.get(`${baseUrl}/availability/2099-12-31`);
      
      expect(response.status).toBe(200);
      expect(response.data.facilities).toEqual([]);
    });
  });
});
```

#### テスト実行手順
```bash
# Terminal 1: Azure Functions起動
cd functions
npm start

# Terminal 2: 統合テスト実行
cd functions
npm test -- integration/backend-cosmos-integration.test.js

# 期待される結果:
# PASS test/integration/backend-cosmos-integration.test.js
#   Backend Cosmos DB Integration Test
#     Availability API
#       ✓ should return availability data for specific date
#       ✓ should return all availability data
#       ✓ should handle non-existent date gracefully
```

### フェーズ1完了確認チェックリスト

```bash
# すべてのテストを実行
cd functions
npm test

# 期待される結果:
# Test Suites: 4 passed, 4 total
# Tests: 15 passed, 15 total
# Coverage: 85%+
```

✅ 確認項目:
- [ ] 環境変数が正しく設定されている
- [ ] Cosmos DBクライアントのテストが成功
- [ ] リポジトリ層のテストが成功（Cosmos DB & フォールバック）
- [ ] 統合テストが成功
- [ ] データマイグレーションが正常に完了
- [ ] API経由でデータが取得できる

---

## フェーズ2: Scraper移行（約45分）

### 2-1. Python環境設定（10分）

```bash
cd scraper
pip install azure-cosmos
```

`requirements.txt`に追加:
```
azure-cosmos==4.5.0
```

### 2-2. Cosmos DB書き込みモジュール作成とテスト（25分）

#### 実装
`scraper/src/cosmos_writer.py`を新規作成:

```python
import os
from datetime import datetime
from typing import Dict, List
from azure.cosmos import CosmosClient, exceptions
from dotenv import load_dotenv

load_dotenv()

class CosmosWriter:
    def __init__(self):
        endpoint = os.getenv('COSMOS_ENDPOINT')
        key = os.getenv('COSMOS_KEY')
        database_name = os.getenv('COSMOS_DATABASE', 'studio-reservations')
        
        if not endpoint or not key:
            raise ValueError("Cosmos DB connection settings are missing")
        
        self.client = CosmosClient(endpoint, key)
        self.database = self.client.get_database_client(database_name)
        self.container = self.database.get_container_client('availability')
    
    def save_availability(self, date: str, facilities: List[Dict]) -> bool:
        """
        空き状況データをCosmos DBに保存
        
        Args:
            date: YYYY-MM-DD形式の日付
            facilities: 施設データのリスト
        
        Returns:
            成功時True
        """
        try:
            for facility in facilities:
                # facility IDを生成
                facility_id = self._generate_facility_id(facility['facilityName'])
                
                # Cosmos DB用のデータ構造
                item = {
                    'id': f"{date}_{facility_id}",
                    'partitionKey': date,
                    'date': date,
                    'facility': facility_id,
                    'facilityName': facility['facilityName'],
                    'timeSlots': facility['timeSlots'],
                    'updatedAt': facility.get('lastUpdated', datetime.utcnow().isoformat() + 'Z'),
                    'dataSource': 'scraping'
                }
                
                # upsert（存在する場合は更新、なければ作成）
                self.container.upsert_item(body=item)
                print(f"Saved to Cosmos DB: {date} - {facility['facilityName']}")
            
            return True
            
        except exceptions.CosmosHttpResponseError as e:
            print(f"Cosmos DB error: {e.message}")
            return False
        except Exception as e:
            print(f"Unexpected error: {e}")
            return False
    
    def _generate_facility_id(self, facility_name: str) -> str:
        """施設名からIDを生成"""
        if "本郷" in facility_name:
            return "ensemble-hongo"
        elif "初台" in facility_name:
            return "ensemble-hatsudai"
        else:
            # その他の施設用
            return facility_name.lower().replace(' ', '-').replace('(', '').replace(')', '')
```

#### テスト実装
`scraper/tests/test_cosmos_writer.py`を新規作成:

```python
import unittest
from unittest.mock import Mock, patch, MagicMock
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.cosmos_writer import CosmosWriter

class TestCosmosWriter(unittest.TestCase):
    
    @patch.dict(os.environ, {
        'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
        'COSMOS_KEY': 'test-key',
        'COSMOS_DATABASE': 'test-db'
    })
    @patch('src.cosmos_writer.CosmosClient')
    def setUp(self, mock_cosmos_client):
        """テスト用のセットアップ"""
        # Cosmos DBクライアントのモック
        self.mock_client = MagicMock()
        self.mock_database = MagicMock()
        self.mock_container = MagicMock()
        
        mock_cosmos_client.return_value = self.mock_client
        self.mock_client.get_database_client.return_value = self.mock_database
        self.mock_database.get_container_client.return_value = self.mock_container
        
        self.writer = CosmosWriter()
    
    def test_save_availability_success(self):
        """正常にデータが保存できることを確認"""
        # テストデータ
        test_date = '2025-11-15'
        test_facilities = [
            {
                'facilityName': 'あんさんぶるStudio和(本郷)',
                'timeSlots': {
                    '9-12': 'available',
                    '13-17': 'booked',
                    '18-21': 'available'
                },
                'lastUpdated': '2025-08-25T10:00:00Z'
            }
        ]
        
        # upsert_itemが成功することをモック
        self.mock_container.upsert_item.return_value = {'id': 'test'}
        
        # 実行
        result = self.writer.save_availability(test_date, test_facilities)
        
        # 検証
        self.assertTrue(result)
        self.mock_container.upsert_item.assert_called_once()
        
        # upsertに渡されたデータを検証
        call_args = self.mock_container.upsert_item.call_args
        saved_item = call_args.kwargs['body']
        
        self.assertEqual(saved_item['id'], '2025-11-15_ensemble-hongo')
        self.assertEqual(saved_item['date'], '2025-11-15')
        self.assertEqual(saved_item['facilityName'], 'あんさんぶるStudio和(本郷)')
        self.assertEqual(saved_item['timeSlots']['13-17'], 'booked')
    
    def test_save_availability_cosmos_error(self):
        """Cosmos DBエラー時の処理を確認"""
        from azure.cosmos import exceptions
        
        # エラーをシミュレート
        self.mock_container.upsert_item.side_effect = exceptions.CosmosHttpResponseError(
            status_code=500,
            message='Internal Server Error'
        )
        
        test_facilities = [{'facilityName': 'test', 'timeSlots': {}}]
        
        # 実行
        result = self.writer.save_availability('2025-11-15', test_facilities)
        
        # エラー時はFalseが返される
        self.assertFalse(result)
    
    def test_generate_facility_id(self):
        """施設IDの生成ロジックを確認"""
        test_cases = [
            ('あんさんぶるStudio和(本郷)', 'ensemble-hongo'),
            ('あんさんぶるStudio音(初台)', 'ensemble-hatsudai'),
            ('Other Studio Name', 'other-studio-name')
        ]
        
        for facility_name, expected_id in test_cases:
            result = self.writer._generate_facility_id(facility_name)
            self.assertEqual(result, expected_id)
    
    @patch.dict(os.environ, {})
    def test_missing_connection_settings(self):
        """接続設定が不足している場合のエラー"""
        with self.assertRaises(ValueError) as context:
            CosmosWriter()
        
        self.assertIn('Cosmos DB connection settings are missing', str(context.exception))

if __name__ == '__main__':
    unittest.main()
```

#### テスト実行と確認
```bash
cd scraper
python -m pytest tests/test_cosmos_writer.py -v

# 期待される結果:
# tests/test_cosmos_writer.py::TestCosmosWriter::test_save_availability_success PASSED
# tests/test_cosmos_writer.py::TestCosmosWriter::test_save_availability_cosmos_error PASSED
# tests/test_cosmos_writer.py::TestCosmosWriter::test_generate_facility_id PASSED
# tests/test_cosmos_writer.py::TestCosmosWriter::test_missing_connection_settings PASSED
# ========================= 4 passed in 0.5s =========================
```

### 2-3. スクレイパー本体の修正とテスト（15分）

#### 実装

`scraper/src/scraper.py`の`scrape_and_save`メソッドを更新:

```python
def scrape_and_save(self, date: str, output_path: Optional[str] = None) -> Dict:
    """
    指定日付の空き状況をスクレイピングして保存
    
    Args:
        date: "YYYY-MM-DD"形式の日付文字列
        output_path: 出力先パス（省略時はCosmos DBに保存）
    
    Returns:
        保存したデータ
    """
    # スクレイピング実行
    facilities = self.scrape_availability(date)
    
    # Cosmos DBに保存を試みる
    try:
        from cosmos_writer import CosmosWriter
        writer = CosmosWriter()
        if writer.save_availability(date, facilities):
            print(f"Successfully saved to Cosmos DB: {date}")
        else:
            print("Failed to save to Cosmos DB, falling back to JSON file")
            output_path = output_path or Path(__file__).parent.parent.parent / "shared-data" / "availability.json"
    except Exception as e:
        print(f"Cosmos DB not available: {e}")
        output_path = output_path or Path(__file__).parent.parent.parent / "shared-data" / "availability.json"
    
    # JSONファイルにも保存（移行期間中の暫定対応）
    if output_path:
        existing_data = {}
        if Path(output_path).exists():
            try:
                with open(output_path, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
            except:
                existing_data = {}
        
        if "data" not in existing_data:
            existing_data["data"] = {}
        
        existing_data["lastScraped"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        existing_data["data"][date] = facilities
        
        self.save_to_json(existing_data, str(output_path))
        print(f"Also saved to JSON file: {output_path}")
    
    return {"data": {date: facilities}}
```

### 2-4. メインエントリーポイント修正（5分）

`scraper/src/main.py`に環境変数読み込みを追加（前述のコードと同じ）

### 2-5. Scraperテスト実行と確認（10分）

```bash
# 全テスト実行
cd scraper
python -m pytest tests/ -v

# 期待される結果:
# tests/test_cosmos_writer.py ... 4 passed
# tests/test_scraper.py ... 既存のテストもすべてPASS
# ========================= 10+ passed =========================
```

### フェーズ2完了確認チェックリスト

✅ 確認項目:
- [ ] azure-cosmosパッケージがインストールされている
- [ ] CosmosWriterのテストが成功
- [ ] スクレイパーがCosmos DBに書き込める（フォールバック付き）
- [ ] JSONファイルにも同時保存される（移行期間中）
- [ ] 既存のスクレイパーテストがすべて成功

---

## フェーズ3: 完全移行とクリーンアップ（約15分）

### 3-1. JSONファイル依存の削除（10分）

#### Backend側
`functions/src/repositories/availability-repository.js`からJSONファイル読み込み部分を削除

#### Scraper側
`scraper/src/scraper.py`からJSONファイル書き込み部分を削除

#### ファイル削除
```bash
rm shared-data/availability.json
```

### 3-2. ドキュメント更新（5分）

- `docs/DEVELOPMENT_SPEC.md`のデータベース設計セクション更新済み
- `README.md`のデータストレージに関する記述を更新
- `CLAUDE.md`の現在の状態セクションを更新

---

## 最終動作確認とシステムテスト

### End-to-Endシステムテスト（20分）

#### 1. Backend動作確認
```bash
# Terminal 1: Azure Functions起動
cd functions
npm start

# Terminal 2: APIテスト
curl http://localhost:7071/api/availability/2025-11-15

# 期待される結果:
# {
#   "date": "2025-11-15",
#   "facilities": [
#     {
#       "facilityName": "あんさんぶるStudio和(本郷)",
#       "timeSlots": { "9-12": "available", "13-17": "booked", "18-21": "available" },
#       "lastUpdated": "2025-08-25T10:00:00Z"
#     }
#   ]
# }
```

#### 2. Scraper動作確認
```bash
cd scraper
python src/main.py --date 2025-11-15

# 期待される結果:
# スクレイピング開始: 2025-11-15
# Saved to Cosmos DB: 2025-11-15 - あんさんぶるStudio和(本郷)
# Saved to Cosmos DB: 2025-11-15 - あんさんぶるStudio音(初台)
# Successfully saved to Cosmos DB: 2025-11-15
# Also saved to JSON file: ../../shared-data/availability.json
# スクレイピング完了
```

#### 3. Frontend統合テスト
```bash
# Terminal 3: Frontend起動
cd frontend
npm start

# ブラウザでhttp://localhost:3000を開く
# 2025-11-15の空き状況が表示されることを確認
```

#### 4. Cosmos DB確認
Azure PortalでData Explorerを開き、以下を確認:
- `availability`コンテナにデータが保存されている
- パーティションキーが正しく設定されている
- クエリが正常に実行できる

```sql
SELECT * FROM c WHERE c.date = '2025-11-15'
```

### パフォーマンステスト

```bash
# レスポンス時間測定
time curl http://localhost:7071/api/availability/2025-11-15

# 期待される結果: 1秒以内にレスポンス
```

### 負荷テスト（オプション）

```bash
# Apache Benchでの簡易負荷テスト
ab -n 100 -c 10 http://localhost:7071/api/availability/2025-11-15

# 期待される結果:
# - 全リクエスト成功（Failed requests: 0）
# - 平均レスポンス時間: 500ms以内
```

---

## トラブルシューティング

### 接続エラー
- 環境変数が正しく設定されているか確認
- Cosmos DBのファイアウォール設定を確認

### データ不整合
- マイグレーションスクリプトを再実行
- Cosmos DBとJSONファイルの両方を確認

### パフォーマンス問題
- パーティションキーが正しく設定されているか確認
- RU/sの設定を確認（無料枠: 1000 RU/s）

---

## ロールバック手順

問題が発生した場合:

1. 環境変数から`COSMOS_ENDPOINT`を削除
2. Backendが自動的にJSONファイルにフォールバック
3. Scraperも自動的にJSONファイル保存に戻る

---

## 移行完了チェックリスト

### 必須確認項目
- [ ] **フェーズ0: Azure Cosmos DB無料枠セットアップ**
  - [ ] Azureアカウント作成
  - [ ] Cosmos DBアカウント作成（無料枠適用確認）
  - [ ] データベース作成（studio-reservations）
  - [ ] 3つのコンテナ作成（availability, target_dates, rate_limits）
  - [ ] 接続情報取得と保管
  - [ ] Azure Portal上での接続確認

- [ ] **フェーズ1: Backend完全移行**
  - [ ] 環境変数設定完了
  - [ ] Cosmos DBクライアントテスト成功
  - [ ] リポジトリ層テスト成功
  - [ ] 統合テスト成功
  - [ ] データマイグレーション完了

- [ ] **フェーズ2: Scraper移行**
  - [ ] azure-cosmosインストール完了
  - [ ] CosmosWriterテスト成功
  - [ ] スクレイパーテスト成功
  - [ ] DB書き込み動作確認

- [ ] **フェーズ3: 完全移行**
  - [ ] JSONファイル依存削除
  - [ ] ドキュメント更新完了

- [ ] **システムテスト**
  - [ ] E2Eテスト成功
  - [ ] パフォーマンステスト合格
  - [ ] 本番環境での動作確認

### テストカバレッジ目標
- Backend: 85%以上
- Scraper: 80%以上
- 統合テスト: すべてのAPIエンドポイントをカバー

---

*最終更新: 2025-08-25*