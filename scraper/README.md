# あんさんぶるスタジオ スクレイパー

Playwrightを使用してあんさんぶるスタジオの予約状況をスクレイピングするPythonアプリケーション。

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

```bash
# 特定日付のスクレイピング
python src/main.py --date 2025-11-15

# 今日の日付でスクレイピング
python src/main.py
```

## テスト実行

```bash
# 基本的なテスト実行
pytest tests/

# カバレッジ付きテスト
pytest tests/ --cov=src --cov-report=term

# 詳細な出力
pytest tests/ -v

# 特定のテストのみ実行
pytest tests/test_scraper.py::TestTimeSlotConversion
```

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

スクレイピング結果は `../shared-data/availability.json` に保存されます。

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
  "lastScraped": "2025-08-21T12:00:00Z",
  "data": {
    "2025-11-15": [
      {
        "facilityName": "あんさんぶるStudio和(本郷)",
        "timeSlots": {
          "9-12": "available",
          "13-17": "booked",
          "18-21": "available"
        },
        "lastUpdated": "2025-08-21T12:00:00Z"
      }
    ]
  }
}
```