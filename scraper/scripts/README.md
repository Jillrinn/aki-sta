# Scraper Scripts

このディレクトリには、Scraperの開発・テスト・運用を支援するスクリプトが含まれています。

## スクリプト一覧

### docker-test.sh
Dockerコンテナの統合テストを実行するスクリプトです。

**使用方法:**
```bash
# デフォルト設定で実行
./scripts/docker-test.sh

# カスタムイメージとenv設定で実行
./scripts/docker-test.sh <image-name> <env-file>

# Makefileから実行
make docker-test
```

**テスト内容:**
1. コンテナの起動確認
2. ヘルスチェックエンドポイント (`/health`) の検証
3. スクレイピングAPI (`/scrape`) の正常動作確認
4. エラーハンドリングの検証
5. コンテナメトリクスの表示

**必要な環境:**
- Docker
- curl
- 有効な`.env.docker`ファイル（Cosmos DB認証情報を含む）

## CI/CDでの使用

GitHub Actionsの`deploy-scraper.yml`ワークフローで、このテストスクリプトの内容が統合されています。

**パイプラインフロー:**
1. `build-and-push`: Dockerイメージのビルドとプッシュ
2. `test`: コンテナのテスト実行（新規追加）
3. `deploy`: Azure Web Appsへのデプロイ

テストが失敗した場合、デプロイは実行されません。

## ローカルでのテスト手順

```bash
# 1. .env.dockerファイルを作成
cp .env.docker.example .env.docker
# .env.dockerを編集してCosmos DB認証情報を設定

# 2. Dockerイメージをビルド
make build

# 3. 統合テストを実行
make docker-test

# または手動でテスト
./scripts/docker-test.sh
```

## トラブルシューティング

### コンテナが起動しない場合
```bash
# コンテナのログを確認
docker logs scraper-test

# Playwrightのブラウザがインストールされているか確認
docker run --rm <image-name> ls /ms-playwright
```

### Cosmos DB接続エラー
- `.env.docker`の認証情報を確認
- ネットワーク接続を確認
- Azure PortalでCosmos DBのステータスを確認

### ポート競合
```bash
# ポート8000が使用中か確認
lsof -i :8000

# 別のポートを使用する場合は、スクリプトを編集
```