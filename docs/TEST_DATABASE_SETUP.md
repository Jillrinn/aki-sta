# テスト環境と開発環境のデータベース使い分け設定

## 概要

このドキュメントでは、開発時とテスト実行時で異なるCosmos DBインスタンスを使用する方法について説明します。

- **開発時（ローカル起動）**: 本番用Cosmos DBを使用
- **テスト実行時**: テスト専用Cosmos DBを使用

## 環境構成

### ファイル構造
```
aki-sta/
├── .env                 # 本番用DB接続情報（開発時使用）
├── .env.test           # テスト用DB接続情報（テスト時使用）
├── .env.example        # サンプル設定
└── api/
    ├── .env            # ルートの.envのコピー（自動生成）
    └── local.settings.json  # Azure Functions用（sync-env.jsで同期）
```

## セットアップ手順

### 1. テスト用環境変数ファイルの作成

ルートディレクトリに`.env.test`ファイルを作成し、テスト用Cosmos DBの接続情報を記載します：

```bash
# .env.test
COSMOS_ENDPOINT=<テスト用CosmosDBのエンドポイント>
COSMOS_KEY=<テスト用CosmosDBのキー>
COSMOS_DATABASE=<テスト用データベース名>
SCRAPER_API_URL=http://localhost:8000
```

### 2. 本番用環境変数の確認

`.env`ファイルに本番用（開発時用）のCosmos DB接続情報が記載されていることを確認：

```bash
# .env
COSMOS_ENDPOINT=<本番用CosmosDBのエンドポイント>
COSMOS_KEY=<本番用CosmosDBのキー>
COSMOS_DATABASE=<本番用データベース名>
SCRAPER_API_URL=http://localhost:8000
```

### 3. 環境変数の同期

開発時にAzure Functionsを起動する前に、環境変数を同期します：

```bash
cd api
node scripts/sync-env.js
```

これにより、`.env`の内容が`local.settings.json`に反映されます。

## 使用方法

### 開発時（本番DBを使用）

```bash
# Azure Functions起動
cd api
func start

# または一括起動
npm start
```

自動的に`.env`の本番用DB設定が使用されます。

### テスト実行時（テスト用DBを使用）

```bash
# APIテストの実行
cd api
npm test

# または全体テスト
npm test
```

`NODE_ENV=test`が自動的に設定され、`.env.test`のテスト用DB設定が使用されます。

## 技術的な仕組み

### cosmos-client.jsの環境判定

`api/src/repositories/cosmos-client.js`では、NODE_ENVに基づいて適切な環境変数ファイルを読み込みます：

```javascript
// NODE_ENVがtestの場合は.env.test、それ以外は.envを読み込み
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
require('dotenv').config({ path: path.join(__dirname, '../../../', envFile) });
```

### package.jsonのテストスクリプト

`api/package.json`のtestスクリプトで`NODE_ENV=test`を設定：

```json
{
  "scripts": {
    "test": "NODE_ENV=test jest"
  }
}
```

## 注意事項

### セキュリティ
- `.env`と`.env.test`は機密情報を含むため、絶対にGitにコミットしないでください
- `.gitignore`に両ファイルが含まれていることを確認してください

### CI/CD環境
- GitHub ActionsやAzure DevOpsでは、環境変数またはシークレットとして設定してください
- テスト用と本番用で異なる値を設定することが重要です

### トラブルシューティング

#### テストが本番DBに接続してしまう場合
1. `NODE_ENV=test`が正しく設定されているか確認
2. `.env.test`ファイルが存在し、正しい形式で記載されているか確認
3. `api/package.json`のtestスクリプトを確認

#### 開発時にテストDBに接続してしまう場合
1. NODE_ENVが設定されていないか確認（`echo $NODE_ENV`）
2. 必要に応じて`unset NODE_ENV`を実行

## 環境変数の優先順位

1. プロセスの環境変数（最優先）
2. `.env.test`（NODE_ENV=testの場合）
3. `.env`（それ以外の場合）
4. local.settings.json（Azure Functions実行時）

## 更新履歴

- 2025-09-03: 初版作成 - テスト環境と開発環境の分離設定を追加