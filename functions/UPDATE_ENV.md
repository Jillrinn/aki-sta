# 🔐 .envファイル更新手順

## 1. Azure Portalから接続情報を取得

### Azure Portalでの手順：
1. [Azure Portal](https://portal.azure.com) にログイン
2. 作成したCosmos DBアカウント（例: `aki-sta-cosmos-dev-202508`）を開く
3. 左メニューから「**キー**」（Keys）をクリック
4. 以下の情報をコピー：

```
URI: https://aki-sta-cosmos-xxxxx.documents.azure.com:443/
プライマリキー: [88文字のBase64文字列]
```

## 2. .envファイルの更新

### 現在の.envファイル（サンプル値）:
```env
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-primary-key
COSMOS_DATABASE=studio-reservations
```

### 更新後の.envファイル（実際の値）:
```env
COSMOS_ENDPOINT=https://aki-sta-cosmos-xxxxx.documents.azure.com:443/
COSMOS_KEY=実際のプライマリキー（Azure Portalからコピー）
COSMOS_DATABASE=studio-reservations
```

### コマンドラインでの更新方法：

```bash
# バックアップを作成
cp .env .env.backup

# エディタで編集
nano .env
# または
vi .env
# または
code .env  # VS Codeの場合
```

## 3. local.settings.jsonの更新

同じ値をlocal.settings.jsonにも設定：

```bash
# local.settings.jsonも更新
nano local.settings.json
```

更新内容：
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_ENDPOINT": "https://aki-sta-cosmos-xxxxx.documents.azure.com:443/",
    "COSMOS_KEY": "実際のプライマリキー",
    "COSMOS_DATABASE": "studio-reservations"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

## 4. 設定の確認

```bash
# .envファイルの確認（キーの一部だけ表示）
cat .env | grep COSMOS_ENDPOINT
cat .env | grep COSMOS_KEY | head -c 50

# 環境変数が正しく読み込まれるか確認
node -e "require('dotenv').config(); console.log('Endpoint:', process.env.COSMOS_ENDPOINT)"
```

## 5. 接続テストの再実行

```bash
# 接続テスト
node test-cosmos-connection.js
```

成功時の出力例：
```
🔍 Cosmos DB接続テスト開始...

📋 環境変数チェック:
  COSMOS_ENDPOINT: ✅ 設定済み
  COSMOS_KEY: ✅ 設定済み
  COSMOS_DATABASE: studio-reservations

🔌 Cosmos DBに接続中...
✅ データベース接続成功: studio-reservations

📦 コンテナ確認:
  ✅ availability: 存在確認OK
  ✅ target_dates: 存在確認OK
  ✅ rate_limits: 存在確認OK

📊 スループット情報:
  設定値: 1000 RU/s
  ✅ 無料枠内

✨ 接続テスト成功！Cosmos DBが正しく設定されています。
```

## ⚠️ セキュリティ注意事項

1. **絶対にGitにコミットしない**
   ```bash
   # .gitignoreに含まれているか確認
   cat .gitignore | grep -E "\.env|local\.settings"
   ```

2. **キーの共有禁止**
   - プライマリキーは絶対に他人と共有しない
   - スクリーンショットに含めない
   - コードレビューに含めない

3. **本番環境では Azure Key Vault を使用**
   - 開発環境: .envファイル
   - 本番環境: Azure Key Vaultまたは環境変数

## 🆘 トラブルシューティング

### "ENOTFOUND"エラーの場合
- エンドポイントURLのタイポを確認
- `https://`で始まっているか確認
- `:443/`で終わっているか確認

### "401 Unauthorized"エラーの場合
- プライマリキーが正しくコピーされているか確認
- キーに余分な空白や改行が含まれていないか確認

### "404 Not Found"エラーの場合
- データベース名が`studio-reservations`になっているか確認
- Azure Portalでデータベースが作成されているか確認