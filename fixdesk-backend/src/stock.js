const express = require("express");
const { authMiddleware } = require("../auth");
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
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
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
    }
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
        }
      );
    }
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
      sfd.sfd_qty

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

  // อัปเดตสถานะใบเบิกของ
  router.put("/stock-forms/update-status", authMiddleware, (req, res) => {
    const { sf_code, status } = req.body;

    console.log("update-status body:", req.body);

    if (!sf_code || !status) {
      return res.status(400).json({ message: "ต้องมี sf_code และ status" });
    }

    // 1) หา sf_id + สถานะปัจจุบัน
    const checkQuery = `
      SELECT sf_id, sf_status
      FROM stock_form
      WHERE sf_code = ?
    `;

    db.query(checkQuery, [sf_code], (err, rows) => {
      if (err) {
        console.error("checkQuery error:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาด (checkQuery)" });
      }

      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: "ไม่พบใบเบิกนี้" });
      }

      const sf_id = rows[0].sf_id;
      const current = rows[0].sf_status;

      // กันแก้ซ้ำ
      if (current !== "waiting") {
        return res.status(400).json({
          message: "ใบเบิกได้รับการอนุมัติหรือปฏิเสธแล้ว ไม่สามารถแก้ไขได้",
        });
      }

      // ฟังก์ชันอัปเดตสถานะอย่างเดียว
      const updateStatusOnly = () => {
        const updateQuery = `
          UPDATE stock_form
          SET sf_status = ?
          WHERE sf_code = ?
        `;

        db.query(updateQuery, [status, sf_code], (err2) => {
          if (err2) {
            console.error("updateQuery error:", err2);
            return res.status(500).json({ message: "อัปเดตสถานะไม่สำเร็จ" });
          }

          return res.json({ message: "อัปเดตสถานะสำเร็จ" });
        });
      };

      // 2) ถ้า rejected -> คืนสต๊อกก่อน แล้วค่อยอัปเดตสถานะ
      if (status === "rejected") {
        const detailQuery = `
          SELECT sfd_pd_id, sfd_qty
          FROM stock_form_detail
          WHERE sfd_sf_id = ?
        `;

        db.query(detailQuery, [sf_id], (errD, items) => {
          if (errD) {
            console.error("detailQuery error:", errD);
            return res
              .status(500)
              .json({ message: "โหลดรายการคืนสต๊อกไม่สำเร็จ" });
          }

          // ถ้าไม่มีรายการก็อัปเดตสถานะไปเลย
          if (!items || items.length === 0) {
            return updateStatusOnly();
          }

          let idx = 0;

          const returnNext = () => {
            if (idx >= items.length) {
              // คืนครบแล้ว -> อัปเดตสถานะ
              return updateStatusOnly();
            }

            const { sfd_pd_id, sfd_qty } = items[idx++];

            const returnStockSql = `
              UPDATE products
              SET pd_quantity = pd_quantity + ?
              WHERE pd_id = ?
            `;

            db.query(returnStockSql, [sfd_qty, sfd_pd_id], (errR) => {
              if (errR) {
                console.error("returnStockSql error:", errR);
                return res.status(500).json({
                  message: "คืนสต๊อกไม่สำเร็จ",
                  error: errR.message,
                });
              }
              returnNext();
            });
          };

          returnNext();
        });

        return; // กัน flow ไหลลงไป approved
      }

      // 3) approved (หรืออื่น ๆ) -> อัปเดตสถานะอย่างเดียว
      return updateStatusOnly();
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

  return router;
};
