# Scraperアプリ Azure Web Apps デプロイ手順書（無料枠）

## 📋 概要

PlaywrightベースのScraperアプリをAzure Web Apps (無料プラン)にDockerコンテナとしてデプロイする完全ガイド。
GitHub Container Registry (ghcr.io)を使用することで、完全無料でのデプロイを実現します。

## 🎯 前提条件

- Azure Web Apps (webapp-scraper-prod) が作成済み
- GitHubリポジトリへのアクセス権限
- Azure PortalまたはAzure CLIへのアクセス

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│                  GitHub                         │
│  ┌──────────────────────────────────────┐      │
│  │     GitHub Actions Workflow           │      │
│  │  1. Dockerイメージビルド              │      │
│  │  2. GitHub Container Registryプッシュ │      │
│  │  3. Azure Web Appsデプロイ            │      │
│  └──────────────────────────────────────┘      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│         GitHub Container Registry               │
│         ghcr.io/{owner}/scraper                │
│         (パブリックイメージ = 無料)              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│           Azure Web Apps (F1 Free)              │
│         webapp-scraper-prod                     │
│     - Flask App with Playwright                 │
│     - 60 CPU分/日の制限                         │
└─────────────────────────────────────────────────┘
```

## 📦 コスト分析

| サービス | プラン | コスト | 制限事項 |
|---------|--------|--------|----------|
| **GitHub Container Registry** | Public | **無料** | 誰でもイメージをプル可能 |
| **Azure Web Apps** | F1 (Free) | **無料** | 60 CPU分/日、1GB RAM |
| **GitHub Actions** | Public repo | **無料** | 無制限 |
| **合計** | - | **0円/月** | - |

## 🔧 実装手順

### ステップ 1: Dockerfileの最適化

`scraper/Dockerfile`を以下のように調整：

```dockerfile
# Python 3.11 slim image for smaller size
FROM python:3.11-slim

# Install system dependencies for Playwright (Chromiumのみ)
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (Chromium only for size optimization)
RUN playwright install chromium
RUN playwright install-deps chromium

# Copy application code
COPY . .

# Set environment variables
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PYTHONUNBUFFERED=1

# Azure Web Apps expects port 8000 by default
EXPOSE 8000

# Start Flask app with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--timeout", "600", "--workers", "1", "app:app"]
```

### ステップ 2: GitHub Package設定

1. **リポジトリのPackage設定**
   - GitHubリポジトリ → Settings → Actions → General
   - "Workflow permissions"で"Read and write permissions"を選択

2. **パッケージの公開設定**
   - リポジトリ → Settings → Packages
   - パッケージ作成後、Visibilityを"Public"に設定

### ステップ 3: GitHub Actionsワークフロー作成

`.github/workflows/deploy-scraper.yml`を作成：

```yaml
name: Deploy Scraper to Azure Web Apps

on:
  push:
    branches: [main]
    paths:
      - 'scraper/**'
      - '.github/workflows/deploy-scraper.yml'
  workflow_dispatch:
    inputs:
      reason:
        description: 'Manual deployment reason'
        required: false
        default: 'Manual deployment'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository_owner }}/aki-sta-scraper
  AZURE_WEBAPP_NAME: webapp-scraper-prod

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v3
    
    - name: Log in to GitHub Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{date 'YYYYMMDD-HHmmss'}}-
          type=raw,value=latest
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: ./scraper
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
        cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
  
  deploy:
    runs-on: ubuntu-latest
    needs: build-and-push
    
    steps:
    - name: Deploy to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: ${{ env.AZURE_WEBAPP_NAME }}
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        images: '${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest'
```

### ステップ 4: Azure Web App設定

#### 4.1 発行プロファイルの取得

```bash
# Azure CLIを使用
az webapp deployment list-publishing-profiles \
  --name webapp-scraper-prod \
  --resource-group rg-aki-sta-prod-japaneast \
  --xml > publish-profile.xml
```

または、Azure Portal:
1. webapp-scraper-prod → 概要 → 発行プロファイルの取得
2. ダウンロードしたXMLファイルの内容をコピー

#### 4.2 GitHub Secretsに追加

リポジトリ → Settings → Secrets and variables → Actions → New repository secret

| Secret名 | 値 |
|---------|-----|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | 発行プロファイルXMLの全内容 |

#### 4.3 環境変数設定（Azure Portal）

webapp-scraper-prod → 設定 → 構成 → アプリケーション設定

| 名前 | 値 | 説明 |
|------|-----|------|
| `COSMOS_ENDPOINT` | `https://cosmos-aki-sta-prod.documents.azure.com:443/` | Cosmos DBエンドポイント |
| `COSMOS_KEY` | `{your-cosmos-key}` | Cosmos DBキー |
| `COSMOS_DATABASE` | `studio-reservations` | データベース名 |
| `WEBSITES_PORT` | `8000` | コンテナポート |
| `DOCKER_REGISTRY_SERVER_URL` | `https://ghcr.io` | レジストリURL |
| `DOCKER_ENABLE_CI` | `true` | 継続的デプロイ有効化 |

### ステップ 5: scraper/app.py の調整

Flask appがAzure Web Appsで正しく動作するよう確認：

```python
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

# Azure Web Appsのポート設定
port = int(os.environ.get('PORT', 8000))

if __name__ == '__main__':
    # Production環境ではGunicornを使用
    app.run(host='0.0.0.0', port=port, debug=False)
```

### ステップ 6: デプロイ実行

1. **初回手動デプロイ**
   ```bash
   # GitHub Actionsを手動トリガー
   gh workflow run deploy-scraper.yml
   ```

2. **自動デプロイ**
   - `scraper/`配下のファイル変更時に自動実行

### ステップ 7: 動作確認

#### 7.1 ヘルスチェック
```bash
curl https://webapp-scraper-prod.azurewebsites.net/health
```

期待されるレスポンス：
```json
{
  "status": "healthy",
  "timestamp": "2025-08-28T10:00:00.000Z"
}
```

#### 7.2 スクレイピング実行テスト
```bash
curl -X POST https://webapp-scraper-prod.azurewebsites.net/scrape \
  -H "Content-Type: application/json" \
  -d '{"dates": ["2025-11-15"]}'
```

#### 7.3 ログ確認
Azure Portal → webapp-scraper-prod → 監視 → ログ ストリーム

## 🚨 トラブルシューティング

### 問題1: Dockerイメージが大きすぎる
**症状**: デプロイが遅い、起動が遅い

**解決策**:
```dockerfile
# マルチステージビルドを使用
FROM python:3.11-slim as builder
COPY requirements.txt .
RUN pip install --user -r requirements.txt

FROM python:3.11-slim
COPY --from=builder /root/.local /root/.local
```

### 問題2: Playwrightブラウザが起動しない
**症状**: "Executable doesn't exist"エラー

**解決策**:
```python
# scraper.pyで環境変数チェック
import os
os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/ms-playwright'
```

### 問題3: 60分制限超過
**症状**: "Free App Service Plan limit exceeded"

**解決策**:
- Logic Appsのスケジュール調整（1日2回→1日1回）
- スクレイピング処理の最適化

### 問題4: コンテナが起動しない
**症状**: "Container didn't respond to HTTP pings"

**解決策**:
```yaml
# Azure Portal設定
WEBSITES_PORT: 8000
WEBSITES_CONTAINER_START_TIME_LIMIT: 1800
```

## 📊 パフォーマンス最適化

### イメージサイズ削減
```dockerfile
# 不要なブラウザを除外
RUN playwright install chromium  # webkitやfirefoxは除外
```

### メモリ使用量削減
```python
# Playwrightオプション
browser = await playwright.chromium.launch(
    headless=True,
    args=['--disable-dev-shm-usage', '--no-sandbox']
)
```

## 🔒 セキュリティ考慮事項

1. **イメージの公開性**
   - GitHub Container Registryのパブリックイメージは誰でもアクセス可能
   - センシティブな情報はコードに含めない

2. **環境変数管理**
   - Cosmos DBキーなどはAzure Web Appの環境変数で管理
   - GitHub Secretsに保存

3. **最小権限の原則**
   - Dockerコンテナは非rootユーザーで実行
   - 必要最小限のシステム権限のみ付与

## 📝 メンテナンス

### ログ監視
```bash
# Azure CLIでログ取得
az webapp log tail \
  --name webapp-scraper-prod \
  --resource-group rg-aki-sta-prod-japaneast
```

### コンテナの更新
1. コード変更をmainブランチにプッシュ
2. GitHub Actionsが自動的に新しいイメージをビルド・デプロイ
3. Azure Web Appsが自動的に新しいコンテナに切り替え

## 🎯 まとめ

この構成により、以下を実現：
- ✅ **完全無料**でのデプロイ
- ✅ Playwright対応のスクレイパー実行
- ✅ 自動デプロイパイプライン
- ✅ スケーラブルなアーキテクチャ

制限事項：
- ⚠️ 1日60分のCPU時間制限
- ⚠️ パブリックDockerイメージ
- ⚠️ 1GB RAMの制限

## 🔗 関連ドキュメント

- [Azure Web Apps公式ドキュメント](https://docs.microsoft.com/ja-jp/azure/app-service/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Playwright Docker](https://playwright.dev/docs/docker)

---

*作成日: 2025-08-28*
*最終更新: 2025-08-28*