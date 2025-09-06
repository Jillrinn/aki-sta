# Azure Web App Configuration for Scraper

## 環境変数設定

Azure PortalまたはAzure CLIで以下の環境変数を設定してください。

### 必須設定

```bash
# Cosmos DB接続情報
COSMOS_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key-here
COSMOS_DATABASE=studio-reservations

# Python設定
PYTHONUNBUFFERED=1
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
```

### Warmup Scheduler設定

```bash
# 自動warmupの有効/無効（デフォルト: true）
WARMUP_ENABLED=true

# Warmup実行間隔（分）
# Azure Web App無料プラン推奨: 10分
# Azure Web App有料プラン推奨: 15-20分
WARMUP_INTERVAL_MINUTES=10
```

### Azure Portal での設定方法

1. Azure Portalにログイン
2. Web App（aki-sta-scraper）を選択
3. 左メニューから「構成」→「アプリケーション設定」を選択
4. 「新しいアプリケーション設定」をクリック
5. 各環境変数を追加
6. 「保存」をクリック
7. Web Appを再起動

### Azure CLI での設定方法

```bash
# 環境変数を設定
az webapp config appsettings set \
  --name aki-sta-scraper \
  --resource-group your-resource-group \
  --settings \
    COSMOS_ENDPOINT="https://your-cosmos-account.documents.azure.com:443/" \
    COSMOS_KEY="your-cosmos-key-here" \
    COSMOS_DATABASE="studio-reservations" \
    WARMUP_ENABLED="true" \
    WARMUP_INTERVAL_MINUTES="10" \
    PYTHONUNBUFFERED="1" \
    PLAYWRIGHT_BROWSERS_PATH="/ms-playwright"

# Web Appを再起動
az webapp restart --name aki-sta-scraper --resource-group your-resource-group
```

## Warmup機能の動作確認

### 1. ステータス確認

```bash
# Warmupスケジューラーのステータス確認
curl https://aki-sta-scraper.azurewebsites.net/warm-up/status
```

期待される応答：
```json
{
  "status": "success",
  "scheduler_enabled": true,
  "scheduler_running": true,
  "interval_minutes": 10,
  "timestamp": "2025-09-06T12:00:00.000000"
}
```

### 2. 手動Warmup実行

```bash
# 手動でwarmupを実行
curl https://aki-sta-scraper.azurewebsites.net/warm-up
```

### 3. ログ確認

Azure Portalのログストリームで以下のようなログが表示されることを確認：

```
WarmupScheduler initialized - Enabled: True, Interval: 10 minutes
WarmupScheduler started - will run every 10 minutes
Executing scheduled warmup at 2025-09-06 12:00:00
Scheduled warmup successful - Execution time: 0.85s, Items found: 1
```

## トラブルシューティング

### Warmupが動作しない場合

1. **環境変数の確認**
   - `WARMUP_ENABLED`が`true`になっているか確認
   - Azure Portalの「構成」→「アプリケーション設定」で確認

2. **ログの確認**
   - Azure Portalの「ログストリーム」でエラーを確認
   - Cosmos DB接続エラーがないか確認

3. **Always On設定（有料プランのみ）**
   - 有料プランの場合、「構成」→「全般設定」で「Always On」を有効化
   - 無料プランではwarmup機能で代替

### パフォーマンスの最適化

- **無料プラン**: `WARMUP_INTERVAL_MINUTES=10`推奨（20分でタイムアウトのため）
- **Basic以上**: `WARMUP_INTERVAL_MINUTES=15-20`推奨
- **Premium**: Always On機能と併用、`WARMUP_INTERVAL_MINUTES=30`でも可

## 注意事項

- Dockerfileにデフォルト値が設定されているため、環境変数を設定しない場合は自動的に有効になります
- デフォルト値: `WARMUP_ENABLED=true`, `WARMUP_INTERVAL_MINUTES=15`
- 本番環境では必ずCosmos DB接続情報を設定してください