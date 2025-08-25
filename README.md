# 空きスタサーチくん

音楽団体向けのスタジオ予約空き状況一元管理システム

![Main CI](https://github.com/Jillrinn/aki-sta/workflows/Main%20CI%2FCD%20Pipeline/badge.svg)

## 🎯 概要
複数のスタジオ・施設の予約空き状況を一画面で確認できるWebアプリケーション。
20人程度の音楽団体が効率的に練習場所を見つけられるよう支援します。

## 📊 開発状況
**MVP v1.0** ✅ 完了（2025-08-21）
- ✅ バックエンドAPI実装（ダミーデータ）
- ✅ フロントエンド実装（React + TypeScript）
- ✅ API-Frontend統合動作確認
- ✅ バックエンドテスト実装
- ✅ フロントエンドテスト実装
- ✅ レスポンシブデザイン実装
- ✅ E2Eテスト実装（Playwright/TypeScript）

**MVP v2.0** ✅ 完了（2025-08-24）
- ✅ Pythonスクレイパー実装（Playwright）
- ✅ 実サイトからのスクレイピング実装（あんさんぶるスタジオ）
- ✅ 人間的操作スクレイピング（DOM探索・カレンダー操作）
- ✅ JSONファイルベースのデータ共有
- ✅ 3時間帯表示（9-12, 13-17, 18-21）
- ✅ Playwright環境分離システム（バージョン競合解決）
- ✅ 自動修復・ブラウザインストール機能

**次のステップ**: MVP v3.0 - Azure本番環境デプロイ・Cosmos DB統合

## 🔧 技術スタック
- **バックエンド**: Azure Functions (Node.js)
- **フロントエンド**: React + TypeScript
- **テスト**: Jest + React Testing Library + Playwright
- **スクレイパー**: Python + Playwright
- **CI/CD**: GitHub Actions
- **データベース**: Cosmos DB（v3.0以降予定）

## 🛠️ 開発環境・特殊機能

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
```

## 🚀 クイックスタート

### 前提条件
- Node.js v18以上
- Azure Functions Core Tools v4
- Git

### インストール
```bash
# リポジトリをクローン
git clone <repository-url>
cd aki-sta

# バックエンドの依存関係インストール
cd functions
npm install
cd ..

# フロントエンドの依存関係インストール
cd frontend
npm install
cd ..
```

### ローカル開発

#### 方法1: 一括起動（推奨）
```bash
# バックエンドとフロントエンドを同時起動
npm start
```

#### 方法2: 個別起動
```bash
# ターミナル1: Azure Functions起動（ポート7071）
cd functions
npm start

# ターミナル2: React アプリ起動（ポート3300）
cd frontend
npm start
```

### アクセスURL
- **フロントエンド**: http://localhost:3300
- **API**: http://localhost:7071/api/availability/{date}
  - 例: http://localhost:7071/api/availability/2025-11-15

## 🧪 テスト実行

### 一括テスト
```bash
# バックエンド、フロントエンド、Pythonスクレイパーのテストを順次実行
npm test

# 並列実行（高速）
npm run test:all
```

### 個別テスト
#### バックエンドテスト
```bash
cd functions
npm test                    # テスト実行
npm run test:coverage       # カバレッジ付きテスト
npm run test:watch          # ウォッチモード
```

#### フロントエンドテスト
```bash
cd frontend
npm test                    # テスト実行（ウォッチモード）
npm test -- --coverage --watchAll=false  # カバレッジ付きテスト
```

#### Pythonスクレイパーテスト
```bash
cd scraper
./run-playwright.sh --install-browsers src/scraper.py  # 環境分離実行
# または
source venv/bin/activate && python -m pytest tests/ -v  # 直接pytest実行
```

#### E2Eテスト
```bash
cd e2e
npm test                    # E2Eテスト実行
npm run test:headed         # ブラウザを表示してテスト
npm run test:ui             # Playwright UIモード
```

## 📁 プロジェクト構造
```
aki-sta/
├── functions/                      # Azure Functions バックエンド
│   ├── availability-api/           # 空き状況取得API
│   │   ├── availability-api.js               # API実装
│   │   ├── availability-api.test.js          # APIテスト
│   │   └── function.json          # Azure Functions設定
│   ├── shared/                     # 共通ライブラリ
│   │   └── data-store.js          # データストア (JSONファイル読み込み)
│   ├── availability-api.js                   # エントリーポイント（必須）
│   ├── host.json                  # Azure Functions全体設定
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
│   ├── scripts/                  # 環境管理・テストデータ管理
│   │   ├── load-env.js           # 環境変数読み込み
│   │   ├── ensure-browsers.js    # ブラウザ自動インストール
│   │   └── cleanup.js            # テストデータクリーンアップ
│   ├── run-test.sh               # 環境分離テスト実行
│   ├── .env.playwright           # Node.js用環境設定
│   └── playwright.config.ts      # Playwright設定
├── shared-data/                   # データ共有ディレクトリ
│   └── availability.json         # スクレイピング結果JSON
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
# index.jsの確認・作成
ls functions/availability-api.js || echo "module.exports = require('./availability-api/index');" > functions/availability-api.js
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
| MVP v1.0 | ダミーデータ表示 | ✅ 完了（2025-08-21） |
| MVP v2.0 | 実データスクレイピング・環境分離システム | ✅ 完了（2025-08-24） |
| MVP v3.0 | Azure本番デプロイ・Cosmos DB | 🚀 計画中 |
| v1.0 | 複数施設対応・複数日付管理 | 📋 バックログ |
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