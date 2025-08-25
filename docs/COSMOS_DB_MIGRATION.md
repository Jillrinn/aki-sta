# Cosmos DB移行手順書

## 概要
本ドキュメントは、空きスタサーチくんのデータストレージをJSONファイルベースからAzure Cosmos DBへ移行する手順を記載したものです。

## 移行方針
- **NoSQLデータベースとして使用**（Azure Cosmos DBの強みを活かす）
- **段階的移行**（Backend → Scraper → クリーンアップ）
- **ダウンタイムゼロ**（フォールバック機構により無停止移行）

## 前提条件
- Azure Cosmos DBアカウントが作成済み
- 接続文字列、プライマリキーが取得済み
- Node.js 18以上、Python 3.9以上がインストール済み

---

## フェーズ1: Backend完全移行（約1.5時間）


### 1-1. 環境設定とパッケージインストール（10分）

#### パッケージインストール
```bash
cd functions
npm install @azure/cosmos dotenv
```

#### 環境変数設定

`.env`ファイルを作成:
```env
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-primary-key
COSMOS_DATABASE=studio-reservations
```

`local.settings.json`を更新:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_ENDPOINT": "https://your-account.documents.azure.com:443/",
    "COSMOS_KEY": "your-primary-key",
    "COSMOS_DATABASE": "studio-reservations"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

### 1-2. Cosmos DBクライアント作成とテスト（20分）

#### 実装
`functions/src/repositories/cosmos-client.js`を新規作成:

```javascript
const { CosmosClient } = require('@azure/cosmos');

class CosmosDBClient {
  constructor() {
    this.client = null;
    this.database = null;
    this.containers = {};
  }

  async initialize() {
    if (this.client) return;

    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;
    const databaseId = process.env.COSMOS_DATABASE || 'studio-reservations';

    if (!endpoint || !key) {
      throw new Error('Cosmos DB connection settings are missing');
    }

    this.client = new CosmosClient({ endpoint, key });
    
    // データベース作成または参照
    const { database } = await this.client.databases.createIfNotExists({ id: databaseId });
    this.database = database;

    // コンテナ作成または参照
    await this.createContainers();
  }

  async createContainers() {
    // availabilityコンテナ
    const { container: availability } = await this.database.containers.createIfNotExists({
      id: 'availability',
      partitionKey: { paths: ['/date'] }
    });
    this.containers.availability = availability;

    // target_datesコンテナ
    const { container: targetDates } = await this.database.containers.createIfNotExists({
      id: 'target_dates',
      partitionKey: { paths: ['/date'] }
    });
    this.containers.targetDates = targetDates;

    // rate_limitsコンテナ
    const { container: rateLimits } = await this.database.containers.createIfNotExists({
      id: 'rate_limits',
      partitionKey: { paths: ['/date'] }
    });
    this.containers.rateLimits = rateLimits;
  }

  getContainer(name) {
    return this.containers[name];
  }
}

// シングルトンインスタンス
const cosmosClient = new CosmosDBClient();

module.exports = cosmosClient;
```

#### テスト実装
`functions/test/repositories/cosmos-client.test.js`を新規作成:

```javascript
const cosmosClient = require('../../src/repositories/cosmos-client');

describe('Cosmos DB Client', () => {
  beforeEach(() => {
    // 環境変数の設定
    process.env.COSMOS_ENDPOINT = 'https://test.documents.azure.com:443/';
    process.env.COSMOS_KEY = 'test-key';
    process.env.COSMOS_DATABASE = 'test-database';
  });

  afterEach(() => {
    // クリーンアップ
    delete process.env.COSMOS_ENDPOINT;
    delete process.env.COSMOS_KEY;
    delete process.env.COSMOS_DATABASE;
  });

  test('should throw error when connection settings are missing', async () => {
    delete process.env.COSMOS_ENDPOINT;
    
    await expect(cosmosClient.initialize()).rejects.toThrow(
      'Cosmos DB connection settings are missing'
    );
  });

  test('should get container by name', () => {
    // コンテナのモック設定
    cosmosClient.containers = {
      availability: { id: 'availability' },
      target_dates: { id: 'target_dates' },
      rate_limits: { id: 'rate_limits' }
    };

    const container = cosmosClient.getContainer('availability');
    expect(container).toBeDefined();
    expect(container.id).toBe('availability');
  });
});
```

#### テスト実行と確認
```bash
cd functions
npm test -- cosmos-client.test.js

# 期待される結果:
# PASS test/repositories/cosmos-client.test.js
#   Cosmos DB Client
#     ✓ should throw error when connection settings are missing
#     ✓ should get container by name
```

### 1-3. リポジトリ層の実装とテスト（35分）

#### 実装

`functions/src/repositories/availability-repository.js`を更新:

```javascript
const fs = require('fs');
const path = require('path');
const cosmosClient = require('./cosmos-client');

module.exports = {
  getAvailabilityData: async (date) => {
    try {
      // Cosmos DBから取得を試みる
      await cosmosClient.initialize();
      const container = cosmosClient.getContainer('availability');
      
      const querySpec = {
        query: "SELECT * FROM c WHERE c.date = @date",
        parameters: [{ name: "@date", value: date }]
      };
      
      const { resources } = await container.items
        .query(querySpec)
        .fetchAll();
      
      if (resources && resources.length > 0) {
        // Cosmos DBからデータを整形して返す
        return resources.map(item => ({
          facilityName: item.facilityName,
          timeSlots: item.timeSlots,
          lastUpdated: item.updatedAt
        }));
      }
    } catch (error) {
      console.error('Cosmos DB read error:', error);
    }

    // フォールバック: JSONファイルから読み込み（移行期間中の暫定対応）
    const scrapedDataPath = path.join(__dirname, '../../../shared-data/availability.json');
    
    if (!fs.existsSync(scrapedDataPath)) {
      return [];
    }
    
    try {
      const jsonContent = fs.readFileSync(scrapedDataPath, 'utf8');
      const data = JSON.parse(jsonContent);
      
      if (data.data && data.data[date]) {
        console.log(`Returning data from JSON file for ${date}`);
        return data.data[date];
      }
      
      return [];
    } catch (error) {
      console.error('JSON file read error:', error);
      throw new Error(`Failed to read availability data: ${error.message}`);
    }
  },
  
  getAllAvailabilityData: async () => {
    try {
      // Cosmos DBから全データ取得
      await cosmosClient.initialize();
      const container = cosmosClient.getContainer('availability');
      
      const { resources } = await container.items
        .readAll()
        .fetchAll();
      
      if (resources && resources.length > 0) {
        // 日付でグループ化
        const groupedData = {};
        resources.forEach(item => {
          if (!groupedData[item.date]) {
            groupedData[item.date] = [];
          }
          groupedData[item.date].push({
            facilityName: item.facilityName,
            timeSlots: item.timeSlots,
            lastUpdated: item.updatedAt
          });
        });
        return groupedData;
      }
    } catch (error) {
      console.error('Cosmos DB read all error:', error);
    }

    // フォールバック: JSONファイルから読み込み
    const scrapedDataPath = path.join(__dirname, '../../../shared-data/availability.json');
    
    if (!fs.existsSync(scrapedDataPath)) {
      throw new Error('Data source not available');
    }
    
    try {
      const jsonContent = fs.readFileSync(scrapedDataPath, 'utf8');
      const data = JSON.parse(jsonContent);
      
      if (!data.data) {
        throw new Error('Invalid data structure');
      }
      
      console.log('Returning all data from JSON file');
      return data.data;
      
    } catch (error) {
      console.error('JSON file read all error:', error);
      throw new Error(`Failed to read all availability data: ${error.message}`);
    }
  }
};
```

### 1-4. データマイグレーション（10分）

`functions/scripts/migrate-to-cosmos.js`を作成:

```javascript
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { CosmosClient } = require('@azure/cosmos');

async function migrate() {
  console.log('Starting migration to Cosmos DB...');
  
  // Cosmos DB接続
  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY
  });
  
  const database = client.database(process.env.COSMOS_DATABASE || 'studio-reservations');
  const container = database.container('availability');
  
  // JSONファイル読み込み
  const jsonPath = path.join(__dirname, '../../shared-data/availability.json');
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(jsonContent);
  
  if (!data.data) {
    console.error('No data found in JSON file');
    return;
  }
  
  // 各日付・施設のデータをCosmos DBに投入
  for (const [date, facilities] of Object.entries(data.data)) {
    for (const facility of facilities) {
      const facilityId = facility.facilityName
        .toLowerCase()
        .replace(/[()（）]/g, '')
        .replace(/\s+/g, '-')
        .replace('あんさんぶるstudio和-本郷', 'ensemble-hongo')
        .replace('あんさんぶるstudio音-初台', 'ensemble-hatsudai');
      
      const cosmosItem = {
        id: `${date}_${facilityId}`,
        partitionKey: date,
        date: date,
        facility: facilityId,
        facilityName: facility.facilityName,
        timeSlots: facility.timeSlots,
        updatedAt: facility.lastUpdated || new Date().toISOString(),
        dataSource: 'migration'
      };
      
      try {
        await container.items.upsert(cosmosItem);
        console.log(`Migrated: ${date} - ${facility.facilityName}`);
      } catch (error) {
        console.error(`Failed to migrate ${date} - ${facility.facilityName}:`, error);
      }
    }
  }
  
  console.log('Migration completed!');
}

migrate().catch(console.error);
```

実行:
```bash
cd functions
node scripts/migrate-to-cosmos.js
```

#### テスト実装
`functions/test/repositories/availability-repository.test.js`を更新:

```javascript
const fs = require('fs');
const availabilityRepository = require('../../src/repositories/availability-repository');
const cosmosClient = require('../../src/repositories/cosmos-client');

// Cosmos DBモック
jest.mock('../../src/repositories/cosmos-client');

describe('Availability Repository with Cosmos DB', () => {
  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    
    // Cosmos DBモックの設定
    cosmosClient.initialize = jest.fn().mockResolvedValue();
    cosmosClient.getContainer = jest.fn().mockReturnValue({
      items: {
        query: jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: [] })
        }),
        readAll: jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: [] })
        })
      }
    });
  });

  describe('getAvailabilityData', () => {
    test('should return data from Cosmos DB when available', async () => {
      const mockData = [
        {
          id: '2025-11-15_ensemble-hongo',
          date: '2025-11-15',
          facilityName: 'あんさんぶるStudio和(本郷)',
          timeSlots: { '9-12': 'available', '13-17': 'booked', '18-21': 'available' },
          updatedAt: '2025-08-25T10:00:00Z'
        }
      ];

      cosmosClient.getContainer.mockReturnValue({
        items: {
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({ resources: mockData })
          })
        }
      });

      const result = await availabilityRepository.getAvailabilityData('2025-11-15');
      
      expect(result).toHaveLength(1);
      expect(result[0].facilityName).toBe('あんさんぶるStudio和(本郷)');
      expect(result[0].timeSlots['13-17']).toBe('booked');
      expect(cosmosClient.initialize).toHaveBeenCalled();
    });

    test('should fallback to JSON file when Cosmos DB fails', async () => {
      // Cosmos DBエラーをシミュレート
      cosmosClient.initialize.mockRejectedValue(new Error('Connection failed'));
      
      // JSONファイル存在確認モック
      const originalExistsSync = fs.existsSync;
      const originalReadFileSync = fs.readFileSync;
      
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
        data: {
          '2025-11-15': [
            {
              facilityName: 'あんさんぶるStudio和(本郷)',
              timeSlots: { '9-12': 'available', '13-17': 'available', '18-21': 'booked' }
            }
          ]
        }
      }));

      const result = await availabilityRepository.getAvailabilityData('2025-11-15');
      
      expect(result).toHaveLength(1);
      expect(result[0].facilityName).toBe('あんさんぶるStudio和(本郷)');
      
      // クリーンアップ
      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
    });

    test('should return empty array when no data exists', async () => {
      const result = await availabilityRepository.getAvailabilityData('2025-12-31');
      expect(result).toEqual([]);
    });
  });

  describe('getAllAvailabilityData', () => {
    test('should return all data from Cosmos DB', async () => {
      const mockData = [
        {
          date: '2025-11-15',
          facilityName: 'あんさんぶるStudio和(本郷)',
          timeSlots: { '9-12': 'available', '13-17': 'booked', '18-21': 'available' },
          updatedAt: '2025-08-25T10:00:00Z'
        },
        {
          date: '2025-11-16',
          facilityName: 'あんさんぶるStudio音(初台)',
          timeSlots: { '9-12': 'booked', '13-17': 'booked', '18-21': 'available' },
          updatedAt: '2025-08-25T10:00:00Z'
        }
      ];

      cosmosClient.getContainer.mockReturnValue({
        items: {
          readAll: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({ resources: mockData })
          })
        }
      });

      const result = await availabilityRepository.getAllAvailabilityData();
      
      expect(result['2025-11-15']).toBeDefined();
      expect(result['2025-11-16']).toBeDefined();
      expect(result['2025-11-15'][0].facilityName).toBe('あんさんぶるStudio和(本郷)');
    });
  });
});
```

#### テスト実行と確認
```bash
cd functions
npm test -- availability-repository.test.js

# 期待される結果:
# PASS test/repositories/availability-repository.test.js
#   Availability Repository with Cosmos DB
#     getAvailabilityData
#       ✓ should return data from Cosmos DB when available
#       ✓ should fallback to JSON file when Cosmos DB fails
#       ✓ should return empty array when no data exists
#     getAllAvailabilityData
#       ✓ should return all data from Cosmos DB
```

### 1-4. データマイグレーション（10分）

`functions/scripts/migrate-to-cosmos.js`を作成（前述のコードと同じ）

### 1-5. API層の調整（10分）

`functions/src/functions/availability-api.js`は変更不要（リポジトリ層が吸収）

### 1-6. 統合テストの実装と実行（20分）

#### E2Eテスト実装
`functions/test/integration/backend-cosmos-integration.test.js`を新規作成:

```javascript
const axios = require('axios');

describe('Backend Cosmos DB Integration Test', () => {
  const baseUrl = 'http://localhost:7071/api';
  
  beforeAll(() => {
    console.log('Starting integration tests...');
    console.log('Make sure Azure Functions is running: npm start');
  });

  describe('Availability API', () => {
    test('should return availability data for specific date', async () => {
      const response = await axios.get(`${baseUrl}/availability/2025-11-15`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('date', '2025-11-15');
      expect(response.data).toHaveProperty('facilities');
      expect(Array.isArray(response.data.facilities)).toBe(true);
    });

    test('should return all availability data', async () => {
      const response = await axios.get(`${baseUrl}/availability`);
      
      expect(response.status).toBe(200);
      expect(typeof response.data).toBe('object');
      
      // 少なくとも1つの日付データが存在することを確認
      const dates = Object.keys(response.data);
      expect(dates.length).toBeGreaterThan(0);
    });

    test('should handle non-existent date gracefully', async () => {
      const response = await axios.get(`${baseUrl}/availability/2099-12-31`);
      
      expect(response.status).toBe(200);
      expect(response.data.facilities).toEqual([]);
    });
  });
});
```

#### テスト実行手順
```bash
# Terminal 1: Azure Functions起動
cd functions
npm start

# Terminal 2: 統合テスト実行
cd functions
npm test -- integration/backend-cosmos-integration.test.js

# 期待される結果:
# PASS test/integration/backend-cosmos-integration.test.js
#   Backend Cosmos DB Integration Test
#     Availability API
#       ✓ should return availability data for specific date
#       ✓ should return all availability data
#       ✓ should handle non-existent date gracefully
```

### フェーズ1完了確認チェックリスト

```bash
# すべてのテストを実行
cd functions
npm test

# 期待される結果:
# Test Suites: 4 passed, 4 total
# Tests: 15 passed, 15 total
# Coverage: 85%+
```

✅ 確認項目:
- [ ] 環境変数が正しく設定されている
- [ ] Cosmos DBクライアントのテストが成功
- [ ] リポジトリ層のテストが成功（Cosmos DB & フォールバック）
- [ ] 統合テストが成功
- [ ] データマイグレーションが正常に完了
- [ ] API経由でデータが取得できる

---

## フェーズ2: Scraper移行（約45分）

### 2-1. Python環境設定（10分）

```bash
cd scraper
pip install azure-cosmos
```

`requirements.txt`に追加:
```
azure-cosmos==4.5.0
```

### 2-2. Cosmos DB書き込みモジュール作成とテスト（25分）

#### 実装
`scraper/src/cosmos_writer.py`を新規作成:

```python
import os
from datetime import datetime
from typing import Dict, List
from azure.cosmos import CosmosClient, exceptions
from dotenv import load_dotenv

load_dotenv()

class CosmosWriter:
    def __init__(self):
        endpoint = os.getenv('COSMOS_ENDPOINT')
        key = os.getenv('COSMOS_KEY')
        database_name = os.getenv('COSMOS_DATABASE', 'studio-reservations')
        
        if not endpoint or not key:
            raise ValueError("Cosmos DB connection settings are missing")
        
        self.client = CosmosClient(endpoint, key)
        self.database = self.client.get_database_client(database_name)
        self.container = self.database.get_container_client('availability')
    
    def save_availability(self, date: str, facilities: List[Dict]) -> bool:
        """
        空き状況データをCosmos DBに保存
        
        Args:
            date: YYYY-MM-DD形式の日付
            facilities: 施設データのリスト
        
        Returns:
            成功時True
        """
        try:
            for facility in facilities:
                # facility IDを生成
                facility_id = self._generate_facility_id(facility['facilityName'])
                
                # Cosmos DB用のデータ構造
                item = {
                    'id': f"{date}_{facility_id}",
                    'partitionKey': date,
                    'date': date,
                    'facility': facility_id,
                    'facilityName': facility['facilityName'],
                    'timeSlots': facility['timeSlots'],
                    'updatedAt': facility.get('lastUpdated', datetime.utcnow().isoformat() + 'Z'),
                    'dataSource': 'scraping'
                }
                
                # upsert（存在する場合は更新、なければ作成）
                self.container.upsert_item(body=item)
                print(f"Saved to Cosmos DB: {date} - {facility['facilityName']}")
            
            return True
            
        except exceptions.CosmosHttpResponseError as e:
            print(f"Cosmos DB error: {e.message}")
            return False
        except Exception as e:
            print(f"Unexpected error: {e}")
            return False
    
    def _generate_facility_id(self, facility_name: str) -> str:
        """施設名からIDを生成"""
        if "本郷" in facility_name:
            return "ensemble-hongo"
        elif "初台" in facility_name:
            return "ensemble-hatsudai"
        else:
            # その他の施設用
            return facility_name.lower().replace(' ', '-').replace('(', '').replace(')', '')
```

#### テスト実装
`scraper/tests/test_cosmos_writer.py`を新規作成:

```python
import unittest
from unittest.mock import Mock, patch, MagicMock
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.cosmos_writer import CosmosWriter

class TestCosmosWriter(unittest.TestCase):
    
    @patch.dict(os.environ, {
        'COSMOS_ENDPOINT': 'https://test.documents.azure.com:443/',
        'COSMOS_KEY': 'test-key',
        'COSMOS_DATABASE': 'test-db'
    })
    @patch('src.cosmos_writer.CosmosClient')
    def setUp(self, mock_cosmos_client):
        """テスト用のセットアップ"""
        # Cosmos DBクライアントのモック
        self.mock_client = MagicMock()
        self.mock_database = MagicMock()
        self.mock_container = MagicMock()
        
        mock_cosmos_client.return_value = self.mock_client
        self.mock_client.get_database_client.return_value = self.mock_database
        self.mock_database.get_container_client.return_value = self.mock_container
        
        self.writer = CosmosWriter()
    
    def test_save_availability_success(self):
        """正常にデータが保存できることを確認"""
        # テストデータ
        test_date = '2025-11-15'
        test_facilities = [
            {
                'facilityName': 'あんさんぶるStudio和(本郷)',
                'timeSlots': {
                    '9-12': 'available',
                    '13-17': 'booked',
                    '18-21': 'available'
                },
                'lastUpdated': '2025-08-25T10:00:00Z'
            }
        ]
        
        # upsert_itemが成功することをモック
        self.mock_container.upsert_item.return_value = {'id': 'test'}
        
        # 実行
        result = self.writer.save_availability(test_date, test_facilities)
        
        # 検証
        self.assertTrue(result)
        self.mock_container.upsert_item.assert_called_once()
        
        # upsertに渡されたデータを検証
        call_args = self.mock_container.upsert_item.call_args
        saved_item = call_args.kwargs['body']
        
        self.assertEqual(saved_item['id'], '2025-11-15_ensemble-hongo')
        self.assertEqual(saved_item['date'], '2025-11-15')
        self.assertEqual(saved_item['facilityName'], 'あんさんぶるStudio和(本郷)')
        self.assertEqual(saved_item['timeSlots']['13-17'], 'booked')
    
    def test_save_availability_cosmos_error(self):
        """Cosmos DBエラー時の処理を確認"""
        from azure.cosmos import exceptions
        
        # エラーをシミュレート
        self.mock_container.upsert_item.side_effect = exceptions.CosmosHttpResponseError(
            status_code=500,
            message='Internal Server Error'
        )
        
        test_facilities = [{'facilityName': 'test', 'timeSlots': {}}]
        
        # 実行
        result = self.writer.save_availability('2025-11-15', test_facilities)
        
        # エラー時はFalseが返される
        self.assertFalse(result)
    
    def test_generate_facility_id(self):
        """施設IDの生成ロジックを確認"""
        test_cases = [
            ('あんさんぶるStudio和(本郷)', 'ensemble-hongo'),
            ('あんさんぶるStudio音(初台)', 'ensemble-hatsudai'),
            ('Other Studio Name', 'other-studio-name')
        ]
        
        for facility_name, expected_id in test_cases:
            result = self.writer._generate_facility_id(facility_name)
            self.assertEqual(result, expected_id)
    
    @patch.dict(os.environ, {})
    def test_missing_connection_settings(self):
        """接続設定が不足している場合のエラー"""
        with self.assertRaises(ValueError) as context:
            CosmosWriter()
        
        self.assertIn('Cosmos DB connection settings are missing', str(context.exception))

if __name__ == '__main__':
    unittest.main()
```

#### テスト実行と確認
```bash
cd scraper
python -m pytest tests/test_cosmos_writer.py -v

# 期待される結果:
# tests/test_cosmos_writer.py::TestCosmosWriter::test_save_availability_success PASSED
# tests/test_cosmos_writer.py::TestCosmosWriter::test_save_availability_cosmos_error PASSED
# tests/test_cosmos_writer.py::TestCosmosWriter::test_generate_facility_id PASSED
# tests/test_cosmos_writer.py::TestCosmosWriter::test_missing_connection_settings PASSED
# ========================= 4 passed in 0.5s =========================
```

### 2-3. スクレイパー本体の修正とテスト（15分）

#### 実装

`scraper/src/scraper.py`の`scrape_and_save`メソッドを更新:

```python
def scrape_and_save(self, date: str, output_path: Optional[str] = None) -> Dict:
    """
    指定日付の空き状況をスクレイピングして保存
    
    Args:
        date: "YYYY-MM-DD"形式の日付文字列
        output_path: 出力先パス（省略時はCosmos DBに保存）
    
    Returns:
        保存したデータ
    """
    # スクレイピング実行
    facilities = self.scrape_availability(date)
    
    # Cosmos DBに保存を試みる
    try:
        from cosmos_writer import CosmosWriter
        writer = CosmosWriter()
        if writer.save_availability(date, facilities):
            print(f"Successfully saved to Cosmos DB: {date}")
        else:
            print("Failed to save to Cosmos DB, falling back to JSON file")
            output_path = output_path or Path(__file__).parent.parent.parent / "shared-data" / "availability.json"
    except Exception as e:
        print(f"Cosmos DB not available: {e}")
        output_path = output_path or Path(__file__).parent.parent.parent / "shared-data" / "availability.json"
    
    # JSONファイルにも保存（移行期間中の暫定対応）
    if output_path:
        existing_data = {}
        if Path(output_path).exists():
            try:
                with open(output_path, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
            except:
                existing_data = {}
        
        if "data" not in existing_data:
            existing_data["data"] = {}
        
        existing_data["lastScraped"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        existing_data["data"][date] = facilities
        
        self.save_to_json(existing_data, str(output_path))
        print(f"Also saved to JSON file: {output_path}")
    
    return {"data": {date: facilities}}
```

### 2-4. メインエントリーポイント修正（5分）

`scraper/src/main.py`に環境変数読み込みを追加（前述のコードと同じ）

### 2-5. Scraperテスト実行と確認（10分）

```bash
# 全テスト実行
cd scraper
python -m pytest tests/ -v

# 期待される結果:
# tests/test_cosmos_writer.py ... 4 passed
# tests/test_scraper.py ... 既存のテストもすべてPASS
# ========================= 10+ passed =========================
```

### フェーズ2完了確認チェックリスト

✅ 確認項目:
- [ ] azure-cosmosパッケージがインストールされている
- [ ] CosmosWriterのテストが成功
- [ ] スクレイパーがCosmos DBに書き込める（フォールバック付き）
- [ ] JSONファイルにも同時保存される（移行期間中）
- [ ] 既存のスクレイパーテストがすべて成功

---

## フェーズ3: 完全移行とクリーンアップ（約15分）

### 3-1. JSONファイル依存の削除（10分）

#### Backend側
`functions/src/repositories/availability-repository.js`からJSONファイル読み込み部分を削除

#### Scraper側  
`scraper/src/scraper.py`からJSONファイル書き込み部分を削除

#### ファイル削除
```bash
rm shared-data/availability.json
```

### 3-2. ドキュメント更新（5分）

- `docs/DEVELOPMENT_SPEC.md`のデータベース設計セクション更新済み
- `README.md`のデータストレージに関する記述を更新
- `CLAUDE.md`の現在の状態セクションを更新

---

## 最終動作確認とシステムテスト

### End-to-Endシステムテスト（20分）

#### 1. Backend動作確認
```bash
# Terminal 1: Azure Functions起動
cd functions
npm start

# Terminal 2: APIテスト
curl http://localhost:7071/api/availability/2025-11-15

# 期待される結果:
# {
#   "date": "2025-11-15",
#   "facilities": [
#     {
#       "facilityName": "あんさんぶるStudio和(本郷)",
#       "timeSlots": { "9-12": "available", "13-17": "booked", "18-21": "available" },
#       "lastUpdated": "2025-08-25T10:00:00Z"
#     }
#   ]
# }
```

#### 2. Scraper動作確認
```bash
cd scraper
python src/main.py --date 2025-11-15

# 期待される結果:
# スクレイピング開始: 2025-11-15
# Saved to Cosmos DB: 2025-11-15 - あんさんぶるStudio和(本郷)
# Saved to Cosmos DB: 2025-11-15 - あんさんぶるStudio音(初台)
# Successfully saved to Cosmos DB: 2025-11-15
# Also saved to JSON file: ../../shared-data/availability.json
# スクレイピング完了
```

#### 3. Frontend統合テスト
```bash
# Terminal 3: Frontend起動
cd frontend
npm start

# ブラウザでhttp://localhost:3000を開く
# 2025-11-15の空き状況が表示されることを確認
```

#### 4. Cosmos DB確認
Azure PortalでData Explorerを開き、以下を確認:
- `availability`コンテナにデータが保存されている
- パーティションキーが正しく設定されている
- クエリが正常に実行できる

```sql
SELECT * FROM c WHERE c.date = '2025-11-15'
```

### パフォーマンステスト

```bash
# レスポンス時間測定
time curl http://localhost:7071/api/availability/2025-11-15

# 期待される結果: 1秒以内にレスポンス
```

### 負荷テスト（オプション）

```bash
# Apache Benchでの簡易負荷テスト
ab -n 100 -c 10 http://localhost:7071/api/availability/2025-11-15

# 期待される結果:
# - 全リクエスト成功（Failed requests: 0）
# - 平均レスポンス時間: 500ms以内
```

---

## トラブルシューティング

### 接続エラー
- 環境変数が正しく設定されているか確認
- Cosmos DBのファイアウォール設定を確認

### データ不整合
- マイグレーションスクリプトを再実行
- Cosmos DBとJSONファイルの両方を確認

### パフォーマンス問題
- パーティションキーが正しく設定されているか確認
- RU/sの設定を確認（無料枠: 1000 RU/s）

---

## ロールバック手順

問題が発生した場合:

1. 環境変数から`COSMOS_ENDPOINT`を削除
2. Backendが自動的にJSONファイルにフォールバック
3. Scraperも自動的にJSONファイル保存に戻る

---

## 移行完了チェックリスト

### 必須確認項目
- [ ] **フェーズ1: Backend完全移行**
  - [ ] 環境変数設定完了
  - [ ] Cosmos DBクライアントテスト成功
  - [ ] リポジトリ層テスト成功
  - [ ] 統合テスト成功
  - [ ] データマイグレーション完了

- [ ] **フェーズ2: Scraper移行**
  - [ ] azure-cosmosインストール完了
  - [ ] CosmosWriterテスト成功
  - [ ] スクレイパーテスト成功
  - [ ] DB書き込み動作確認

- [ ] **フェーズ3: 完全移行**
  - [ ] JSONファイル依存削除
  - [ ] ドキュメント更新完了

- [ ] **システムテスト**
  - [ ] E2Eテスト成功
  - [ ] パフォーマンステスト合格
  - [ ] 本番環境での動作確認

### テストカバレッジ目標
- Backend: 85%以上
- Scraper: 80%以上
- 統合テスト: すべてのAPIエンドポイントをカバー

---

*最終更新: 2025-08-25*