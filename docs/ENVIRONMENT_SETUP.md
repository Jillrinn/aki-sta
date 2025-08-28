# 環境変数設定ガイド

## Frontend APIエンドポイント設定

### 概要
FrontendアプリケーションはAPIエンドポイントを環境別に自動切り替えできます。

### 仕組み
`frontend/src/services/api.ts`では以下の優先順位でAPIのベースURLを決定します：
```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
```

1. 環境変数 `REACT_APP_API_URL` が設定されている場合はその値を使用
2. 設定されていない場合は `/api` を使用（相対パス）

### ローカル開発環境

#### 方法1: proxyを使用（デフォルト・推奨）
`frontend/package.json`に設定済み：
```json
"proxy": "http://localhost:7071"
```
- `/api`へのリクエストは自動的に`http://localhost:7071/api`にプロキシされます
- 追加設定不要

#### 方法2: 環境変数を使用
`frontend/.env.local`ファイルで設定：
```bash
REACT_APP_API_URL=http://localhost:7071/api
```

### 本番環境（Azure Static Web Apps）

#### 方法1: Azure Static Web Appsのバックエンド統合（推奨）
- 設定不要
- `/api`は自動的にAzure FunctionsのAPIにルーティングされます
- `staticwebapp.config.json`で設定済み

#### 方法2: 環境変数を使用
Azure PortalまたはGitHub Actionsで設定：

**Azure Portal**:
1. Static Web Apps リソースに移動
2. 「設定」→「環境変数」
3. 以下を追加：
   - 名前: `REACT_APP_API_URL`
   - 値: `https://aki-sta-func.azurewebsites.net/api`

**GitHub Actions**:
1. リポジトリの Settings → Secrets and variables → Actions
2. 新しいSecretを追加：
   - 名前: `REACT_APP_API_URL`
   - 値: `https://aki-sta-func.azurewebsites.net/api`
3. ワークフローファイルで使用：
   ```yaml
   env:
     REACT_APP_API_URL: ${{ secrets.REACT_APP_API_URL }}
   ```

### 環境変数ファイル

| ファイル | 用途 | Git管理 |
|---------|------|---------|
| `.env` | デフォルト設定 | ○ |
| `.env.local` | ローカル開発用（個人設定） | × |
| `.env.production` | 本番環境用 | ○ |

### トラブルシューティング

#### APIが接続できない場合
1. Azure Functionsが起動していることを確認
   ```bash
   cd functions && npm start
   ```

2. 環境変数が正しく設定されていることを確認
   ```bash
   # ローカル環境
   echo $REACT_APP_API_URL
   ```

3. ブラウザのネットワークタブでAPIリクエストのURLを確認

#### CORSエラーが発生する場合
- ローカル開発: proxyを使用することで回避
- 本番環境: Azure FunctionsでCORS設定を確認

### 参考リンク
- [Create React App - Proxying API Requests](https://create-react-app.dev/docs/proxying-api-requests-in-development/)
- [Azure Static Web Apps - API support](https://docs.microsoft.com/azure/static-web-apps/apis)