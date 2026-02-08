const express = require("express");
const { authMiddleware } = require("../auth.middleware");
const multer = require("multer"); // 1. ต้อง import multer
const path = require("path");
const fs = require("fs");

// ตรวจสอบว่ามีโฟลเดอร์ uploads หรือไม่ ถ้าไม่มีให้สร้าง
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // เก็บไฟล์ในโฟลเดอร์ uploads
  },
  filename: function (req, file, cb) {
    // ตั้งชื่อไฟล์ใหม่: fieldname-timestamp.นามสกุลไฟล์
    // เช่น: pd_upload_image-1678888888.jpg
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({ storage: storage });

module.exports = function StockRoutes(db) {
  const router = express.Router();

  router.get("/show-stock", authMiddleware, (req, res) => {
    const query = `
    SELECT
      pd.pd_id,
      pd.pd_asset_code,
      pd.pd_name,
      ct.ct_name,
      pd.pd_quantity,
      un.units_name,
      pd.pd_updated_at,
      pd.pd_upload_image
    FROM products pd
    LEFT JOIN categories ct ON pd.pd_category_id = ct.ct_id
    LEFT JOIN units un ON pd.pd_unit_id = un.units_id
    ORDER BY pd.pd_id ASC;
  `;

    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching inventory:", err);
        return res.status(500).json({
          message: "ดึงข้อมูลคลังสินค้าไม่สำเร็จ",
          error: err.message,
        });
      }
      res.json(results);
    });
  });

  router.post(
    "/add-stock",
    authMiddleware,
    upload.single("pd_upload_image"),
    (req, res) => {
      // รับค่าหน่วยนับที่เป็น "ข้อความ" (ไม่ใช่ ID แล้ว)
      const {
        pd_asset_code,
        pd_name,
        pd_category_id,
        pd_quantity,
        pd_unit_id: pd_unit_name, // รับค่า text มา (Frontend ส่งมาในชื่อ key นี้ หรือแก้ key ให้ตรงกัน)
        status,
      } = req.body;

      const pd_upload_image = req.file ? req.file.filename : null;

      if (!pd_name || !pd_category_id || !pd_quantity || !pd_unit_name) {
        return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
      }

      // --- ฟังก์ชันสำหรับหาหรือสร้าง Unit ID ---
      const getOrCreateUnitId = (unitName, callback) => {
        // 1. ลองค้นหาดูก่อนว่ามีชื่อนี้ไหม
        const checkQuery = "SELECT units_id FROM units WHERE units_name = ?";
        db.query(checkQuery, [unitName], (err, results) => {
          if (err) return callback(err, null);

          // 2. ถ้ามีอยู่แล้ว -> ส่ง ID เดิมกลับไป
          if (results.length > 0) {
            return callback(null, results[0].units_id);
          }

          // 3. ถ้ายังไม่มี -> สร้างใหม่ (INSERT)
          const insertQuery = "INSERT INTO units (units_name) VALUES (?)";
          db.query(insertQuery, [unitName], (err, insertResult) => {
            if (err) return callback(err, null);
            // ส่ง ID ที่เพิ่งสร้างใหม่กลับไป
            return callback(null, insertResult.insertId);
          });
        });
      };

      // --- เริ่มทำงาน ---
      getOrCreateUnitId(pd_unit_name, (err, finalUnitId) => {
        if (err) {
          console.error("Error managing unit:", err);
          return res.status(500).json({ message: "Error managing unit" });
        }

        // 4. บันทึกข้อมูลสินค้า โดยใช้ ID ที่ได้มา (finalUnitId)
        const insertProductQuery = `
        INSERT INTO products
        (pd_asset_code, pd_name, pd_category_id, pd_quantity, pd_unit_id, pd_upload_image, pd_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;

        const params = [
          pd_asset_code,
          pd_name,
          pd_category_id,
          pd_quantity,
          finalUnitId, // <--- ใช้ ID จาก function ข้างบน
          pd_upload_image,
        ];

        db.query(insertProductQuery, params, (err, results) => {
          if (err) {
            console.error("Error adding stock:", err);
            return res.status(500).json({
              message: "Failed to add inventory item",
              error: err.message,
            });
          }
          res.status(201).json({
            message: "Inventory item added successfully",
            id: results.insertId,
            unit_used: pd_unit_name,
          });
        });
      });
    },
  );

  // เรียกหมวดหมู่
  router.get("/category", (req, res) => {
    const query = `SELECT ct_id, ct_name FROM categories ORDER BY ct_name ASC`;
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching categories:", err);
        return res
          .status(500)
          .json({ message: "ดึงข้อมูลหมวดหมู่ไม่สำเร็จ", error: err.message });
      }
      res.json(results);
    });
  });

  // เพิ่มหมวดหมู่ใหม่
  router.post("/category", authMiddleware, async (req, res) => {
    const { ct_name } = req.body;
    if (!ct_name || !ct_name.trim()) {
      return res.status(400).json({ message: "กรุณากรอกชื่อหมวดหมู่" });
    }

    // ตรวจสอบชื่อซ้ำ
    const checkQuery =
      "SELECT COUNT(*) as count FROM categories WHERE LOWER(ct_name) = LOWER(?)";
    db.query(checkQuery, [ct_name.trim()], (err, results) => {
      if (err) {
        console.error("Error checking category:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาด" });
      }

      if (results[0].count > 0) {
        return res.status(400).json({ message: "หมวดหมู่นี้มีอยู่แล้ว" });
      }

      // เพิ่มหมวดหมู่ใหม่
      const insertQuery = "INSERT INTO categories (ct_name) VALUES (?)";
      db.query(insertQuery, [ct_name.trim()], (err, result) => {
        if (err) {
          console.error("Error inserting category:", err);
          return res.status(500).json({ message: "เพิ่มหมวดหมู่ไม่สำเร็จ" });
        }
        res.status(201).json({
          message: "เพิ่มหมวดหมู่สำเร็จ",
          ct_id: result.insertId,
          ct_name: ct_name.trim(),
        });
      });
    });
  });

  // แก้ไขหมวดหมู่
  router.put("/category/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { ct_name } = req.body;

    if (!ct_name || !ct_name.trim()) {
      return res.status(400).json({ message: "กรุณากรอกชื่อหมวดหมู่" });
    }

    // ตรวจสอบชื่อซ้ำ (ยกเว้นตัวเอง)
    const checkQuery =
      "SELECT COUNT(*) as count FROM categories WHERE LOWER(ct_name) = LOWER(?) AND ct_id != ?";
    db.query(checkQuery, [ct_name.trim(), id], (err, results) => {
      if (err) {
        console.error("Error checking category:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาด" });
      }

      if (results[0].count > 0) {
        return res.status(400).json({ message: "หมวดหมู่นี้มีอยู่แล้ว" });
      }

      const updateQuery = "UPDATE categories SET ct_name = ? WHERE ct_id = ?";
      db.query(updateQuery, [ct_name.trim(), id], (err, result) => {
        if (err) {
          console.error("Error updating category:", err);
          return res.status(500).json({ message: "แก้ไขหมวดหมู่ไม่สำเร็จ" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "ไม่พบหมวดหมู่นี้" });
        }
        res.json({ message: "แก้ไขหมวดหมู่สำเร็จ" });
      });
    });
  });

  // ลบหมวดหมู่
  router.delete("/category/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;

    // ตรวจสอบว่ามีสินค้าใช้หมวดหมู่นี้อยู่หรือไม่
    const checkQuery =
      "SELECT COUNT(*) as count FROM products WHERE pd_category_id = ?";
    db.query(checkQuery, [id], (err, results) => {
      if (err) {
        console.error("Error checking products:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาด" });
      }

      if (results[0].count > 0) {
        return res.status(400).json({
          message: `ไม่สามารถลบได้ เนื่องจากมีสินค้า ${results[0].count} รายการใช้หมวดหมู่นี้อยู่`,
        });
      }

      const deleteQuery = "DELETE FROM categories WHERE ct_id = ?";
      db.query(deleteQuery, [id], (err, result) => {
        if (err) {
          console.error("Error deleting category:", err);
          return res.status(500).json({ message: "ลบหมวดหมู่ไม่สำเร็จ" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "ไม่พบหมวดหมู่นี้" });
        }
        res.json({ message: "ลบหมวดหมู่สำเร็จ" });
      });
    });
  });

  router.get("/units", (req, res) => {
    const query = `SELECT units_id, units_name FROM units ORDER BY units_name ASC`;

    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching units:", err);
        return res.status(500).json({ message: "Error", error: err.message });
      }
      // ส่งข้อมูลกลับไปให้ Frontend
      res.json(results);
    });
  });

  // ลบรายการ
  router.delete("/delete-stock/:id", authMiddleware, (req, res) => {
    const { id } = req.params;

    // 1. หาไฟล์รูปก่อนลบ (ถ้ามี)
    const findQuery = "SELECT pd_upload_image FROM products WHERE pd_id = ?";

    db.query(findQuery, [id], (err, results) => {
      if (err) {
        console.error("Error finding product:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาด" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "ไม่พบรายการสินค้า" });
      }

      const imageName = results[0].pd_upload_image;

      // 2. ลบข้อมูลใน DB
      const deleteQuery = "DELETE FROM products WHERE pd_id = ?";
      db.query(deleteQuery, [id], (err) => {
        if (err) {
          console.error("Error deleting product:", err);
          return res.status(500).json({ message: "ลบข้อมูลไม่สำเร็จ" });
        }

        // 3. ลบไฟล์รูป (ถ้ามี)
        if (imageName) {
          const imagePath = path.join(__dirname, "..", "uploads", imageName);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }

        res.json({ message: "ลบสินค้าเรียบร้อย" });
      });
    });
  });

  // แก้ไขรายการ
  router.put(
    "/update-stock/:id",
    authMiddleware,
    upload.single("pd_upload_image"),
    (req, res) => {
      const {
        pd_asset_code,
        pd_name,
        pd_detail,
        pd_category_id,
        pd_quantity,
        pd_unit_id,
      } = req.body;

      const pd_id = req.params.id;

      // log ช่วย debug
      console.log("UPDATE BODY:", req.body);
      console.log("UPDATE FILE:", req.file);

      // หา unit id จากชื่อ
      db.query(
        "SELECT units_id FROM units WHERE units_name = ?",
        [pd_unit_id],
        (err, unitResult) => {
          if (err) return res.status(500).json({ message: err.message });

          if (!unitResult || unitResult.length === 0) {
            return res.status(400).json({
              message: `ไม่พบหน่วยนับ '${pd_unit_id}'`,
            });
          }

          const unitId = unitResult[0].units_id;

          // ถ้ามีอัปโหลดรูปใหม่ → ใช้รูปใหม่
          const newImage = req.file ? req.file.filename : null;

          // UPDATE
          const sql = `
            UPDATE products SET
              pd_asset_code = ?,
              pd_name = ?,
              pd_detail = ?,
              pd_category_id = ?,
              pd_quantity = ?,
              pd_unit_id = ?,
              ${newImage ? "pd_upload_image = ?," : ""}
              pd_updated_at = NOW()
            WHERE pd_id = ?
          `;

          const params = [
            pd_asset_code,
            pd_name,
            pd_detail,
            pd_category_id,
            pd_quantity,
            unitId,
          ];

          if (newImage) params.push(newImage);
          params.push(pd_id);

          db.query(sql, params, (err, result) => {
            if (err) {
              console.error("UPDATE ERROR:", err);
              return res.status(500).json({ message: err.message });
            }

            if (result.affectedRows === 0) {
              return res.status(404).json({ message: "ไม่พบรายการสินค้า" });
            }

            res.json({ message: "แก้ไขสำเร็จ" });
          });
        },
      );
    },
  );

  router.get("/stock-forms/:id", authMiddleware, (req, res) => {
    const userId = req.params.id;

    const query = `
    SELECT
      sf.sf_id,
      sf.sf_code,
      sf.sf_rf_id,
      sf.sf_us_id,
      sf.sf_status,
      sf.sf_create_at,
      rf.rf_code AS rf_code,
      sf.sf_update_at,
      b.bd_name AS building_name,

      GROUP_CONCAT(
        CONCAT(pd.pd_name, ' x', sfd.sfd_qty)
        SEPARATOR '\\n'
      ) AS items

    FROM stock_form sf

    LEFT JOIN stock_form_detail sfd ON sf.sf_id = sfd.sfd_sf_id
    LEFT JOIN products pd ON sfd.sfd_pd_id = pd.pd_id

    LEFT JOIN repair_form rf ON sf.sf_rf_id = rf.rf_id
    LEFT JOIN room r ON rf.rf_room_id = r.room_id
    LEFT JOIN floor f ON r.room_fl_id = f.fl_id
    LEFT JOIN building b ON f.fl_bd_id = b.bd_id

    WHERE sf.sf_us_id = ?
    GROUP BY sf.sf_id
    ORDER BY sf.sf_id DESC;
  `;

    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error("SQL Error:", err);
        return res.status(500).json({
          message: "ดึงข้อมูลคลังสินค้าไม่สำเร็จ",
          error: err.message,
        });
      }
      res.json(results);
    });
  });

  // ดึงรายการเบิกของทั้งหมด (ไม่ filter by user)
  router.get("/stock-forms", authMiddleware, (req, res) => {
    const query = `
    SELECT
      sf.sf_id,
      sf.sf_code,
      sf.sf_status,
      sf.sf_create_at,
      u.us_department,
      b.bd_name,
      f.fl_name,
      r.room_name,

      -- ชื่อผู้ขอเบิก (ประกอบจากชื่อจริง)
      CONCAT(u.us_first_name_th, ' ', u.us_last_name_th) AS requester
    FROM stock_form sf

    -- ใช้ตาราง user (ไม่มี s)
    LEFT JOIN user u ON u.us_id = sf.sf_us_id

    LEFT JOIN repair_form rf ON sf.sf_rf_id = rf.rf_id
    LEFT JOIN room r ON rf.rf_room_id = r.room_id
    LEFT JOIN floor f ON r.room_fl_id = f.fl_id
    LEFT JOIN building b ON f.fl_bd_id = b.bd_id

    ORDER BY sf.sf_id DESC;
  `;

    db.query(query, (err, results) => {
      if (err) {
        console.error("SQL ERROR (stock-forms):", err);
        return res.status(500).json({
          message: "โหลดข้อมูลไม่สำเร็จ",
          error: err.message,
        });
      }
      res.json(results);
    });
  });

  // ดึงรายละเอียดใบเบิกแบบเต็ม
  router.get("/stock-forms/detail/:sf_code", authMiddleware, (req, res) => {
    const { sf_code } = req.params;

    const query = `
    SELECT
      sf.sf_id,
      sf.sf_code,
      sf.sf_status,
      sf.sf_create_at,

      -- ผู้เบิก
      u.us_department,
      CONCAT(u.us_first_name_th, ' ', u.us_last_name_th) AS requester,

      -- สถานที่
      b.bd_name,
      f.fl_name,
      r.room_name,

      -- รายการแต่ละชิ้น
      pd.pd_id,
      pd.pd_name,
      pd.pd_asset_code,
      pd.pd_detail,
      pd.pd_upload_image,
      ct.ct_name AS category,
      sfd.sfd_qty,
      sfd.sfd_status

    FROM stock_form sf

    LEFT JOIN user u ON u.us_id = sf.sf_us_id
    LEFT JOIN repair_form rf ON rf.rf_id = sf.sf_rf_id
    LEFT JOIN room r ON rf.rf_room_id = r.room_id
    LEFT JOIN floor f ON r.room_fl_id = f.fl_id
    LEFT JOIN building b ON f.fl_bd_id = b.bd_id

    LEFT JOIN stock_form_detail sfd ON sfd.sfd_sf_id = sf.sf_id
    LEFT JOIN products pd ON pd.pd_id = sfd.sfd_pd_id
    LEFT JOIN categories ct ON ct.ct_id = pd.pd_category_id

    WHERE sf.sf_code = ?;
  `;

    db.query(query, [sf_code], (err, results) => {
      if (err) {
        console.error("Error:", err);
        return res.status(500).json({ message: "โหลดข้อมูลไม่สำเร็จ" });
      }
      res.json(results);
    });
  });

  // เพิ่ม API ใหม่: อนุมัติ “รายชิ้น”
  router.put("/stock-forms/detail/update-item-status", authMiddleware, (req, res) => {
    const { sf_code, pd_id, status } = req.body;
    
    if (!sf_code || !pd_id || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "invalid payload" });
    }
  
    // หา sf_id จาก sf_code
    db.query("SELECT sf_id FROM stock_form WHERE sf_code = ?", [sf_code], (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!rows.length) return res.status(404).json({ message: "ไม่พบใบเบิก" });
    
      const sf_id = rows[0].sf_id;
    
      // 1) อ่าน qty ของรายการนี้ก่อน (เพื่อคืนสต๊อกแบบตรง ๆ)
      const findQtySql = `
        SELECT sfd_qty, sfd_status
        FROM stock_form_detail
        WHERE sfd_sf_id = ? AND sfd_pd_id = ?
      `;
      db.query(findQtySql, [sf_id, pd_id], (errQ, dRows) => {
        if (errQ) return res.status(500).json({ message: errQ.message });
        if (!dRows.length) return res.status(404).json({ message: "ไม่พบรายการในใบเบิก" });
      
        const currentStatus = dRows[0].sfd_status;
        const qty = Number(dRows[0].sfd_qty) || 0;
      
        // 2) กันกดซ้ำ: ถ้าไม่ได้อยู่ waiting แล้ว ให้หยุด
        if (currentStatus !== "waiting") {
          return res.status(400).json({ message: "รายการนี้ถูกพิจารณาแล้ว" });
        }
      
        // 3) อัปเดตสถานะจาก waiting -> approved/rejected (ทำครั้งเดียว)
        const updateItemSql = `
          UPDATE stock_form_detail
          SET sfd_status = ?
          WHERE sfd_sf_id = ?
            AND sfd_pd_id = ?
            AND sfd_status = 'waiting'
        `;
      
        db.query(updateItemSql, [status, sf_id, pd_id], (errU, result) => {
          if (errU) return res.status(500).json({ message: errU.message });
          if (result.affectedRows === 0) {
            return res.status(400).json({ message: "รายการนี้ถูกพิจารณาแล้ว" });
          }
        
          // 4) ถ้า rejected => คืนสต๊อก 1 ครั้ง (เพราะ update ผ่านได้แค่ครั้งเดียว)
          if (status === "rejected") {
            const returnStockSql = `
              UPDATE products
              SET pd_quantity = pd_quantity + ?
              WHERE pd_id = ?
            `;
            return db.query(returnStockSql, [qty, pd_id], (errR) => {
              if (errR) return res.status(500).json({ message: errR.message });
              return recalcStockFormStatus(sf_id, res);
            });
          }
        
          // approved: ไม่ต้องยุ่งสต๊อก (เพราะคุณตัดตั้งแต่สร้างใบแล้ว)
          return recalcStockFormStatus(sf_id, res);
        });
      });
    });
  });

  function recalcStockFormStatus(sf_id, res) {
    const q = `
    SELECT
      SUM(sfd_status = 'waiting') AS waiting,
      SUM(sfd_status = 'approved') AS approved,
      SUM(sfd_status = 'rejected') AS rejected
    FROM stock_form_detail
    WHERE sfd_sf_id = ?
  `;

    db.query(q, [sf_id], (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });

      const { waiting, approved, rejected } = rows[0];
      let newStatus = "waiting";

      if (waiting === 0 && approved > 0 && rejected === 0)
        newStatus = "approved";
      else if (waiting === 0 && rejected > 0 && approved === 0)
        newStatus = "rejected";
      else if (approved > 0 && rejected > 0) newStatus = "partial";

      db.query(
        "UPDATE stock_form SET sf_status = ? WHERE sf_id = ?",
        [newStatus, sf_id],
        () => res.json({ message: "updated", sf_status: newStatus }),
      );
    });
  }

  // อัปเดตสถานะใบเบิกของ
  router.put("/stock-forms/update-status", authMiddleware, (req, res) => {
    const { sf_code, status } = req.body;

    if (!sf_code || !status) {
      return res.status(400).json({ message: "ต้องมี sf_code และ status" });
    }

    const updateQuery = `
      UPDATE stock_form
      SET sf_status = ?
      WHERE sf_code = ?
    `;

    db.query(updateQuery, [status, sf_code], (err2, result) => {
      if (err2) return res.status(500).json({ message: "อัปเดตสถานะไม่สำเร็จ" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "ไม่พบใบเบิกนี้" });
      return res.json({ message: "อัปเดตสถานะสำเร็จ", sf_status: status });
    });
  });

  // เบิกสินค้า
  router.post("/withdraw", authMiddleware, (req, res) => {
    const { repair_code, requester_name, department, withdraw_date, items } =
      req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "ไม่มีรายการสินค้า" });
    }

    // 1) หา repair_form จากรหัส
    const findRepair = `
    SELECT rf_id FROM repair_form WHERE rf_code = ?
  `;

    db.query(findRepair, [repair_code], (err, rfRows) => {
      if (err) return res.status(500).json({ message: err.message });

      if (rfRows.length === 0) {
        return res.status(404).json({ message: "ไม่พบใบแจ้งซ่อม" });
      }

      const rf_id = rfRows[0].rf_id;

      // 2) สร้าง stock_form (หัวฟอร์ม)
      const insertStockForm = `
      INSERT INTO stock_form (sf_code, sf_status, sf_create_at, sf_us_id, sf_rf_id)
      VALUES (?, 'approved', NOW(), ?, ?)
    `;

      const sf_code = "SF" + Date.now();

      const userId = req.user.id;

      db.query(insertStockForm, [sf_code, userId, rf_id], (err2, sfResult) => {
        if (err2) return res.status(500).json({ message: err2.message });

        const sf_id = sfResult.insertId;

        // 3) ลูปสินค้า เพื่อ insert stock_form_detail + update products
        items.forEach((item) => {
          const pd_id = item.id;
          const qty = item.qty;

          // Insert detail
          const insertDetail = `
          INSERT INTO stock_form_detail (sfd_sf_id, sfd_pd_id, sfd_qty)
          VALUES (?, ?, ?)
        `;
          db.query(insertDetail, [sf_id, pd_id, qty]);

          // Update สต๊อกสินค้า
          const updateStock = `
          UPDATE products
          SET pd_quantity = pd_quantity - ?
          WHERE pd_id = ? AND pd_quantity >= ?
        `;

          db.query(updateStock, [qty, pd_id, qty]);
        });

        return res.json({
          message: "เบิกสินค้าเรียบร้อย",
          sf_code,
        });
      });
    });
  });

  router.post("/stock/import", authMiddleware, async (req, res) => {
    // ไว้มาลบทีหลัง
    console.log("🔥 /stock/import HIT");
    console.log("BODY:", req.body);

    const { items } = req.body;
    const results = [];
    const errors = [];

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "No stock items to import" });
    }

    for (const [i, u] of items.entries()) {
      try {
       //ตรวจสอบความถูกต้องข้อมูล
        const qty = Number(u.pd_quantity);

        if (!u.pd_name || isNaN(qty) || qty <= 0 || !u.pd_unit_name) {
          throw new Error("Missing required fields");
        }

       // ชื่อและหมายเลขครุภัณฑ์ห้ามซ้ำในระบบ
        const [dupRows] = await db.promise().query(
          `
        SELECT pd_id FROM products
        WHERE pd_name = ?
           OR (pd_asset_code IS NOT NULL AND pd_asset_code = ?)
        LIMIT 1
        `,
          [u.pd_name, u.pd_asset_code || null],
        );

        if (dupRows.length) {
          throw new Error("Duplicate name or asset code");
        }
      
        let pd_unit_id;
        const [unitRows] = await db
          .promise()
          .query("SELECT units_id FROM units WHERE units_name = ?", [
            u.pd_unit_name,
          ]);

        if (unitRows.length > 0) {
          pd_unit_id = unitRows[0].units_id;
        } else {
          const [insertUnit] = await db
            .promise()
            .query("INSERT INTO units (units_name) VALUES (?)", [
              u.pd_unit_name,
            ]);

          pd_unit_id = insertUnit.insertId;
        }

        //ถ้าไม่มีหมวดหมู่ใน DB ไม่สามารถ import เข้าได้
        let pd_category_id = null;

        if (u.pd_category_name) {
          const [ctRows] = await db
            .promise()
            .query("SELECT ct_id FROM categories WHERE ct_name = ?", [
              u.pd_category_name,
            ]);

          if (!ctRows.length) throw new Error("Invalid category");

          pd_category_id = ctRows[0].ct_id;
        }

       // insert products
        await db.promise().query(
          `INSERT INTO products (
          pd_asset_code,
          pd_name,
          pd_category_id,
          pd_quantity,
          pd_unit_id,
          pd_upload_image,
          pd_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            u.pd_asset_code || null, // ครุภัณฑ์กรอกไม่กรอกก็ได้
            u.pd_name,
            pd_category_id,
            qty,
            pd_unit_id,
            null, // ไม่มีรูปตอน import excel
          ],
        );

        results.push({ index: i, name: u.pd_name });
      } catch (err) {
        console.error("IMPORT STOCK ERROR:", err.message);

        errors.push({
          index: i,
          name: u.pd_name,
          message: err.message,
        });
      }
    }

    res.json({
      success: results.length,
      failed: errors.length,
      errors,
    });
  });

  return router;
};

const API_BASE = import.meta.env.VITE_API_BASE

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
})

export const getAllProducts = async (token) => {
  const res = await fetch(`${API_BASE}/show-stock`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Fetch products failed')
  return res.json()
}

export const getAllStockForms = async (token) => {
  const res = await fetch(`${API_BASE}/stock-forms`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Fetch stock forms failed')
  return res.json()
}