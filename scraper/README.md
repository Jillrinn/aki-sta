# あんさんぶるスタジオ スクレイパー

Playwright + BeautifulSoup4を使用してあんさんぶるスタジオ（本郷・初台）の予約状況をスクレイピングするPythonアプリケーション。

## 機能

- 本郷・初台の2施設の予約状況を同時取得
- 3つの時間帯（9-12, 13-17, 18-21）の空き状況を確認
- リトライ機能付きの安定したスクレイピング
- 動的な日付ナビゲーション（カレンダー月移動対応）
- JSON形式でのデータ保存と既存データの更新
- **Cosmos DB統合対応** ✅ 実装済み（v3.0）

## セットアップ

```bash
# Python仮想環境の作成
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係のインストール
pip install -r requirements.txt

# Playwrightブラウザのインストール
playwright install chromium

# 環境変数設定（Cosmos DB接続情報）
cp .env.example .env  # .envファイルを作成
# .envファイルを編集してCosmos DB接続情報を設定
```

## 使用方法

### Web APIサーバーとして起動

Scraperは Flask ベースの Web API サーバーとして起動できます。これにより HTTP エンドポイント経由でスクレイピングを実行できます。

#### ローカル起動

```bash
# 仮想環境をアクティベート
source venv/bin/activate

# Flask開発サーバーで起動（ポート8000）
python app.py

# または Gunicorn を使用（本番環境推奨）
gunicorn --bind 0.0.0.0:8000 --timeout 600 app:app
```

#### 利用可能なエンドポイント

```bash
# ヘルスチェック
curl http://localhost:8000/health

# スクレイピング実行（単一日付）
curl -X POST 'http://localhost:8000/scrape?date=2025-11-15'

# スクレイピング実行（複数日付、JSONペイロード）
curl -X POST http://localhost:8000/scrape \
  -H "Content-Type: application/json" \
  -d '{"dates": ["2025-11-15", "2025-11-16"]}'

# Logic Apps や Azure Scheduler からの実行例
curl -X POST https://aki-sta-scraper-cygfc8fvc2f5ebfq.eastasia-01.azurewebsites.net/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "triggeredBy": "scheduler",
    "dates": ["2025-11-15", "2025-11-16"]
  }'
```

詳細なAPI仕様は [API_SPEC.md](API_SPEC.md) を参照してください。

## 🐳 Docker環境での実行（推奨）

Dockerコンテナを使用することで、環境依存を排除し、本番環境と同じ環境でローカル開発・テストが可能です。

### クイックスタート

```bash
# 1. 環境変数設定（初回のみ）
cp .env.docker.example .env.docker
# .env.dockerを編集してCosmos DB接続情報を設定

# 2. 起動
./docker-run.sh start

# 3. APIテスト
curl -X POST 'http://localhost:8000/scrape?date=2025-01-30'

# 4. 停止
./docker-run.sh stop
```

### Makefileを使用した操作

```bash
# ビルド＆起動
make build
make up

# ログ確認
make logs

# スクレイピング実行（CLIモード）
make scrape DATE=2025-01-30

# テスト実行
make test

# ヘルスチェック
make health

# 停止
make down
```

### docker-run.shコマンド一覧

```bash
# サービス起動（ビルド含む）
./docker-run.sh start

# サービス停止
./docker-run.sh stop

# サービス再起動
./docker-run.sh restart

# ステータス確認
./docker-run.sh status

# ログ表示（フォロー）
./docker-run.sh logs

# テスト実行
./docker-run.sh test

# CLIモードでスクレイピング
./docker-run.sh scrape 2025-01-30

# コンテナ内でシェル起動
./docker-run.sh shell

# クリーンアップ
./docker-run.sh clean
```

### API呼び出し例

```bash
# ヘルスチェック
curl http://localhost:8000/health

# 単一日付のスクレイピング
curl -X POST 'http://localhost:8000/scrape?date=2025-01-30'

# 複数日付のスクレイピング
curl -X POST http://localhost:8000/scrape \
  -H "Content-Type: application/json" \
  -d '{"dates": ["2025-01-30", "2025-01-31"]}'

# HTTPieを使用
http POST localhost:8000/scrape date==2025-01-30
```

### Docker環境の詳細

- **ベースイメージ**: Python 3.11-slim
- **Webサーバー**: Gunicorn（ワーカー1、タイムアウト600秒）
- **ブラウザ**: Playwright Chromium
- **ポート**: 8000
- **ヘルスチェック**: 30秒間隔で`/health`エンドポイントを確認

### トラブルシューティング

#### 環境変数エラー
```bash
# エラー: COSMOS_ENDPOINT is not configured
# 解決: .env.dockerを正しく設定
cp .env.docker.example .env.docker
nano .env.docker  # Cosmos DB接続情報を入力
```

#### ポート競合
```bash
# エラー: bind: address already in use
# 解決: 別のポートを使用
docker-compose -p scraper-dev up -d  # 別のプロジェクト名で起動
```

#### コンテナ内デバッグ
```bash
# コンテナ内でシェル起動
make shell

# コンテナ内でPythonコンソール
docker-compose exec scraper python

# コンテナ内でスクレイピング実行
docker-compose exec scraper python src/main.py --date 2025-01-30
```

### run-playwright.sh スクリプトを使用（推奨）

`run-playwright.sh`は、Playwright環境を適切に設定してPythonスクリプトを実行するラッパースクリプトです。

#### 特徴
- **環境分離**: Python用とNode.js用のPlaywrightが競合しないよう環境を分離
- **自動設定**: `.env.playwright`から環境変数を自動読み込み
- **ブラウザ管理**: 必要に応じてブラウザを自動インストール
- **仮想環境サポート**: venv環境を自動検出・アクティベート

#### 基本的な使い方

```bash
# デフォルト実行（今日の日付でスクレイピング）
./run-playwright.sh src/main.py

# 特定日付のスクレイピング（YYYY-MM-DD形式）
./run-playwright.sh src/main.py --date 2025-11-15

# YYYY/MM/DD形式でも指定可能
./run-playwright.sh src/main.py --date 2025/11/15

# ブラウザをインストールしてから実行
./run-playwright.sh --install-browsers src/main.py

# 別のブラウザを使用（デフォルトはwebkit）
./run-playwright.sh --browser chromium src/main.py

# ヘルプを表示
./run-playwright.sh --help
```

#### 環境設定（.env.playwright）
```bash
# Playwright環境分離設定
PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/playwright-python
PLAYWRIGHT_BROWSER=webkit
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0
```

### 直接Pythonで実行

```bash
# 仮想環境をアクティベート
source venv/bin/activate

# 特定日付のスクレイピング（YYYY-MM-DD形式）
python src/main.py --date 2025-11-15

# YYYY/MM/DD形式でも指定可能
python src/main.py --date 2025/09/01

# 今日の日付でスクレイピング
python src/main.py
```

### Pythonスクリプトとして

```python
from src.scraper import EnsembleStudioScraper

scraper = EnsembleStudioScraper()

# 特定日付の予約状況を取得
date = "2025-11-15"
results = scraper.scrape_availability(date)

# JSONファイルに保存
scraper.scrape_and_save(date, "availability.json")
```

## テスト実行

```bash
# 基本的なテスト実行
./test.sh

# または直接pytestを使用
pytest tests/ -v

# npmコマンドから実行（プロジェクトルートから）
npm run test:scraper
```

### テストの種類

- **単体テスト** (`test_scraper.py`): 個別関数のテスト
- **動的日付テスト** (`test_dynamic_date.py`): 現在日時+7日での型検証テスト
- **日付形式テスト** (`test_date_format.py`): YYYY-MM-DDとYYYY/MM/DD形式のサポート確認
- **ファイル更新テスト** (`test_file_update.py`): ファイルの作成・更新・タイムスタンプ確認
- **統合テスト**: 実際のサイトへのアクセステスト

## 開発環境

```bash
# 開発用依存関係のインストール
pip install -r requirements-dev.txt

# コードフォーマット
black src/ tests/

# インポート整理
isort src/ tests/

# 型チェック
mypy src/

# Linting
flake8 src/ tests/
```

## 出力

スクレイピング結果は `../../shared-data/availability.json`（プロジェクトルートの`shared-data`ディレクトリ）に保存されます。

## データストレージ

### 🌟 現在の動作（JSON + Cosmos DB 統合）

**JSONファイル保存が主要機能**として動作し、Cosmos DBは追加機能として利用できます：

1. **主要保存先：JSONファイル**
   - `shared-data/availability.json`に常に保存
   - 従来の形式を維持（下位互換性）
   - ローカル開発やファイルベースの処理に対応

2. **追加保存先：Cosmos DB**（オプション）
   - 環境変数設定時のみ有効
   - Azure Cosmos DBにリアルタイムで保存
   - upsert機能で既存データを更新
   - 本番環境での高可用性・検索機能を提供

3. **並行保存方式**
   - 環境変数設定時は**両方**に保存
   - Cosmos DB失敗時もJSONファイルへの保存は継続
   - データ損失を防ぐ安全な設計

### 📁 ファイル保存とDB保存の使い分け

#### 🔹 デフォルト動作（推奨）

```bash
# JSONファイル + Cosmos DB 並行保存
./run-playwright.sh src/main.py --date 2025-11-15
```

**動作:**
1. JSONファイルに保存 ✅（常に実行）
2. 環境変数があればCosmos DBにも保存 ✅
3. Cosmos DB失敗時もJSONファイル保存は成功 ✅

#### 🔹 JSONファイルのみ保存

```bash
# 環境変数を無効化してJSONファイルのみに保存
unset COSMOS_ENDPOINT COSMOS_KEY COSMOS_DATABASE
./run-playwright.sh src/main.py --date 2025-11-15
```

**動作:**
1. JSONファイルに保存 ✅
2. Cosmos DB接続情報なし → スキップ
3. **従来通りの単一ファイル保存動作**

#### 🔹 プログラムから制御

```python
from src.scraper import EnsembleStudioScraper

scraper = EnsembleStudioScraper()
date = "2025-11-15"

# デフォルト：Cosmos DB + JSONファイル並行保存
results = scraper.scrape_and_save(date)

# 特定パスのJSONファイルに強制保存
results = scraper.scrape_and_save(date, "custom_output.json")
```

### 🔧 環境変数設定

`.env`ファイルで接続先を制御：

```bash
# Cosmos DB接続設定
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-primary-key
COSMOS_DATABASE=your-database-name
```

### 📊 保存先判定ロジック

```
スクレイピング実行
    ↓
JSONファイルに保存（常に実行）
    ↓ 成功
Cosmos DB環境変数あり？
    ↓ Yes              ↓ No
Cosmos DBに保存      完了
    ↓ 成功  ↓ 失敗      
   完了    完了（JSON保存済みなので安全）
```

### 🗂️ データ形式

#### Cosmos DBデータ構造
```json
{
  "id": "2025-11-15_ensemble-hongo",
  "partitionKey": "2025-11-15", 
  "date": "2025-11-15",
  "facility": "ensemble-hongo",
  "facilityName": "あんさんぶるStudio和(本郷)",
  "timeSlots": {
    "9-12": "available",
    "13-17": "booked", 
    "18-21": "available"
  },
  "updatedAt": "2025-08-25T14:31:13Z",
  "dataSource": "scraping"
}
```

#### JSONファイル構造（従来形式維持）

```json
{
  "lastScraped": "2025-08-24T14:31:13Z",
  "data": {
    "2025-11-15": [
      {
        "facilityName": "あんさんぶるStudio和(本郷)",
        "timeSlots": {
          "9-12": "available",
          "13-17": "booked",
          "18-21": "available"
        },
        "lastUpdated": "2025-08-24T14:18:03Z"
      }
    ]
  }
}
```

### 🚀 新機能の使い方

#### 1. 初回セットアップ
```bash
# .env.exampleから.envを作成
cp .env.example .env

# .envファイルを編集して実際のCosmos DB接続情報を設定
nano .env
```

#### 2. データ保存の確認
```bash
# スクレイピング実行後、以下で確認
echo "Cosmos DBに保存されました"
echo "JSONファイルにも保存されました: shared-data/availability.json"
```

#### 3. トラブルシューティング

**Cosmos DB接続エラーの場合:**
```bash
# エラーログを確認
./run-playwright.sh src/main.py --date 2025-11-15

# 出力例:
# Cosmos DB not available: Cosmos DB connection settings are missing
# Also saved to JSON file: ../../shared-data/availability.json
```

**JSONファイルのみ使用する場合:**
```bash
# 一時的に環境変数を無効化
mv .env .env.backup
./run-playwright.sh src/main.py --date 2025-11-15
```

## CI/CD

GitHub Actionsで以下が自動実行されます：

- **テスト**: Python 3.9, 3.10, 3.11でのテスト実行
- **カバレッジ**: テストカバレッジの測定とレポート
- **Linting**: flake8, black, isort, mypyでのコード品質チェック
- **セキュリティ**: safetyによる依存関係の脆弱性チェック

詳細: `.github/workflows/python-scraper.yml`

## データ形式

### ステータス値

- `available`: 予約可能（○）
- `booked`: 予約済み（×）
- `unknown`: 状態不明（－、△、または取得失敗）

## トラブルシューティング

### Playwrightのブラウザがクラッシュする場合

```bash
# Playwrightを最新版にアップグレード
pip install --upgrade playwright
playwright install chromium
```

### Playwright環境の競合問題

Node.js（E2Eテスト）とPython（スクレイパー）でPlaywrightのバージョンが異なる場合、環境が競合することがあります。

**解決方法:**
```bash
# 環境分離システムを使用
./run-playwright.sh src/main.py

# または包括的セットアップスクリプトを実行（プロジェクトルートから）
../setup-playwright-environments.sh
```

### 実サイトへの接続がタイムアウトする場合

- ネットワーク接続を確認
- サイトが稼働しているか確認（https://ensemble-studio.com/schedule/）
- `src/scraper.py`の`timeout`設定を調整（デフォルト: 30秒）

### run-playwright.shが実行できない場合

```bash
# 実行権限を付与
chmod +x run-playwright.sh

# 仮想環境がない場合は作成
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 注意事項

- スクレイピングは対象サイトの利用規約を遵守して実行してください
- 過度なアクセスは避け、適切な間隔を空けて実行してください
- venv/フォルダはgitで追跡されません（.gitignoreに記載済み）