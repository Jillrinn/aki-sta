# GitHub Secrets設定ガイド

## 📋 概要

GitHub ActionsからAzureリソースにアクセスするために必要なSecretsの設定手順です。
これらのSecretsは、自動デプロイパイプラインで使用されます。

## 🔐 必要なGitHub Secrets一覧

| Secret名 | 説明 | 取得方法 | 使用場所 |
|---|---|---|---|
| `AZUREAPPSERVICE_CLIENTID_*` | Azure App Service ClientID | Azure Portal (自動生成) | Functions OIDC認証 |
| `AZUREAPPSERVICE_TENANTID_*` | Azure App Service TenantID | Azure Portal (自動生成) | Functions OIDC認証 |
| `AZUREAPPSERVICE_SUBSCRIPTIONID_*` | Azure App Service SubscriptionID | Azure Portal (自動生成) | Functions OIDC認証 |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_DELIGHTFUL_SMOKE_*` | Static Web Apps APIトークン | Azure Portal (自動生成) | Frontend デプロイ |
| `REACT_APP_API_URL` | Frontend API エンドポイント | 固定値: `https://aki-sta-func-*.azurewebsites.net/api` | Frontend ビルド |
| `COSMOS_ENDPOINT` | Cosmos DBエンドポイント | Azure Portal/CLI | データベース接続 |
| `COSMOS_KEY` | Cosmos DBプライマリキー | Azure Portal/CLI | データベース認証 |
| `COSMOS_DATABASE` | データベース名 | 固定値: `akista-db` | データベース接続 |

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

# 変数設定（実際のリソース名に基づく）
RESOURCE_GROUP="<your-resource-group>"
COSMOS_ACCOUNT="aki-sta-cosmos"
FUNCTION_APP="aki-sta-func"
STATIC_WEB_APP="delightful-smoke-0d4827500"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
```

### 1. Azure App Service認証設定（OIDC）
**用途**: Azure FunctionsへのOIDC（OpenID Connect）認証

**注意**: これらのSecretsは、Azure PortalでFunction Appのデプロイメントセンターを設定した際に自動的に作成されます。

- `AZUREAPPSERVICE_CLIENTID_E327A028D14545AC8D7AC6EDC03A0441`
- `AZUREAPPSERVICE_TENANTID_5B64C3AA0E774E3786D3BE05F0B329B8`
- `AZUREAPPSERVICE_SUBSCRIPTIONID_F3A8046D56004FC3A9C957C0CA9ACD66`

手動で設定が必要な場合：
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

### 2. Static Web Apps APIトークン
**用途**: Azure Static Web Appsへのデプロイ認証

**Secret名**: `AZURE_STATIC_WEB_APPS_API_TOKEN_DELIGHTFUL_SMOKE_0D4827500`

**注意**: このトークンは、Azure PortalでStatic Web Appを作成した際に自動的にGitHub Secretsに追加されます。

```bash
# サブスクリプションIDの取得
az account show --query id -o tsv
```

**GitHub設定**:
- Name: `AZURE_SUBSCRIPTION_ID`
- Value: 出力されたID（例: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx）

### 3. Frontend API エンドポイント
**用途**: ReactアプリケーションがAPIにアクセスするためのURL

**GitHub設定**:
- Name: `REACT_APP_API_URL`
- Value: `https://aki-sta-func-chdxb5hgayf6g4az.eastasia-01.azurewebsites.net/api`

### 4. Cosmos DB接続設定
**用途**: データベース接続用認証情報

```bash
# Cosmos DBエンドポイントの取得
COSMOS_ENDPOINT="https://aki-sta-cosmos.documents.azure.com:443/"
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
  - Value: `https://aki-sta-cosmos.documents.azure.com:443/`
- Name: `COSMOS_KEY`
  - Value: 取得したプライマリキー
- Name: `COSMOS_DATABASE`
  - Value: `akista-db`

## ✅ 設定確認チェックリスト

すべてのSecretsが正しく設定されているか確認してください：

### 自動生成されるSecrets（Azure Portal経由）
- [ ] `AZUREAPPSERVICE_CLIENTID_E327A028D14545AC8D7AC6EDC03A0441` - UUID形式
- [ ] `AZUREAPPSERVICE_TENANTID_5B64C3AA0E774E3786D3BE05F0B329B8` - UUID形式
- [ ] `AZUREAPPSERVICE_SUBSCRIPTIONID_F3A8046D56004FC3A9C957C0CA9ACD66` - UUID形式
- [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN_DELIGHTFUL_SMOKE_0D4827500` - APIトークン文字列

### 手動設定が必要なSecrets
- [ ] `REACT_APP_API_URL` - `https://aki-sta-func-chdxb5hgayf6g4az.eastasia-01.azurewebsites.net/api`
- [ ] `COSMOS_ENDPOINT` - `https://aki-sta-cosmos.documents.azure.com:443/`
- [ ] `COSMOS_KEY` - Base64文字列
- [ ] `COSMOS_DATABASE` - `akista-db`

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
2. GitHub Actionsワークフローの実行
   - Functions: `.github/workflows/deploy-functions.yml`
   - Frontend: `.github/workflows/azure-static-web-apps-delightful-smoke-0d4827500.yml`
3. デプロイ結果の確認

## 🔗 関連ドキュメント

- [Azure リソース作成手順](./AZURE_DEPLOYMENT.md)
- [GitHub Actions セキュリティガイド](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Azure サービスプリンシパル](https://docs.microsoft.com/ja-jp/azure/active-directory/develop/app-objects-and-service-principals)

---

最終更新: 2025-08-28