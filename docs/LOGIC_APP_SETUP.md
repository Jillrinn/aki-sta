# Logic App設定ガイド

## 概要
Azure Logic Appを使用して、空きスタサーチくんのスクレイピング処理を定期的に自動実行する設定手順です。

## アーキテクチャ

```
[Logic App (Timer Trigger)]
    ↓ 毎日定時実行
[Azure Functions - POST /api/scrape/batch]
    ↓ target_dates取得
    ↓ スクレイパー呼び出し
[処理完了]
```

## 前提条件

- Azure Functions が既にデプロイ済み
- Logic App リソースが作成済み
- 以下の環境変数が設定済み:
  - `SCRAPER_API_URL`: スクレイパーAPIのエンドポイント
  - Cosmos DB接続設定

## Logic App設定手順

### 1. 基本設定

1. Azure PortalでLogic Appリソースを開く
2. 「Logic app designer」を選択
3. 「Blank Logic App」から新規作成

### 2. トリガーの設定

```json
{
  "type": "Recurrence",
  "recurrence": {
    "frequency": "Day",
    "interval": 1,
    "schedule": {
      "hours": ["9"],
      "minutes": [0]
    },
    "timeZone": "Tokyo Standard Time"
  }
}
```

**設定項目:**
- **Frequency**: Day（毎日）
- **Interval**: 1
- **Time zone**: Tokyo Standard Time
- **At these hours**: 9（午前9時）
- **At these minutes**: 0

### 3. HTTPアクションの追加

1. 「New step」をクリック
2. 「HTTP」アクションを選択
3. 以下の設定を入力:

```json
{
  "method": "POST",
  "uri": "https://your-function-app.azurewebsites.net/api/scrape/batch",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "source": "logic-app",
    "includeAllTargetDates": true
  }
}
```

**重要な設定:**
- **Method**: POST
- **URI**: デプロイした Azure Functions の URL + `/api/scrape/batch`
- **Headers**: Content-Type を application/json に設定
- **Body**: 上記のJSONを設定

### 4. エラーハンドリング（オプション）

HTTPアクションの設定で「Settings」を開き:
- **Retry Policy**: Fixed interval
- **Count**: 3
- **Interval**: PT1M（1分間隔）

### 5. 通知設定（オプション）

失敗時の通知を設定する場合:

1. HTTPアクションの後に「New step」追加
2. 「Condition」を選択
3. 条件設定:
   - **Value**: `@outputs('HTTP')['statusCode']`
   - **is not equal to**: 202

4. 「If true」ブランチに通知アクション追加:
   - メール送信（Office 365 Outlook等）
   - Teams通知
   - など

## APIレスポンス

### 成功時（202 Accepted）

```json
{
  "success": true,
  "message": "スクレイピングを開始しました",
  "targetDates": ["2025-09-15", "2025-09-20"]
}
```

### エラーレスポンス

#### 404 Not Found（対象日付なし）
```json
{
  "success": false,
  "message": "対象日付が設定されていません"
}
```

## 監視とログ

### Logic App実行履歴
1. Logic Appリソースの「Overview」
2. 「Runs history」で実行履歴確認
3. 各実行をクリックして詳細確認

### Azure Functions ログ
1. Function Appの「Monitor」
2. 「Logs」でリアルタイムログ確認
3. Application Insightsで詳細分析

## トラブルシューティング

### よくある問題

1. **認証エラー（401/403）**
   - Function AppのAuthenticationレベルを確認
   - 必要に応じてAPIキーを設定

2. **タイムアウト**
   - Logic AppのHTTPアクションタイムアウトを延長（最大120秒）
   - Function Appのタイムアウト設定を確認

3. **重複実行**
   - Logic Appのconcurrency controlを設定
   - 最大並列実行数を1に制限

### ログの確認ポイント

```kusto
// Application Insights クエリ例
traces
| where message contains "batch"
| where timestamp > ago(1d)
| order by timestamp desc
| take 100
```

## ベストプラクティス

1. **実行時間の選択**
   - 施設の予約システムが更新される時間帯を避ける
   - システム負荷の低い時間帯を選択

2. **リトライ戦略**
   - 一時的なエラーに対してリトライを設定
   - exponential backoffの使用を検討

3. **監視アラート**
   - 連続失敗時のアラート設定
   - 実行時間の異常検知

## 関連ドキュメント

- [Azure Logic Apps ドキュメント](https://docs.microsoft.com/azure/logic-apps/)
- [Azure Functions スクレイピングAPI仕様](./API_SPECIFICATION.md)
- [システムアーキテクチャ](./ARCHITECTURE.md)