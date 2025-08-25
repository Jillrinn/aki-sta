const fs = require('fs');
const path = require('path');
const cosmosClient = require('../src/repositories/cosmos-client');
require('dotenv').config();

async function migrateAvailabilityData() {
  console.log('Starting data migration to Cosmos DB...');
  
  try {
    // Cosmos DBの初期化
    await cosmosClient.initialize();
    const container = cosmosClient.getContainer('availability');
    
    // JSONファイルからデータを読み込み
    const jsonPath = path.join(__dirname, '../../shared-data/availability.json');
    
    if (!fs.existsSync(jsonPath)) {
      console.log('No data file found to migrate');
      return;
    }
    
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(jsonContent);
    
    if (!data.data) {
      console.log('Invalid data structure in JSON file');
      return;
    }
    
    // データを変換してCosmos DBに保存
    let successCount = 0;
    let errorCount = 0;
    
    for (const [date, facilities] of Object.entries(data.data)) {
      for (const facility of facilities) {
        const cosmosDocument = {
          id: `${date}_${facility.facilityName.replace(/[()]/g, '-').replace(/\s+/g, '')}`,
          date: date,
          facilityName: facility.facilityName,
          timeSlots: facility.timeSlots,
          updatedAt: facility.lastUpdated || new Date().toISOString(),
          partitionKey: date
        };
        
        try {
          await container.items.upsert(cosmosDocument);
          console.log(`✓ Migrated: ${cosmosDocument.id}`);
          successCount++;
        } catch (error) {
          console.error(`✗ Failed to migrate ${cosmosDocument.id}:`, error.message);
          errorCount++;
        }
      }
    }
    
    console.log(`\nMigration completed:`);
    console.log(`  ✓ Success: ${successCount} documents`);
    console.log(`  ✗ Failed: ${errorCount} documents`);
    
    if (errorCount === 0) {
      console.log('\nAll data migrated successfully!');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  migrateAvailabilityData()
    .then(() => {
      console.log('\nMigration process finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

module.exports = { migrateAvailabilityData };