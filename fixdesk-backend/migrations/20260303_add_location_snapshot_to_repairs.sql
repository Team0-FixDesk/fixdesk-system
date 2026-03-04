-- =====================================================================
-- Migration: เพิ่ม Location Snapshot Fields
-- Version: 1.0.0
-- Date: 2026-03-03
-- Author: AI Assistant (approved by Manager)
-- ---------------------------------------------------------------------
-- Description:
--   เพิ่มคอลัมน์สำหรับเก็บ snapshot ของชื่อสถานที่ (อาคาร/ชั้น/ห้อง)
--   ณ เวลาที่สร้างใบแจ้งซ่อม เพื่อรักษาความถูกต้องของข้อมูลประวัติ
--   แม้ว่าชื่อสถานที่จะถูกแก้ไขในภายหลัง
--
--   Problem:
--     - ใบแจ้งซ่อมเก่าแสดงชื่อสถานที่แบบ real-time จาก FK
--     - เมื่อแก้ไขชื่ออาคาร "A" → "B" ใบเก่าจะแสดง "B" ทั้งหมด
--
--   Solution:
--     - Snapshot Approach: เก็บชื่อสถานที่ ณ เวลาที่สร้าง
--     - ใบแจ้งซ่อมจะแสดงชื่อที่ถูกต้องตามประวัติ
-- =====================================================================

-- เพิ่มคอลัมน์ snapshot สำหรับชื่อสถานที่
ALTER TABLE repair_form
ADD COLUMN rf_building_snapshot VARCHAR(255) DEFAULT NULL COMMENT 'ชื่ออาคาร ณ เวลาที่สร้างใบแจ้งซ่อม',
ADD COLUMN rf_floor_snapshot VARCHAR(255) DEFAULT NULL COMMENT 'ชื่อชั้น ณ เวลาที่สร้างใบแจ้งซ่อม',
ADD COLUMN rf_room_snapshot VARCHAR(255) DEFAULT NULL COMMENT 'ชื่อห้อง ณ เวลาที่สร้างใบแจ้งซ่อม';

-- สร้าง index สำหรับการ query ที่เร็วขึ้น (optional but recommended)
CREATE INDEX idx_rf_location_snapshot ON repair_form(rf_building_snapshot, rf_floor_snapshot, rf_room_snapshot);

-- =====================================================================
-- Data Migration: อัปเดตข้อมูลเก่าให้มี snapshot จากข้อมูลปัจจุบัน
-- =====================================================================
-- สำหรับใบแจ้งซ่อมที่มีอยู่แล้ว ให้บันทึกชื่อปัจจุบันเป็น snapshot
-- (เพื่อไม่ให้ null และป้องกัน breaking change)

UPDATE repair_form rf
LEFT JOIN room r ON rf.rf_room_id = r.room_id
LEFT JOIN floor f ON r.room_fl_id = f.fl_id
LEFT JOIN building b ON f.fl_bd_id = b.bd_id
SET
  rf.rf_building_snapshot = b.bd_name,
  rf.rf_floor_snapshot = f.fl_name,
  rf.rf_room_snapshot = r.room_name
WHERE rf.rf_building_snapshot IS NULL;

-- =====================================================================
-- Rollback Instructions
-- =====================================================================
-- หากต้องการ rollback migration นี้:
--
-- DROP INDEX idx_rf_location_snapshot ON repair_form;
-- ALTER TABLE repair_form
-- DROP COLUMN rf_building_snapshot,
-- DROP COLUMN rf_floor_snapshot,
-- DROP COLUMN rf_room_snapshot;
-- =====================================================================
