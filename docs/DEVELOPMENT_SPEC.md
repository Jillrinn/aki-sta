# 【統合版】空きスタサーチくん - 開発仕様書

## 📋 プロジェクト概要

**プロジェクト名**: 空きスタサーチくん  
**開発手法**: MVP段階実装 + テスト駆動開発（TDD）  
**アーキテクチャ**: Azure Functions + React + Cosmos DB（無料枠）  
**利用者**: 20人程度の音楽団体  
**目的**: 複数施設の予約空き状況を一元可視化し、練習場所選定を効率化

## 🎯 最終システム仕様

### 機能要件
```yaml
コア機能:
  - 事前指定した日付の空き状況可視化
  - 複数施設横断での空き状況比較
  - 時間帯: 9-12、13-17、18-21の3枠表示（13-17が最重要）
  - レスポンシブWebアプリ（認証不要）

データ更新:
  - 自動更新: 1日2回（朝8時・夕17時JST）
  - 手動更新: 1日3回まで + 30分クールダウン（全ユーザー共通）
  - 対象期間: 2-3ヶ月先まで

対象施設（優先順位順):
  1. https://ensemble-studio.com/schedule/
  2. https://resv.city.meguro.tokyo.jp/Web/Home/WgR_ModeSelect
  3. https://www.yoyaku.city.shibuya.tokyo.jp/
  4. https://www.shinjuku.eprs.jp/chiiki/web/
  5. https://chuo-yoyaku.openreaf02.jp/index.php

非機能要件:
  - レスポンス時間: 10秒以内
  - 同時アクセス: 5人程度
  - コスト: Azure無料枠内で運用
```

### システム構成
```
Frontend (React + Azure Static Web Apps)
│
├── 日付管理画面
│   ├── 監視対象日付の追加/削除
│   └── 手動更新ボタン（制限付き）
│
├── 空き状況表示画面  
│   ├── 時間帯: 9-12, 13-17, 18-21
│   └── リアルタイム表示
│
└── Azure Functions (API - 無料枠)
    ├── Timer Trigger (1日2回: 08:00, 17:00 JST)
    ├── HTTP Trigger (手動更新: 制限付き)
    ├── 日付管理 API
    └── Azure Cosmos DB (無料枠: 25GB、1000 RU/s)
```

## 🚀 MVP段階実装戦略

### **MVP v1.0: 最小動作確認**（3-4日）
**目標**: ダミーデータでの動作検証、API-Frontend統合確認

```yaml
実装スコープ:
  - 固定日付（2025-11-15）の空き状況表示
  - あんさんぶるスタジオのみ対応（本郷・初台）
  - 時間帯: 13-17のみ表示
  - ダミーデータでの動作

技術スタック:
  - Azure Functions HTTP Trigger 1つ
  - React基本コンポーネント
  - ローカル統合
```

### **MVP v2.0: 実データ取得**（3-4日）
**目標**: 実際のスクレイピングデータで動作する完全機能版

```yaml
機能追加:
  - あんさんぶるスタジオの実スクレイピング
  - 3時間帯表示（9-12, 13-17, 18-21）
  - JSONファイルベースでのデータ永続化
  - エラーハンドリング強化

技術追加:
  - Playwright実装
  - ファイルベースストレージ
  - 時間帯変換ロジック
```

### **MVP v3.0: 本格運用対応**（2-3日）
**目標**: Azure本番環境での自動運用開始

```yaml
機能追加:
  - Cosmos DB永続化
  - 複数日付管理
  - 自動スケジュール実行（1日2回）
  - 手動更新機能（制限付き）

技術追加:
  - Azure Cosmos DB接続
  - Timer Trigger実装
  - レート制限機能
  - Azure本番デプロイ
```

## 🏗️ プロジェクト構成

```
studio-reservation-checker/
├── functions/                      # Azure Functions (Node.js)
│   ├── host.json
│   ├── package.json
│   ├── availability-api/           # HTTP Trigger (空き状況取得)
│   │   ├── function.json
│   │   ├── availability-api.js
│   │   └── availability-api.test.js
│   ├── target-dates-api/           # HTTP Trigger (日付管理) [v3.0で追加]
│   │   ├── function.json
│   │   ├── availability-api.js
│   │   └── availability-api.test.js
│   ├── scheduled-scraping/         # Timer Trigger [v3.0で追加]
│   │   ├── function.json
│   │   ├── availability-api.js
│   │   └── availability-api.test.js
│   ├── manual-update/              # HTTP Trigger (手動更新) [v3.0で追加]
│   │   ├── function.json
│   │   ├── availability-api.js
│   │   └── availability-api.test.js
│   ├── shared/                     # 共通ライブラリ
│   │   ├── data-store.js           # v1.0: ダミー, v2.0: JSON, v3.0: Cosmos
│   │   ├── data-store.test.js
│   │   ├── cosmos-client.js        # v3.0で追加
│   │   ├── rate-limiter.js         # v3.0で追加
│   │   ├── scrapers/
│   │   │   ├── ensemble-scraper.js # v2.0で実装
│   │   │   ├── ensemble-scraper.test.js
│   │   │   └── scraper-base.js     # 共通スクレイピング機能
│   │   └── time-processor.js       # 時間帯変換ロジック
│   └── jest.config.js
├── frontend/                       # React App
│   ├── src/
│   │   ├── components/
│   │   │   ├── AvailabilityTable.tsx      # v1.0実装
│   │   │   ├── AvailabilityTable.test.tsx
│   │   │   ├── DateManager.tsx            # v3.0で追加
│   │   │   ├── DateManager.test.tsx
│   │   │   ├── ManualUpdateButton.tsx     # v3.0で追加
│   │   │   └── ManualUpdateButton.test.tsx
│   │   ├── services/
│   │   │   ├── api.ts              # v1.0実装
│   │   │   └── api.test.ts
│   │   ├── hooks/
│   │   │   ├── useTargetDates.ts   # v3.0で追加
│   │   │   └── useAvailability.ts  # v2.0で追加
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript型定義
│   │   └── App.tsx                 # v1.0実装
│   └── package.json
├── scripts/
│   ├── setup-azure.sh
│   └── deploy.sh
├── .env.example
├── .gitignore
└── README.md
```

## 📝 MVP v1.0 詳細実装（3-4日）

### Day 1: 基本API実装
**Claude Codeコマンド例**:
```bash
npx claude-code "Azure Functions HTTPトリガーでダミー空き状況データを返すAPIを作成。
以下の仕様で実装:
- エンドポイント: GET /api/availability/2025-11-15
- レスポンス: あんさんぶるスタジオ本郷・初台の13-17時間帯データ
- テスト込みのTDD実装"
```

**期待するダミーデータ**:
```javascript
// functions/shared/data-store.js (v1.0版)
const DUMMY_DATA = {
  "2025-11-15": [
    {
      facilityName: "Ensemble Studio 本郷",
      timeSlots: { "13-17": "available" }
    },
    {
      facilityName: "Ensemble Studio 初台", 
      timeSlots: { "13-17": "booked" }
    }
  ]
};

module.exports = {
  getAvailabilityData: (date) => DUMMY_DATA[date] || []
};
```

**API実装**:
```javascript
// functions/availability-api/availability-api.js
module.exports = async function (context, req) {
  const date = req.params.date;
  const dataStore = require('../shared/data-store');
  const data = dataStore.getAvailabilityData(date);
  
  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: {
      date: date,
      facilities: data,
      dataSource: "dummy"
    }
  };
};
```

### Day 2: 基本画面実装
**Claude Codeコマンド例**:
```bash
npx claude-code "React でシンプルな空き状況テーブルを作成。
要件:
- Azure Functions APIからデータ取得
- 施設名と13-17時間帯のみ表示
- ○×表示（○=空き、×=予約済み）
- レスポンシブ対応
- TypeScript + Testing Library使用"
```

**期待するコンポーネント**:
```tsx
// frontend/src/components/AvailabilityTable.tsx
import React, { useState, useEffect } from 'react';

interface TimeSlots {
  '13-17': 'available' | 'booked' | 'unknown';
}

interface FacilityData {
  facilityName: string;
  timeSlots: TimeSlots;
  lastUpdated: string;
}

interface AvailabilityResponse {
  date: string;
  facilities: FacilityData[];
  dataSource: string;
}

export const AvailabilityTable: React.FC = () => {
  const [data, setData] = useState<FacilityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/availability/2025-11-15');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result: AvailabilityResponse = await response.json();
      setData(result.facilities);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'available': return '○';
      case 'booked': return '×';
      case 'lottery': return '△';
      default: return '?';
    }
  };

  const getStatusClass = (status: string): string => {
    const baseClass = 'px-3 py-2 rounded text-center font-bold';
    switch (status) {
      case 'available': return `${baseClass} text-green-600 bg-green-100`;
      case 'booked': return `${baseClass} text-red-600 bg-red-100`;
      case 'lottery': return `${baseClass} text-yellow-600 bg-yellow-100`;
      default: return `${baseClass} text-gray-600 bg-gray-100`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">🔄 読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>エラー:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        🎵 2025-11-15 スタジオ空き状況
      </h1>
      
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 bg-white shadow-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-3 text-left font-medium">
                施設名
              </th>
              <th className="border border-gray-300 px-4 py-3 text-center font-medium">
                13-17時
              </th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={2} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                  データがありません
                </td>
              </tr>
            ) : (
              data.map((facility, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 font-medium">
                    {facility.facilityName}
                  </td>
                  <td className="border border-gray-300 p-2">
                    <div className={getStatusClass(facility.timeSlots['13-17'])}>
                      {getStatusIcon(facility.timeSlots['13-17'])}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>○ 空き　× 予約済み　△ 抽選中　? 不明</p>
      </div>
    </div>
  );
};
```

### Day 3: 統合・CORS設定
**Claude Codeコマンド例**:
```bash
npx claude-code "Azure Functions とReactアプリの統合設定。
- local.settings.json でCORS設定
- React プロキシ設定（package.json）
- ローカル開発環境での動作確認
- エラーハンドリング実装"
```

**期待する設定ファイル**:
```json
// functions/local.settings.json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}

// frontend/package.json (proxy設定)
{
  "name": "studio-reservation-frontend",
  "proxy": "http://localhost:7071",
  "scripts": {
    "start": "react-scripts start",
    "test": "react-scripts test",
    "build": "react-scripts build"
  }
}
```

### Day 4: UI改善・テスト
**Claude Codeコマンド例**:
```bash
npx claude-code "MVP v1.0の仕上げ実装。
- ローディング・エラー状態の表示改善
- レスポンシブデザインの調整
- E2Eテスト追加
- ドキュメント整備"
```

**✅ MVP v1.0 完了判定基準**
- [ ] ローカル環境でAPI-Frontend統合動作
- [ ] ダミーデータが正しく表示
- [ ] 基本的なエラーハンドリング実装
- [ ] テストカバレッジ80%以上
- [ ] レスポンシブデザイン確認

## 📝 MVP v2.0 詳細実装（3-4日）

### Day 1-2: スクレイピング実装
**Claude Codeコマンド例**:
```bash
npx claude-code "Playwrightであんさんぶるスタジオをスクレイピング実装。
仕様:
- URL: https://ensemble-studio.com/schedule/
- 対象: 本郷・初台の2スタジオ
- 取得時間帯: 9-12, 13-17, 18-21の3区分
- TDD実装でテストファースト
- エラーハンドリング・リトライ機能"
```

**期待するスクレイパー**:
```javascript
// functions/shared/scrapers/ensemble-scraper.js
const { chromium } = require('playwright');

class EnsembleScraper {
  constructor() {
    this.baseUrl = 'https://ensemble-studio.com/schedule/';
    this.studios = ['本郷', '初台'];
    this.retryCount = 3;
    this.timeout = 30000;
  }

  async scrapeAvailability(targetDate) {
    let browser;
    
    try {
      browser = await chromium.launch({ 
        headless: true,
        timeout: this.timeout 
      });
      
      const page = await browser.newPage();
      await page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      
      // 日付移動ロジック（必要に応じて）
      await this.navigateToDate(page, targetDate);
      
      const results = [];
      
      for (const studio of this.studios) {
        const studioData = await this.extractStudioData(page, studio, targetDate);
        results.push({
          facilityName: `Ensemble Studio ${studio}`,
          date: targetDate,
          timeSlots: this.convertToTimeSlots(studioData),
          scrapedAt: new Date().toISOString()
        });
      }
      
      return { 
        status: 'success', 
        data: results,
        message: `Successfully scraped ${results.length} studios`
      };
      
    } catch (error) {
      console.error('Scraping error:', error);
      return { 
        status: 'error', 
        message: error.message,
        error: error.stack
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async navigateToDate(page, targetDate) {
    // サイト固有の日付移動ロジック
    // 実際のDOM構造に応じて実装
  }

  async extractStudioData(page, studioName, date) {
    // スタジオ固有のデータ抽出ロジック
    // 実際のHTML構造を解析して実装
    const timeSlots = {};
    
    // 例: DOM要素からの抽出
    const slots = await page.$$eval(
      `[data-studio="${studioName}"] .time-slot`,
      elements => elements.map(el => ({
        time: el.getAttribute('data-time'),
        status: el.textContent.trim()
      }))
    );
    
    slots.forEach(slot => {
      timeSlots[slot.time] = this.parseStatus(slot.status);
    });
    
    return timeSlots;
  }

  convertToTimeSlots(rawData) {
    // 詳細時間を3区分に変換
    const timeMapping = {
      '9-12': ['09:00', '10:00', '11:00'],
      '13-17': ['13:00', '14:00', '15:00', '16:00'],
      '18-21': ['18:00', '19:00', '20:00']
    };
    
    const result = {};
    
    for (const [slot, hours] of Object.entries(timeMapping)) {
      const statuses = hours
        .map(hour => rawData[hour])
        .filter(status => status !== undefined);
      
      if (statuses.length === 0) {
        result[slot] = 'unknown';
      } else if (statuses.includes('available')) {
        result[slot] = 'available';  // 一つでも空きがあれば
      } else if (statuses.includes('lottery')) {
        result[slot] = 'lottery';
      } else if (statuses.includes('booked')) {
        result[slot] = 'booked';
      } else {
        result[slot] = 'unknown';
      }
    }
    
    return result;
  }

  parseStatus(statusText) {
    if (!statusText) return 'unknown';
    
    const text = statusText.toLowerCase().trim();
    
    if (text.includes('○') || text.includes('空') || text.includes('available')) {
      return 'available';
    } else if (text.includes('×') || text.includes('予約') || text.includes('booked')) {
      return 'booked';
    } else if (text.includes('△') || text.includes('抽選') || text.includes('lottery')) {
      return 'lottery';
    } else {
      return 'unknown';
    }
  }
}

module.exports = EnsembleScraper;
```

### Day 3: データ統合・ファイル保存
**Claude Codeコマンド例**:
```bash
npx claude-code "スクレイピング結果をJSONファイル保存し、API経由で読み込む機能実装。
- data/availability.json でデータ管理
- data-store.js をファイルベースに更新
- 手動実行スクリプト追加（npm run scrape）"
```

### Day 4: 実データ表示・3時間帯対応
**Claude Codeコマンド例**:
```bash
npx claude-code "実データで3時間帯表示にReactコンポーネント更新。
- AvailabilityTableを3列に拡張
- 時間帯ヘッダー表示
- 状態アイコン改善（○×△?）
- 最終更新時刻表示"
```

**✅ MVP v2.0 完了判定基準**
- [ ] 実際のあんさんぶるスタジオデータ取得成功
- [ ] 3時間帯正しく表示
- [ ] ファイルベースでのデータ永続化動作
- [ ] エラー時の適切な表示

## 📝 MVP v3.0 詳細実装（2-3日）

### Day 1: Cosmos DB移行
**Claude Codeコマンド例**:
```bash
npx claude-code "ファイルベース→Cosmos DB移行実装。
- data-store.jsをCosmos DB版に更新
- 接続設定・エラーハンドリング
- データマイグレーション機能
- 既存テストの動作確認"
```

### Day 2: 日付管理・自動実行
**Claude Codeコマンド例**:
```bash
npx claude-code "日付管理機能と自動スケジュール実行実装。
- target-dates-api でCRUD操作
- scheduled-scraping Timer Trigger
- 1日2回（8時・17時）の自動実行
- フロントエンドに日付選択機能追加"
```

### Day 3: Azure デプロイ・最終調整
**Claude Codeコマンド例**:
```bash
npx claude-code "Azure本番環境デプロイと最終調整。
- Azure Functions App作成・設定
- Static Web Apps デプロイ
- 環境変数設定
- 本番環境での動作テスト"
```

**✅ MVP v3.0 完了判定基準**
- [ ] Azure本番環境で正常動作
- [ ] 自動スケジュール実行確認
- [ ] 複数日付管理動作
- [ ] 手動更新機能動作

## 🧪 テスト戦略

### TDD実装フロー
```
1. Red   → テスト失敗を確認
2. Green → 最小限の実装でテスト通過
3. Refactor → コードの改善
```

### 各MVP段階でのテスト要件

**MVP v1.0: 基本テスト**
```javascript
// API統合テスト
describe('Availability API', () => {
  test('should return dummy data for valid date', async () => {
    const response = await fetch('/api/availability/2025-11-15');
    const data = await response.json();
    
    expect(data.facilities).toHaveLength(2);
    expect(data.date).toBe('2025-11-15');
    expect(data.dataSource).toBe('dummy');
  });
});

// コンポーネントテスト
describe('AvailabilityTable', () => {
  test('should display facility data correctly', () => {
    const mockData = [
      { facilityName: 'Test Studio', timeSlots: { '13-17': 'available' } }
    ];
    
    render(<AvailabilityTable initialData={mockData} />);
    expect(screen.getByText('Test Studio')).toBeInTheDocument();
    expect(screen.getByText('○')).toBeInTheDocument();
  });
});
```

**MVP v2.0: スクレイピングテスト**
```javascript
describe('EnsembleScraper', () => {
  test('should parse status correctly', () => {
    const scraper = new EnsembleScraper();
    
    expect(scraper.parseStatus('○')).toBe('available');
    expect(scraper.parseStatus('×')).toBe('booked');
    expect(scraper.parseStatus('△')).toBe('lottery');
  });
  
  test('should convert time slots correctly', () => {
    const scraper = new EnsembleScraper();
    const rawData = {
      '09:00': 'available',
      '10:00': 'booked',
      '13:00': 'available'
    };
    
    const result = scraper.convertToTimeSlots(rawData);
    expect(result['9-12']).toBe('available'); // 1つでも空きがあれば
    expect(result['13-17']).toBe('available');
  });
});
```

**MVP v3.0: 統合テスト**
```javascript
describe('Full Application Flow', () => {
  test('should complete end-to-end user journey', async () => {
    // 1. 日付追加
    await addTargetDate('2025-11-15', 'Test Event');
    
    // 2. 自動スクレイピング実行
    await triggerScheduledScraping();
    
    // 3. データ取得確認
    const data = await getAvailabilityData('2025-11-15');
    expect(data).toBeDefined();
    expect(data.facilities.length).toBeGreaterThan(0);
  });
});
```

## 💾 データベース設計（Cosmos DB）

### Collections
```javascript
// target_dates collection
{
  "id": "2025-11-15",
  "date": "2025-11-15",
  "label": "本番ライブ", 
  "isActive": true,
  "priority": 1,
  "createdAt": "2025-08-19T10:00:00Z"
}

// availability collection  
{
  "id": "2025-11-15_ensemble-hongo",
  "date": "2025-11-15",
  "facility": "ensemble-hongo",
  "facilityName": "Ensemble Studio 本郷",
  "timeSlots": {
    "9-12": "available",
    "13-17": "booked", 
    "18-21": "available"
  },
  "updatedAt": "2025-08-19T17:00:00Z",
  "nextUpdate": "2025-08-20T08:00:00Z",
  "dataSource": "scraping",
  "scrapingStatus": "success"
}

// rate_limits collection
{
  "id": "2025-08-19",
  "date": "2025-08-19",
  "count": 2,
  "lastUpdate": "2025-08-19T15:30:00Z"
}

// scraping_logs collection
{
  "id": "log_2025-08-19_17:00:00",
  "timestamp": "2025-08-19T17:00:00Z",
  "facility": "ensemble-studio",
  "date": "2025-11-15",
  "status": "success",
  "duration": 5.2,
  "message": "Successfully scraped 2 studios"
}
```

## 🚀 Claude Code活用フロー

### 各MVP開始時
```bash
# 現在のMVP段階を明確に伝える
npx claude-code "MVP v1.0の実装開始。ダミーデータでの基本動作確認が目標。
このドキュメントの仕様に従って、以下の順序で実装:
1. Azure Functions API（ダミーデータ返却）
2. React基本テーブル表示
3. 統合動作確認

現在のプロジェクト構成: [プロジェクト構成を貼り付け]"
```

### 問題発生時
```bash
# 具体的な問題を明示
npx claude-code "MVP v2.0でスクレイピングが失敗。
問題: Playwrightでのタイムアウトエラー
現在のコード: [現在のコード貼り付け]
エラーメッセージ: [エラー内容]

このドキュメントの仕様に従って解決策を提案して"
```

### レビュー時
```bash
# MVP完了時の品質確認
npx claude-code "MVP v1.0完了。このドキュメントの完了判定基準に従ってレビューし、改善点を提案:
- 実装コード: [コードを貼り付け]
- テスト結果: [テスト結果を貼り付け]
- 次のMVP v2.0への移行準備状況を確認"
```

## 📊 進捗管理

### マイルストーン
```
Week 1: MVP v1.0 完了（基本動作確認）
Week 2: MVP v2.0 完了（実データ取得）
Week 3: MVP v3.0 完了（本格運用）
```

### 品質ゲート（各MVP完了時）
```
✅ 設定した機能がすべて動作
✅ テストがグリーン（カバレッジ80%以上）
✅ ドキュメント更新
✅ 次MVP向けの課題整理
✅ デモ実行可能
```

## 🔧 開発環境セットアップ

### 必要なツール
```bash
# Node.js, npm
node --version  # v18以上推奨

# Azure Functions Core Tools
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Claude Code CLI
npm install -g @anthropic-ai/claude-code

# プロジェクト初期化
mkdir studio-reservation-checker
cd studio-reservation-checker
func init functions --javascript
cd functions && npm install jest playwright @azure/cosmos
cd ../
npx create-react-app frontend --template typescript
```

### 環境変数設定
```bash
# .env (ローカル開発用)
COSMOS_CONNECTION_STRING=AccountEndpoint=https://...
COSMOS_DATABASE_NAME=studio-reservations
NODE_ENV=development
```

## 📚 参考ドキュメント

- [Azure Functions JavaScript開発者向けリファレンス](https://docs.microsoft.com/ja-jp/azure/azure-functions/functions-reference-node)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Azure Cosmos DB JavaScript SDK](https://docs.microsoft.com/ja-jp/javascript/api/overview/azure/cosmos-readme)

---

**このドキュメントは、Claude CodeでのTDD開発を想定した包括的な開発仕様書です。各MVP段階で Claude Codeに具体的な指示を出す際の参考として使用してください。**