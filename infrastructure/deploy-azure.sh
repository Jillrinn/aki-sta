#!/bin/bash

# ============================================
# Azure Resources Deployment Script
# 空きスタサーチくん - 本番環境構築
# ============================================

set -e  # エラー時に停止

# カラー出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 変数設定
# ============================================
ENVIRONMENT="${1:-production}"
RESOURCE_GROUP="rg-aki-sta-${ENVIRONMENT}-japaneast"
LOCATION="japaneast"
BASE_NAME="aki-sta"

# ============================================
# 関数定義
# ============================================
print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed"
        exit 1
    fi
}

# ============================================
# 前提条件チェック
# ============================================
print_header "前提条件チェック"

# Azure CLIのインストール確認
check_command az
print_success "Azure CLI is installed"

# jqのインストール確認（JSON処理用）
if ! command -v jq &> /dev/null; then
    print_warning "jq is not installed. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install jq
    else
        sudo apt-get update && sudo apt-get install -y jq
    fi
fi

# Azureログイン確認
if ! az account show &> /dev/null; then
    print_warning "Not logged in to Azure. Please login..."
    az login
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
print_success "Using subscription: $SUBSCRIPTION_ID"

# ============================================
# リソースグループの作成
# ============================================
print_header "Step 1: リソースグループの作成"

if az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    print_warning "Resource group '$RESOURCE_GROUP' already exists"
else
    az group create \
        --name "$RESOURCE_GROUP" \
        --location "$LOCATION"
    print_success "Resource group created: $RESOURCE_GROUP"
fi

# ============================================
# Bicep テンプレートのデプロイ
# ============================================
print_header "Step 2: Bicep テンプレートのデプロイ"

BICEP_FILE="$(dirname "$0")/azure-resources.bicep"

if [ ! -f "$BICEP_FILE" ]; then
    print_error "Bicep file not found: $BICEP_FILE"
    exit 1
fi

print_warning "Deploying resources... This may take 10-15 minutes"

DEPLOYMENT_OUTPUT=$(az deployment group create \
    --name "deployment-$(date +%Y%m%d%H%M%S)" \
    --resource-group "$RESOURCE_GROUP" \
    --template-file "$BICEP_FILE" \
    --parameters environment="$ENVIRONMENT" location="$LOCATION" baseName="$BASE_NAME" \
    --output json)

print_success "Bicep deployment completed"

# ============================================
# デプロイメント出力の取得
# ============================================
print_header "Step 3: リソース情報の取得"

# 出力値の取得
FUNCTION_APP_NAME=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.functionAppName.value')
FUNCTION_APP_URL=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.functionAppUrl.value')
STATIC_WEB_APP_URL=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.staticWebAppUrl.value')
COSMOS_ENDPOINT=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.cosmosEndpoint.value')
CONTAINER_REGISTRY_SERVER=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.containerRegistryServer.value')
APP_INSIGHTS_KEY=$(echo "$DEPLOYMENT_OUTPUT" | jq -r '.properties.outputs.appInsightsInstrumentationKey.value')

# ============================================
# 認証情報の取得
# ============================================
print_header "Step 4: 認証情報の取得"

# Cosmos DBキーの取得
COSMOS_ACCOUNT="cosmos-${BASE_NAME}-${ENVIRONMENT}"
COSMOS_KEY=$(az cosmosdb keys list \
    --name "$COSMOS_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --query primaryMasterKey -o tsv)

# Container Registry認証情報の取得
ACR_NAME="acr${BASE_NAME}${ENVIRONMENT}"
ACR_USERNAME=$(az acr credential show \
    --name "$ACR_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query username -o tsv)
ACR_PASSWORD=$(az acr credential show \
    --name "$ACR_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query passwords[0].value -o tsv)

# Functions発行プロファイルの取得
print_warning "Getting Functions publish profile..."
PUBLISH_PROFILE=$(az functionapp deployment list-publishing-profiles \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --xml)

# Static Web Apps APIトークンの取得
STATIC_WEB_APP_NAME="swa-${BASE_NAME}-${ENVIRONMENT}"
SWA_TOKEN=$(az staticwebapp secrets list \
    --name "$STATIC_WEB_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "properties.apiKey" -o tsv 2>/dev/null || echo "Manual configuration required")

# ============================================
# サービスプリンシパルの作成
# ============================================
print_header "Step 5: サービスプリンシパルの作成（GitHub Actions用）"

SP_NAME="github-actions-${BASE_NAME}-${ENVIRONMENT}"

# 既存のサービスプリンシパルを削除（存在する場合）
if az ad sp list --display-name "$SP_NAME" --query "[0].appId" -o tsv &> /dev/null; then
    print_warning "Service principal '$SP_NAME' already exists. Recreating..."
    OLD_SP_ID=$(az ad sp list --display-name "$SP_NAME" --query "[0].appId" -o tsv)
    az ad sp delete --id "$OLD_SP_ID"
fi

# 新しいサービスプリンシパルの作成
AZURE_CREDENTIALS=$(az ad sp create-for-rbac \
    --name "$SP_NAME" \
    --role contributor \
    --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
    --json-auth)

print_success "Service principal created: $SP_NAME"

# ============================================
# 環境変数ファイルの作成
# ============================================
print_header "Step 6: 環境変数ファイルの作成"

ENV_FILE=".env.${ENVIRONMENT}"
cat > "$ENV_FILE" << EOF
# Azure Resources - ${ENVIRONMENT} Environment
# Generated: $(date)

# Resource Group
RESOURCE_GROUP=${RESOURCE_GROUP}
LOCATION=${LOCATION}

# Function App
AZURE_FUNCTIONAPP_NAME=${FUNCTION_APP_NAME}
FUNCTION_APP_URL=${FUNCTION_APP_URL}

# Static Web App
STATIC_WEB_APP_URL=${STATIC_WEB_APP_URL}

# Cosmos DB
COSMOS_ENDPOINT=${COSMOS_ENDPOINT}
COSMOS_KEY=${COSMOS_KEY}
COSMOS_DATABASE=studio-reservations

# Container Registry
AZURE_CONTAINER_REGISTRY_SERVER=${CONTAINER_REGISTRY_SERVER}
AZURE_CONTAINER_REGISTRY_USERNAME=${ACR_USERNAME}
AZURE_CONTAINER_REGISTRY_PASSWORD=${ACR_PASSWORD}

# Application Insights
APP_INSIGHTS_INSTRUMENTATION_KEY=${APP_INSIGHTS_KEY}

# Azure Subscription
AZURE_SUBSCRIPTION_ID=${SUBSCRIPTION_ID}
EOF

print_success "Environment file created: $ENV_FILE"

# ============================================
# GitHub Secrets用JSONファイルの作成
# ============================================
print_header "Step 7: GitHub Secrets設定ファイルの作成"

SECRETS_FILE="github-secrets-${ENVIRONMENT}.json"
cat > "$SECRETS_FILE" << EOF
{
  "AZURE_CREDENTIALS": $(echo "$AZURE_CREDENTIALS" | jq -c .),
  "AZURE_SUBSCRIPTION_ID": "${SUBSCRIPTION_ID}",
  "AZURE_FUNCTIONAPP_NAME": "${FUNCTION_APP_NAME}",
  "AZURE_STATIC_WEB_APPS_API_TOKEN": "${SWA_TOKEN}",
  "AZURE_CONTAINER_REGISTRY_SERVER": "${CONTAINER_REGISTRY_SERVER}",
  "AZURE_CONTAINER_REGISTRY_USERNAME": "${ACR_USERNAME}",
  "AZURE_CONTAINER_REGISTRY_PASSWORD": "${ACR_PASSWORD}",
  "COSMOS_ENDPOINT": "${COSMOS_ENDPOINT}",
  "COSMOS_KEY": "${COSMOS_KEY}",
  "COSMOS_DATABASE": "studio-reservations"
}
EOF

print_success "GitHub secrets file created: $SECRETS_FILE"

# 発行プロファイルを別ファイルに保存
PROFILE_FILE="publish-profile-${ENVIRONMENT}.xml"
echo "$PUBLISH_PROFILE" > "$PROFILE_FILE"
print_success "Publish profile saved to: $PROFILE_FILE"

# ============================================
# デプロイ結果サマリ
# ============================================
print_header "デプロイ完了サマリ"

cat << EOF

${GREEN}✅ Azure リソースの作成が完了しました！${NC}

${BLUE}== リソース情報 ==${NC}
- Resource Group: ${RESOURCE_GROUP}
- Location: ${LOCATION}
- Environment: ${ENVIRONMENT}

${BLUE}== アプリケーションURL ==${NC}
- Frontend URL: ${STATIC_WEB_APP_URL}
- API URL: ${FUNCTION_APP_URL}
- Container Registry: ${CONTAINER_REGISTRY_SERVER}

${BLUE}== 次のステップ ==${NC}

1. GitHub Secretsの設定:
   ${YELLOW}cat ${SECRETS_FILE}${NC}
   上記の内容をGitHub Repository Settings > Secrets and variablesに設定

2. Functions発行プロファイルの設定:
   ${YELLOW}cat ${PROFILE_FILE}${NC}
   内容を AZURE_FUNCTIONAPP_PUBLISH_PROFILE として設定

3. デプロイの実行:
   mainブランチにpushするか、GitHub ActionsでWorkflowを手動実行

4. 動作確認:
   - Frontend: ${STATIC_WEB_APP_URL}
   - API Health Check: ${FUNCTION_APP_URL}/api/availability/2025-11-15

${YELLOW}重要: ${SECRETS_FILE} と ${PROFILE_FILE} にはセキュアな情報が含まれています。${NC}
${YELLOW}      設定後は必ず削除してください。${NC}

EOF

print_warning "セキュリティ警告: 認証情報ファイルを安全に管理してください"

# ============================================
# クリーンアップオプション
# ============================================
read -p "認証情報ファイルを削除しますか？ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f "$SECRETS_FILE" "$PROFILE_FILE" "$ENV_FILE"
    print_success "認証情報ファイルを削除しました"
else
    print_warning "認証情報ファイルは手動で削除してください"
fi

print_header "スクリプト完了"
print_success "Azure環境の構築が完了しました！"