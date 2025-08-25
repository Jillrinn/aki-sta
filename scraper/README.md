# あんさんぶるスタジオ スクレイパー

Playwright + BeautifulSoup4を使用してあんさんぶるスタジオ（本郷・初台）の予約状況をスクレイピングするPythonアプリケーション。

## 機能

- 本郷・初台の2施設の予約状況を同時取得
- 3つの時間帯（9-12, 13-17, 18-21）の空き状況を確認
- リトライ機能付きの安定したスクレイピング
- 動的な日付ナビゲーション（カレンダー月移動対応）
- JSON形式でのデータ保存と既存データの更新

## セットアップ

```bash
# Python仮想環境の作成
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存関係のインストール
pip install -r requirements.txt

# Playwrightブラウザのインストール
playwright install chromium
```

## 使用方法

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

## CI/CD

GitHub Actionsで以下が自動実行されます：

- **テスト**: Python 3.9, 3.10, 3.11でのテスト実行
- **カバレッジ**: テストカバレッジの測定とレポート
- **Linting**: flake8, black, isort, mypyでのコード品質チェック
- **セキュリティ**: safetyによる依存関係の脆弱性チェック

詳細: `.github/workflows/python-scraper.yml`

## データ形式

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
      },
      {
        "facilityName": "あんさんぶるStudio音(初台)",
        "timeSlots": {
          "9-12": "booked",
          "13-17": "available",
          "18-21": "unknown"
        },
        "lastUpdated": "2025-08-24T14:18:03Z"
      }
    ]
  }
}
```

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