module.exports = (db) => {
  return {
    /* ================== BUILDING (อาคาร) ================== */
    async getAllBuildings() {
      const sql =
        "SELECT bd_id AS building_id, bd_name AS building_name FROM building ORDER BY bd_id ASC";
      return new Promise((resolve, reject) => {
        db.query(sql, (err, res) => (err ? reject(err) : resolve(res)));
      });
    },

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

    /* ================== FLOOR (ชั้น) ================== */
    async getFloorsByBuilding(buildingId) {
      const sql =
        "SELECT fl_id AS floor_id, fl_name AS floor_name FROM floor WHERE fl_bd_id = ? ORDER BY fl_id ASC";
      return new Promise((resolve, reject) => {
        db.query(sql, [buildingId], (err, res) =>
          err ? reject(err) : resolve(res),
        );
      });
    },

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

    /* ================== ROOM (ห้อง) ================== */
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

    async getRoomsByFloor(floorId) {
      const sql =
        "SELECT room_id AS room_id, room_name AS room_name FROM room WHERE room_fl_id = ? ORDER BY room_id ASC";
      return new Promise((resolve, reject) => {
        db.query(sql, [floorId], (err, res) =>
          err ? reject(err) : resolve(res),
        );
      });
    },

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

    /* ================== IMPORT & EXPORT ================== */
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
  };
};
