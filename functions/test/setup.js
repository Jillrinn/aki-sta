// テスト環境のセットアップ
// 全テストで環境変数を利用可能にする

const path = require('path');
const dotenv = require('dotenv');

// ルートディレクトリの.envファイルを読み込み
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

// 環境変数が正しく読み込まれたことを確認（デバッグ用）
if (process.env.NODE_ENV !== 'test') {
  console.log('Test environment setup completed');
  console.log('COSMOS_ENDPOINT:', process.env.COSMOS_ENDPOINT ? '✓ Set' : '✗ Not set');
  console.log('COSMOS_KEY:', process.env.COSMOS_KEY ? '✓ Set' : '✗ Not set');
  console.log('COSMOS_DATABASE:', process.env.COSMOS_DATABASE || 'Not set');
}