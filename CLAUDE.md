# CLAUDE.md - Claude専用指示書

## 🤖 あなたはこのプロジェクトのAIアシスタントです

### プロジェクト: 空きスタサーチくん
音楽団体向けの施設予約空き状況一元管理システム

## ⚠️ 重要な制約とルール

### 絶対に守るべきこと
1. **既存ファイルの編集を優先** - 新規ファイル作成は最小限に
2. **テストファースト開発** - 新機能実装時は必ずテストから書く
3. **不要なファイルを作らない** - 特に`*.md`ファイルは指示された時のみ
4. **コメントは最小限** - コード自体を読みやすく書く
5. **コミット前に必ず`.github/commit-checklist.md`を確認** - 関連ドキュメントをすべて更新
6. **MVP進捗更新時は`.github/mvp-checklist.md`を確認** - 完了基準を正確に判定

### してはいけないこと
- プロアクティブにドキュメント作成しない
- ユーザーの指示なしにgit pushしない
- 設定ファイル（.env、local.settings.json）をコミットしない
- console.logをプロダクションコードに残さない
- TypeScriptで`any`型を使わない

## 📁 プロジェクト構造と重要ファイル

```
aki-sta/
├── functions/          # Azure Functions API
│   ├── availability-api.js       # ⚠️ 必須：これがないと起動エラー
│   └── availability-api/
├── frontend/          # React TypeScript
│   └── src/
│       ├── components/  # UIコンポーネント
│       ├── services/    # API通信
│       └── types/       # 型定義
├── scraper/           # Python Playwrightスクレイパー
│   └── src/
├── e2e/               # E2Eテスト (Playwright/TypeScript)
│   ├── tests/
│   ├── fixtures/      # テストデータ
│   └── scripts/       # セットアップ/クリーンアップ
└── CLAUDE.md          # この指示書
```

## 🚀 よく使うコマンド（コピペ用）

### 開発サーバー起動
```bash
# 推奨: 一括起動
npm start

# または個別起動
cd functions && npm start  # Terminal 1
cd frontend && npm start   # Terminal 2
```

### テスト実行
```bash
# 一括テスト（backend + frontend + scraper）
npm test

# Backend個別
cd functions && npm test

# Frontend個別
cd frontend && npm test -- --coverage --watchAll=false

# Scraperテスト
cd scraper && python -m pytest tests/ -v

# E2Eテスト
cd e2e && npm test
```

### プロセス確認
```bash
# ポート使用状況
lsof -i :3300  # React
lsof -i :7071  # Azure Functions

# バックグラウンドbash確認
# Claudeコマンド: /bashes
```

## 🐛 既知の問題と解決策

### Azure Functions起動エラー（解決済み: 2025-08-25）
**原因**: availability-api.jsファイルがルートディレクトリに存在しない
**解決**: Azure Functions標準構造を復元
- functions/availability-api.js（エントリーポイント）
- functions/availability-api/index.js（ハンドラー）
- functions/availability-api/function.json（設定）

### Playwrightバージョン競合問題（解決済み）
**原因**: Python（スクレイパー）とNode.js（E2E）で異なるPlaywrightバージョンを使用
**解決**: 環境分離システム実装（2025-08-24）
```bash
# 包括的セットアップ
./setup-playwright-environments.sh

# Python実行（環境分離）
cd scraper && ./run-playwright.sh src/scraper.py

# E2E実行（環境分離）
cd e2e && npm test
```

### Jest + axios ESMエラー
**原因**: axiosのESモジュール問題
**解決**: setupTests.tsでモック、package.jsonでtransformIgnorePatterns設定

### React Hook act()警告
**原因**: 非同期処理が適切にラップされていない
**解決**:
```tsx
await act(async () => {
  render(<Component />);
});
```

## 💡 作業時の判断基準

### 新機能追加時のフロー
1. まずテストファイルを作成（`.test.ts`/`.test.tsx`）
2. テストが失敗することを確認（RED）
3. 最小限のコードで成功させる（GREEN）
4. リファクタリング（REFACTOR）
5. カバレッジ確認（目標: 80%以上）

### ファイル変更の優先順位
1. 既存ファイルの編集 > 新規ファイル作成
2. 必要最小限の変更 > 大規模リファクタリング
3. 型安全性の確保 > 実装スピード

### API変更時の対応
1. functions/availability-api/availability-api.js を更新
2. frontend/src/types/availability.ts の型を更新
3. 両方のテストを更新・実行
4. 統合動作確認

## 📊 現在の状態（自動更新対象）

### MVP v1.0 - ✅ 完了（2025-08-21）
- Backend API: ✅ 実装完了
- Frontend: ✅ 実装完了
- テスト: ✅ 実装完了（E2Eテスト含む）
- 統合動作: ✅ 動作確認済み
- E2Eテスト: ✅ 実装完了（固定データ戦略採用）

### MVP v2.0 - ✅ 完了（2025-08-24）
- 実データスクレイピング: ✅ 完了（あんさんぶるスタジオ対応）
- Playwright実装: ✅ 完了（人間的操作・環境分離システム）
- データ共有: ✅ 完了（JSONファイルベース、shared-data/）
- 3時間帯表示: ✅ 完了（9-12, 13-17, 18-21）
- 環境分離システム: ✅ 完了（バージョン競合完全解決）

**進捗更新時**: `.github/mvp-checklist.md`で完了基準を確認

### MVP v3.0 - ✅ 完了（2025-08-25）
- ✅ Cosmos DB統合・データ永続化（Phase 3移行完了）
- ✅ Azure Functions構造修正（availability-api.js復元）
- ✅ 環境変数設定改善（テスト時自動読み込み）
- ✅ E2Eテスト柔軟化（データ有無両対応）
- ✅ 環境変数統合システム（ルートレベル管理）
- ✅ JSONファイル依存完全削除（フェーズ3完了）
- ✅ Pure Cosmos DBアーキテクチャ移行完了

### 次の作業: MVP v4.0
- Azure本番環境デプロイ
- Timer Trigger自動実行システム
- 複数日付管理機能

### GitHub Actions  
- **main-ci.yml**: push/PR時の全テスト実行（Backend/Frontend/Scraper/E2E）
- E2Eテスト: Ubuntu 22.04でPlaywright実行
- 詳細: [docs/GITHUB_ACTIONS.md](./docs/GITHUB_ACTIONS.md)

## 🔄 コミット時の自動タスク

コミット作成時は以下を実行：
1. **`.github/commit-checklist.md`を確認** ← 最重要
2. `git status`で変更確認
3. テスト実行確認
4. 関連ドキュメント更新（checklist.mdに従う）
   - README.md（ユーザー向け変更時）
   - CLAUDE.md（開発フロー変更時）
   - docs/配下（技術的変更時）
   - **MVP進捗更新時は`.github/mvp-checklist.md`も確認**
5. コミットメッセージに変更内容を明確に記載

### コミットメッセージスタイル
```
<type>: <description>

<optional body>

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**タイプ（type）**:
- `feat`: 新機能追加
- `fix`: バグ修正
- `refactor`: リファクタリング（機能変更なし）
- `test`: テスト追加・修正
- `docs`: ドキュメント更新
- `chore`: ビルド設定、依存関係更新など

**記述ルール**:
- 日本語OK（このプロジェクトの慣例）
- 簡潔に（1-2行）
- 「何を」よりも「なぜ」を重視
- 必要に応じて箇条書きで詳細を追加

## 🎯 ユーザーとのやり取りで重要なこと

### 確認すべきこと
- 大きな変更前は必ず確認を取る
- ファイル削除時は特に慎重に
- 外部ライブラリ追加時は理由を説明

### 報告すべきこと
- テストカバレッジの変化
- パフォーマンスへの影響
- セキュリティ上の懸念

### 提案すべきこと
- より良い実装方法がある場合
- テストが不足している場合
- 型安全性が損なわれている場合

## 🔥 トラブルシューティング

### Azure Functions起動エラー
```bash
# "Worker was unable to load entry point 'availability-api.js'"の場合
cd functions
echo "module.exports = require('./availability-api/index');" > availability-api.js
```

### GitHub Actionsエラー
- "Select a number for worker runtime"で止まる場合
- → 環境変数`FUNCTIONS_WORKER_RUNTIME=node`を設定済み（main-ci.yml）
- 詳細: [docs/GITHUB_ACTIONS.md](./docs/GITHUB_ACTIONS.md)

---
*最終更新: 2025-08-25 - MVP v3.0完了、Pure Cosmos DBアーキテクチャ実装*
- testを実行して成功することを確認して初めてcommitするようにしてください