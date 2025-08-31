# Scraper API v2 Documentation

## 概要
Pythonベストプラクティスに基づいてリファクタリングされたScraperのAPI実装です。
レイヤードアーキテクチャとファクトリーパターンを採用し、施設の拡張性と保守性を向上させました。

## アーキテクチャ

### ディレクトリ構造
```
scraper/src/
├── config/           # 設定管理
├── domain/           # ドメインモデル（エンティティ、例外）
├── services/         # ビジネスロジック層
├── scrapers/         # スクレイパー実装
│   ├── base.py      # 基底クラス
│   ├── factory.py   # ファクトリーパターン
│   └── ensemble_studio_v2.py  # あんさんぶるスタジオ実装
├── repositories/     # データアクセス層
├── api/             # Flask API層
│   ├── app.py       # Flaskアプリファクトリー
│   ├── routes/      # APIルート（Blueprint）
│   ├── middleware.py # ミドルウェア
│   └── error_handlers.py # エラーハンドリング
└── entrypoints/     # エントリーポイント
    └── flask_api_v2.py  # 新しいFlaskエントリーポイント
```

## API仕様

### エンドポイント一覧

#### 1. あんさんぶるスタジオスクレイピング（特定日付）
```http
POST /api/scrape/ensemble?date=YYYY-MM-DD
```

**例:**
```bash
curl -X POST "http://localhost:8000/api/scrape/ensemble?date=2025-08-31"
```

**レスポンス:**
```json
{
  "status": "success",
  "timestamp": "2025-08-31T12:00:00Z",
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
        "facilities": [...]
      }
    }
  ]
}
```

#### 2. あんさんぶるスタジオスクレイピング（target-dates使用）
```http
POST /api/scrape/ensemble
```

Cosmos DBのtargetDatesコンテナから日付を自動取得してスクレイピングします。

**例:**
```bash
curl -X POST "http://localhost:8000/api/scrape/ensemble"
```

#### 3. 全施設スクレイピング（特定日付）
```http
POST /api/scrape?date=YYYY-MM-DD
```

**例:**
```bash
curl -X POST "http://localhost:8000/api/scrape?date=2025-08-31"
```

**レスポンス:**
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

#### 4. 全施設スクレイピング（target-dates使用）
```http
POST /api/scrape
```

#### 5. スクレイパーステータス
```http
GET /api/scrape/status
```

**レスポンス:**
```json
{
  "status": "ready",
  "supportedFacilities": ["ensemble_studio"],
  "timestamp": "2025-08-31T12:00:00Z"
}
```

#### 6. ヘルスチェック
```http
GET /api/health
```

## 主な改善点

### 1. **レイヤードアーキテクチャ**
- 関心の分離により各層の責任が明確
- ビジネスロジックがサービス層に集約
- テストが容易

### 2. **ファクトリーパターン**
- 新施設の追加が簡単（ScraperFactoryに登録するだけ）
- 施設タイプの動的選択が可能

### 3. **設定管理**
- 環境変数を一元管理（Settings クラス）
- シングルトンパターンで効率的

### 4. **エラーハンドリング**
- カスタム例外クラスで詳細なエラー情報
- 一貫したエラーレスポンス形式
- 適切なHTTPステータスコード

### 5. **テスタビリティ**
- 依存性注入によりモックテストが容易
- 単体テストと統合テストを分離

## 開発・テスト

### ローカル実行
```bash
cd scraper
python src/entrypoints/flask_api_v2.py
```

### テスト実行
```bash
# 単体テスト
pytest tests/unit/

# 統合テスト
pytest tests/integration/

# 全テスト
pytest tests/
```

### 環境変数設定
`.env`ファイルに以下を設定:
```env
COSMOS_ENDPOINT=your-cosmos-endpoint
COSMOS_KEY=your-cosmos-key
COSMOS_DATABASE=studio-reservations
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=INFO
```

## 新施設の追加方法

1. **スクレイパークラスの作成**
```python
# src/scrapers/new_facility.py
from .base import BaseScraper

class NewFacilityScraper(BaseScraper):
    @property
    def facility_type(self):
        return FacilityType.NEW_FACILITY
    
    def scrape_date(self, date):
        # 実装
        pass
```

2. **FacilityTypeに追加**
```python
# src/domain/entities.py
class FacilityType(Enum):
    ENSEMBLE_STUDIO = "ensemble_studio"
    NEW_FACILITY = "new_facility"  # 追加
```

3. **ファクトリーに登録**
```python
# src/scrapers/factory.py
_scrapers = {
    FacilityType.ENSEMBLE_STUDIO: EnsembleStudioScraperV2,
    FacilityType.NEW_FACILITY: NewFacilityScraper,  # 追加
}
```

以上で新施設が自動的にAPIで利用可能になります。

## 移行ガイド

既存のAPIから移行する場合:

1. エンドポイントURLを更新
   - `/scrape` → `/api/scrape/ensemble` または `/api/scrape`
   
2. レスポンス形式の変更に対応
   - より構造化されたレスポンス形式
   - エラー情報が詳細化

3. 新機能の活用
   - target-dates連携
   - 複数施設の同時スクレイピング