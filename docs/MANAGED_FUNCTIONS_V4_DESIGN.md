# Managed Functions v4 実装設計書

## 概要
既存のfunctionsディレクトリを維持したまま、Azure Static Web Apps Managed Functions v4で同等機能を実装する設計書。
並行運用により段階的な移行が可能。

## アーキテクチャ比較

### 現在のアーキテクチャ（v3）
```
aki-sta/
├── functions/                  # Bring Your Own Functions
│   ├── availability-api/       
│   │   ├── index.js           # 関数実装
│   │   └── function.json      # 関数設定
│   └── src/                   
│       └── repositories/      # データアクセス層
└── frontend/
    └── src/services/api.ts    # API URL環境変数依存
```

### 新規実装アーキテクチャ（v4）
```
aki-sta/
├── api/                        # Managed Functions v4
│   ├── src/
│   │   ├── functions/         
│   │   │   └── availability.js # v4関数実装
│   │   └── repositories/      # データアクセス層（共有）
│   ├── package.json           # @azure/functions依存
│   └── host.json              # v4設定
├── functions/                  # 既存v3（そのまま維持）
└── frontend/
    └── src/services/api.ts    # 相対パス"/api/"使用可能
```

## 詳細実装設計

### 1. ディレクトリ構造
```
api/
├── src/
│   ├── functions/
│   │   └── availability.js    # メイン関数
│   └── repositories/
│       ├── availability-repository.js
│       └── cosmos-client.js
├── package.json
├── host.json
└── local.settings.json
```

### 2. package.json
```json
{
  "name": "aki-sta-api-v4",
  "version": "1.0.0",
  "description": "Azure Static Web Apps Managed Functions v4",
  "main": "src/functions/*.js",
  "scripts": {
    "start": "func start",
    "test": "jest"
  },
  "dependencies": {
    "@azure/functions": "^4.0.0",
    "@azure/cosmos": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "18.x",
    "jest": "^30.0.5",
    "azure-functions-core-tools": "^4.x"
  }
}
```

### 3. host.json
```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.0.0, 5.0.0)"
  },
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  }
}
```

### 4. availability.js（v4実装）
```javascript
const { app } = require('@azure/functions');
const availabilityRepository = require('../repositories/availability-repository');

// メイン処理関数
async function availabilityHandler(request, context) {
  const date = request.params.date;
  
  try {
    // 日付パラメータがない場合は全データを返す
    if (!date) {
      const allData = await availabilityRepository.getAllAvailabilityData();
      return {
        status: 200,
        jsonBody: allData
      };
    }
    
    // 特定日付のデータを取得
    const data = await availabilityRepository.getAvailabilityData(date);
    
    return {
      status: 200,
      jsonBody: {
        date: date,
        facilities: data
      }
    };
    
  } catch (error) {
    context.log.error(`Failed to get availability data: ${error.message}`);
    
    return {
      status: 503,
      jsonBody: {
        error: "Service temporarily unavailable",
        details: error.message
      }
    };
  }
}

// 関数登録（v4形式）
app.http('availability', {
  methods: ['GET', 'OPTIONS'],
  route: 'availability/{date?}',
  authLevel: 'anonymous',
  handler: availabilityHandler
});

module.exports = app;
```

### 5. local.settings.json
```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsFeatureFlags": "EnableWorkerIndexing",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "COSMOS_ENDPOINT": "https://aki-sta-cosmos.documents.azure.com:443/",
    "COSMOS_KEY": "your-cosmos-key",
    "COSMOS_DATABASE": "aki-sta-db"
  }
}
```

## 実装手順

### フェーズ1: 基本構造作成
1. api/ディレクトリ作成
2. package.json, host.json設定
3. @azure/functions v4インストール

### フェーズ2: 関数実装
4. availability.js作成（v4形式）
5. repositoriesディレクトリをapi/src/に複製
6. パス調整（require文の修正）

### フェーズ3: テスト作成
7. api/test/ディレクトリ作成
8. v4用のテストケース実装
9. ローカル動作確認

### フェーズ4: デプロイ設定
10. GitHub Actionsワークフロー更新
    - api_location: "./api"追加
11. Azure Portal設定不要（Managed Functions）

### フェーズ5: 切り替え準備
12. Frontendに切り替えフラグ追加
13. 並行運用テスト
14. 段階的切り替え

## メリット

### 即座に得られる利点
- **CORS完全不要**: 同一ドメインで自動処理
- **環境変数簡素化**: API URL設定不要
- **デプロイ高速化**: 1つのワークフローで完結
- **コスト削減**: 別Functions App不要

### 開発効率の向上
- **function.json不要**: コードファースト開発
- **型安全性向上**: TypeScript対応改善
- **デバッグ容易**: 統合された開発体験
- **最新機能**: v4の新機能活用可能

## リスクと対策

### リスク
1. **初期学習コスト**: v4モデルの習得必要
2. **デバッグ複雑化**: 並行運用中の切り分け
3. **依存関係競合**: package.json管理

### 対策
1. **段階的実装**: 1関数ずつ移行
2. **ログ強化**: 詳細なログ出力実装
3. **モノレポ管理**: workspaces活用検討

## 並行運用戦略

### ステップ1: 共存期間（1-2週間）
- 両方のAPIを並行稼働
- Frontendは環境変数で切り替え可能
- A/Bテスト実施

### ステップ2: 段階的移行（2-4週間）
- 新規ユーザーをv4に誘導
- 既存ユーザーは徐々に移行
- パフォーマンス比較

### ステップ3: 完全移行
- v3完全停止
- functionsディレクトリ削除
- Azure Functions App削除

## コード例: Frontend切り替え

```typescript
// frontend/src/services/api.ts
const API_VERSION = process.env.REACT_APP_API_VERSION || 'v4';

const API_BASE_URL = API_VERSION === 'v4' 
  ? '/api'  // Managed Functions（同一ドメイン）
  : process.env.REACT_APP_API_URL || '/api';  // Bring Your Own

export const availabilityApi = {
  async getAvailability(date: string): Promise<AvailabilityResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/availability/${date}`
    );
    return response.data;
  }
};
```

## 実装チェックリスト

- [ ] api/ディレクトリ構造作成
- [ ] package.json設定（@azure/functions v4）
- [ ] host.json設定
- [ ] availability.js実装（v4形式）
- [ ] repositories複製と調整
- [ ] ローカルテスト実行
- [ ] GitHub Actionsワークフロー更新
- [ ] デプロイテスト
- [ ] Frontend切り替え機能追加
- [ ] 並行運用開始
- [ ] パフォーマンス測定
- [ ] 完全移行判断

## 参考資料
- [Azure Static Web Apps - Add an API](https://learn.microsoft.com/en-us/azure/static-web-apps/add-api)
- [Azure Functions v4 Programming Model](https://learn.microsoft.com/en-us/azure/azure-functions/functions-node-upgrade-v4)
- [Managed Functions Documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/apis-functions)

## まとめ
既存システムを維持しながら、新しいv4実装を並行構築することで、リスクを最小限に抑えた移行が可能。CORSの問題も完全に解決され、将来的な拡張性も確保できる。

*作成日: 2025-08-28*
*最終更新: 2025-08-28*