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
5. **コミット時はCLAUDE.mdとREADME.mdを更新** - 会話内容と差分を反映

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
│   ├── index.js       # ⚠️ 必須：これがないと起動エラー
│   └── availability-api/
├── frontend/          # React TypeScript
│   └── src/
│       ├── components/  # UIコンポーネント
│       ├── services/    # API通信
│       └── types/       # 型定義
└── CLAUDE.md          # この指示書
```

## 🚀 よく使うコマンド（コピペ用）

### 両方起動する場合
```bash
# Terminal 1
cd functions && npm start

# Terminal 2  
cd frontend && npm start
```

### テスト実行
```bash
# Backend
cd functions && npm test

# Frontend
cd frontend && npm test -- --coverage --watchAll=false
```

### プロセス確認
```bash
# ポート使用状況
lsof -i :3000  # React
lsof -i :7071  # Azure Functions

# バックグラウンドbash確認
# Claudeコマンド: /bashes
```

## 🐛 既知の問題と解決策

### Azure Functions起動エラー
**原因**: functions/index.jsが存在しない
**解決**: 
```bash
echo "module.exports = require('./availability-api/index');" > functions/index.js
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
1. functions/availability-api/index.js を更新
2. frontend/src/types/availability.ts の型を更新
3. 両方のテストを更新・実行
4. 統合動作確認

## 📊 現在の状態（自動更新対象）

### MVP v1.0 - ✅ 完了
- Backend API: 100% テストカバレッジ
- Frontend: 73% テストカバレッジ
- 統合テスト: 動作確認済み

### 次の作業: MVP v2.0
- 実データスクレイピング実装
- Puppeteer/Playwright導入
- データ永続化（Cosmos DB）

## 🔄 コミット時の自動タスク

コミット作成時は以下を実行：
1. `git status`で変更確認
2. テスト実行確認
3. CLAUDE.md更新（現在の状態セクション）
4. README.md更新（必要に応じて）
5. コミットメッセージに変更内容を明確に記載

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

---
*最終更新: 2025-08-20 - Claude向け指示書として最適化*