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
pytest tests/
```

## 出力

スクレイピング結果は `../shared-data/availability.json` に保存されます。

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