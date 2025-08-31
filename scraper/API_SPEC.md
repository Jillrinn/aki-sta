# Scraper API 仕様書

## 概要
Azure Web Apps でホスティングされるスクレイピングサービスの API 仕様。

## エンドポイント

### POST /scrape
施設の予約状況をスクレイピングする統一エンドポイント。

#### リクエスト

**日付指定方法（優先順位）:**
1. クエリパラメータ（最優先）
2. JSON ボディ

**クエリパラメータ:**
```
POST /scrape?date=2025-11-15
POST /scrape?date=2025-11-15&date=2025-11-16
POST /scrape?triggeredBy=manual&date=2025-11-15
```

**JSON ボディ:**
```json
{
  "triggeredBy": "scheduler",
  "dates": ["2025-11-15", "2025-11-16", "2025-11-22"]
}
```

**パラメータ:**
- `date` / `dates`: **必須** - YYYY-MM-DD 形式の日付（単一または複数）
- `triggeredBy`: 任意 - トリガー元（"scheduler", "manual" など）デフォルト: "manual"

#### レスポンス

**成功時 (200):**
```json
{
  "status": "success",
  "timestamp": "2025-08-26T10:00:00.000Z",
  "triggeredBy": "scheduler",
  "total_dates": 3,
  "success_count": 3,
  "error_count": 0,
  "results": [
    {
      "date": "2025-11-15",
      "status": "success",
      "facilities": 10
    }
  ]
}
```

**エラー時 (400):**
```json
{
  "status": "error",
  "message": "At least one date is required. Use query parameter ?date=YYYY-MM-DD or JSON body {\"dates\": [\"YYYY-MM-DD\"]}",
  "timestamp": "2025-08-26T10:00:00.000Z"
}
```

### GET /health
ヘルスチェックエンドポイント。

#### レスポンス (200)
```json
{
  "status": "healthy",
  "timestamp": "2025-08-26T10:00:00.000Z"
}
```

### GET /
サービス情報エンドポイント。

#### レスポンス (200)
```json
{
  "service": "Scraper Web App",
  "status": "running",
  "timestamp": "2025-08-26T10:00:00.000Z"
}
```

## エラーコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 400 | 不正なリクエスト（日付未指定、フォーマットエラー） |
| 500 | サーバーエラー |

## 使用例

### cURL

```bash
# クエリパラメータで単一日付
curl -X POST "https://aki-sta-scraper-cygfc8fvc2f5ebfq.eastasia-01.azurewebsites.net/scrape?date=2025-11-15"

# クエリパラメータで複数日付
curl -X POST "https://aki-sta-scraper-cygfc8fvc2f5ebfq.eastasia-01.azurewebsites.net/scrape?date=2025-11-15&date=2025-11-16"

# JSON ボディで複数日付
curl -X POST "https://aki-sta-scraper-cygfc8fvc2f5ebfq.eastasia-01.azurewebsites.net/scrape" \
  -H "Content-Type: application/json" \
  -d '{"dates": ["2025-11-15", "2025-11-16"], "triggeredBy": "manual"}'
```

### Logic Apps 設定

```json
{
  "method": "POST",
  "uri": "https://aki-sta-scraper-cygfc8fvc2f5ebfq.eastasia-01.azurewebsites.net/scrape",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "triggeredBy": "scheduler",
    "dates": ["2025-11-15", "2025-11-16", "2025-11-22", "2025-11-23"]
  }
}
```

## 注意事項

1. **日付は必須**: 少なくとも1つの日付を指定する必要があります
2. **日付フォーマット**: YYYY-MM-DD 形式のみ対応
3. **優先順位**: クエリパラメータが JSON ボディより優先されます
4. **レート制限**: Azure Free Tier の制限内での利用を推奨