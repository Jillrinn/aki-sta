# 空きスタサーチくん

音楽団体向けのスタジオ予約空き状況一元管理システム

![Main CI](https://github.com/Jillrinn/aki-sta/workflows/Main%20CI%2FCD%20Pipeline/badge.svg)

## 🎯 概要
複数のスタジオ・施設の予約空き状況を一画面で確認できるWebアプリケーション。
20人程度の音楽団体が効率的に練習場所を見つけられるよう支援します。

## 🔧 技術スタック
- **バックエンド**: Azure Functions (Node.js)
- **フロントエンド**: React + TypeScript
- **データベース**: Azure Cosmos DB (NoSQL)
- **テスト**: Jest + React Testing Library + Playwright
- **スクレイパー**: Python + Playwright (Docker対応)
- **CI/CD**: GitHub Actions
- **コンテナ**: Docker (スクレイパー環境の一貫性確保)

## 🛠️ 開発環境・特殊機能

### Docker環境でのスクレイパー実行 🐳
スクレイパーはDockerコンテナで実行することで、環境の一貫性を保証します。
- **環境統一**: ローカル/CI/本番で同一のDockerイメージを使用
- **依存関係解決**: Playwrightブラウザが事前インストール済み
- **プラットフォーム対応**: macOS（WebKit）、Linux/Docker（Chromium）を自動選択
- **簡単実行**: `npm run scraper:date -- 2025/09/20` で即実行可能

### Playwright環境分離システム 🎯
Python（スクレイパー）とNode.js（E2E）で異なるバージョンのPlaywrightを使用してもバージョン競合が発生しない包括的なシステムを実装。
- **環境分離**: `~/.cache/playwright-python` と `~/.cache/playwright-node`
- **自動修復**: ブラウザ不足時の自動インストール・復旧機能
- **バージョン独立**: どちらの環境を先に実行しても影響なし
- **設定**: `scraper/.env.playwright` と `e2e/.env.playwright`

### 初回セットアップ
```bash
# 包括的環境セットアップ（推奨）
./setup-playwright-environments.sh

# Dockerを使用する場合（スクレイパー）
npm run scraper:build  # 初回のみ必要
```

### Cosmos DB統合 🌐
Azure Cosmos DB（NoSQL）を使用したデータ永続化を実装。
- **無料枠**: 1000 RU/s + 25GB ストレージ
- **自動フォールバック**: Cosmos DB → JSONファイル
- **環境変数同期**: .env → local.settings.json
- **データマイグレーション**: JSONからCosmos DBへの移行ツール

## 🚀 クイックスタート

### 前提条件
- Node.js v18以上
- Azure Functions Core Tools v4
- Git
- Azure アカウント（Cosmos DB用、無料枠利用可）

### インストール
```bash
# リポジトリをクローン
git clone <repository-url>
cd aki-sta

# バックエンドの依存関係インストール
cd api
npm install
cd ..

# フロントエンドの依存関係インストール
cd frontend
npm install
cd ..
```

### Cosmos DBセットアップ
```bash
# 1. Azure PortalでCosmos DBアカウント作成（無料枠適用）
# 2. .envファイルに接続情報を設定
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-primary-key
COSMOS_DATABASE=akista-db

# 3. 環境変数同期と接続テスト
npm run cosmos:setup  # 同期→テスト→マイグレーション一括実行

# または個別実行
npm run sync:env      # .env → local.settings.json
npm run cosmos:test   # 接続テスト
npm run cosmos:migrate # データマイグレーション
```

### ローカル開発

#### 方法1: v3 Functions（従来版）
```bash
# バックエンドとフロントエンドを同時起動
npm start
```

#### 方法2: 個別起動
```bash
# バックエンド
cd api && func start  # ポート7071

# フロントエンド
cd frontend && npm start   # ポート3300
```

### アクセスURL
- **フロントエンド**: http://localhost:3300
- **API**: http://localhost:7071/api/availability/{date}
  - 例: http://localhost:7071/api/availability/2025-11-15

## 🧪 テスト実行

### 一括テスト
```bash
# 全テスト実行（Backend + Frontend + Scraper + E2E）
npm test

# 並列実行（高速）
npm run test:all
```

### 個別テスト
#### バックエンドテスト
```bash
cd api
npm test                    # テスト実行
```

#### フロントエンドテスト
```bash
cd frontend
npm test                    # テスト実行（ウォッチモード）
npm test -- --coverage --watchAll=false  # カバレッジ付きテスト
```

#### Pythonスクレイパーテスト
```bash
# Docker実行（推奨）
npm run test:scraper

# ローカル実行（開発用）
npm run test:scraper:local
```

### 🕷️ スクレイパー実行

#### Docker実行（推奨）
```bash
# Dockerイメージをビルド
npm run scraper:build

# デフォルト実行（今日の日付でスクレイピング）
npm run scraper

# 特定の日付を指定して実行
npm run scraper:date -- 2025/11/15

# Dockerコンテナでテスト実行
npm run test:scraper
```

#### ローカル実行（開発用）
```bash
# 特定の日付を指定して実行
npm run scraper:local:date -- 2025/11/15

# ローカル環境でテスト実行
npm run test:scraper:local
```

**注意**: Docker実行では環境の一貫性が保証され、Playwrightブラウザのインストールも不要です。

#### E2Eテスト
```bash
cd e2e
npm test                    # E2Eテスト実行
npm run test:headed         # ブラウザを表示してテスト
npm run test:ui             # Playwright UIモード
```

## 🚀 Azure本番環境デプロイ

### 自動デプロイ (GitHub Actions)
本プロジェクトはGitHub Actionsによる自動デプロイが設定されています。
`main`ブランチへのpush時に以下の順序でデプロイが実行されます：

1. **テスト実行**: Backend/Frontend/Scraper/E2E
2. **Azure Functions デプロイ**: Backend APIデプロイ
3. **Static Web Apps デプロイ**: Frontendデプロイ  
4. **Container デプロイ**: Scraperコンテナデプロイ

### 初回セットアップ手順

#### 1. Azureリソースの作成
```bash
# インフラストラクチャの一括作成
cd infrastructure
./deploy-azure.sh production
```

このスクリプトは以下を自動作成します：
- Resource Group
- Cosmos DB (無料枠)
- Storage Account
- Azure Functions
- Static Web Apps
- Container Registry
- Application Insights

#### 2. GitHub Secrets設定
スクリプト実行後に生成される`github-secrets-production.json`の内容をGitHub Secretsに設定：

1. GitHubリポジトリ → Settings → Secrets and variables → Actions
2. 以下のSecretsを追加：
   - `AZURE_CREDENTIALS`
   - `AZURE_SUBSCRIPTION_ID`
   - `AZURE_FUNCTIONAPP_NAME`
   - `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`
   - `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - `AZURE_CONTAINER_REGISTRY_SERVER`
   - `AZURE_CONTAINER_REGISTRY_USERNAME`
   - `AZURE_CONTAINER_REGISTRY_PASSWORD`
   - `COSMOS_ENDPOINT`
   - `COSMOS_KEY`
   - `COSMOS_DATABASE`

詳細は[GitHub Secrets設定ガイド](./docs/GITHUB_SECRETS.md)を参照。

#### 3. デプロイ実行
```bash
# mainブランチにpush
git push origin main

# または手動実行
# GitHub Actions → Deploy to Production → Run workflow
```

### 本番環境URL
- **アプリケーション**: https://delightful-smoke-0d4827500.1.azurestaticapps.net
- **API**: https://delightful-smoke-0d4827500.1.azurestaticapps.net/api
- **スクレイパー**: https://aki-sta-scraper-cygfc8fvc2f5ebfq.eastasia-01.azurewebsites.net

### デプロイ関連ドキュメント
- [Azure デプロイ詳細手順](./docs/AZURE_DEPLOYMENT.md)
- [GitHub Secrets設定](./docs/GITHUB_SECRETS.md)
- [デプロイワークフロー](./.github/workflows/deploy-production.yml)

## 📁 プロジェクト構造
```
aki-sta/
├── api/                            # Azure Functions バックエンド
│   ├── src/
│   │   ├── functions/
│   │   │   └── availability.js    # 関数実装
│   │   └── repositories/          # データアクセス層
│   │       ├── availability-repository.js
│   │       └── cosmos-client.js
│   ├── test/                       # テストコード
│   ├── scripts/                    # ユーティリティスクリプト
│   │   └── sync-env.js            # 環境変数同期
│   ├── host.json                  # Azure Functions設定
│   ├── local.settings.json        # ローカル設定（gitignore）
│   └── package.json               # 依存関係・スクリプト
├── frontend/                       # React TypeScript アプリ
│   ├── src/
│   │   ├── components/            # UIコンポーネント
│   │   │   └── AvailabilityTable.tsx  # 空き状況テーブル
│   │   ├── services/              # API通信層
│   │   │   └── api.ts            # APIクライアント
│   │   ├── types/                 # TypeScript型定義
│   │   │   └── availability.ts   # データモデル
│   │   ├── App.tsx                # メインコンポーネント
│   │   └── setupTests.ts          # Jest設定
│   ├── public/                    # 静的ファイル
│   ├── .env                       # 環境変数（PORT=3300）
│   ├── package.json               # 依存関係・プロキシ設定
│   └── tsconfig.json              # TypeScript設定
├── scraper/                       # Pythonスクレイパー（Playwright）
│   ├── src/
│   │   ├── scraper.py            # スクレイピングロジック（人間的操作）
│   │   ├── playwright_wrapper.py # 自動修復機能付きPlaywrightラッパー
│   │   ├── main.py               # CLIエントリーポイント
│   │   └── generate_test_data.py # テストデータ生成
│   ├── tests/
│   │   ├── test_scraper.py       # スクレイパーテスト
│   │   └── test_dynamic_date.py  # 動的日付テスト
│   ├── docs/
│   │   └── scraping-specification.md # 人間的スクレイピング仕様
│   ├── shared-data/              # スクレイピング結果保存
│   │   └── availability.json     # 実データ
│   ├── run-playwright.sh         # 環境分離実行スクリプト
│   ├── .env.playwright           # Python用環境設定
│   ├── requirements.txt          # Python依存関係
│   └── README.md                 # スクレイパードキュメント
├── e2e/                           # E2Eテスト（Playwright/TypeScript）
│   ├── tests/
│   │   └── app.spec.ts           # E2Eテストケース
│   ├── fixtures/
│   │   └── test-data.json        # 固定テストデータ
│   ├── scripts/                  # 環境管理
│   │   ├── load-env.js           # 環境変数読み込み
│   │   └── ensure-browsers.js    # ブラウザ自動インストール
│   ├── run-test.sh               # 環境分離テスト実行
│   ├── .env.playwright           # Node.js用環境設定
│   └── playwright.config.ts      # Playwright設定
├── docs/                          # ドキュメント
│   ├── DEVELOPMENT_SPEC.md       # 開発仕様書
│   └── GITHUB_ACTIONS.md         # CI/CDパイプライン詳細
├── .github/                       # GitHub Actions CI/CD
│   ├── workflows/
│   ├── mvp-checklist.md          # MVP完了判定基準
│   └── commit-checklist.md       # コミット前確認事項
├── setup-playwright-environments.sh # 包括的環境セットアップスクリプト
├── README.md                      # プロジェクト概要（このファイル）
└── CLAUDE.md                      # Claude専用指示書
```

## 🔧 開発方針

### テスト駆動開発（TDD）
新機能開発時は必ずテストファーストで実装：
1. テストケース作成
2. テスト失敗確認（RED）
3. 最小限のコードで成功（GREEN）
4. リファクタリング（REFACTOR）

### コーディング規約
- TypeScript使用（フロントエンド）
- ESLint/Prettier準拠
- コンポーネントは関数型で実装
- カスタムフックでロジック分離

## 📚 ドキュメント
- [CLAUDE.md](./CLAUDE.md) - Claude AI専用指示書（AIアシスタント用）
- [開発仕様書](./docs/DEVELOPMENT_SPEC.md) - 詳細技術仕様
- [frontend/README.md](./frontend/README.md) - フロントエンド詳細
- [GitHub Actions](./docs/GITHUB_ACTIONS.md) - CI/CDパイプライン詳細

## 📡 API仕様

### エンドポイント

#### 特定日付のデータ取得
```
GET /api/availability/{date}
```
- **パラメータ**: date (YYYY-MM-DD形式)
- **例**: `/api/availability/2025-11-15`

#### 全日付のデータ取得
```
GET /api/availability
```
- **パラメータ**: なし
- **レスポンス**: 日付をキーとしたデータのオブジェクト

### レスポンス形式
```typescript
interface AvailabilityResponse {
  date: string;                    // 日付 (YYYY-MM-DD)
  facilities: Facility[];          // 施設リスト
  dataSource: 'dummy' | 'scraping'; // データソース
}

interface Facility {
  facilityName: string;            // 施設名
  timeSlots: {                    // 時間枠ごとの状態
    [timeSlot: string]: 'available' | 'booked' | 'lottery' | 'unknown';
  };
  lastUpdated: string;             // 施設ごとの最終更新日時 (ISO 8601)
}
```

### ステータス値
- `available`: 空き（○）
- `booked`: 予約済み（×）
- `lottery`: 抽選中（△）※v2.0予定
- `unknown`: 不明（?）※v2.0予定

## 🚦 環境変数
### フロントエンド (.env)
```
REACT_APP_API_URL=/api  # デフォルト値、プロキシ経由
```

### バックエンド (local.settings.json)
```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": ""
  },
  "Host": {
    "CORS": "*"
  }
}
```

## 🐛 トラブルシューティング

### Azure Functions が起動しない
```bash
# 構造確認
ls functions/availability-api/index.js
ls functions/availability-api/function.json
# package.jsonのmainフィールドが削除されていることを確認
```

### ポート使用中エラー
```bash
# ポート3300の確認
lsof -i :3300
# ポート7071の確認
lsof -i :7071
```

### テストエラー
- axiosのESMエラー: setupTests.tsでモック設定確認
- act()警告: 非同期処理を適切にラップ

## 🗓️ ロードマップ

| バージョン | 内容 | ステータス |
|-----------|------|----------|
| v1.0 | 複数施設対応・複数日付管理・Timer Trigger | 📋 次期開発 |
| v2.0 | ユーザー認証・お気に入り・通知機能 | 📋 バックログ |

## 📚 外部リソース

### 公式ドキュメント
- [Azure Functions ドキュメント](https://docs.microsoft.com/ja-jp/azure/azure-functions/)
- [React ドキュメント](https://react.dev/)
- [TypeScript ドキュメント](https://www.typescriptlang.org/)
- [Jest テスティング](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### ツール
- [Azure Functions Core Tools](https://github.com/Azure/azure-functions-core-tools)
- [Create React App](https://create-react-app.dev/)
- [npm](https://www.npmjs.com/)

## 👥 コントリビューション
現在プライベートプロジェクトとして開発中

## 📝 ライセンス
Private Project

---
*空きスタサーチくん - 練習場所探しをもっと簡単に*