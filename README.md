# 空きスタサーチくん

音楽団体向けのスタジオ予約空き状況一元管理システム

![Main CI](https://github.com/Jillrinn/aki-sta/workflows/Main%20CI%2FCD%20Pipeline/badge.svg)

## 🎯 概要
複数のスタジオ・施設の予約空き状況を一画面で確認できるWebアプリケーション。
20人程度の音楽団体が効率的に練習場所を見つけられるよう支援します。

## 📊 開発状況
**MVP v1.0** ✅ 完了（2025-08-20）
- ✅ バックエンドAPI実装（ダミーデータ）
- ✅ フロントエンド実装（React + TypeScript）
- ✅ API-Frontend統合動作確認
- ✅ バックエンドテスト実装
- ✅ フロントエンドテスト実装
- ✅ レスポンシブデザイン実装

**次のステップ**: MVP v2.0 - 実データスクレイピング実装

## 🔧 技術スタック
- **バックエンド**: Azure Functions (Node.js)
- **フロントエンド**: React + TypeScript
- **テスト**: Jest + React Testing Library
- **データベース**: Cosmos DB（v3.0以降予定）

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
npm run dev
```

#### 方法2: 個別起動
```bash
# ターミナル1: Azure Functions起動（ポート7071）
cd functions
npm start

# ターミナル2: React アプリ起動（ポート3000）
cd frontend
npm start
```

### アクセスURL
- **フロントエンド**: http://localhost:3000
- **API**: http://localhost:7071/api/availability/{date}
  - 例: http://localhost:7071/api/availability/2025-11-15

## 🧪 テスト実行

### 一括テスト
```bash
# バックエンドとフロントエンドのテストを順次実行
npm test
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

## 📁 プロジェクト構造
```
aki-sta/
├── functions/                      # Azure Functions バックエンド
│   ├── availability-api/           # 空き状況取得API
│   │   ├── index.js               # API実装
│   │   ├── index.test.js          # APIテスト
│   │   └── function.json          # Azure Functions設定
│   ├── shared/                     # 共通ライブラリ
│   │   └── data-store.js          # データストア (現在: ダミー)
│   ├── index.js                   # エントリーポイント（必須）
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
│   ├── package.json               # 依存関係・プロキシ設定
│   └── tsconfig.json              # TypeScript設定
├── docs/                          # ドキュメント
│   ├── DEVELOPMENT_SPEC.md       # 開発仕様書
│   └── GITHUB_ACTIONS.md         # CI/CDパイプライン詳細
├── .github/                       # GitHub Actions CI/CD
│   └── workflows/
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
```
GET /api/availability/{date}
```
- **パラメータ**: date (YYYY-MM-DD形式)
- **例**: `/api/availability/2025-11-15`

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
ls functions/index.js || echo "module.exports = require('./availability-api/index');" > functions/index.js
```

### ポート使用中エラー
```bash
# ポート3000の確認
lsof -i :3000
# ポート7071の確認
lsof -i :7071
```

### テストエラー
- axiosのESMエラー: setupTests.tsでモック設定確認
- act()警告: 非同期処理を適切にラップ

## 🗓️ ロードマップ
| バージョン | 内容 | ステータス |
|-----------|------|----------|
| MVP v1.0 | ダミーデータ表示 | ✅ 完了 |
| MVP v2.0 | 実データスクレイピング | ⏳ 計画中 |
| MVP v3.0 | Azure本番デプロイ | ⏳ 計画中 |
| v1.0 | 複数日付対応 | 📋 バックログ |
| v2.0 | ユーザー認証・お気に入り | 📋 バックログ |

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