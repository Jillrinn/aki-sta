const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

describe('API Integration Tests', () => {
  let funcProcess;
  const TEST_PORT = '7073'; // テスト用の別ポート（7073を使用）
  const API_URL = `http://localhost:${TEST_PORT}`;
  const STARTUP_TIMEOUT = 30000; // 30秒
  
  // ポートをクリーンアップする関数
  const cleanupPort = async () => {
    const { exec } = require('child_process');
    return new Promise((resolve) => {
      // macOS/Linux でポートを使用しているプロセスを終了
      exec(`lsof -ti :${TEST_PORT} | xargs kill -9 2>/dev/null || true`, (error) => {
        // エラーは無視（プロセスが存在しない場合など）
        resolve();
      });
    });
  };
  
  // APIエンドポイントの準備状態を確認する関数
  const waitForApi = async (url, timeout) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        // ヘルスチェック的なリクエストを送信
        await axios.get(url, { timeout: 1000 });
        return true;
      } catch (error) {
        // まだ準備できていない場合は待機
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    return false;
  };
  
  beforeAll(async () => {
    // 既存のプロセスをクリーンアップ
    console.log(`Cleaning up port ${TEST_PORT}...`);
    await cleanupPort();
    await new Promise(resolve => setTimeout(resolve, 1000)); // クリーンアップ後の待機
    
    // Azure Functionsを起動（テスト用ポートで）
    console.log(`Starting Azure Functions on port ${TEST_PORT}...`);
    funcProcess = spawn('func', ['start', '--port', TEST_PORT], {
      cwd: path.join(__dirname, '../..'),
      stdio: 'pipe'
    });
    
    // プロセスエラー処理
    funcProcess.on('error', (error) => {
      console.error('Failed to start Azure Functions:', error);
    });
    
    funcProcess.on('exit', (code, signal) => {
      if (code !== null) {
        console.log(`Azure Functions exited with code ${code}`);
      }
      if (signal !== null) {
        console.log(`Azure Functions was killed with signal ${signal}`);
      }
    });
    
    // 起動ログを監視
    let hasStartedWorker = false;
    let hasFunctionsListed = false;
    
    funcProcess.stdout.on('data', (data) => {
      const output = data.toString();

      // 起動段階のチェック
      if (output.includes('Worker process started and initialized')) {
        hasStartedWorker = true;
      }
      if (output.includes('Functions:')) {
        hasFunctionsListed = true;
      }
    });
    
    funcProcess.stderr.on('data', (data) => {
      console.error('[Azure Functions Error]', data.toString().trim());
    });
    
    // 起動シグナルを待つ（ログ出力ベース）
    const logCheckStartTime = Date.now();
    while ((!hasStartedWorker || !hasFunctionsListed) && 
           Date.now() - logCheckStartTime < STARTUP_TIMEOUT / 2) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 実際にAPIが応答するまで待つ
    console.log('Waiting for API to be ready...');
    const isApiReady = await waitForApi(`${API_URL}/api/availability/2025-11-15`, STARTUP_TIMEOUT / 2);
    
    if (!isApiReady) {
      // 起動に失敗した場合はプロセスをクリーンアップ
      if (funcProcess) {
        funcProcess.kill('SIGKILL');
      }
      throw new Error('Azure Functions API did not become ready within timeout');
    }
    
    console.log('Azure Functions is ready and responding');
  }, STARTUP_TIMEOUT + 5000);
  
  afterAll(async () => {
    if (funcProcess) {
      console.log('Stopping Azure Functions...');
      
      // まずSIGTERMで正常終了を試みる
      funcProcess.kill('SIGTERM');
      
      // プロセスが終了するまで待つ（最大5秒）
      let exited = false;
      const exitPromise = new Promise((resolve) => {
        funcProcess.on('exit', () => {
          exited = true;
          resolve();
        });
      });
      
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
      
      await Promise.race([exitPromise, timeoutPromise]);
      
      // まだ終了していない場合は強制終了
      if (!exited) {
        console.log('Force killing Azure Functions...');
        funcProcess.kill('SIGKILL');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 最後にポートをクリーンアップ
      await cleanupPort();
      console.log('Azure Functions stopped');
    }
  });
  
  describe('GET /api/availability/{date}', () => {
    test('should return 200 with valid date', async () => {
      const response = await axios.get(`${API_URL}/api/availability/2025-11-15`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('date', '2025-11-15');
      expect(response.data).toHaveProperty('facilities');
      expect(Array.isArray(response.data.facilities)).toBe(true);
    });
    
    test('should return 200 with empty array for unknown date', async () => {
      const response = await axios.get(`${API_URL}/api/availability/2099-12-31`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('date', '2099-12-31');
      expect(response.data.facilities).toEqual([]);
    });
    
    test('should return 400 for missing date parameter', async () => {
      try {
        // URLの末尾に/を付けないとAzure Functionsが404を返す場合がある
        await axios.get(`${API_URL}/api/availability/`);
        fail('Should have thrown an error');
      } catch (error) {
        // Azure Functionsは無効なルートに対して404を返す可能性がある
        expect([400, 404]).toContain(error.response.status);
      }
    });
    
    test('should include CORS headers', async () => {
      const response = await axios.get(`${API_URL}/api/availability/2025-11-15`);
      
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['content-type']).toContain('application/json');
    });
    
    test('should handle concurrent requests', async () => {
      const dates = ['2025-11-15', '2025-11-16', '2025-11-17'];
      const requests = dates.map(date => 
        axios.get(`${API_URL}/api/availability/${date}`)
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.data.date).toBe(dates[index]);
      });
    });
  });
  
  describe('Health check', () => {
    test('Azure Functions should be responsive', async () => {
      // Azure Functionsのベースパスにアクセス
      try {
        const response = await axios.get(`${API_URL}/`);
        // ステータスコードが返ってくることを確認（内容は問わない）
        expect(response.status).toBeDefined();
      } catch (error) {
        // 404でも正常（ルートハンドラーがない場合）
        expect(error.response.status).toBeDefined();
      }
    });
  });
});