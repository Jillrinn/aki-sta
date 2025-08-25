#!/usr/bin/env node

/**
 * .envファイルの内容をlocal.settings.jsonに同期するスクリプト
 * 
 * 使い方:
 *   node scripts/sync-env.js
 *   npm run sync:env (package.jsonにスクリプト追加後)
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// カラー出力用のANSIコード
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function syncEnvToLocalSettings() {
  console.log(`${colors.blue}🔄 環境変数の同期を開始します...${colors.reset}\n`);

  // .envファイルのパスを解決（functionsディレクトリまたはルートから実行可能）
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '..', '.env'),
    path.join(__dirname, '..', '..', '.env')
  ];

  let envPath = null;
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      envPath = p;
      break;
    }
  }

  if (!envPath) {
    console.error(`${colors.red}❌ エラー: .envファイルが見つかりません${colors.reset}`);
    console.log('  探索したパス:');
    envPaths.forEach(p => console.log(`    - ${p}`));
    process.exit(1);
  }

  console.log(`${colors.green}✅ .envファイル発見:${colors.reset} ${envPath}`);

  // .envファイルを読み込み
  const envConfig = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
  
  // local.settings.jsonのパス
  const localSettingsPath = path.join(__dirname, '..', 'local.settings.json');
  
  // 既存のlocal.settings.jsonを読み込み（存在しない場合はデフォルト値）
  let localSettings = {
    IsEncrypted: false,
    Values: {
      AzureWebJobsStorage: "",
      FUNCTIONS_WORKER_RUNTIME: "node"
    },
    Host: {
      CORS: "*",
      CORSCredentials: false
    }
  };

  if (fs.existsSync(localSettingsPath)) {
    try {
      localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8'));
      console.log(`${colors.green}✅ 既存のlocal.settings.json読み込み完了${colors.reset}`);
    } catch (error) {
      console.warn(`${colors.yellow}⚠️  警告: local.settings.jsonの解析に失敗。デフォルト値を使用します${colors.reset}`);
    }
  } else {
    console.log(`${colors.yellow}⚠️  local.settings.jsonが存在しません。新規作成します${colors.reset}`);
  }

  // Cosmos DB関連の環境変数を同期
  const cosmosVars = ['COSMOS_ENDPOINT', 'COSMOS_KEY', 'COSMOS_DATABASE'];
  let updatedCount = 0;

  console.log(`\n${colors.blue}📝 環境変数を更新中...${colors.reset}`);
  
  cosmosVars.forEach(varName => {
    if (envConfig[varName]) {
      const oldValue = localSettings.Values[varName];
      localSettings.Values[varName] = envConfig[varName];
      
      if (oldValue !== envConfig[varName]) {
        updatedCount++;
        // キーの場合は一部のみ表示
        const displayValue = varName === 'COSMOS_KEY' 
          ? `${envConfig[varName].substring(0, 20)}...` 
          : envConfig[varName];
        console.log(`  ${colors.green}✓${colors.reset} ${varName}: ${displayValue}`);
      } else {
        console.log(`  ${colors.blue}-${colors.reset} ${varName}: 変更なし`);
      }
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} ${varName}: .envに定義されていません`);
    }
  });

  // その他の環境変数も同期（オプション）
  const otherVars = Object.keys(envConfig).filter(key => !cosmosVars.includes(key));
  if (otherVars.length > 0) {
    console.log(`\n${colors.blue}📋 その他の環境変数:${colors.reset}`);
    otherVars.forEach(varName => {
      localSettings.Values[varName] = envConfig[varName];
      console.log(`  ${colors.green}✓${colors.reset} ${varName}`);
    });
  }

  // local.settings.jsonに書き込み
  try {
    fs.writeFileSync(
      localSettingsPath, 
      JSON.stringify(localSettings, null, 2) + '\n',
      'utf8'
    );
    console.log(`\n${colors.green}✅ local.settings.jsonの更新完了!${colors.reset}`);
    console.log(`   更新されたファイル: ${localSettingsPath}`);
    console.log(`   更新された変数: ${updatedCount}個`);
  } catch (error) {
    console.error(`${colors.red}❌ エラー: local.settings.jsonの書き込みに失敗しました${colors.reset}`);
    console.error(`   ${error.message}`);
    process.exit(1);
  }

  // 設定値の検証
  console.log(`\n${colors.blue}🔍 設定値の検証...${colors.reset}`);
  
  if (localSettings.Values.COSMOS_ENDPOINT && 
      localSettings.Values.COSMOS_ENDPOINT.includes('your-account')) {
    console.warn(`${colors.yellow}⚠️  警告: COSMOS_ENDPOINTがサンプル値のままです${colors.reset}`);
  }
  
  if (localSettings.Values.COSMOS_KEY && 
      localSettings.Values.COSMOS_KEY === 'your-primary-key') {
    console.warn(`${colors.yellow}⚠️  警告: COSMOS_KEYがサンプル値のままです${colors.reset}`);
  }

  console.log(`\n${colors.green}✨ 同期完了!${colors.reset}`);
  console.log(`\n次のステップ:`);
  console.log(`  1. ${colors.blue}cd functions${colors.reset}`);
  console.log(`  2. ${colors.blue}node test-cosmos-connection.js${colors.reset} で接続テスト`);
  console.log(`  3. ${colors.blue}npm start${colors.reset} でAzure Functions起動`);
}

// メイン実行
if (require.main === module) {
  syncEnvToLocalSettings();
}

module.exports = { syncEnvToLocalSettings };