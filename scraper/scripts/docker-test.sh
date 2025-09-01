#!/bin/bash

# Docker Container Test Script
# このスクリプトはDockerコンテナの動作確認を行います
# ローカル環境とCI/CD環境の両方で使用可能

set -e

# カラー出力用の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# コンテナ名とポート
CONTAINER_NAME="scraper-test-$(date +%s)"
PORT=8000
MAX_WAIT=30

# 関数: ログ出力
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 関数: クリーンアップ
cleanup() {
    log_info "Cleaning up..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
}

# エラー時のクリーンアップ設定
trap cleanup EXIT

# 引数チェック
IMAGE_NAME=${1:-"ghcr.io/jillrinn/aki-sta-scraper:latest"}
ENV_FILE=${2:-".env.docker"}

log_info "Testing Docker image: $IMAGE_NAME"

# 環境ファイルの確認
if [ ! -f "$ENV_FILE" ]; then
    log_error "Environment file not found: $ENV_FILE"
    log_info "Please create $ENV_FILE with Cosmos DB credentials"
    exit 1
fi

# 1. コンテナの起動
log_info "Starting Docker container..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -p "$PORT:$PORT" \
    --env-file "$ENV_FILE" \
    "$IMAGE_NAME"

# 2. コンテナの起動を待つ
log_info "Waiting for container to be ready..."
for i in $(seq 1 $MAX_WAIT); do
    if curl -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
        log_info "Container is ready! ($i seconds)"
        break
    fi
    
    if [ $i -eq $MAX_WAIT ]; then
        log_error "Container failed to start within $MAX_WAIT seconds"
        docker logs "$CONTAINER_NAME"
        exit 1
    fi
    
    echo -n "."
    sleep 1
done
echo ""

# 3. ヘルスチェックテスト
log_info "Testing health endpoint..."
response=$(curl -s "http://localhost:$PORT/health")
echo "Response: $response"

if echo "$response" | grep -q '"status":"healthy"'; then
    log_info "✅ Health check passed"
else
    log_error "❌ Health check failed"
    exit 1
fi

# 4. 正常なスクレイピングテスト
log_info "Testing scrape endpoint with valid date..."
test_date="2025-01-30"
response=$(curl -s -X POST "http://localhost:$PORT/scrape?date=$test_date")
echo "Response (truncated): ${response:0:200}..."

if echo "$response" | grep -q '"status":"success"'; then
    log_info "✅ Scrape endpoint returned success"
elif echo "$response" | grep -q '"success":true'; then
    log_info "✅ Scrape endpoint returned success (legacy format)"
elif echo "$response" | grep -q '"facilities":\[\]'; then
    log_info "✅ Scrape endpoint returned empty facilities (expected for future date)"
elif echo "$response" | grep -q '"error"'; then
    # Cosmos DB接続エラーの可能性
    if echo "$response" | grep -q '"error_type":"DATABASE_ERROR"'; then
        log_warning "⚠️ Database connection error (check Cosmos DB credentials)"
    else
        log_error "❌ Unexpected error from scrape endpoint"
        exit 1
    fi
else
    log_error "❌ Unexpected response from scrape endpoint"
    exit 1
fi

# 5. エラーハンドリングテスト
log_info "Testing error handling with invalid date..."
response=$(curl -s -X POST "http://localhost:$PORT/scrape?date=invalid-date")
echo "Response: $response"

# 新しいレスポンス形式に対応（success: false）
if echo "$response" | grep -q '"success":false'; then
    log_info "✅ Error handling test passed (new format)"
elif echo "$response" | grep -q '"error"'; then
    log_info "✅ Error handling test passed (legacy format)"
else
    log_error "❌ Expected error response for invalid date"
    exit 1
fi

# 6. メトリクス確認（オプション）
log_info "Checking container metrics..."
docker stats --no-stream "$CONTAINER_NAME"

# 7. ログの最後の10行を表示
log_info "Container logs (last 10 lines):"
docker logs --tail 10 "$CONTAINER_NAME"

# 成功
log_info "🎉 All tests passed successfully!"