#!/bin/bash

# Docker実行用スクリプト（一時的なコンテナで実行）
set -e

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# イメージ名
IMAGE_NAME="aki-sta-scraper"

# スクリプトのディレクトリに移動
cd "$(dirname "$0")"

# 関数: エラーメッセージ
error() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

# 関数: 成功メッセージ
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 関数: 情報メッセージ
info() {
    echo -e "${YELLOW}$1${NC}"
}

# 関数: Dockerイメージのビルド
build_image() {
    info "Building Docker image..."
    docker build -t $IMAGE_NAME . || error "Failed to build Docker image"
    success "Docker image built successfully"
}

# 関数: 環境変数ファイルの確認
check_env_file() {
    local env_file=$1
    if [ ! -f "$env_file" ]; then
        if [ "$env_file" == ".env.docker" ] && [ -f ".env.docker.example" ]; then
            warning ".env.docker not found, copying from example..."
            cp .env.docker.example .env.docker
            error "Please edit .env.docker with your Cosmos DB credentials"
        else
            error "Environment file $env_file not found"
        fi
    fi
}

# メインコマンド処理
case "$1" in
    build)
        build_image
        ;;
    
    test)
        info "Running tests in Docker..."
        # テスト用環境変数ファイルを使用（存在する場合）
        if [ -f ".env.test" ]; then
            docker run --rm --env-file .env.test $IMAGE_NAME python -m pytest tests/ -v
        else
            # テスト用環境変数がない場合は環境変数なしで実行
            docker run --rm $IMAGE_NAME python -m pytest tests/ -v
        fi
        ;;
    
    run)
        shift # 最初の引数(run)を削除
        
        # デフォルトの環境変数ファイル
        env_file=".env.docker"
        
        # --env-fileオプションのチェック
        while [[ $# -gt 0 ]]; do
            case $1 in
                --env-file)
                    env_file="$2"
                    shift 2
                    ;;
                *)
                    break
                    ;;
            esac
        done
        
        # 環境変数ファイルの確認
        check_env_file "$env_file"
        
        info "Running scraper with args: $@"
        docker run --rm --env-file "$env_file" $IMAGE_NAME python src/main.py "$@"
        ;;
    
    shell)
        info "Opening shell in Docker container..."
        docker run --rm -it $IMAGE_NAME /bin/bash
        ;;
    
    exec)
        shift # 最初の引数(exec)を削除
        info "Executing command in Docker: $@"
        docker run --rm $IMAGE_NAME "$@"
        ;;
    
    *)
        echo "Usage: $0 {build|test|run|shell|exec} [options]"
        echo ""
        echo "Commands:"
        echo "  build         - Build Docker image"
        echo "  test          - Run tests in Docker"
        echo "  run [args]    - Run scraper with arguments"
        echo "                  Example: $0 run --date 2025/09/20"
        echo "                  With env: $0 run --env-file .env.prod --date 2025/09/20"
        echo "  shell         - Open bash shell in container"
        echo "  exec [cmd]    - Execute arbitrary command in container"
        echo ""
        echo "Environment:"
        echo "  Default env file for 'run': .env.docker"
        echo "  Test env file (optional): .env.test"
        exit 1
        ;;
esac