# Azure Static Web Apps デプロイ履歴の再設定手順

## 📋 概要

ワークフローファイル名を変更（`azure-static-web-apps-proud-glacier-046b3f300.yml` → `deploy-frontend.yml`）したことにより、Azure Portal でデプロイ履歴が正しく表示されない問題を解決するための手順書です。

## 🔍 問題の背景

Azure Static Web Apps は初回セットアップ時に生成されたワークフローファイル名を記録しており、このファイル名でのデプロイのみを Azure Portal で追跡します。ファイル名を変更すると、この追跡が切れてしまいます。

## ✅ 解決方法：デプロイトークンの再発行と再設定

### 手順1: Azure Portal でデプロイトークンを再発行

1. **Azure Portal にログイン**
   ```
   https://portal.azure.com
   ```

2. **Static Web App リソースを開く**
   - リソース名で検索（例：`swa-aki-sta-prod`）
   - または「すべてのリソース」から探す

3. **デプロイトークンを取得**
   - 左側メニューから「管理」セクションを展開
   - 「デプロイ トークンの管理」をクリック
   - 「トークンのリセット」または「Reset token」をクリック（必要に応じて）
   - 表示されたトークンをコピー（重要：このトークンは一度しか表示されません）

### 手順2: GitHub Secrets の更新

1. **GitHub リポジトリを開く**
   ```
   https://github.com/Jillrinn/aki-sta
   ```

2. **Settings → Secrets and variables → Actions**

3. **既存のシークレットを更新または新規作成**
   - シークレット名：`AZURE_STATIC_WEB_APPS_API_TOKEN_PROUD_GLACIER_046B3F300`
   - 値：Azure Portal でコピーしたトークン
   - 「Update secret」または「Add secret」をクリック

### 手順3: ワークフローファイルの確認

`deploy-frontend.yml` が以下の設定になっていることを確認：

```yaml
name: Deploy Frontend to Azure Static Web Apps

on:
  workflow_dispatch:
  workflow_call:

jobs:
  build_and_deploy_job:
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true
          lfs: false
      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_PROUD_GLACIER_046B3F300 }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "./frontend"
          api_location: ""
          output_location: "build"
```

### 手順4: テストデプロイの実行

1. **GitHub Actions ページを開く**
   - リポジトリの「Actions」タブをクリック

2. **手動でワークフローを実行**
   - 「Deploy Frontend to Azure Static Web Apps」を選択
   - 「Run workflow」をクリック
   - ブランチ：`main` を選択
   - 「Run workflow」（緑のボタン）をクリック

3. **実行状況を確認**
   - ワークフローが正常に完了することを確認
   - エラーが発生した場合はログを確認

### 手順5: Azure Portal でデプロイ履歴を確認

1. **Azure Portal の Static Web App リソースに戻る**

2. **「デプロイ」または「Deployments」セクションを確認**
   - 新しいデプロイが表示されるまで数分待つ
   - 必要に応じてページをリフレッシュ

## 🔧 それでも解決しない場合の追加手順

### オプション A: Azure Portal から GitHub 統合を再設定

1. **Static Web App の「構成」→「ソース管理」**

2. **GitHub 接続を一時的に切断**
   - 「切断」または「Disconnect」をクリック
   - 確認ダイアログで「はい」

3. **GitHub を再接続**
   - 「GitHub に接続」をクリック
   - 認証を求められたら GitHub にサインイン
   - リポジトリ：`Jillrinn/aki-sta` を選択
   - ブランチ：`main` を選択
   - ワークフローファイルパス：`.github/workflows/deploy-frontend.yml` を指定

### オプション B: Azure CLI を使用した更新

```bash
# Azure CLI にログイン
az login

# Static Web App の設定を更新
az staticwebapp update \
  --name <your-static-web-app-name> \
  --resource-group <your-resource-group> \
  --branch main \
  --source .github/workflows/deploy-frontend.yml
```

## 📝 今後の注意点

1. **ワークフローファイル名の変更は避ける**
   - Azure Static Web Apps は初回設定時のファイル名を記憶する
   - 変更が必要な場合は、このドキュメントの手順に従う

2. **トークンの管理**
   - デプロイトークンは安全に管理する
   - 定期的なローテーションを検討

3. **デプロイ履歴の監視**
   - Azure Portal での表示が正常か定期的に確認
   - GitHub Actions のログも併せて確認

## 🚨 トラブルシューティング

### エラー：「Deployment token is invalid」
- トークンが正しくコピーされているか確認
- GitHub Secrets の名前が正確か確認
- トークンを再発行して再試行

### エラー：「App location cannot be found」
- `app_location` が正しいパス（`./frontend`）になっているか確認
- リポジトリ構造が変更されていないか確認

### デプロイは成功するが Azure Portal に表示されない
- Azure Portal のキャッシュをクリア（Ctrl+F5）
- 別のブラウザで確認
- 数分待ってから再度確認

## 📚 関連ドキュメント

- [Azure Static Web Apps ドキュメント](https://docs.microsoft.com/ja-jp/azure/static-web-apps/)
- [GitHub Actions ワークフロー構文](https://docs.github.com/ja/actions/reference/workflow-syntax-for-github-actions)
- [プロジェクト CI/CD ドキュメント](./GITHUB_ACTIONS.md)

---
*最終更新: 2025-08-27*