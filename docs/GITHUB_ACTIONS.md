# GitHub Actions CI/CD パイプライン

## 📋 概要
空きスタサーチくんでは、モジュール化された再利用可能なワークフロー構造を採用しています。
`main-ci.yml`を統合エントリーポイントとして、各機能別のワークフローを呼び出す設計により、保守性と柔軟性を実現しています。

## 🏗️ ワークフロー構造

### モジュール化アーキテクチャ
```
main-ci.yml (エントリーポイント)
├── 並列テスト実行
│   ├── test-backend.yml
│   ├── test-frontend.yml
│   └── test-scraper.yml
├── ビルド
│   └── build.yml
├── E2Eテスト
│   └── test-e2e.yml
└── デプロイ (mainブランチのみ)
    ├── deploy-azure-functions.yml
    ├── deploy-static-web-app.yml
    └── deploy-production.yml (レガシー)
```

## 🚀 CI/CDパイプライン

### main-ci.yml - 統合CI/CDパイプライン
**ファイル**: `.github/workflows/main-ci.yml`

**トリガー**:
- `main`ブランチへのプッシュ
- `main`ブランチへのプルリクエスト
- 手動実行（workflow_dispatch）
  - `skip-tests`: テストをスキップ
  - `deploy-only`: デプロイのみ実行

### モジュールワークフロー

| ワークフロー | 用途 | 呼び出し方法 |
|-------------|------|-------------|
| test-backend.yml | バックエンドテスト | workflow_call |
| test-frontend.yml | フロントエンドテスト | workflow_call |
| test-scraper.yml | Pythonスクレイパーテスト | workflow_call |
| test-e2e.yml | E2Eテスト | workflow_call |
| build.yml | フロントエンドビルド | workflow_call |
| deploy-azure-functions.yml | Azure Functionsデプロイ | workflow_call |
| deploy-static-web-app.yml | Static Web Appデプロイ | workflow_call |

## 📊 パイプライン詳細

### ジョブ構成
| ジョブ | 並列実行 | 内容 |
|--------|----------|------|
| backend-test | ✅ | バックエンドテスト（カバレッジ80%必須） |
| frontend-test | ✅ | フロントエンドテスト＋カバレッジ |
| scraper-test | ✅ | Pythonスクレイパーテスト |
| e2e-test | ❌ | E2Eテスト（固定データ戦略） |
| build | ❌ | テスト成功後にビルド実行 |
| deploy-functions | ❌ | Azure Functionsデプロイ |
| deploy-static-web-app | ❌ | Static Web Appデプロイ |
| ci-summary | ✅ | 実行結果サマリー |

### 実行フロー
```
プッシュ/PR
    ↓
[並列実行]
├─ Backend Tests (Node 18.x, 20.x)
├─ Frontend Tests (Node 18.x, 20.x)
└─ Scraper Tests (Python 3.9, 3.11)
    ↓
Build Application + E2E Tests
    ↓
[デプロイ - mainブランチのみ]
├─ Deploy Azure Functions
└─ Deploy Static Web App
    ↓
CI Summary Report
```

## 🎯 特徴

### 1. 完全テスト実行
- すべてのプッシュで全テストを実行
- 部分的なテストスキップなし
- 確実な品質保証

### 2. マトリックステスト
- Node.js複数バージョン対応（18.x, 20.x）
- 互換性の確保

### 3. 統合テスト
- Azure Functions実際に起動
- APIエンドポイントの動作確認
- データ構造の検証
- **環境変数設定**:
  - `FUNCTIONS_WORKER_RUNTIME: node` - ランタイム自動設定
  - `AzureWebJobsStorage: ""` - ローカルストレージ使用

### 4. アーティファクト保存
- カバレッジレポート（7日間）
- ビルド成果物（7日間）
- 問題分析用

## 📝 開発ワークフロー

### 1. ローカル開発
```bash
# バックエンドテスト
cd functions && npm test

# フロントエンドテスト
cd frontend && npm test

# ローカル統合テスト
cd functions && func start  # ターミナル1
cd frontend && npm start    # ターミナル2
```

### 2. プッシュ前確認
```bash
# 全テスト実行
npm run test:all  # プロジェクトルートから

# コミット&プッシュ
git add .
git commit -m "feat: 新機能"
git push origin main
```

### 3. CI/CD確認
1. GitHubの「Actions」タブを開く
2. 「Main CI/CD Pipeline」の実行状況確認
3. 失敗時はログを確認して修正

## 🛠️ 設定とカスタマイズ

### 環境変数（GitHub Secrets）
将来のAzureデプロイ用に以下を設定予定：
- `AZURE_WEBAPP_NAME`: Webアプリ名
- `AZURE_WEBAPP_PUBLISH_PROFILE`: 発行プロファイル
- `AZURE_FUNCTIONAPP_NAME`: Functions名
- `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`: Functions発行プロファイル

### カバレッジ閾値
```yaml
# backend-test内
if (( $(echo "$COVERAGE < 80" | bc -l) )); then
  echo "❌ Coverage is below 80% threshold"
  exit 1
fi
```

## 📊 実行結果の確認

### GitHub UI
- **バッジ**: README.mdのバッジでステータス確認
- **Actions タブ**: 詳細ログとアーティファクト
- **サマリー**: 各実行のサマリーレポート

### ステータスバッジ
```markdown
![Main CI](https://github.com/Jillrinn/aki-sta/workflows/Main%20CI%2FCD%20Pipeline/badge.svg)
```

## 🐛 トラブルシューティング

### テスト失敗
1. Actions タブで失敗したジョブを特定
2. ログを展開して詳細確認
3. ローカルで同じテストを実行して再現

### Azure Functions起動エラー
```bash
# ローカルで確認
cd functions
func start --verbose
```

### カバレッジ不足
```bash
# カバレッジレポート確認
cd functions && npm run test:coverage
cd frontend && npm test -- --coverage
```

## 🔄 今後の改善予定

### Phase 1（実装済み）
- ✅ 全テスト統合パイプライン
- ✅ マトリックステスト
- ✅ 統合テスト
- ✅ サマリーレポート
- ✅ モジュール化されたワークフロー構造
- ✅ 再利用可能なワークフローコンポーネント

### Phase 2（実装済み）
- ✅ Azure Functions デプロイワークフロー
- ✅ Static Web App デプロイワークフロー
- ✅ workflow_dispatch による手動実行サポート

### Phase 3（計画中）
- ⏳ 環境別デプロイ最適化（staging/production）
- ⏳ ロールバック機能
- ⏳ パフォーマンステスト（Lighthouse）
- ⏳ セキュリティスキャン（CodeQL）
- ⏳ Slack/Teams通知統合

---
*最終更新: 2025-08-27 - ワークフローモジュール化実装*