/**
 * =====================================================================
 * @file            location.service.js
 * @layer           Service Layer (Business Logic Layer)
 * @version         1.2.0
 * @since           2026-02-18
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *   - นราธิป แสนทวีสุข
 *
 * @lastModified    2026-03-03
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 *  Service สำหรับจัดการข้อมูลสถานที่ (Location Management)
 *  ประกอบด้วย Building, Floor, และ Room
 *
 *  ทำหน้าที่:
 *    - จัดการ CRUD ของอาคาร ชั้น และห้อง
 *    - ตรวจสอบความถูกต้องของข้อมูล
 *    - ตรวจสอบ Dependency ก่อนลบข้อมูล
 *    - Import ข้อมูลสถานที่แบบ batch โดยใช้ Transaction
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - Initial implementation Location Service ตาม Layered Architecture
 *     [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *   - แก้ไขการจัดการ transaction ของฐานข้อมูลในการ import locations
 *     [2026-02-13, นราธิป แสนทวีสุข] V 1.1.0
 *   - feat(location): เพิ่ม checkUsageInRepairs() เพื่อตรวจสอบการใช้งานสถานที่ในใบแจ้งซ่อมก่อนแก้ไข/ลบ
 *     [2026-03-03, นราธิป แสนทวีสุข] V 1.2.0
 *
 * =====================================================================
 */

/**
 * Location Service Module
 * จัดการ Business Logic สำหรับระบบ Location
 *
 * @param {Object} db - Database connection instance
 * @returns {Object} Location Service Functions
 */
module.exports = (db) => {
  return {
    /* ================== BUILDING SERVICE ================== */
    /**
     * ดึงรายการอาคารทั้งหมด
     * @returns {Promise<Array>}
     */
    async getAllBuildings() {
      const sql =
        "SELECT bd_id AS building_id, bd_name AS building_name FROM building ORDER BY bd_id ASC";
      return new Promise((resolve, reject) => {
        db.query(sql, (err, res) => (err ? reject(err) : resolve(res)));
      });
    },

    /**
     * สร้างอาคารใหม่
     * ตรวจสอบชื่อซ้ำก่อนเพิ่ม
     * @param {string} buildingName - ชื่ออาคาร
     * @throws {Error} DUPLICATE_NAME
     * @returns {Promise<number>} ID ของอาคารที่สร้าง
     */
    async createBuilding(buildingName) {
      // 1. เช็คว่าชื่อซ้ำไหม
      const checkSql =
        "SELECT COUNT(*) as count FROM building WHERE LOWER(bd_name) = LOWER(?)";
      const [checkResult] = await db.promise().query(checkSql, [buildingName]);

      if (checkResult[0].count > 0) {
        throw new Error("DUPLICATE_NAME");
      }

      // 2. ถ้าไม่ซ้ำ ก็เพิ่มลงฐานข้อมูล
      const insertSql = "INSERT INTO building (bd_name) VALUES (?)";
      const [result] = await db.promise().query(insertSql, [buildingName]);
      return result.insertId;
    },

    /**
     * อัปเดตข้อมูลอาคาร
     * @param {number} id - ID อาคาร
     * @param {string} buildingName - ชื่ออาคารใหม่
     *
     * @throws {Error} NOT_FOUND
     * @throws {Error} DUPLICATE_NAME
     *
     * @returns {Promise<boolean>}
     */
    async updateBuilding(id, buildingName) {
      // 1. เช็คชื่อซ้ำ (ที่ไม่ใช่ตัวเอง)
      const checkSql =
        "SELECT COUNT(*) as count FROM building WHERE LOWER(bd_name) = LOWER(?) AND bd_id != ?";
      const [checkResult] = await db
        .promise()
        .query(checkSql, [buildingName, id]);

      if (checkResult[0].count > 0) {
        throw new Error("DUPLICATE_NAME");
      }

      // 2. อัปเดตข้อมูล
      const updateSql = "UPDATE building SET bd_name = ? WHERE bd_id = ?";
      const [result] = await db.promise().query(updateSql, [buildingName, id]);

      if (result.affectedRows === 0) throw new Error("NOT_FOUND");
      return true;
    },

    /**
     * ลบอาคาร
     * ตรวจสอบว่ามี Floor ใช้งานอยู่หรือไม่
     * @param {number} id - ID อาคาร
     *
     * @throws {Error} NOT_FOUND
     * @throws {Error} DEPENDENCY_EXISTS
     *
     * @returns {Promise<boolean>}
     */
    async deleteBuilding(id) {
      // 1. เช็คว่ามี "ชั้น" เชื่อมอยู่ไหม
      const checkSql = "SELECT COUNT(*) as count FROM floor WHERE fl_bd_id = ?";
      const [checkResult] = await db.promise().query(checkSql, [id]);

      if (checkResult[0].count > 0) {
        throw new Error("DEPENDENCY_EXISTS");
      }

      // 2. ลบอาคาร
      const deleteSql = "DELETE FROM building WHERE bd_id = ?";
      const [result] = await db.promise().query(deleteSql, [id]);

      if (result.affectedRows === 0) throw new Error("NOT_FOUND");
      return true;
    },

    /* ================== FLOOR SERVICE ================== */
    /**
     * ดึงรายการชั้นตาม Building
     * @param {number} buildingId - ID อาคาร
     * @returns {Promise<Array>}
     */
    async getFloorsByBuilding(buildingId) {
      const sql =
        "SELECT fl_id AS floor_id, fl_name AS floor_name FROM floor WHERE fl_bd_id = ? ORDER BY fl_id ASC";
      return new Promise((resolve, reject) => {
        db.query(sql, [buildingId], (err, res) =>
          err ? reject(err) : resolve(res),
        );
      });
    },

    /**
     * ดึงรายการชั้นทั้งหมด
     * @returns {Promise<Array>}
     */
    async getAllFloors() {
      const sql = `
          SELECT f.fl_id AS floor_id, f.fl_name AS floor_name, f.fl_bd_id AS building_id, b.bd_name AS building_name
          FROM floor f LEFT JOIN building b ON f.fl_bd_id = b.bd_id
          ORDER BY b.bd_name, f.fl_name
        `;
      return new Promise((resolve, reject) => {
        db.query(sql, (err, res) => (err ? reject(err) : resolve(res)));
      });
    },

    /**
     * สร้างชั้นใหม่
     * ตรวจสอบ Building และชื่อซ้ำ
     * @param {string} floorName - ชื่อชั้น
     * @param {number} buildingId - ID อาคาร
     *
     * @throws {Error} PARENT_NOT_FOUND
     * @throws {Error} DUPLICATE_NAME
     *
     * @returns {Promise<number>} ID ชั้นใหม่
     */
    async createFloor(floorName, buildingId) {
      // 1. เช็คว่าตึกมีจริงไหม
      const checkBuildingSql =
        "SELECT COUNT(*) as count FROM building WHERE bd_id = ?";
      const [bCheck] = await db.promise().query(checkBuildingSql, [buildingId]);
      if (bCheck[0].count === 0) throw new Error("PARENT_NOT_FOUND");

      // 2. เช็คชื่อซ้ำในตึกเดียวกัน
      const checkNameSql =
        "SELECT COUNT(*) as count FROM floor WHERE LOWER(fl_name) = LOWER(?) AND fl_bd_id = ?";
      const [nCheck] = await db
        .promise()
        .query(checkNameSql, [floorName, buildingId]);
      if (nCheck[0].count > 0) throw new Error("DUPLICATE_NAME");

      // 3. สร้างชั้น
      const insertSql = "INSERT INTO floor (fl_name, fl_bd_id) VALUES (?, ?)";
      const [result] = await db
        .promise()
        .query(insertSql, [floorName, buildingId]);
      return result.insertId;
    },

    /**
     * อัปเดตข้อมูลชั้น
     * @param {number} id - ID ชั้น
     * @param {string} floorName - ชื่อชั้น
     * @param {number} buildingId - ID อาคาร
     *
     * @throws {Error} NOT_FOUND
     * @throws {Error} PARENT_NOT_FOUND
     * @throws {Error} DUPLICATE_NAME
     *
     * @returns {Promise<boolean>}
     */
    async updateFloor(id, floorName, buildingId) {
      // Logic คล้าย createFloor แต่เพิ่มการเช็ค id ตัวเอง
      const checkBuildingSql =
        "SELECT COUNT(*) as count FROM building WHERE bd_id = ?";
      const [bCheck] = await db.promise().query(checkBuildingSql, [buildingId]);
      if (bCheck[0].count === 0) throw new Error("PARENT_NOT_FOUND");

      const checkNameSql =
        "SELECT COUNT(*) as count FROM floor WHERE LOWER(fl_name) = LOWER(?) AND fl_bd_id = ? AND fl_id != ?";
      const [nCheck] = await db
        .promise()
        .query(checkNameSql, [floorName, buildingId, id]);
      if (nCheck[0].count > 0) throw new Error("DUPLICATE_NAME");

      const updateSql =
        "UPDATE floor SET fl_name = ?, fl_bd_id = ? WHERE fl_id = ?";
      const [result] = await db
        .promise()
        .query(updateSql, [floorName, buildingId, id]);

      if (result.affectedRows === 0) throw new Error("NOT_FOUND");
      return true;
    },

    /**
     * ลบชั้น
     * ตรวจสอบว่ามี Room ใช้งานอยู่หรือไม่
     * @param {number} id - ID ชั้น
     *
     * @throws {Error} NOT_FOUND
     * @throws {Error} DEPENDENCY_EXISTS
     *
     * @returns {Promise<boolean>}
     */
    async deleteFloor(id) {
      // เช็คว่ามี "ห้อง" เชื่อมอยู่ไหม
      const checkSql =
        "SELECT COUNT(*) as count FROM room WHERE room_fl_id = ?";
      const [checkResult] = await db.promise().query(checkSql, [id]);

      if (checkResult[0].count > 0) throw new Error("DEPENDENCY_EXISTS");

      const deleteSql = "DELETE FROM floor WHERE fl_id = ?";
      const [result] = await db.promise().query(deleteSql, [id]);

      if (result.affectedRows === 0) throw new Error("NOT_FOUND");
      return true;
    },

    /* ================== ROOM SERVICE ================== */
    /**
     * ดึงรายการห้องทั้งหมด
     * @returns {Promise<Array>}
     */
    async getAllRooms() {
      const sql = `
            SELECT r.room_id AS room_id, r.room_name AS room_name, r.room_fl_id AS floor_id,
              f.fl_name AS floor_name, f.fl_bd_id AS building_id, b.bd_name AS building_name
            FROM room r
            LEFT JOIN floor f ON r.room_fl_id = f.fl_id
            LEFT JOIN building b ON f.fl_bd_id = b.bd_id
            ORDER BY b.bd_name, f.fl_name, r.room_name
        `;
      return new Promise((resolve, reject) => {
        db.query(sql, (err, res) => (err ? reject(err) : resolve(res)));
      });
    },

    /**
     * ดึงรายการห้องตาม Floor
     * @param {number} floorId - ID ชั้น
     * @returns {Promise<Array>}
     */
    async getRoomsByFloor(floorId) {
      const sql =
        "SELECT room_id AS room_id, room_name AS room_name FROM room WHERE room_fl_id = ? ORDER BY room_id ASC";
      return new Promise((resolve, reject) => {
        db.query(sql, [floorId], (err, res) =>
          err ? reject(err) : resolve(res),
        );
      });
    },

    /**
     * สร้างห้องใหม่
     * ตรวจสอบ Floor และชื่อซ้ำ
     * @param {string} roomName - ชื่อห้อง
     * @param {number} floorId - ID ชั้น
     *
     * @throws {Error} PARENT_NOT_FOUND
     * @throws {Error} DUPLICATE_NAME
     *
     * @returns {Promise<number>} ID ห้องใหม่
     */
    async createRoom(roomName, floorId) {
      // เช็คชั้นมีจริง + ชื่อซ้ำ (Logic เดียวกับ Floor)
      const checkFloorSql =
        "SELECT COUNT(*) as count FROM floor WHERE fl_id = ?";
      const [fCheck] = await db.promise().query(checkFloorSql, [floorId]);
      if (fCheck[0].count === 0) throw new Error("PARENT_NOT_FOUND");

      const checkNameSql =
        "SELECT COUNT(*) as count FROM room WHERE LOWER(room_name) = LOWER(?) AND room_fl_id = ?";
      const [nCheck] = await db
        .promise()
        .query(checkNameSql, [roomName, floorId]);
      if (nCheck[0].count > 0) throw new Error("DUPLICATE_NAME");

      const insertSql =
        "INSERT INTO room (room_name, room_fl_id) VALUES (?, ?)";
      const [result] = await db.promise().query(insertSql, [roomName, floorId]);
      return result.insertId;
    },

    /**
     * อัปเดตข้อมูลห้อง
     * @param {number} id - ID ห้อง
     * @param {string} roomName - ชื่อห้อง
     * @param {number} floorId - ID ชั้น
     *
     * @throws {Error} NOT_FOUND
     * @throws {Error} PARENT_NOT_FOUND
     * @throws {Error} DUPLICATE_NAME
     *
     * @returns {Promise<boolean>}
     */
    async updateRoom(id, roomName, floorId) {
      // Logic Update Room (ตัดทอนให้สั้นลง แต่ Logic เหมือน Create)
      const checkFloorSql =
        "SELECT COUNT(*) as count FROM floor WHERE fl_id = ?";
      const [fCheck] = await db.promise().query(checkFloorSql, [floorId]);
      if (fCheck[0].count === 0) throw new Error("PARENT_NOT_FOUND");

      const checkNameSql =
        "SELECT COUNT(*) as count FROM room WHERE LOWER(room_name) = LOWER(?) AND room_fl_id = ? AND room_id != ?";
      const [nCheck] = await db
        .promise()
        .query(checkNameSql, [roomName, floorId, id]);
      if (nCheck[0].count > 0) throw new Error("DUPLICATE_NAME");

      const updateSql =
        "UPDATE room SET room_name = ?, room_fl_id = ? WHERE room_id = ?";
      const [result] = await db
        .promise()
        .query(updateSql, [roomName, floorId, id]);
      if (result.affectedRows === 0) throw new Error("NOT_FOUND");
      return true;
    },

    /**
     * ลบห้อง
     * ตรวจสอบว่ามี Repair Form ใช้งานอยู่หรือไม่
     * @param {number} id - ID ห้อง
     *
     * @throws {Error} NOT_FOUND
     * @throws {Error} DEPENDENCY_EXISTS
     *
     * @returns {Promise<boolean>}
     */
    async deleteRoom(id) {
      // เช็คว่ามีใบแจ้งซ่อมผูกอยู่ไหม
      const checkSql =
        "SELECT COUNT(*) as count FROM repair_form WHERE rf_room_id = ?";
      const [checkResult] = await db.promise().query(checkSql, [id]);
      if (checkResult[0].count > 0) throw new Error("DEPENDENCY_EXISTS");

      const deleteSql = "DELETE FROM room WHERE room_id = ?";
      const [result] = await db.promise().query(deleteSql, [id]);
      if (result.affectedRows === 0) throw new Error("NOT_FOUND");
      return true;
    },

    /* ================== IMPORT SERVICE ================== */
    /**
     * Import ข้อมูล Location แบบ batch
     * รองรับการสร้าง Building, Floor, Room
     * โดยใช้ Transaction เพื่อความถูกต้องของข้อมูล
     * @param {Array<Object>} locationList - รายการสถานที่
     *
     * @returns {Promise<boolean>}
     */
    async importLocations(locationList) {
      const promisePool = db.promise();
      const connection = await promisePool.getConnection();
      try {
        await connection.beginTransaction();

        for (const loc of locationList) {
          const building = loc.building_name?.trim();
          const floor = loc.floor_name?.trim();
          const room = loc.room_name?.trim();

          if (!building || !floor || !room) continue;

          // 1. จัดการ Building (ถ้าไม่มีก็สร้างใหม่)
          let buildingId;
          const [bRows] = await connection.query(
            "SELECT bd_id FROM building WHERE LOWER(bd_name)=LOWER(?)",
            [building],
          );
          if (bRows.length === 0) {
            const [res] = await connection.query(
              "INSERT INTO building (bd_name) VALUES (?)",
              [building],
            );
            buildingId = res.insertId;
          } else {
            buildingId = bRows[0].bd_id;
          }

          // 2. จัดการ Floor
          let floorId;
          const [fRows] = await connection.query(
            "SELECT fl_id FROM floor WHERE LOWER(fl_name)=LOWER(?) AND fl_bd_id=?",
            [floor, buildingId],
          );
          if (fRows.length === 0) {
            const [res] = await connection.query(
              "INSERT INTO floor (fl_name, fl_bd_id) VALUES (?,?)",
              [floor, buildingId],
            );
            floorId = res.insertId;
          } else {
            floorId = fRows[0].fl_id;
          }

          // 3. จัดการ Room
          const [rRows] = await connection.query(
            "SELECT room_id FROM room WHERE LOWER(room_name)=LOWER(?) AND room_fl_id=?",
            [room, floorId],
          );
          if (rRows.length === 0) {
            await connection.query(
              "INSERT INTO room (room_name, room_fl_id) VALUES (?,?)",
              [room, floorId],
            );
          }
        }

        await connection.commit();
        return true;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    /* ================== USAGE CHECK SERVICE ================== */
    /**
     * เช็คว่า Building, Floor หรือ Room มีการใช้งานในรายการแจ้งซ่อมหรือไม่
     * @param {string} type - ประเภท: 'building', 'floor', 'room'
     * @param {number} id - ID ของ Building, Floor หรือ Room
     * @returns {Promise<{inUse: boolean, count: number}>}
     */
    async checkUsageInRepairs(type, id) {
      let sql;
      
      if (type === 'building') {
        // เช็คว่ามีห้องในอาคารนี้ที่ถูกใช้ในรายการแจ้งซ่อมหรือไม่
        sql = `
          SELECT COUNT(DISTINCT rf.rf_id) as count 
          FROM repair_form rf
          JOIN room r ON rf.rf_room_id = r.room_id
          JOIN floor f ON r.room_fl_id = f.fl_id
          WHERE f.fl_bd_id = ?
        `;
      } else if (type === 'floor') {
        // เช็คว่ามีห้องในชั้นนี้ที่ถูกใช้ในรายการแจ้งซ่อมหรือไม่
        sql = `
          SELECT COUNT(DISTINCT rf.rf_id) as count 
          FROM repair_form rf
          JOIN room r ON rf.rf_room_id = r.room_id
          WHERE r.room_fl_id = ?
        `;
      } else if (type === 'room') {
        // เช็คว่าห้องนี้ถูกใช้ในรายการแจ้งซ่อมหรือไม่
        sql = `
          SELECT COUNT(*) as count 
          FROM repair_form 
          WHERE rf_room_id = ?
        `;
      } else {
        throw new Error('INVALID_TYPE');
      }

      const [result] = await db.promise().query(sql, [id]);
      const count = result[0].count;
      
      return {
        inUse: count > 0,
        count: count
      };
    },
  };
};
