.PHONY: help build up down logs shell test scrape clean health

# デフォルトターゲット
help:
	@echo "使用可能なコマンド:"
	@echo "  make build   - Dockerイメージをビルド"
	@echo "  make up      - コンテナを起動（Web APIモード）"
	@echo "  make down    - コンテナを停止・削除"
	@echo "  make logs    - コンテナのログを表示"
	@echo "  make shell   - コンテナ内でシェルを起動"
	@echo "  make test    - テストを実行"
	@echo "  make scrape  - CLIモードでスクレイピング実行"
	@echo "  make health  - ヘルスチェック"
	@echo "  make clean   - コンテナとイメージを削除"

# Dockerイメージをビルド
build:
	docker-compose build

# コンテナを起動（バックグラウンド）
up:
	@if [ ! -f .env.docker ]; then \
		echo "Error: .env.docker file not found!"; \
		echo "Run: cp .env.docker.example .env.docker"; \
		echo "Then edit .env.docker with your Cosmos DB credentials"; \
		exit 1; \
	fi
	docker-compose up -d
	@echo "Scraper API started at http://localhost:8000"
	@echo "Health check: http://localhost:8000/health"

# コンテナを停止
down:
	docker-compose down

# ログを表示（フォロー）
logs:
	docker-compose logs -f

# コンテナ内でシェルを起動
shell:
	docker-compose exec scraper /bin/bash

# テストを実行
test:
	docker-compose run --rm scraper python -m pytest tests/ -v

# CLIモードでスクレイピング実行（引数: DATE=2025-01-30）
scrape:
	@if [ -z "$(DATE)" ]; then \
		echo "Usage: make scrape DATE=2025-01-30"; \
		exit 1; \
	fi
	docker-compose run --rm scraper python src/main.py --date $(DATE)

# ヘルスチェック
health:
	@curl -s http://localhost:8000/health | python -m json.tool || echo "Service is not running"

# クリーンアップ（コンテナとイメージを削除）
clean:
	docker-compose down -v
	docker rmi aki-sta-scraper_scraper 2>/dev/null || true