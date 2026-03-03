/**
 * =====================================================================
 * @file            run-migration.js
 * @layer           Database Migration Utility
 * @version         1.1.0
 * @since           2026-02-10
 * @author          System
 * @contributors
 *   - นราธิป แสนทวีสุข
 *
 * @lastModified    2026-03-03
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 *  Utility script สำหรับรัน database migrations
 *  รองรับการเพิ่มคอลัมน์, สร้าง index, และ migrate ข้อมูลเก่า
 *
 * @usage
 *   node run-migration.js
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - Initial implementation Migration Runner
 *     [2026-02-10, System] V 1.0.0
 *   - เพิ่มการรัน migration แบบ inline สำหรับ location snapshot
 *     [2026-03-03, นราธิป แสนทวีสุข] V 1.1.0
 *
 * =====================================================================
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Starting migration...');
  
  // สร้าง connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true, // อนุญาตให้รัน multiple SQL statements
  });

  console.log('✅ Connected to database');

  try {
    // รัน SQL statements โดยตรง (แทนการอ่านไฟล์)
    console.log('📝 Step 1: Adding snapshot columns...');
    
    await connection.query(`
      ALTER TABLE repair_form
      ADD COLUMN rf_building_snapshot VARCHAR(255) DEFAULT NULL COMMENT 'ชื่ออาคาร ณ เวลาที่สร้างใบแจ้งซ่อม',
      ADD COLUMN rf_floor_snapshot VARCHAR(255) DEFAULT NULL COMMENT 'ชื่อชั้น ณ เวลาที่สร้างใบแจ้งซ่อม',
      ADD COLUMN rf_room_snapshot VARCHAR(255) DEFAULT NULL COMMENT 'ชื่อห้อง ณ เวลาที่สร้างใบแจ้งซ่อม'
    `);
    
    console.log('   ✅ Columns added successfully');

    console.log('📝 Step 2: Creating index...');
    
    await connection.query(`
      CREATE INDEX idx_rf_location_snapshot 
      ON repair_form(rf_building_snapshot, rf_floor_snapshot, rf_room_snapshot)
    `);
    
    console.log('   ✅ Index created successfully');

    console.log('📝 Step 3: Migrating existing data...');
    
    const [updateResult] = await connection.query(`
      UPDATE repair_form rf
      LEFT JOIN room r ON rf.rf_room_id = r.room_id
      LEFT JOIN floor f ON r.room_fl_id = f.fl_id
      LEFT JOIN building b ON f.fl_bd_id = b.bd_id
      SET
        rf.rf_building_snapshot = b.bd_name,
        rf.rf_floor_snapshot = f.fl_name,
        rf.rf_room_snapshot = r.room_name
      WHERE rf.rf_building_snapshot IS NULL
    `);
    
    console.log(`   ✅ Updated ${updateResult.affectedRows} existing repair forms`);

    console.log('✅ Migration completed successfully!');

    // เช็คว่าคอลัมน์ถูกสร้างแล้ว
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM repair_form 
      WHERE Field IN ('rf_building_snapshot', 'rf_floor_snapshot', 'rf_room_snapshot')
    `);
    
    console.log(`\n📊 Verification:`);
    console.log(`   Found ${columns.length} new columns:`);
    columns.forEach(col => {
      console.log(`   ✓ ${col.Field} (${col.Type})`);
    });

    // นับจำนวนใบแจ้งซ่อมที่มี snapshot
    const [counts] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN rf_building_snapshot IS NOT NULL THEN 1 ELSE 0 END) as with_snapshot
      FROM repair_form
    `);
    
    console.log(`\n📈 Data Status:`);
    console.log(`   Total repair forms: ${counts[0].total}`);
    console.log(`   With snapshot data: ${counts[0].with_snapshot}`);

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
    console.log('\n✅ Database connection closed');
  }
}

// รัน migration
runMigration()
  .then(() => {
    console.log('\n🎉 Migration script completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
  });
