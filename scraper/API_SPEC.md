# Scraper API 仕様書 v2

## 概要
Azure Web Apps でホスティングされるスクレイピングサービスの API 仕様。
Python/Flaskベストプラクティスに基づいた新しいアーキテクチャで実装。

## エンドポイント

### POST /api/scrape/ensemble
あんさんぶるスタジオの予約状況をスクレイピングする専用エンドポイント。

#### リクエスト

**日付指定方法:**
- クエリパラメータで特定日付を指定
- パラメータなしの場合はCosmos DBのtarget-datesを使用

**クエリパラメータ:**
```
POST /api/scrape/ensemble?date=2025-11-15
POST /api/scrape/ensemble?triggeredBy=manual&date=2025-11-15
POST /api/scrape/ensemble  # target-dates使用
```

**パラメータ:**
- `date`: 任意 - YYYY-MM-DD 形式の日付（未指定時はtarget-dates使用）
- `triggeredBy`: 任意 - トリガー元（"scheduler", "manual" など）デフォルト: "manual"

#### レスポンス

**成功時 (200):**
```json
{
  "status": "success",
  "timestamp": "2025-08-31T12:00:00Z",
  "triggeredBy": "manual",
  "facilityType": "ensemble_studio",
  "totalDates": 1,
  "successCount": 1,
  "errorCount": 0,
  "results": [
    {
      "status": "success",
      "date": "2025-08-31",
      "facilityType": "ensemble_studio",
      "facilitiesCount": 2,
      "data": {
        "date": "2025-08-31",
        "facilities": [
          {
            "facilityId": "ensemble-hongo",
            "facilityName": "あんさんぶるStudio和(本郷)",
            "facilityType": "ensemble_studio",
            "timeSlots": [
              {"slot": "9-12", "available": true},
              {"slot": "13-17", "available": false},
              {"slot": "18-21", "available": true}
            ]
          }
        ]
      }
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

### POST /api/scrape
全ての対応施設の予約状況をスクレイピングする統一エンドポイント。

#### リクエスト

**クエリパラメータ:**
```
POST /api/scrape?date=2025-11-15
POST /api/scrape  # target-dates使用
```

#### レスポンス

**成功時 (200):**
```json
{
  "status": "success",
  "timestamp": "2025-08-31T12:00:00Z",
  "totalSuccess": 1,
  "totalError": 0,
  "facilities": [
    {
      "facilityType": "ensemble_studio",
      "successCount": 1,
      "errorCount": 0,
      "results": [...]
    }
  ]
}
```

### GET /api/health
ヘルスチェックエンドポイント。

#### レスポンス (200)
```json
{
  "status": "healthy",
  "service": "Scraper API",
  "timestamp": "2025-08-31T12:00:00Z"
}
```

### GET /api/
サービス情報エンドポイント。

#### レスポンス (200)
```json
{
  "service": "Scraper Web App",
  "status": "running",
  "version": "2.0.0",
  "timestamp": "2025-08-31T12:00:00Z"
}
```

### GET /api/scrape/status
スクレイパーステータスエンドポイント。

#### レスポンス (200)
```json
{
  "status": "ready",
  "supportedFacilities": ["ensemble_studio"],
  "timestamp": "2025-08-31T12:00:00Z"
}
```

## エラーコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 400 | 不正なリクエスト（日付フォーマットエラー、過去日付） |
| 404 | データまたはエンドポイントが見つからない |
| 503 | サービス一時利用不可（ネットワーク、ブラウザエラー） |
| 500 | サーバーエラー |

## 使用例

### cURL

```bash
# あんさんぶるスタジオ - 特定日付
curl -X POST "https://aki-sta-scraper.azurewebsites.net/api/scrape/ensemble?date=2025-11-15"

# あんさんぶるスタジオ - target-dates使用
curl -X POST "https://aki-sta-scraper.azurewebsites.net/api/scrape/ensemble"

# 全施設 - 特定日付
curl -X POST "https://aki-sta-scraper.azurewebsites.net/api/scrape?date=2025-11-15"

# ヘルスチェック
curl "https://aki-sta-scraper.azurewebsites.net/api/health"

# ステータス確認
curl "https://aki-sta-scraper.azurewebsites.net/api/scrape/status"
```

### Logic Apps 設定

```json
{
  "method": "POST",
  "uri": "https://aki-sta-scraper.azurewebsites.net/api/scrape/ensemble",
  "headers": {
    "Content-Type": "application/json"
  },
  "queries": {
    "triggeredBy": "scheduler"
  }
}
```
注: target-datesを使用するため、日付指定は不要

## 注意事項

1. **target-dates連携**: 日付未指定時は Cosmos DB の targetDates コンテナから自動取得
2. **日付フォーマット**: YYYY-MM-DD 形式のみ対応
3. **過去日付の拒否**: 過去の日付は指定できません
4. **レート制限**: Azure Free Tier の制限内での利用を推奨
5. **拡張性**: 新施設追加時は ScraperFactory に登録するだけで自動的に API で利用可能

## 移行ガイド（v1からv2へ）

### 主な変更点
1. **エンドポイント変更**: `/scrape` → `/api/scrape/ensemble` または `/api/scrape`
2. **target-dates対応**: 日付指定が任意に（未指定時は自動取得）
3. **レスポンス形式**: より構造化された詳細なレスポンス
4. **エラーハンドリング**: カスタム例外による詳細なエラー情報

### 互換性
- 旧API（`/scrape`）も引き続き利用可能
- 段階的な移行が可能