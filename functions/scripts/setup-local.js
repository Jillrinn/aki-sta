#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function setupLocalSettings() {
  console.log(`${colors.blue}🔧 ローカル開発環境のセットアップを開始します...${colors.reset}\n`);

  const templatePath = path.join(__dirname, '..', 'local.settings.json.template');
  const targetPath = path.join(__dirname, '..', 'local.settings.json');

  // テンプレートファイルの存在確認
  if (!fs.existsSync(templatePath)) {
    console.error(`${colors.red}❌ エラー: テンプレートファイルが見つかりません${colors.reset}`);
    console.error(`   パス: ${templatePath}`);
    process.exit(1);
  }

  // local.settings.jsonが既に存在する場合
  if (fs.existsSync(targetPath)) {
    console.log(`${colors.yellow}⚠️  local.settings.json は既に存在します${colors.reset}`);
    console.log(`   パス: ${targetPath}`);
    console.log(`\n${colors.green}✅ セットアップ済みです。すぐに開発を開始できます！${colors.reset}`);
    console.log(`\n次のステップ:`);
    console.log(`  ${colors.blue}npm start${colors.reset} でAzure Functionsを起動`);
    return;
  }

  // テンプレートからlocal.settings.jsonを作成
  try {
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    fs.writeFileSync(targetPath, templateContent, 'utf8');
    
    console.log(`${colors.green}✅ local.settings.json を作成しました${colors.reset}`);
    console.log(`   パス: ${targetPath}`);
    
    console.log(`\n${colors.yellow}⚠️  重要: 接続情報を設定してください${colors.reset}`);
    console.log(`\n以下の値を実際の接続情報に更新してください:`);
    console.log(`  - COSMOS_ENDPOINT: Cosmos DBのエンドポイントURL`);
    console.log(`  - COSMOS_KEY: Cosmos DBのプライマリキー`);
    console.log(`  - COSMOS_DATABASE: データベース名`);
    
    console.log(`\n${colors.blue}💡 ヒント:${colors.reset}`);
    console.log(`  Azure Portalからコピーした接続情報を`);
    console.log(`  ${targetPath} に直接貼り付けてください`);
    
  } catch (error) {
    console.error(`${colors.red}❌ エラー: ファイルの作成に失敗しました${colors.reset}`);
    console.error(`   ${error.message}`);
    process.exit(1);
  }

  console.log(`\n${colors.green}✨ セットアップ完了！${colors.reset}`);
  console.log(`\n次のステップ:`);
  console.log(`  1. ${colors.blue}local.settings.json${colors.reset} を編集して接続情報を設定`);
  console.log(`  2. ${colors.blue}npm start${colors.reset} でAzure Functionsを起動`);
  console.log(`  3. ${colors.blue}node test-cosmos-connection.js${colors.reset} で接続テスト（オプション）`);
}

// メイン実行
if (require.main === module) {
  setupLocalSettings();
}

module.exports = { setupLocalSettings };