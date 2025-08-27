# GitHub Secrets設定ガイド

## 📋 概要

GitHub ActionsからAzureリソースにアクセスするために必要なSecretsの設定手順です。
これらのSecretsは、自動デプロイパイプラインで使用されます。

## 🔐 必要なGitHub Secrets一覧

| Secret名 | 説明 | 取得方法 | 使用場所 |
|---|---|---|---|
| `AZURE_CREDENTIALS` | Azureサービスプリンシパル認証情報 | Azure CLI | 全体的なAzure認証 |
| `AZURE_SUBSCRIPTION_ID` | AzureサブスクリプションID | Azure Portal/CLI | リソース管理 |
| `AZURE_FUNCTIONAPP_NAME` | Functions App名 | 固定値: `func-aki-sta-prod` | Functions デプロイ |
| `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` | Functions発行プロファイル | Azure Portal/CLI | Functions デプロイ |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Static Web Apps APIトークン | Azure Portal | Frontend デプロイ |
| `AZURE_WEBAPP_NAME` | Web App名 | 固定値: `webapp-scraper-prod` | Scraper デプロイ |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Web App発行プロファイル | Azure Portal/CLI | Scraper デプロイ |
| `COSMOS_ENDPOINT` | Cosmos DBエンドポイント | Azure Portal/CLI | データベース接続 |
| `COSMOS_KEY` | Cosmos DBプライマリキー | Azure Portal/CLI | データベース認証 |
| `COSMOS_DATABASE` | データベース名 | 固定値: `studio-reservations` | データベース接続 |

## 📍 GitHub Secretsの設定手順

### Step 1: GitHubリポジトリ設定画面へアクセス
1. GitHubでリポジトリを開く
2. 「Settings」タブをクリック
3. 左メニューから「Secrets and variables」→「Actions」を選択
4. 「New repository secret」をクリック

### Step 2: 各Secretの設定

以下の手順で各Secretを順番に設定します。

## 🔧 Secrets取得コマンド集

### 事前準備
```bash
# Azure CLIにログイン
az login

# 変数設定
RESOURCE_GROUP="rg-aki-sta-prod-japaneast"
COSMOS_ACCOUNT="cosmos-aki-sta-prod"
FUNCTION_APP="func-aki-sta-prod"
STATIC_WEB_APP="swa-aki-sta-prod"
WEB_APP_SCRAPER="webapp-scraper-prod"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
```

### 1. AZURE_CREDENTIALS
**用途**: GitHub ActionsからAzureリソース全体にアクセスするための認証情報

```bash
# サービスプリンシパルの作成
az ad sp create-for-rbac \
  --name "github-actions-aki-sta" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
  --json-auth
```

**出力例**:
```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

**GitHub設定**:
- Name: `AZURE_CREDENTIALS`
- Value: 上記のJSON全体をコピー&ペースト

### 2. AZURE_SUBSCRIPTION_ID
**用途**: Azureサブスクリプションの識別

```bash
# サブスクリプションIDの取得
az account show --query id -o tsv
```

**GitHub設定**:
- Name: `AZURE_SUBSCRIPTION_ID`
- Value: 出力されたID（例: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx）

### 3. AZURE_FUNCTIONAPP_NAME
**用途**: Functions App名

**GitHub設定**:
- Name: `AZURE_FUNCTIONAPP_NAME`
- Value: `func-aki-sta-prod`

### 4. AZURE_FUNCTIONAPP_PUBLISH_PROFILE
**用途**: Functions Appへの直接デプロイ用認証情報

#### Azure CLIでの取得方法:
```bash
# 発行プロファイルの取得
az functionapp deployment list-publishing-profiles \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --xml
```

#### Azure Portalでの取得方法:
1. Azure Portalにログイン
2. Function App「func-aki-sta-prod」を開く
3. 「概要」ページの上部メニューから「発行プロファイルの取得」をクリック
4. ダウンロードされたファイルの内容全体をコピー

**GitHub設定**:
- Name: `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`
- Value: XML全体をコピー&ペースト

### 5. AZURE_STATIC_WEB_APPS_API_TOKEN
**用途**: Static Web Appsへのデプロイ認証

#### Azure Portalでの取得方法:
1. Azure Portalにログイン
2. Static Web App「swa-aki-sta-prod」を開く
3. 「デプロイトークンの管理」をクリック
4. トークンをコピー

#### Azure CLIでの取得方法:
```bash
# Static Web Apps APIトークンの取得
az staticwebapp secrets list \
  --name $STATIC_WEB_APP \
  --resource-group $RESOURCE_GROUP \
  --query "properties.apiKey" -o tsv
```

**GitHub設定**:
- Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
- Value: 取得したトークン

### 6. AZURE_WEBAPP_NAME
**用途**: Web App (Scraper) のアプリ名

**GitHub設定**:
- Name: `AZURE_WEBAPP_NAME`
- Value: `webapp-scraper-prod`

### 7. AZURE_WEBAPP_PUBLISH_PROFILE
**用途**: Web Appへの直接デプロイ用認証情報

#### Azure CLIでの取得方法:
```bash
# 発行プロファイルの取得
az webapp deployment list-publishing-profiles \
  --name $WEB_APP_SCRAPER \
  --resource-group $RESOURCE_GROUP \
  --xml
```

#### Azure Portalでの取得方法:
1. Azure Portalにログイン
2. Web App「webapp-scraper-prod」を開く
3. 「概要」ページの上部メニューから「発行プロファイルの取得」をクリック
4. ダウンロードされたファイルの内容全体をコピー

**GitHub設定**:
- Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
- Value: XML全体をコピー&ペースト

### 8. Cosmos DB関連 (3つ)
**用途**: データベース接続用認証情報

```bash
# Cosmos DBエンドポイントの取得
COSMOS_ENDPOINT=$(az cosmosdb show \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query documentEndpoint -o tsv)
echo "Endpoint: $COSMOS_ENDPOINT"

# Cosmos DBプライマリキーの取得
COSMOS_KEY=$(az cosmosdb keys list \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query primaryMasterKey -o tsv)
echo "Key: $COSMOS_KEY"
```

**GitHub設定**:
- Name: `COSMOS_ENDPOINT`
  - Value: 取得したエンドポイント（例: https://cosmos-aki-sta-prod.documents.azure.com:443/）
- Name: `COSMOS_KEY`
  - Value: 取得したプライマリキー
- Name: `COSMOS_DATABASE`
  - Value: `studio-reservations`

## ✅ 設定確認チェックリスト

すべてのSecretsが正しく設定されているか確認してください：

- [ ] `AZURE_CREDENTIALS` - JSON形式のサービスプリンシパル
- [ ] `AZURE_SUBSCRIPTION_ID` - UUID形式
- [ ] `AZURE_FUNCTIONAPP_NAME` - `func-aki-sta-prod`
- [ ] `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` - XML形式
- [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN` - APIトークン文字列
- [ ] `AZURE_WEBAPP_NAME` - `webapp-scraper-prod`
- [ ] `AZURE_WEBAPP_PUBLISH_PROFILE` - XML形式
- [ ] `COSMOS_ENDPOINT` - https://で始まるURL
- [ ] `COSMOS_KEY` - Base64文字列
- [ ] `COSMOS_DATABASE` - `studio-reservations`

## 🔄 Secrets更新手順

### サービスプリンシパルの更新
```bash
# 既存のサービスプリンシパルのリセット
az ad sp credential reset \
  --name "github-actions-aki-sta" \
  --json-auth
```

### Web App発行プロファイルの再取得
```bash
# 発行プロファイルの再取得
az webapp deployment list-publishing-profiles \
  --name $WEB_APP_SCRAPER \
  --resource-group $RESOURCE_GROUP \
  --xml
```

### Cosmos DBキーの再生成
```bash
# プライマリキーの再生成
az cosmosdb keys regenerate \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --key-kind primary
```

## 🚨 トラブルシューティング

### 問題: Authentication failed
**原因**: `AZURE_CREDENTIALS`のJSON形式が不正
**解決策**: 
- JSON全体をコピーしているか確認
- 改行やスペースが正しく含まれているか確認

### 問題: Resource not found
**原因**: リソース名やリソースグループ名が間違っている
**解決策**:
- Azure Portalで正確なリソース名を確認
- リージョンサフィックスが含まれているか確認

### 問題: Invalid publish profile
**原因**: 発行プロファイルのXMLが不完全
**解決策**:
- XML全体をコピーしているか確認
- ファイルの先頭から最後まですべて含める

## 🔒 セキュリティベストプラクティス

1. **最小権限の原則**
   - サービスプリンシパルにはリソースグループレベルのContributor権限のみ付与
   - 不要な権限は付与しない

2. **定期的な更新**
   - 3-6か月ごとにキーをローテーション
   - 不要になったSecretは削除

3. **アクセス制限**
   - リポジトリのSecrets設定は管理者のみアクセス可能に
   - ブランチ保護ルールを設定

4. **監査ログ**
   - GitHub ActionsとAzureの両方で監査ログを有効化
   - 不審なアクティビティを監視

## 📝 次のステップ

1. すべてのSecretsを設定完了
2. [デプロイワークフロー](../.github/workflows/deploy-production.yml)の実行
3. デプロイ結果の確認

## 🔗 関連ドキュメント

- [Azure リソース作成手順](./AZURE_DEPLOYMENT.md)
- [GitHub Actions セキュリティガイド](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Azure サービスプリンシパル](https://docs.microsoft.com/ja-jp/azure/active-directory/develop/app-objects-and-service-principals)

---

最終更新: 2025-08-27