# Azure Functions バックエンド

空きスタサーチくんのバックエンドAPI実装（Azure Functions + Cosmos DB）

## 🚀 クイックスタート

### 前提条件
- Node.js v18以上
- Azure Functions Core Tools v4
- Azure アカウント（Cosmos DB無料枠利用）

### セットアップ

#### 1. 依存関係インストール
```bash
npm install
```

#### 2. ローカル設定ファイルの作成（初回のみ）
```bash
# local.settings.jsonをテンプレートから作成
npm run setup
```

#### 3. Cosmos DB接続設定
`local.settings.json`を編集して実際の接続情報を設定：
```json
{
  "Values": {
    "COSMOS_ENDPOINT": "https://your-account.documents.azure.com:443/",
    "COSMOS_KEY": "your-primary-key",
    "COSMOS_DATABASE": "akista-db"
  }
}
```

⚠️ **重要**: `local.settings.json`は`.gitignore`に含まれているため、コミットされません。接続情報は安全に保管されます。

#### 4. ローカル起動
```bash
npm start
# http://localhost:7071 で起動
```

## 📊 データストア

### Cosmos DB統合（v3.0）
- **データベース**: Azure Cosmos DB (NoSQL)
- **無料枠**: 1000 RU/s + 25GB
- **自動フォールバック**: Cosmos DB障害時はJSONファイル使用
- **データ同期**: JSONファイル → Cosmos DB自動マイグレーション

### フォールバック機構
```javascript
// Cosmos DB → JSONファイル自動切り替え
if (cosmosDB.isAvailable()) {
  return await cosmosDB.getData();
} else {
  console.warn('Cosmos DB unavailable, falling back to JSON');
  return await jsonFile.getData();
}
```

## 🔧 環境変数

### local.settings.json（Azure Functions用）
```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "",
    "COSMOS_ENDPOINT": "https://your-account.documents.azure.com:443/",
    "COSMOS_KEY": "your-primary-key",
    "COSMOS_DATABASE": "akista-db"
  }
}
```

### GitHub Actions用設定
GitHub Secretsに以下を登録：
- `COSMOS_ENDPOINT`: Cosmos DBエンドポイント
- `COSMOS_KEY`: プライマリキー
- `COSMOS_DATABASE`: データベース名

## 📡 API仕様

### エンドポイント

#### 特定日付の空き状況取得
```
GET /api/availability/{date}
```
- パラメータ: date (YYYY-MM-DD形式)
- 例: `/api/availability/2025-11-15`

#### 全日付のデータ取得
```
GET /api/availability
```

### レスポンス形式
```typescript
{
  date: string;                    // YYYY-MM-DD
  facilities: [{
    facilityName: string;
    timeSlots: {
      "9-12": "available" | "booked",
      "13-17": "available" | "booked",
      "18-21": "available" | "booked"
    },
    lastUpdated: string;           // ISO 8601
  }],
  dataSource: "cosmos" | "json" | "dummy"
}
```

## 🧪 テスト

```bash
# ユニットテスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage

# ウォッチモード
npm run test:watch
```

### テストカバレッジ目標
- **目標**: 95%以上
- **現状**: ✅ 95%達成

## 📚 プロジェクト構造

```
functions/
├── availability-api/           # Azure Functions標準構造
│   ├── index.js               # 関数実装
│   └── function.json          # 関数設定
├── src/                        # 共通コード専用
│   └── repositories/          # データアクセス層
│       ├── availability-repository.js
│       ├── cosmos-client.js
│       └── fallback-data.json
├── scripts/
│   └── sync-env.js            # 環境変数同期
├── test/
│   ├── availability-api/
│   │   └── availability-api.test.js
│   └── repositories/
│       ├── availability-repository.test.js
│       └── cosmos-client.test.js
├── test-cosmos-connection.js  # DB接続テスト
├── local.settings.json        # Azure Functions設定（gitignore）
├── host.json                  # Azure Functions全体設定
└── package.json               # mainフィールド削除済み
```

### 構造の特徴
- **Azure Functions標準構造採用**: 各関数がディレクトリとして独立
- **srcディレクトリ**: 共通コード（リポジトリ、ユーティリティ）専用
- **拡張性**: 新しいAPIは新しいディレクトリを作成するだけ

## 🛠️ NPMスクリプト

```bash
# 開発
npm run setup             # local.settings.json初期作成
npm start                 # Azure Functions起動

# Cosmos DB管理
npm run cosmos:test       # 接続テスト
npm run cosmos:migrate    # データマイグレーション
npm run cosmos:setup      # 同期→テスト→マイグレーション一括実行

# テスト
npm test                  # ユニットテスト
npm run test:coverage     # カバレッジ付き
npm run test:watch        # ウォッチモード
```

## 🐛 トラブルシューティング

### Azure Functions起動エラー
```bash
# "Worker was unable to load entry point"の場合
# package.jsonのmainフィールドを削除
# 各関数ディレクトリにindex.jsとfunction.jsonが存在することを確認
ls availability-api/index.js availability-api/function.json
```

### Cosmos DB接続エラー
```bash
# 環境変数確認
npm run sync:env

# 接続テスト
npm run cosmos:test
```

### ポート使用中エラー
```bash
lsof -i :7071
# プロセスをkillして再起動
```

## 📦 主要な依存関係

- **@azure/cosmos**: Cosmos DBクライアント
- **dotenv**: 環境変数管理
- **jest**: テストフレームワーク
- **axios**: HTTPクライアント（テスト用）

## 🔗 関連ドキュメント

- [プロジェクトREADME](../README.md)
- [Cosmos DB移行ガイド](../docs/COSMOS_DB_MIGRATION.md)
- [開発仕様書](../docs/DEVELOPMENT_SPEC.md)