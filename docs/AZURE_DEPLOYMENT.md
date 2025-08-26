# Azure本番環境デプロイ手順書

## 📋 概要

この文書は「空きスタサーチくん」をAzure本番環境にデプロイするための詳細な手順書です。
Azure Portal またはAzure CLIを使用してリソースを作成し、GitHub Actionsによる自動デプロイを設定します。

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                    Resource Group                        │
│                 (rg-aki-sta-prod-japaneast)             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │Azure Functions│  │Static Web Apps│ │  Web Apps    │ │
│  │(Backend API) │  │  (Frontend)    │ │  (Scraper)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                  │                  ↑        │
│         │                  │                  │        │
│  ┌──────────────────────────────────────────────┐     │
│  │              Cosmos DB                        │     │
│  │          (データ永続化層)                      │     │
│  └──────────────────────────────────────────────┘     │
│                                                          │
│  ┌──────────────────────────────────────────────┐     │
│  │              Logic Apps                        │     │
│  │       (定期実行: 毎日 8時・17時 JST)            │     │
│  └──────────────────────────────────────────────┘     │
│                     ↓ HTTP呼出し                         │
│                 Web Apps /scrape                        │
│  ┌──────────────────────────────────────────────┐     │
│  │        Application Insights                   │     │
│  └──────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## 🎯 前提条件

1. **Azure サブスクリプション**: 有効なAzureサブスクリプション
2. **Azure CLI**: バージョン 2.50.0 以上
3. **GitHub リポジトリ**: フォーク/クローンされたリポジトリ
4. **権限**: Azure サブスクリプションの所有者またはコントリビューター権限

## 📦 必要なAzureリソース一覧

| リソースタイプ | リソース名 | SKU/プラン | 用途 | 月額コスト（目安） |
|---|---|---|---|---|
| Resource Group | rg-aki-sta-prod-japaneast | - | 全リソースの管理 | 無料 |
| Cosmos DB | cosmos-aki-sta-prod | サーバーレス | データ永続化 | 無料（1000 RU/s、25GB） |
| Azure Functions | func-aki-sta-prod | Consumption Plan | Backend API | 無料枠内 |
| Static Web Apps | swa-aki-sta-prod | Free | Frontend | 無料 |
| Web Apps | webapp-scraper-prod | Free (F1) | Scraper実行 | 無料（60分CPU/日） |
| Logic Apps | logic-aki-sta-scheduler | 消費プラン | 定期実行制御 | 無料（4,000実行/月） |
| Application Insights | appi-aki-sta-prod | - | 監視・ログ | 無料枠内 |

**総額見積もり**: 月額 **0円**（すべて無料枠内）

## 📍 リージョン選択

- **推奨リージョン**: Japan East (東日本)
- **代替リージョン**: Japan West (西日本)
- **考慮事項**: 
  - レイテンシー最小化のため日本リージョンを選択
  - Cosmos DBは地理的冗長性なし（コスト削減のため）

## 🔨 Azure リソース作成手順

### 方法1: Azure Portal（GUI）での作成

#### Step 1: Resource Groupの作成
1. [Azure Portal](https://portal.azure.com)にログイン
2. 「リソースグループ」→「作成」をクリック
3. 以下を入力:
   - サブスクリプション: 選択
   - リソースグループ名: `rg-aki-sta-prod-japaneast`
   - リージョン: `Japan East`
4. 「確認と作成」→「作成」

#### Step 2: Cosmos DBの作成
1. 「リソースの作成」→「Cosmos DB」を検索
2. 「作成」→「Azure Cosmos DB for NoSQL」を選択
3. 以下を設定:
   ```
   サブスクリプション: 選択
   リソースグループ: rg-aki-sta-prod-japaneast
   アカウント名: cosmos-aki-sta-prod
   場所: Japan East
   容量モード: サーバーレス（無料枠利用）
   ```
4. 「確認と作成」→「作成」
5. デプロイ完了後、「データベース」→「新しいデータベース」:
   - データベースID: `studio-reservations`
6. コンテナを作成:
   - availability (パーティションキー: /date)
   - target_dates (パーティションキー: /id)
   - rate_limits (パーティションキー: /date)

#### Step 3: Azure Functionsの作成
1. 「リソースの作成」→「Function App」を検索
2. 以下を設定:
   ```
   サブスクリプション: 選択
   リソースグループ: rg-aki-sta-prod-japaneast
   関数アプリ名: func-aki-sta-prod
   公開: コード
   ランタイムスタック: Node.js
   バージョン: 20 LTS
   リージョン: Japan East
   オペレーティングシステム: Linux
   プラン: 消費量（サーバーレス）
   ```
3. 「ホスティング」タブ:
   - ストレージアカウント: 新規作成（内部ストレージを使用）
4. 「監視」タブ:
   - Application Insights: 新規作成（appi-aki-sta-prod）
5. 「確認と作成」→「作成」

#### Step 4: Static Web Appsの作成
1. 「リソースの作成」→「Static Web App」を検索
2. 以下を設定:
   ```
   サブスクリプション: 選択
   リソースグループ: rg-aki-sta-prod-japaneast
   名前: swa-aki-sta-prod
   プラン: Free
   リージョン: East Asia（日本最寄り）
   デプロイソース: GitHub
   組織: あなたのGitHub組織
   リポジトリ: aki-sta
   ブランチ: main
   ビルドプリセット: React
   アプリの場所: /frontend
   APIの場所: （空白）
   出力場所: build
   ```
3. 「確認と作成」→「作成」

#### Step 5: Web Apps (Scraper)の作成
1. 「リソースの作成」→「Web App」を検索
2. 以下を設定:
   ```
   サブスクリプション: 選択
   リソースグループ: rg-aki-sta-prod-japaneast
   名前: webapp-scraper-prod
   公開: コード
   ランタイムスタック: Python 3.11
   オペレーティングシステム: Linux
   リージョン: Japan East
   価格プラン: Free F1
   ```
3. 「確認と作成」→「作成」

#### Step 6: Logic Appsの作成
1. 「リソースの作成」→「Logic App」を検索
2. 以下を設定:
   ```
   サブスクリプション: 選択
   リソースグループ: rg-aki-sta-prod-japaneast
   ロジックアプリ名: logic-aki-sta-scheduler
   地域: Japan East
   プランの種類: 消費（無料枠対象）
   ```
3. 「確認と作成」→「作成」
4. デプロイ完了後、Logic Appデザイナーで以下を設定:
   - **トリガー**: 「繰り返し」
     - 間隔: 1
     - 頻度: 日
     - タイムゾーン: (UTC+09:00) 大阪、札幌、東京
     - 設定した時刻: 8, 17（8時と17時）
   - **アクション**: 「HTTP」
     - メソッド: POST
     - URI: `https://webapp-scraper-prod.azurewebsites.net/scrape`
     - ヘッダー: `Content-Type: application/json`
     - 本文:
       ```json
       {
         "triggeredBy": "scheduler",
         "dates": [
           "@{formatDateTime(utcNow(), 'yyyy-MM-dd')}",
           "@{formatDateTime(addDays(utcNow(), 1), 'yyyy-MM-dd')}",
           "@{formatDateTime(addDays(utcNow(), 2), 'yyyy-MM-dd')}"
         ]
       }
       ```
     - または、特定の日付を固定で指定：
       ```json
       {
         "triggeredBy": "scheduler",
         "dates": ["2025-11-15", "2025-11-16", "2025-11-22", "2025-11-23"]
       }
       ```

#### Step 7: Application Insightsの設定（Functions作成時に自動作成済み）
1. リソースグループから「appi-aki-sta-prod」を開く
2. 「プロパティ」からインストルメンテーションキーをコピー
3. Functions Appの構成に追加

### 方法2: Azure CLI での自動作成

#### 前準備
```bash
# Azure CLIにログイン
az login

# サブスクリプションを設定（必要に応じて）
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# 変数設定
RESOURCE_GROUP="rg-aki-sta-prod-japaneast"
LOCATION="japaneast"
COSMOS_ACCOUNT="cosmos-aki-sta-prod"
FUNCTION_APP="func-aki-sta-prod"
STATIC_WEB_APP="swa-aki-sta-prod"
WEB_APP_SCRAPER="webapp-scraper-prod"
LOGIC_APP="logic-aki-sta-scheduler"
APP_INSIGHTS="appi-aki-sta-prod"
```

#### スクリプト実行
```bash
# 1. リソースグループの作成
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# 2. Cosmos DBの作成
az cosmosdb create \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --locations regionName=$LOCATION \
  --capabilities EnableServerless \
  --default-consistency-level Session

# データベースとコンテナの作成
az cosmosdb sql database create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --name studio-reservations

az cosmosdb sql container create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name studio-reservations \
  --name availability \
  --partition-key-path /date

az cosmosdb sql container create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name studio-reservations \
  --name target_dates \
  --partition-key-path /id

az cosmosdb sql container create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name studio-reservations \
  --name rate_limits \
  --partition-key-path /date

# 3. Application Insightsの作成
az monitor app-insights component create \
  --app $APP_INSIGHTS \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web

# 4. Azure Functionsの作成
az functionapp create \
  --resource-group $RESOURCE_GROUP \
  --consumption-plan-location $LOCATION \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name $FUNCTION_APP \
  --app-insights $APP_INSIGHTS \
  --os-type Linux

# 5. App Service Plan (Free Tier) の作成
az appservice plan create \
  --name asp-scraper-free \
  --resource-group $RESOURCE_GROUP \
  --is-linux \
  --sku F1

# 6. Web Apps (Scraper)の作成
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_SCRAPER \
  --plan asp-scraper-free \
  --runtime "PYTHON:3.11"

# 7. Logic Appsの作成
az logic workflow create \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --name $LOGIC_APP

# Logic Appsの定義を設定（JSONファイルを作成して適用）
cat > logic-app-definition.json << 'EOF'
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "triggers": {
      "Recurrence": {
        "type": "Recurrence",
        "recurrence": {
          "frequency": "Day",
          "interval": 1,
          "timeZone": "Tokyo Standard Time",
          "schedule": {
            "hours": ["8", "17"]
          }
        }
      }
    },
    "actions": {
      "HTTP": {
        "type": "Http",
        "inputs": {
          "method": "POST",
          "uri": "https://webapp-scraper-prod.azurewebsites.net/scrape",
          "headers": {
            "Content-Type": "application/json"
          },
          "body": {
            "triggeredBy": "scheduler",
            "dates": [
              "@{formatDateTime(utcNow(), 'yyyy-MM-dd')}",
              "@{formatDateTime(addDays(utcNow(), 1), 'yyyy-MM-dd')}",
              "@{formatDateTime(addDays(utcNow(), 2), 'yyyy-MM-dd')}"
            ]
          }
        },
        "runAfter": {}
      }
    }
  }
}
EOF

# Logic Appsワークフローの更新
az logic workflow update \
  --resource-group $RESOURCE_GROUP \
  --name $LOGIC_APP \
  --definition @logic-app-definition.json

# 8. Static Web Apps（GitHub経由で作成される）
echo "Static Web Appsは GitHub Actions workflow実行時に自動作成されます"
```

## 🔐 Azure認証情報の取得

### 1. Cosmos DB接続情報
```bash
# エンドポイントの取得
COSMOS_ENDPOINT=$(az cosmosdb show \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query documentEndpoint -o tsv)

# プライマリキーの取得
COSMOS_KEY=$(az cosmosdb keys list \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query primaryMasterKey -o tsv)

echo "COSMOS_ENDPOINT=$COSMOS_ENDPOINT"
echo "COSMOS_KEY=$COSMOS_KEY"
echo "COSMOS_DATABASE=studio-reservations"
```

### 2. Azure Functions発行プロファイル
```bash
# 発行プロファイルの取得
az functionapp deployment list-publishing-profiles \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --xml > functionapp-publish-profile.xml
```

### 3. Web Apps (Scraper) 設定
```bash
# Web Apps URLの取得
WEB_APP_URL=$(az webapp show \
  --name $WEB_APP_SCRAPER \
  --resource-group $RESOURCE_GROUP \
  --query defaultHostName -o tsv)

echo "WEB_APP_URL=https://$WEB_APP_URL"

# 環境変数の設定
az webapp config appsettings set \
  --name $WEB_APP_SCRAPER \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "COSMOS_ENDPOINT=$COSMOS_ENDPOINT" \
    "COSMOS_KEY=$COSMOS_KEY" \
    "COSMOS_DATABASE=studio-reservations"
```

### 4. サービスプリンシパルの作成（GitHub Actions用）
```bash
# サービスプリンシパルの作成
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

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

## 🔧 Functions App設定

### 環境変数の設定
```bash
# Functions Appの環境変数を設定
az functionapp config appsettings set \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "COSMOS_ENDPOINT=$COSMOS_ENDPOINT" \
    "COSMOS_KEY=$COSMOS_KEY" \
    "COSMOS_DATABASE=studio-reservations" \
    "FUNCTIONS_WORKER_RUNTIME=node" \
    "NODE_ENV=production"
```

### CORS設定
```bash
# CORS設定（Static Web Appsからのアクセスを許可）
az functionapp cors add \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --allowed-origins https://swa-aki-sta-prod.azurestaticapps.net
```

## 📊 監視とログ設定

### Application Insightsの設定
1. Azure Portalで Application Insights リソースを開く
2. 「使用状況とパフォーマンス」→「ライブメトリック」で実時間監視
3. 「調査」→「ログ」でKQLクエリによる詳細分析

### アラート設定
```bash
# エラー率アラートの設定
az monitor metrics alert create \
  --name high-error-rate \
  --resource-group $RESOURCE_GROUP \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$FUNCTION_APP \
  --condition "avg requests/failed > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --description "Function Appのエラー率が高い"
```

## 🔄 デプロイ後の確認事項

### 1. Functions Appの動作確認
```bash
# Function Appのステータス確認
az functionapp show \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --query state -o tsv

# APIエンドポイントのテスト
curl https://$FUNCTION_APP.azurewebsites.net/api/availability/2025-11-15
```

### 2. Static Web Appsの動作確認
```bash
# Static Web AppsのURL取得
az staticwebapp show \
  --name $STATIC_WEB_APP \
  --resource-group $RESOURCE_GROUP \
  --query defaultHostname -o tsv
```

### 3. Web Apps (Scraper)の確認
```bash
# Web Appsのステータス確認
az webapp show \
  --name $WEB_APP_SCRAPER \
  --resource-group $RESOURCE_GROUP \
  --query state -o tsv

# スクレイパーAPIのテスト
curl https://$WEB_APP_SCRAPER.azurewebsites.net/health
```

## 🚨 トラブルシューティング

### 問題: Functions Appが起動しない
**解決策**:
1. Application Insightsのログを確認
2. Functions Appの「診断と問題の解決」を確認
3. ランタイムのバージョンを確認

### 問題: CORS エラー
**解決策**:
```bash
# 全オリジンを一時的に許可（テスト用）
az functionapp cors add \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --allowed-origins "*"
```

### 問題: Cosmos DB接続エラー
**解決策**:
1. 接続文字列の確認
2. ファイアウォール設定の確認
3. IPアドレス制限の確認

### 問題: Logic Appsが実行されない
**解決策**:
1. Logic Appsの実行履歴を確認
2. トリガー設定（時刻、タイムゾーン）を確認
3. Web AppsのURLが正しいか確認

## 📝 次のステップ

1. [GitHub Secrets設定](./GITHUB_SECRETS.md)を行う
2. GitHub Actionsワークフローを実行
3. デプロイ完了後、アプリケーションの動作確認

## 🔗 関連ドキュメント

- [GitHub Secrets設定ガイド](./GITHUB_SECRETS.md)
- [GitHub Actionsワークフロー設定](../.github/workflows/deploy-production.yml)
- [Azure Functions公式ドキュメント](https://docs.microsoft.com/ja-jp/azure/azure-functions/)
- [Static Web Apps公式ドキュメント](https://docs.microsoft.com/ja-jp/azure/static-web-apps/)
- [Logic Apps公式ドキュメント](https://docs.microsoft.com/ja-jp/azure/logic-apps/)

---

最終更新: 2025-08-26