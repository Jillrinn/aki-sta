# CLAUDE.md - プロジェクト作業ガイド

## 🎯 プロジェクト概要
**空きスタサーチくん** - 音楽団体向けの複数施設予約状況一元管理システム

### 現在の進捗状況
- 🔄 **MVP v1.0 進行中** (2025-08-20)
  - ✅ Azure Functions HTTPトリガーAPI実装
  - ✅ ダミーデータストア実装
  - ✅ バックエンドテスト実装（カバレッジ100%）
  - ❌ React フロントエンド未実装
  - ❌ API-Frontend統合未実装
  - ❌ UIでのデータ表示確認未実施

## 📁 プロジェクト構造
```
aki-sta/
├── functions/                      # Azure Functions (Node.js)
│   ├── availability-api/           # 空き状況取得API
│   ├── shared/                     # 共通ライブラリ
│   │   └── data-store.js          # データストア (現在: ダミー)
│   ├── host.json                  # Azure Functions設定
│   └── package.json               # 依存関係
├── unified_development_spec.md    # 統合開発仕様書
└── CLAUDE.md                      # このファイル
```

## 🔧 開発環境
### 必要なツール
- Node.js v18以上
- Azure Functions Core Tools v4
- Git

### ローカル開発コマンド
```bash
# テスト実行
cd functions && npm test

# Azure Functions起動（ポート7071）
cd functions && func start

# Git操作
git add .
git commit -m "feat: 機能説明"
git push origin main
```

## 🚀 次のステップ (MVP v1.0 完了)
### 残作業（Day 2-4）
1. **React フロントエンド実装**
   - `npx create-react-app frontend --template typescript`
   - AvailabilityTable.tsx コンポーネント作成
   - APIサービス（api.ts）実装
   - 固定日付（2025-11-15）の表示

2. **API-Frontend統合**
   - Reactプロキシ設定（package.json）
   - ローカル環境での動作確認
   - CORS動作確認

3. **UI仕上げ**
   - ○×表示実装
   - レスポンシブデザイン
   - ローディング・エラー状態の表示

### MVP v1.0 完了判定基準
- [ ] ローカル環境でAPI-Frontend統合動作
- [ ] ダミーデータが正しく表示
- [ ] 基本的なエラーハンドリング実装
- [x] テストカバレッジ80%以上（バックエンド完了）
- [ ] レスポンシブデザイン確認

## 📝 重要な仕様
### APIエンドポイント
- `GET /api/availability/{date}` - 指定日の空き状況取得
  - 例: `/api/availability/2025-11-15`

### データ構造
```javascript
{
  date: "2025-11-15",
  facilities: [
    {
      facilityName: "Ensemble Studio 本郷",
      timeSlots: { 
        "13-17": "available"  // available | booked | lottery | unknown
      }
    }
  ],
  lastUpdated: "ISO 8601形式",
  dataSource: "dummy"  // dummy | scraping
}
```

### ステータス値
- `available`: 空き（○）
- `booked`: 予約済み（×）
- `lottery`: 抽選中（△）※v2.0で追加予定
- `unknown`: 不明（?）※v2.0で追加予定

## ⚠️ 注意事項
1. **local.settings.json**はGitにコミットしない（.gitignore済み）
2. **テストファースト開発**を徹底する
3. **CORSは現在すべて許可**（本番環境では要調整）
4. **無料枠内での運用**を前提とする

## 🧪 品質基準
- テストカバレッジ: 80%以上
- すべてのAPIにテスト実装
- エラーハンドリング必須
- TypeScript型定義（フロントエンド実装時）

## 📊 MVPロードマップ
| MVP | 目標 | 期間 | ステータス |
|-----|------|------|----------|
| v1.0 | ダミーデータ動作確認（API+React） | 3-4日 | 🔄 進行中 (Day1完了) |
| v2.0 | 実データスクレイピング | 3-4日 | ⏳ 予定 |
| v3.0 | Azure本番環境デプロイ | 2-3日 | ⏳ 予定 |

### MVP v1.0 詳細進捗
- **Day 1**: ✅ バックエンドAPI実装完了
- **Day 2**: ⏳ React基本コンポーネント実装
- **Day 3**: ⏳ API-Frontend統合
- **Day 4**: ⏳ UI改善・最終確認

## 🔗 関連ドキュメント
- [統合開発仕様書](./unified_development_spec.md) - 詳細な技術仕様
- [Azure Functions ドキュメント](https://docs.microsoft.com/ja-jp/azure/azure-functions/)
- [Jest テスティング](https://jestjs.io/docs/getting-started)

## 💡 開発のヒント
1. **困ったら仕様書を確認**: `unified_development_spec.md`に詳細記載
2. **テストから書く**: TDD実践でバグを防ぐ
3. **小さくリリース**: MVP段階的に機能追加
4. **エラーは詳細に**: ログとエラーメッセージは具体的に

## 🎨 空きスタサーチくん - ブランディング
- **システム名**: 空きスタサーチくん
- **目的**: 音楽団体の練習場所探しを効率化
- **ターゲット**: 20人程度の音楽団体
- **価値提案**: 複数施設の空き状況を一目で確認

---
*最終更新: 2025-08-20 - MVP v1.0 Day1完了（バックエンドAPI実装済み）*