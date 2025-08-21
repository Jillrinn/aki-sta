const fs = require('fs');
const path = require('path');

const testDataPath = path.join(__dirname, '../fixtures/test-data.json');
const targetPath = path.join(__dirname, '../../shared-data/availability.json');
const backupPath = path.join(__dirname, '../../shared-data/availability.json.e2e-backup');

module.exports = {
  setup: function() {
    try {
      // 既にバックアップが存在する場合は、前回のテストが異常終了した可能性
      if (fs.existsSync(backupPath)) {
        console.warn('⚠️  Previous backup found. Restoring first...');
        this.cleanup();
      }

      // 現在のファイルをバックアップ
      if (fs.existsSync(targetPath)) {
        console.log('📦 Backing up current data...');
        fs.copyFileSync(targetPath, backupPath);
      }

      // テストデータを配置
      console.log('🔧 Setting up test data...');
      fs.copyFileSync(testDataPath, targetPath);
      console.log('✅ Test data ready');
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    }
  },

  cleanup: function() {
    try {
      console.log('🔄 Restoring original data...');
      
      // テストデータを削除
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }

      // バックアップを復元
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, targetPath);
        fs.unlinkSync(backupPath);
        console.log('✅ Original data restored');
      } else {
        console.log('ℹ️  No backup to restore');
      }
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      // クリーンアップ失敗してもテストは継続
    }
  }
};