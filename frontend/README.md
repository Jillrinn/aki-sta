# 空きスタサーチくん - フロントエンド

React + TypeScript で構築された空きスタサーチくんのフロントエンドアプリケーション

## 🎯 概要
音楽施設の空き状況を視覚的に表示するWebインターフェース。
Azure Functions APIと連携して、リアルタイムの空き状況データを取得・表示します。

## 🚀 クイックスタート

### 前提条件
- Node.js v18以上
- npm または yarn
- Azure Functions バックエンドが起動していること

### インストール
```bash
# 依存関係のインストール
npm install
```

### 開発サーバー起動
```bash
# 開発サーバー起動（ポート3300）
npm start
```

ブラウザで http://localhost:3300 を開いてアクセスします。

### 重要：バックエンドとの連携
⚠️ **Azure Functions を先に起動してください**
```bash
# 別ターミナルで実行
cd ../functions
npm start
```

プロキシ設定により、`/api`へのリクエストは自動的に`http://localhost:7071`に転送されます。

## 🧪 テスト

### テスト実行
```bash
# ウォッチモードでテスト実行
npm test

# カバレッジ付きテスト実行
npm test -- --coverage --watchAll=false

# 特定のテストファイルのみ実行
npm test -- AvailabilityTable.test.tsx
```

### 現在のテストカバレッジ
- 全体: 73.46%
- コンポーネント: 93.33%
- サービス: 100%

## 📁 プロジェクト構造
```
src/
├── components/           # UIコンポーネント
│   ├── AvailabilityTable.tsx    # 空き状況テーブル
│   ├── AvailabilityTable.css    # スタイリング
│   └── AvailabilityTable.test.tsx # テスト
├── services/            # API通信層
│   ├── api.ts          # API クライアント
│   └── api.test.ts     # テスト
├── types/              # TypeScript型定義
│   └── availability.ts # データモデル定義
├── App.tsx             # メインコンポーネント
├── App.test.tsx        # アプリテスト
└── setupTests.ts       # テスト設定
```

## 🔧 利用可能なスクリプト

### `npm start`
開発モードでアプリを起動します。
- URL: http://localhost:3300
- ホットリロード対応
- エラー表示機能付き

### `npm test`
インタラクティブウォッチモードでテストを実行します。
- 変更を自動検知
- カバレッジレポート生成可能

### `npm run build`
本番用にアプリをビルドします。
- `build`フォルダに出力
- 最適化・minify済み
- デプロイ準備完了

### `npm run eject`
**注意: 一方向の操作です。一度実行すると元に戻せません。**

## 🎨 主要コンポーネント

### AvailabilityTable
施設の空き状況を表形式で表示するメインコンポーネント。

**機能:**
- ○×形式の視覚的な空き状況表示
- レスポンシブデザイン対応
- ローディング状態管理
- エラーハンドリング

**表示ステータス:**
- ○: 空き（available）
- ×: 予約済み（booked）
- △: 抽選中（lottery）※v2.0予定
- ?: 不明（unknown）※v2.0予定

## 🔗 API連携

### エンドポイント
```typescript
GET /api/availability/{date}
```

### レスポンス型
```typescript
interface AvailabilityResponse {
  date: string;
  facilities: Facility[];
  lastUpdated: string;
  dataSource: 'cosmos' | 'json' | 'dummy';
}
```

### 現在の仕様
- 固定日付使用中: `2025-11-15`
- プロキシ経由でAzure Functionsと通信
- axiosを使用したHTTP通信
- データソース: Cosmos DB（フォールバック: JSONファイル）

## 🐛 トラブルシューティング

### テストでaxiosエラーが発生
`setupTests.ts`でaxiosがモックされているか確認：
```typescript
jest.mock('axios', () => ({
  get: jest.fn(),
  // ...
}));
```

### APIとの通信エラー
1. Azure Functionsが起動しているか確認
2. プロキシ設定（package.json）を確認
3. CORS設定を確認

### React Hooksのテスト警告
非同期処理を`act()`でラップ：
```typescript
await act(async () => {
  render(<Component />);
});
```

## 🚦 環境変数
```bash
# .env.local（必要に応じて作成）
REACT_APP_API_URL=/api  # APIベースURL
```

## 📊 パフォーマンス最適化
- React.memoによる再レンダリング最適化
- useCallbackでの関数メモ化
- 遅延ローディング（今後実装予定）

## 🔄 今後の改善予定
1. **日付選択機能**: カレンダーUIの実装
2. **フィルタリング**: 施設名・エリアでの絞り込み
3. **リアルタイム更新**: WebSocketまたはPolling実装
4. **お気に入り機能**: よく使う施設の保存
5. **PWA対応**: オフライン機能追加

## 📚 参考資料
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Testing Library](https://testing-library.com/)
- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started)

---
*空きスタサーチくん Frontend - MVP v1.0*