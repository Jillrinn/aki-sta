#!/bin/bash

# Scraper Docker環境管理スクリプト
set -e

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 関数: エラーメッセージ
error() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

# 関数: 成功メッセージ
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 関数: 警告メッセージ
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 関数: 環境変数チェック
check_env() {
    if [ ! -f .env.docker ]; then
        warning ".env.docker file not found!"
        echo "Creating from template..."
        cp .env.docker.example .env.docker
        error "Please edit .env.docker with your Cosmos DB credentials"
    fi
    
    # 必須環境変数チェック
    source .env.docker
    if [ -z "$COSMOS_ENDPOINT" ] || [ "$COSMOS_ENDPOINT" == "https://your-cosmos-account.documents.azure.com:443/" ]; then
        error "COSMOS_ENDPOINT is not configured in .env.docker"
    fi
    if [ -z "$COSMOS_KEY" ] || [ "$COSMOS_KEY" == "your-cosmos-primary-key" ]; then
        error "COSMOS_KEY is not configured in .env.docker"
    fi
    
    success "Environment variables checked"
}

# 関数: ヘルスチェック
health_check() {
    echo "Checking service health..."
    sleep 5  # サービス起動待ち
    
    for i in {1..10}; do
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            success "Service is healthy!"
            echo "API endpoint: http://localhost:8000"
            echo "Health check: http://localhost:8000/health"
            echo "Scrape endpoint: POST http://localhost:8000/scrape?date=YYYY-MM-DD"
            return 0
        fi
        echo "Waiting for service to start... ($i/10)"
        sleep 2
    done
    
    error "Service failed to start. Check logs with: docker-compose logs"
}

# メインコマンド処理
case "$1" in
    start)
        echo "Starting Scraper Docker environment..."
        check_env
        docker-compose build
        docker-compose up -d
        health_check
        ;;
    
    stop)
        echo "Stopping Scraper Docker environment..."
        docker-compose down
        success "Services stopped"
        ;;
    
    restart)
        echo "Restarting Scraper Docker environment..."
        docker-compose down
        check_env
        docker-compose up -d
        health_check
        ;;
    
    status)
        if docker-compose ps | grep -q "Up"; then
            success "Service is running"
            docker-compose ps
        else
            warning "Service is not running"
        fi
        ;;
    
    logs)
        docker-compose logs -f
        ;;
    
    test)
        echo "Running tests in Docker..."
        check_env
        docker-compose run --rm scraper python -m pytest tests/ -v
        ;;
    
    scrape)
        if [ -z "$2" ]; then
            error "Date argument required. Usage: ./docker-run.sh scrape YYYY-MM-DD"
        fi
        echo "Running scraper for date: $2"
        check_env
        docker-compose run --rm scraper python src/main.py --date "$2"
        ;;
    
    shell)
        echo "Opening shell in container..."
        docker-compose exec scraper /bin/bash
        ;;
    
    clean)
        echo "Cleaning up Docker resources..."
        docker-compose down -v
        docker rmi aki-sta-scraper_scraper 2>/dev/null || true
        success "Cleanup complete"
        ;;
    
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|test|scrape|shell|clean}"
        echo ""
        echo "Commands:"
        echo "  start    - Build and start the Docker environment"
        echo "  stop     - Stop the Docker environment"
        echo "  restart  - Restart the Docker environment"
        echo "  status   - Check service status"
        echo "  logs     - Show container logs (follow mode)"
        echo "  test     - Run tests in Docker"
        echo "  scrape   - Run scraper for specific date (e.g., ./docker-run.sh scrape 2025-01-30)"
        echo "  shell    - Open bash shell in container"
        echo "  clean    - Remove containers and images"
        exit 1
        ;;
esac