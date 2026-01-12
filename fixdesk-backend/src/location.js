const express = require("express");
const { authMiddleware } = require("../auth.middleware");

module.exports = function LocationRoutes(db) {
  const router = express.Router();

  // เรียกข้อมูลตึกหรืออาคาร
  router.get("/buildings", (req, res) => {
    const query =
      "SELECT bd_id AS building_id, bd_name AS building_name FROM building ORDER BY bd_id ASC";
    db.query(query, (err, results) => {
      if (err)
        return res.status(500).json({ message: "โหลดข้อมูลอาคารไม่สำเร็จ" });
      res.json(results);
    });
  });

  // เพิ่มข้อมูลตึกหรืออาคาร
  router.post("/buildings", authMiddleware, (req, res) => {
    const { bd_name } = req.body;
    if (!bd_name || !bd_name.trim()) {
      return res.status(400).json({ message: "กรุณากรอกชื่ออาคาร" });
    }
    // ตรวจสอบชื่อซ้ำ
    const checkQuery =
      "SELECT COUNT(*) as count FROM building WHERE LOWER(bd_name) = LOWER(?)";
    db.query(checkQuery, [bd_name.trim()], (err, results) => {
      if (err) {
        console.error("Error checking duplicate building:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }
      if (results[0].count > 0) {
        return res
          .status(400)
          .json({ message: "ชื่ออาคารนี้มีอยู่ในระบบแล้ว" });
      }

      const insertQuery = "INSERT INTO building (bd_name) VALUES (?)";
      db.query(insertQuery, [bd_name.trim()], (err, result) => {
        if (err) {
          console.error("Error creating building:", err);
          return res
            .status(500)
            .json({ message: "เกิดข้อผิดพลาดในการเพิ่มอาคาร" });
        }
        res.status(201).json({
          message: "เพิ่มอาคารสำเร็จ",
          bd_id: result.insertId,
          bd_name: bd_name.trim(),
        });
      });
    });
  });

  // แก้ไขข้อมูลตึกหรืออาคาร
  router.put("/buildings/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    const { bd_name } = req.body;
    if (!bd_name || !bd_name.trim()) {
      return res.status(400).json({ message: "กรุณากรอกชื่ออาคาร" });
    }
    // ตรวจสอบชื่อซ้ำ (ยกเว้น record ปัจจุบัน)
    const checkQuery =
      "SELECT COUNT(*) as count FROM building WHERE LOWER(bd_name) = LOWER(?) AND bd_id != ?";
    db.query(checkQuery, [bd_name.trim(), id], (err, results) => {
      if (err) {
        console.error("Error checking duplicate building:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }
      if (results[0].count > 0) {
        return res
          .status(400)
          .json({ message: "ชื่ออาคารนี้มีอยู่ในระบบแล้ว" });
      }

      const updateQuery = "UPDATE building SET bd_name = ? WHERE bd_id = ?";
      db.query(updateQuery, [bd_name.trim(), id], (err, result) => {
        if (err) {
          console.error("Error updating building:", err);
          return res
            .status(500)
            .json({ message: "เกิดข้อผิดพลาดในการแก้ไขอาคาร" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "ไม่พบอาคารที่ต้องการแก้ไข" });
        }
        res.json({ message: "แก้ไขอาคารสำเร็จ" });
      });
    });
  });

  // ลบข้อมูลตึกหรืออาคาร
  router.delete("/buildings/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    // ตรวจสอบว่ามีชั้นในอาคารนี้อยู่หรือไม่
    const checkQuery = "SELECT COUNT(*) as count FROM floor WHERE fl_bd_id = ?";
    db.query(checkQuery, [id], (err, results) => {
      if (err) {
        console.error("Error checking building usage:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }
      if (results[0].count > 0) {
        return res.status(400).json({
          message: "ไม่สามารถลบอาคารนี้ได้ เนื่องจากมีชั้นที่เชื่อมโยงอยู่",
        });
      }

      const deleteQuery = "DELETE FROM building WHERE bd_id = ?";
      db.query(deleteQuery, [id], (err, result) => {
        if (err) {
          console.error("Error deleting building:", err);
          return res
            .status(500)
            .json({ message: "เกิดข้อผิดพลาดในการลบอาคาร" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "ไม่พบอาคารที่ต้องการลบ" });
        }
        res.json({ message: "ลบอาคารสำเร็จ" });
      });
    });
  });

  // เรียกข้อมูลชั้นทั้งหมด (ใหม่)
  router.get("/floors", (req, res) => {
    const query = `
      SELECT 
        f.fl_id AS floor_id, 
        f.fl_name AS floor_name,
        f.fl_bd_id AS building_id,
        b.bd_name AS building_name
      FROM floor f
      LEFT JOIN building b ON f.fl_bd_id = b.bd_id
      ORDER BY b.bd_name, f.fl_name
    `;
    db.query(query, (err, results) => {
      if (err) {
        console.error("Database error (all floors):", err);
        return res.status(500).json({ message: "โหลดข้อมูลชั้นไม่สำเร็จ" });
      }
      res.json(results);
    });
  });

  // เรียกข้อมูลชั้นตามอาคาร
  router.get("/floors/:buildingId", (req, res) => {
    const { buildingId } = req.params;
    const query = `
        SELECT fl_id AS floor_id, fl_name AS floor_name
        FROM floor
        WHERE fl_bd_id = ?
        ORDER BY fl_id ASC
      `;
    db.query(query, [buildingId], (err, results) => {
      if (err) {
        console.error("Database error (floors):", err);
        return res.status(500).json({ message: "โหลดข้อมูลชั้นไม่สำเร็จ" });
      }
      res.json(results);
    });
  });

  // เพิ่มข้อมูลชั้น
  router.post("/floors", authMiddleware, (req, res) => {
    const { fl_name, fl_bd_id } = req.body;
    if (!fl_name || !fl_name.trim() || !fl_bd_id) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }
    // ตรวจสอบว่าอาคารมีอยู่จริง
    const checkBuildingQuery =
      "SELECT COUNT(*) as count FROM building WHERE bd_id = ?";
    db.query(checkBuildingQuery, [fl_bd_id], (err, results) => {
      if (err) {
        console.error("Error checking building:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }
      if (results[0].count === 0) {
        return res.status(400).json({ message: "ไม่พบอาคารที่ระบุ" });
      }
      // ตรวจสอบชื่อชั้นซ้ำในอาคารเดียวกัน
      const checkQuery =
        "SELECT COUNT(*) as count FROM floor WHERE LOWER(fl_name) = LOWER(?) AND fl_bd_id = ?";
      db.query(checkQuery, [fl_name.trim(), fl_bd_id], (err2, results2) => {
        if (err2) {
          console.error("Error checking duplicate floor:", err2);
          return res
            .status(500)
            .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
        }
        if (results2[0].count > 0) {
          return res
            .status(400)
            .json({ message: "ชื่อชั้นนี้มีอยู่ในอาคารนี้แล้ว" });
        }

        const insertQuery =
          "INSERT INTO floor (fl_name, fl_bd_id) VALUES (?, ?)";
        db.query(insertQuery, [fl_name.trim(), fl_bd_id], (err3, result) => {
          if (err3) {
            console.error("Error creating floor:", err3);
            return res
              .status(500)
              .json({ message: "เกิดข้อผิดพลาดในการเพิ่มชั้น" });
          }
          res.status(201).json({
            message: "เพิ่มชั้นสำเร็จ",
            fl_id: result.insertId,
            fl_name: fl_name.trim(),
            fl_bd_id: fl_bd_id,
          });
        });
      });
    });
  });

  // แก้ไขข้อมูลชั้น
  router.put("/floors/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    const { fl_name, fl_bd_id } = req.body;
    if (!fl_name || !fl_name.trim() || !fl_bd_id) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }
    // ตรวจสอบว่าอาคารมีอยู่จริง
    const checkBuildingQuery =
      "SELECT COUNT(*) as count FROM building WHERE bd_id = ?";
    db.query(checkBuildingQuery, [fl_bd_id], (err, results) => {
      if (err) {
        console.error("Error checking building:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }
      if (results[0].count === 0) {
        return res.status(400).json({ message: "ไม่พบอาคารที่ระบุ" });
      }
      // ตรวจสอบชื่อซ้ำในอาคารเดียวกัน (ยกเว้น record ปัจจุบัน)
      const checkQuery =
        "SELECT COUNT(*) as count FROM floor WHERE LOWER(fl_name) = LOWER(?) AND fl_bd_id = ? AND fl_id != ?";
      db.query(checkQuery, [fl_name.trim(), fl_bd_id, id], (err2, results2) => {
        if (err2) {
          console.error("Error checking duplicate floor:", err2);
          return res
            .status(500)
            .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
        }
        if (results2[0].count > 0) {
          return res
            .status(400)
            .json({ message: "ชื่อชั้นนี้มีอยู่ในอาคารนี้แล้ว" });
        }
        const updateQuery =
          "UPDATE floor SET fl_name = ?, fl_bd_id = ? WHERE fl_id = ?";
        db.query(
          updateQuery,
          [fl_name.trim(), fl_bd_id, id],
          (err3, result) => {
            if (err3) {
              console.error("Error updating floor:", err3);
              return res
                .status(500)
                .json({ message: "เกิดข้อผิดพลาดในการแก้ไขชั้น" });
            }
            if (result.affectedRows === 0) {
              return res
                .status(404)
                .json({ message: "ไม่พบชั้นที่ต้องการแก้ไข" });
            }
            res.json({ message: "แก้ไขชั้นสำเร็จ" });
          }
        );
      });
    });
  });

  // ลบข้อมูลชั้น
  router.delete("/floors/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    // ตรวจสอบว่ามีห้องในชั้นนี้อยู่หรือไม่
    const checkQuery =
      "SELECT COUNT(*) as count FROM room WHERE room_fl_id = ?";
    db.query(checkQuery, [id], (err, results) => {
      if (err) {
        console.error("Error checking floor usage:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }
      if (results[0].count > 0) {
        return res.status(400).json({
          message: "ไม่สามารถลบชั้นนี้ได้ เนื่องจากมีห้องที่เชื่อมโยงอยู่",
        });
      }

      const deleteQuery = "DELETE FROM floor WHERE fl_id = ?";
      db.query(deleteQuery, [id], (err2, result) => {
        if (err2) {
          console.error("Error deleting floor:", err2);
          return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบชั้น" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "ไม่พบชั้นที่ต้องการลบ" });
        }
        res.json({ message: "ลบชั้นสำเร็จ" });
      });
    });
  });

  // เรียกข้อมูลห้องทั้งหมด (ใหม่)
  router.get("/rooms", (req, res) => {
    const query = `
      SELECT 
        r.room_id AS room_id, 
        r.room_name AS room_name,
        r.room_fl_id AS floor_id,
        f.fl_name AS floor_name,
        f.fl_bd_id AS building_id,
        b.bd_name AS building_name
      FROM room r
      LEFT JOIN floor f ON r.room_fl_id = f.fl_id
      LEFT JOIN building b ON f.fl_bd_id = b.bd_id
      ORDER BY b.bd_name, f.fl_name, r.room_name
    `;
    db.query(query, (err, results) => {
      if (err) {
        console.error("Database error (all rooms):", err);
        return res.status(500).json({ message: "โหลดข้อมูลห้องไม่สำเร็จ" });
      }
      res.json(results);
    });
  });

  // เรียกข้อมูลห้องตามชั้น
  router.get("/rooms/:floorId", (req, res) => {
    const { floorId } = req.params;
    const query = `
        SELECT room_id AS room_id, room_name AS room_name
        FROM room
        WHERE room_fl_id = ?
        ORDER BY room_id ASC
      `;
    db.query(query, [floorId], (err, results) => {
      if (err) {
        console.error("database error (rooms):", err);
        return res.status(500).json({ message: "โหลดข้อมูลห้องไม่สำเร็จ" });
      }
      res.json(results);
    });
  });

  // เพิ่มข้อมูลห้อง
  router.post("/rooms", authMiddleware, (req, res) => {
    const { room_name, room_fl_id } = req.body;
    if (!room_name || !room_name.trim() || !room_fl_id) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }
    // ตรวจสอบว่าชั้นมีอยู่จริง
    const checkFloorQuery =
      "SELECT COUNT(*) as count FROM floor WHERE fl_id = ?";
    db.query(checkFloorQuery, [room_fl_id], (err, results) => {
      if (err) {
        console.error("Error checking floor:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }
      if (results[0].count === 0) {
        return res.status(400).json({ message: "ไม่พบชั้นที่ระบุ" });
      }
      // ตรวจสอบชื่อห้องซ้ำในชั้นเดียวกัน
      const checkQuery =
        "SELECT COUNT(*) as count FROM room WHERE LOWER(room_name) = LOWER(?) AND room_fl_id = ?";
      db.query(checkQuery, [room_name.trim(), room_fl_id], (err2, results2) => {
        if (err2) {
          console.error("Error checking duplicate room:", err2);
          return res
            .status(500)
            .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
        }
        if (results2[0].count > 0) {
          return res
            .status(400)
            .json({ message: "ชื่อห้องนี้มีอยู่ในชั้นนี้แล้ว" });
        }
        const insertQuery =
          "INSERT INTO room (room_name, room_fl_id) VALUES (?, ?)";
        db.query(
          insertQuery,
          [room_name.trim(), room_fl_id],
          (err3, result) => {
            if (err3) {
              console.error("Error creating room:", err3);
              return res
                .status(500)
                .json({ message: "เกิดข้อผิดพลาดในการเพิ่มห้อง" });
            }
            res.status(201).json({
              message: "เพิ่มห้องสำเร็จ",
              room_id: result.insertId,
              room_name: room_name.trim(),
              room_fl_id: room_fl_id,
            });
          }
        );
      });
    });
  });

  // แก้ไขข้อมูลห้อง
  router.put("/rooms/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    const { room_name, room_fl_id } = req.body;
    if (!room_name || !room_name.trim() || !room_fl_id) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }
    // ตรวจสอบว่าชั้นมีอยู่จริง
    const checkFloorQuery =
      "SELECT COUNT(*) as count FROM floor WHERE fl_id = ?";
    db.query(checkFloorQuery, [room_fl_id], (err, results) => {
      if (err) {
        console.error("Error checking floor:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }
      if (results[0].count === 0) {
        return res.status(400).json({ message: "ไม่พบชั้นที่ระบุ" });
      }
      // ตรวจสอบชื่อซ้ำในชั้นเดียวกัน (ยกเว้น record ปัจจุบัน)
      const checkQuery =
        "SELECT COUNT(*) as count FROM room WHERE LOWER(room_name) = LOWER(?) AND room_fl_id = ? AND room_id != ?";
      db.query(
        checkQuery,
        [room_name.trim(), room_fl_id, id],
        (err2, results2) => {
          if (err2) {
            console.error("Error checking duplicate room:", err2);
            return res
              .status(500)
              .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
          }
          if (results2[0].count > 0) {
            return res
              .status(400)
              .json({ message: "ชื่อห้องนี้มีอยู่ในชั้นนี้แล้ว" });
          }
          const updateQuery =
            "UPDATE room SET room_name = ?, room_fl_id = ? WHERE room_id = ?";
          db.query(
            updateQuery,
            [room_name.trim(), room_fl_id, id],
            (err3, result) => {
              if (err3) {
                console.error("Error updating room:", err3);
                return res
                  .status(500)
                  .json({ message: "เกิดข้อผิดพลาดในการแก้ไขห้อง" });
              }
              if (result.affectedRows === 0) {
                return res
                  .status(404)
                  .json({ message: "ไม่พบห้องที่ต้องการแก้ไข" });
              }
              res.json({ message: "แก้ไขห้องสำเร็จ" });
            }
          );
        }
      );
    });
  });

  // ลบข้อมูลห้อง
  router.delete("/rooms/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    // ตรวจสอบว่ามีใบแจ้งซ่อมที่เชื่อมโยงกับห้องนี้หรือไม่
    const checkQuery =
      "SELECT COUNT(*) as count FROM repair_form WHERE rf_room_id = ?";
    db.query(checkQuery, [id], (err, results) => {
      if (err) {
        console.error("Error checking room usage:", err);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" });
      }
      if (results[0].count > 0) {
        return res.status(400).json({
          message:
            "ไม่สามารถลบห้องนี้ได้ เนื่องจากมีใบแจ้งซ่อมที่เชื่อมโยงอยู่",
        });
      }

      const deleteQuery = "DELETE FROM room WHERE room_id = ?";
      db.query(deleteQuery, [id], (err2, result) => {
        if (err2) {
          console.error("Error deleting room:", err2);
          return res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบห้อง" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "ไม่พบห้องที่ต้องการลบ" });
        }
        res.json({ message: "ลบห้องสำเร็จ" });
      });
    });
  });

  // เรียกข้อมูลสถานที่ทั้งหมดในครั้งเดียว (ใหม่)
  router.get("/locations/all", (req, res) => {
    // ดึงข้อมูลอาคาร
    const buildingQuery =
      "SELECT bd_id AS id, bd_name AS name, 'building' AS type FROM building";

    // ดึงข้อมูลชั้นพร้อมข้อมูลอาคาร
    const floorQuery = `
      SELECT 
        f.fl_id AS id, 
        f.fl_name AS name, 
        'floor' AS type,
        f.fl_bd_id AS building_id,
        b.bd_name AS building_name
      FROM floor f
      LEFT JOIN building b ON f.fl_bd_id = b.bd_id
    `;

    // ดึงข้อมูลห้องพร้อมข้อมูลชั้นและอาคาร
    const roomQuery = `
      SELECT 
        r.room_id AS id, 
        r.room_name AS name, 
        'room' AS type,
        r.room_fl_id AS floor_id,
        f.fl_name AS floor_name,
        f.fl_bd_id AS building_id,
        b.bd_name AS building_name
      FROM room r
      LEFT JOIN floor f ON r.room_fl_id = f.fl_id
      LEFT JOIN building b ON f.fl_bd_id = b.bd_id
    `;

    // ดึงข้อมูลทั้งหมดพร้อมกัน
    db.query(buildingQuery, (err1, buildings) => {
      if (err1) {
        console.error("Error fetching buildings:", err1);
        return res.status(500).json({ message: "โหลดข้อมูลอาคารไม่สำเร็จ" });
      }

      db.query(floorQuery, (err2, floors) => {
        if (err2) {
          console.error("Error fetching floors:", err2);
          return res.status(500).json({ message: "โหลดข้อมูลชั้นไม่สำเร็จ" });
        }

        db.query(roomQuery, (err3, rooms) => {
          if (err3) {
            console.error("Error fetching rooms:", err3);
            return res.status(500).json({ message: "โหลดข้อมูลห้องไม่สำเร็จ" });
          }

          // รวมข้อมูลทั้งหมด
          const allLocations = [
            ...buildings.map((b) => ({
              ...b,
              building: b.name,
              floor: "-",
              room: "-",
            })),
            ...floors.map((f) => ({
              ...f,
              building: f.building_name,
              floor: f.name,
              room: "-",
            })),
            ...rooms.map((r) => ({
              ...r,
              building: r.building_name,
              floor: r.floor_name,
              room: r.name,
            })),
          ];

          res.json(allLocations);
        });
      });
    });
  });

  return router;
};
