/**
 * =====================================================================
 * @file            : stock-service.js
 * @module          : Business Logic สำหรับระบบคลังวัสดุ/อุปกรณ์
 * @layer           : Service Layer (Business Logic Layer)
 * @version         : 1.3.0
 * @since           : 2026-02-17
 * @lastModified    : 2026-02-23
 * @lastModifiedBy  : นายพชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  Service Layer สำหรับจัดการตรรกะการทำงานหลักของระบบคลังวัสดุ/อุปกรณ์
 *  และใบเบิกสินค้า (Stock Forms) โดยทำงานร่วมกับฐานข้อมูลโดยตรง
 *  รับคำสั่งจาก Controller Layer และดำเนินการ query, transaction
 *  และ business logic ที่เกี่ยวข้องกับ stock และ inventory
 *
 *  รองรับการทำงาน:
 *    - จัดการสินค้า (เพิ่ม, แก้ไข, ลบ, แสดงรายการ)
 *    - จัดการหมวดหมู่สินค้า (Categories)
 *    - จัดการหน่วยนับสินค้า (Units)
 *    - สร้างใบเบิกสินค้า และตัด stock (Withdraw)
 *    - อนุมัติ / ปฏิเสธ รายการสินค้า
 *    - อนุมัติ / ปฏิเสธ รายการสินค้าแบบ batch
 *    - อัปเดตสถานะใบเบิกสินค้า
 *    - คืนสินค้า/อุปกรณ์ และเพิ่ม stock กลับ
 *    - Import ข้อมูลสินค้าแบบ batch
 *
 *  มีการใช้ Transaction เพื่อความถูกต้องของข้อมูลในกรณี:
 *    - createWithdraw
 *    - updateMultipleItemsStatus
 *    - returnItem
 *
 * @requires
 *   - mysql2 (Database connection ผ่าน db instance)
 *   - fs
 *   - path
 *
 * @databaseTables
 *   - products
 *   - categories
 *   - units
 *   - stock_form
 *   - stock_form_detail
 *   - repair_form
 *
 * @dataFlow
 *   Controller → Service → Database
 *
 * @author
 *   - นายพชร ไพศรีสกุล
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  - ปรับ Business Logic: เบิกของไม่ตัด stock ทันที รออนุมัติก่อน
 *    - createWithdraw: เปลี่ยนสถานะเป็น 'waiting' ไม่ตัด stock
 *    - updateItemStatus: อนุมัติ → ตัด stock + บันทึก OUT transaction
 *    - updateMultipleItemsStatus: อนุมัติ → ตัด stock + บันทึก OUT transaction
 *    - addProduct: บันทึก IN transaction เมื่อเพิ่มสินค้า
 *    - updateProduct: บันทึก IN/OUT transaction ตามการเปลี่ยนแปลงจำนวน
 *    - importStock: บันทึก IN transaction เมื่อ import
 *    [2026-02-20, นราธิป แสนทวีสุข]
 *  - เพิ่มระบบคืนสินค้า (returnItem)
 *    และเพิ่ม transaction สำหรับคืนสินค้า
 *    [2026-02-17, นายพชร ไพศรีสกุล]
 *  - รองรับการคืนอุปกรณ์แบบบางส่วน (Partial Return)ปรับปรุง logic การคืนและการคำนวณ stock ให้รองรับการคืนหลายครั้ง
 *    [2026-02-23, พชร ไพศรีสกุล] V1.3.0
 * =====================================================================
 */

/**
 * =====================================================================
 * @file            : stock-service.js
 * @module          : Business Logic สำหรับระบบคลังวัสดุ/อุปกรณ์
 * @layer           : Service Layer (Business Logic Layer)
 * @version         : 1.1.0
 * @since           : 2026-02-17
 * @lastModified    : 2026-02-17
 * @lastModifiedBy  : นายธนภัทร จันทร์งาม
 * ---------------------------------------------------------------------
 * @description
 *  Service Layer สำหรับจัดการตรรกะการทำงานหลักของระบบคลังวัสดุ/อุปกรณ์
 *  และใบเบิกสินค้า (Stock Forms)
 *
 *  แก้ไขเพิ่มเติม:
 *    - ปรับปรุงการสร้างใบเบิกสินค้า (createWithdraw)
 *    - รองรับกรณีมีการเพิ่มรายการสินค้าที่ซ้ำกัน
 *    - รวมจำนวนสินค้าที่มีรหัสเดียวกันก่อนบันทึก
 *    - ป้องกันการบันทึกข้อมูลซ้ำใน stock_form_detail
 *    - ป้องกันการตัด stock ซ้ำหลายครั้ง
 *
 * @requires
 *   - mysql2 (Database connection ผ่าน db instance)
 *   - fs
 *   - path
 *
 * @databaseTables
 *   - products
 *   - categories
 *   - units
 *   - stock_form
 *   - stock_form_detail
 *   - repair_form
 *
 * @dataFlow
 *   Controller → Service → Database
 *
 * @author
 *   - นายพชร ไพศรีสกุล
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  - ปรับปรุงฟังก์ชัน createWithdraw
 *    ให้รวมรายการสินค้าที่ซ้ำกันก่อนทำ Transaction
 *    เพื่อความถูกต้องของข้อมูล stock
 *    [2026-02-17, นายธนภัทร จันทร์งาม]
 * =====================================================================
 */

const fs = require("fs");
const path = require("path");

module.exports = (db) => {
  return {
    /* ================== PRODUCTS (สินค้า) ================== */

    async getAllProducts() {
      const sql = `
        SELECT pd.pd_id, pd.pd_asset_code, pd.pd_name, ct.ct_name,
               pd.pd_quantity, un.units_name, pd.pd_updated_at, pd.pd_upload_image
        FROM products pd
        LEFT JOIN categories ct ON pd.pd_category_id = ct.ct_id
        LEFT JOIN units un ON pd.pd_unit_id = un.units_id
        ORDER BY pd.pd_id ASC
      `;
      return new Promise((resolve, reject) => {
        db.query(sql, (err, res) => (err ? reject(err) : resolve(res)));
      });
    },

    /* ================== STOCK TRANSACTIONS (บันทึกการเคลื่อนไหว) ================== */

    async getAllTransactions() {
      const sql = `
        SELECT 
          stt.stt_id,
          stt.stt_product_id,
          stt.stt_type,
          stt.stt_quantity,
          stt.stt_created_at,
          stt.stt_ref_sf_id,
          stt.stt_user_id,
          pd.pd_name,
          pd.pd_asset_code,
          CONCAT(u.us_first_name_th, ' ', u.us_last_name_th) AS user_name
        FROM stock_transactions stt
        LEFT JOIN products pd ON stt.stt_product_id = pd.pd_id
        LEFT JOIN user u ON stt.stt_user_id = u.us_id
        ORDER BY stt.stt_created_at DESC
      `;
      return new Promise((resolve, reject) => {
        db.query(sql, (err, res) => (err ? reject(err) : resolve(res)));
      });
    },

    // ฟังก์ชันช่วย: หาหรือสร้าง Unit ID (ใช้ใน add/update product)
    async getOrCreateUnitId(unitName) {
      if (!unitName) throw new Error("Unit name is required");

      const [rows] = await db
        .promise()
        .query("SELECT units_id FROM units WHERE units_name = ?", [unitName]);
      if (rows.length > 0) return rows[0].units_id;

      const [res] = await db
        .promise()
        .query("INSERT INTO units (units_name) VALUES (?)", [unitName]);
      return res.insertId;
    },

    async addProduct(data, filename, userId = null) {
      // 1. จัดการ Unit
      const unitId = await this.getOrCreateUnitId(data.unitName);

      // 2. เพิ่มสินค้า
      const sql = `
        INSERT INTO products
        (pd_asset_code, pd_name, pd_category_id, pd_quantity, pd_unit_id, pd_upload_image, pd_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;
      const params = [
        data.assetCode,
        data.name,
        data.categoryId,
        data.quantity,
        unitId,
        filename,
      ];

      const [result] = await db.promise().query(sql, params);
      const productId = result.insertId;

      console.log("📝 [addProduct Service] Product inserted:", { productId, quantity: data.quantity, userId });

      // 3. บันทึก transaction IN (ระบุชื่อ column ชัดเจน)
      if (data.quantity > 0) {
        console.log("💰 [addProduct Service] Recording transaction...", {
          productId,
          userId,
          quantity: data.quantity,
          type: 'IN'
        });
        
        await db.promise().query(
          "INSERT INTO stock_transactions (stt_product_id, stt_user_id, stt_type, stt_quantity, stt_created_at) VALUES (?, ?, 'IN', ?, NOW())",
          [productId, userId, data.quantity],
        );
        
        console.log("✅ [addProduct Service] Transaction recorded successfully");
      } else {
        console.log("⚠️ [addProduct Service] Skipping transaction - quantity is:", data.quantity);
      }

      return productId;
    },

    async updateProduct(id, data, newFilename, userId = null) {
      // 1. ดึงข้อมูลเดิม
      const [oldProduct] = await db
        .promise()
        .query("SELECT pd_quantity FROM products WHERE pd_id = ?", [id]);
      if (!oldProduct.length) throw new Error("PRODUCT_NOT_FOUND");
      const oldQuantity = oldProduct[0].pd_quantity;

      // 2. จัดการ Unit
      const unitId = await this.getOrCreateUnitId(data.unitName);

      // 3. เตรียม SQL
      let sql = `
        UPDATE products SET
          pd_asset_code=?, pd_name=?, pd_detail=?, pd_category_id=?,
          pd_quantity=?, pd_unit_id=?, pd_updated_at=NOW()
      `;
      const params = [
        data.assetCode,
        data.name,
        data.detail,
        data.categoryId,
        data.quantity,
        unitId,
      ];

      // ถ้ามีรูปใหม่ ให้ Update field รูปด้วย
      if (newFilename) {
        sql += `, pd_upload_image=?`;
        params.push(newFilename);
      }

      sql += ` WHERE pd_id=?`;
      params.push(id);

      const [result] = await db.promise().query(sql, params);

      // 4. บันทึก transaction เมื่อจำนวนเปลี่ยนแปลง (ระบุชื่อ column ชัดเจน + userId)
      const quantityDiff = data.quantity - oldQuantity;
      if (quantityDiff > 0) {
        // 🆕 จำนวนเพิ่มขึ้น → บันทึก IN
        await db.promise().query(
          "INSERT INTO stock_transactions (stt_product_id, stt_user_id, stt_type, stt_quantity, stt_created_at) VALUES (?, ?, 'IN', ?, NOW())",
          [id, userId, quantityDiff],
        );
      } else if (quantityDiff < 0) {
        // 🆕 จำนวนลดลง → บันทึก OUT (ปรับสต๊อกลด)
        await db.promise().query(
          "INSERT INTO stock_transactions (stt_product_id, stt_user_id, stt_type, stt_quantity, stt_created_at) VALUES (?, ?, 'OUT', ?, NOW())",
          [id, userId, Math.abs(quantityDiff)],
        );
      }

      return result.affectedRows;
    },

    async deleteProduct(id, userId = null) {
      // 1. หาข้อมูลสินค้าก่อนลบ
      const [rows] = await db
        .promise()
        .query("SELECT pd_upload_image, pd_quantity, pd_name FROM products WHERE pd_id = ?", [id]);
      if (rows.length === 0) throw new Error("PRODUCT_NOT_FOUND");

      const imageName = rows[0].pd_upload_image;
      const quantity = rows[0].pd_quantity;
      const productName = rows[0].pd_name;

      // 2. 🆕 บันทึก transaction OUT ก่อนลบ (ถ้ายังมีสินค้าคงเหลือ) - ระบุชื่อ column ชัดเจน + userId
      if (quantity > 0) {
        await db.promise().query(
          "INSERT INTO stock_transactions (stt_product_id, stt_user_id, stt_type, stt_quantity, stt_created_at) VALUES (?, ?, 'OUT', ?, NOW())",
          [id, userId, quantity],
        );
      }

      // 3. ลบ DB
      await db.promise().query("DELETE FROM products WHERE pd_id = ?", [id]);

      // 4. ลบไฟล์ (ถ้ามี)
      if (imageName) {
        const imagePath = path.join(__dirname, "../../uploads", imageName);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      }
      return true;
    },

    /* ================== CATEGORIES & UNITS ================== */

    async getAllCategories() {
      const [rows] = await db
        .promise()
        .query("SELECT ct_id, ct_name FROM categories ORDER BY ct_name ASC");
      return rows;
    },

    async addCategory(name) {
      const [check] = await db
        .promise()
        .query(
          "SELECT COUNT(*) as count FROM categories WHERE LOWER(ct_name) = LOWER(?)",
          [name],
        );
      if (check[0].count > 0) throw new Error("DUPLICATE_NAME");

      const [res] = await db
        .promise()
        .query("INSERT INTO categories (ct_name) VALUES (?)", [name]);
      return res.insertId;
    },

    async updateCategory(id, name) {
      const [check] = await db
        .promise()
        .query(
          "SELECT COUNT(*) as count FROM categories WHERE LOWER(ct_name) = LOWER(?) AND ct_id != ?",
          [name, id],
        );
      if (check[0].count > 0) throw new Error("DUPLICATE_NAME");

      const [res] = await db
        .promise()
        .query("UPDATE categories SET ct_name = ? WHERE ct_id = ?", [name, id]);
      if (res.affectedRows === 0) throw new Error("NOT_FOUND");
      return true;
    },

    async deleteCategory(id) {
      const [check] = await db
        .promise()
        .query(
          "SELECT COUNT(*) as count FROM products WHERE pd_category_id = ?",
          [id],
        );
      if (check[0].count > 0) throw new Error("DEPENDENCY_EXISTS");

      const [res] = await db
        .promise()
        .query("DELETE FROM categories WHERE ct_id = ?", [id]);
      if (res.affectedRows === 0) throw new Error("NOT_FOUND");
      return true;
    },

    async getAllUnits() {
      const [rows] = await db
        .promise()
        .query(
          "SELECT units_id, units_name FROM units ORDER BY units_name ASC",
        );
      return rows;
    },

    /* ================== STOCK FORMS (เบิกของ) ================== */

    async getStockForms(userId = null) {
      let sql = `
    SELECT
      sf.sf_id,
      sf.sf_code,
      sf.sf_status,
      sf.sf_create_at,

      rf.rf_code,

      u.us_department,
      CONCAT(u.us_first_name_th, ' ', u.us_last_name_th) AS requester,

      b.bd_name,
      f.fl_name,
      r.room_name,

      GROUP_CONCAT(
        CONCAT(pd.pd_name, ' x', sfd.sfd_qty)
        SEPARATOR '\\n'
      ) AS items

    FROM stock_form sf
    LEFT JOIN user u ON u.us_id = sf.sf_us_id
    LEFT JOIN repair_form rf ON sf.sf_rf_id = rf.rf_id
    LEFT JOIN room r ON rf.rf_room_id = r.room_id
    LEFT JOIN floor f ON r.room_fl_id = f.fl_id
    LEFT JOIN building b ON f.fl_bd_id = b.bd_id

    LEFT JOIN stock_form_detail sfd ON sfd.sfd_sf_id = sf.sf_id
    LEFT JOIN products pd ON pd.pd_id = sfd.sfd_pd_id
  `;

      const params = [];

      if (userId) {
        sql += ` WHERE sf.sf_us_id = ?`;
        params.push(userId);
      }

      sql += ` GROUP BY sf.sf_id ORDER BY sf.sf_id DESC`;

      const [rows] = await db.promise().query(sql, params);
      return rows;
    },

    async getStockFormDetail(code) {
      const sql = `
        SELECT
          sf.sf_id, sf.sf_code, sf.sf_status, sf.sf_create_at,
          u.us_department, CONCAT(u.us_first_name_th, ' ', u.us_last_name_th) AS requester,
          b.bd_name, f.fl_name, r.room_name,
          pd.pd_id, pd.pd_name, pd.pd_asset_code, pd.pd_detail, pd.pd_upload_image,
          ct.ct_name AS category, sfd.sfd_qty, sfd.sfd_status,
          rf.rf_code
        FROM stock_form sf
        LEFT JOIN user u ON u.us_id = sf.sf_us_id
        LEFT JOIN repair_form rf ON rf.rf_id = sf.sf_rf_id
        LEFT JOIN room r ON rf.rf_room_id = r.room_id
        LEFT JOIN floor f ON r.room_fl_id = f.fl_id
        LEFT JOIN building b ON f.fl_bd_id = b.bd_id
        LEFT JOIN stock_form_detail sfd ON sfd.sfd_sf_id = sf.sf_id
        LEFT JOIN products pd ON pd.pd_id = sfd.sfd_pd_id
        LEFT JOIN categories ct ON ct.ct_id = pd.pd_category_id
        WHERE sf.sf_code = ?
      `;
      const [rows] = await db.promise().query(sql, [code]);
      return rows;
    },

    // สร้างใบเบิก (Transaction)
    async createWithdraw(userId, repairCode, items) {
      const connection = await db.promise().getConnection();

      try {
        // ===============================
        // ✅ STEP 1: รวม item ที่ซ้ำกัน
        // ===============================
        const mergedItemsMap = {};

        for (const item of items) {
          if (!mergedItemsMap[item.id]) {
            mergedItemsMap[item.id] = {
              id: item.id,
              qty: Number(item.qty),
            };
          } else {
            mergedItemsMap[item.id].qty += Number(item.qty);
          }
        }

        const mergedItems = Object.values(mergedItemsMap);

        await connection.beginTransaction();

        // 1. หา Repair ID
        const [rf] = await connection.query(
          "SELECT rf_id FROM repair_form WHERE rf_code = ?",
          [repairCode],
        );
        if (!rf.length) throw new Error("REPAIR_NOT_FOUND");
        const rfId = rf[0].rf_id;

        // 2. สร้าง Header (Stock Form) - สถานะ waiting รออนุมัติ
        const sfCode = "SF" + Date.now();
        const [sfRes] = await connection.query(
          "INSERT INTO stock_form (sf_code, sf_status, sf_create_at, sf_us_id, sf_rf_id) VALUES (?, 'waiting', NOW(), ?, ?)",
          [sfCode, userId, rfId],
        );
        const sfId = sfRes.insertId;

        // 3. Loop สร้างรายการเบิก (ไม่ตัด stock ยัง - รอ Stock อนุมัติก่อน)
        for (const item of items) {
          // เช็คว่าสินค้ามีจริง
          const [pd] = await connection.query(
            "SELECT pd_quantity, pd_name FROM products WHERE pd_id = ?",
            [item.id],
          );
          
          if (pd.length === 0) {
            throw new Error(`PRODUCT_NOT_FOUND:${item.id}`);
          }

          // เช็คว่า stock พอไหม (แต่ยังไม่ตัด)
          if (pd[0].pd_quantity < item.qty) {
            throw new Error(`INSUFFICIENT_STOCK_FOR_ITEM_${item.id}`);
          }

          console.log(`📝 [createWithdraw] Creating withdraw request: productId=${item.id}, qty=${item.qty}, current_stock=${pd[0].pd_quantity}`);

          // Insert Detail (สถานะ waiting - รอ Stock อนุมัติ)
          await connection.query(
            `INSERT INTO stock_form_detail
         (sfd_sf_id, sfd_pd_id, sfd_qty, sfd_status)
         VALUES (?, ?, ?, 'waiting')`,
            [sfId, item.id, item.qty],
          );
          
          console.log(`✅ [createWithdraw] Withdraw request created for product ${item.id} (stock will be deducted after approval)`);
        }

        await connection.commit();
        console.log(`✅ [createWithdraw] Withdraw completed: sfCode=${sfCode}, sfId=${sfId}`);
        return sfCode;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    // อนุมัติ/ไม่อนุมัติ รายชิ้น (Complex Logic)
    async updateItemStatus(sfCode, pdId, status, userId = null) {
      // 1. หา ID
      const [sf] = await db
        .promise()
        .query("SELECT sf_id FROM stock_form WHERE sf_code = ?", [sfCode]);
      if (!sf.length) throw new Error("FORM_NOT_FOUND");
      const sfId = sf[0].sf_id;

      // 2. หาข้อมูล Item ปัจจุบัน
      const [item] = await db
        .promise()
        .query(
          "SELECT sfd_qty, sfd_status FROM stock_form_detail WHERE sfd_sf_id = ? AND sfd_pd_id = ?",
          [sfId, pdId],
        );
      if (!item.length) throw new Error("ITEM_NOT_FOUND");
      if (item[0].sfd_status !== "waiting")
        throw new Error("ALREADY_PROCESSED");

      // 3. อัปเดตสถานะ
      await db
        .promise()
        .query(
          "UPDATE stock_form_detail SET sfd_status = ? WHERE sfd_sf_id = ? AND sfd_pd_id = ?",
          [status, sfId, pdId],
        );

      // 4. ถ้า Approved → ตัด stock + บันทึก OUT transaction
      if (status === "approved") {
        console.log(`✅ [updateItemStatus] Approving item: productId=${pdId}, qty=${item[0].sfd_qty}`);
        
        // ตัด stock
        await db
          .promise()
          .query(
            "UPDATE products SET pd_quantity = pd_quantity - ? WHERE pd_id = ?",
            [item[0].sfd_qty, pdId],
          );
        
        console.log(`💰 [updateItemStatus] Recording OUT transaction: productId=${pdId}, qty=${item[0].sfd_qty}, userId=${userId}`);
        
        // บันทึก transaction OUT (อนุมัติแล้ว - ตัด stock)
        await db
          .promise()
          .query(
            "INSERT INTO stock_transactions (stt_product_id, stt_user_id, stt_type, stt_quantity, stt_created_at, stt_ref_sf_id) VALUES (?, ?, 'OUT', ?, NOW(), ?)",
            [pdId, userId, item[0].sfd_qty, sfId],
          );
        
        console.log(`✅ [updateItemStatus] OUT transaction recorded for product ${pdId}`);
      }

      // 5. ถ้า Rejected → ไม่ทำอะไร (เพราะยังไม่ได้ตัด stock)
      if (status === "rejected") {
        console.log(`❌ [updateItemStatus] Rejecting item: productId=${pdId}, qty=${item[0].sfd_qty} (no stock changes needed)`);
      }

      // 6. คำนวณสถานะรวมของใบเบิกใหม่ (Recalculate)
      const [stats] = await db.promise().query(
        `
            SELECT
                SUM(sfd_status = 'waiting') AS waiting,
                SUM(sfd_status = 'approved') AS approved,
                SUM(sfd_status = 'rejected') AS rejected
            FROM stock_form_detail WHERE sfd_sf_id = ?
        `,
        [sfId],
      );

      const { waiting, approved, rejected } = stats[0];
      let newStatus = "waiting";

      if (waiting == 0) {
        if (approved > 0)
          newStatus = "approved"; // อนุมัติอย่างน้อย 1 ชิ้น
        else newStatus = "rejected"; // ไม่อนุมัติทั้งหมด
      }

      await db
        .promise()
        .query("UPDATE stock_form SET sf_status = ? WHERE sf_id = ?", [
          newStatus,
          sfId,
        ]);

      return { itemStatus: status, formStatus: newStatus };
    },

    // อนุมัติ/ไม่อนุมัติ หลายรายการพร้อมกัน (Batch Update)
    async updateMultipleItemsStatus(sfCode, items, userId = null) {
      const promisePool = db.promise();
      const connection = await promisePool.getConnection();

      try {
        await connection.beginTransaction();

        console.log("=== updateMultipleItemsStatus called ===");
        console.log("sfCode:", sfCode);
        console.log("items:", JSON.stringify(items, null, 2));

        // 1. หา sf_id
        const [sf] = await connection.query(
          "SELECT sf_id FROM stock_form WHERE sf_code = ?",
          [sfCode],
        );
        if (!sf.length) throw new Error("FORM_NOT_FOUND");
        const sfId = sf[0].sf_id;
        console.log("Found sfId:", sfId);

        // 2. วน update แต่ละรายการ
        for (const item of items) {
          const { pd_id, status } = item;

          console.log(`Processing item: pd_id=${pd_id}, status=${status}`);

          if (!pd_id || !["approved", "rejected"].includes(status)) {
            console.error("Invalid item data:", item);
            throw new Error("INVALID_ITEM_DATA");
          }

          // ตรวจสอบสถานะปัจจุบัน
          const [current] = await connection.query(
            "SELECT sfd_qty, sfd_status FROM stock_form_detail WHERE sfd_sf_id = ? AND sfd_pd_id = ?",
            [sfId, pd_id],
          );

          if (!current.length) {
            console.error("Item not found:", sfId, pd_id);
            throw new Error("ITEM_NOT_FOUND");
          }

          console.log("Current item status:", current[0].sfd_status);

          // ข้ามรายการที่ดำเนินการแล้ว (ไม่ throw error)
          if (current[0].sfd_status !== "waiting") {
            console.log("Skipping already processed item");
            continue;
          }

          // อัพเดตสถานะ
          await connection.query(
            "UPDATE stock_form_detail SET sfd_status = ? WHERE sfd_sf_id = ? AND sfd_pd_id = ?",
            [status, sfId, pd_id],
          );
          console.log("Updated item status to:", status);

          // ถ้า approved → ตัด stock + บันทึก OUT transaction
          if (status === "approved") {
            console.log(`✅ [updateMultipleItemsStatus] Approving item: pd_id=${pd_id}, qty=${current[0].sfd_qty}`);
            
            // ตัด stock
            await connection.query(
              "UPDATE products SET pd_quantity = pd_quantity - ? WHERE pd_id = ?",
              [current[0].sfd_qty, pd_id],
            );
            console.log("Deducted quantity:", current[0].sfd_qty);
            
            // บันทึก transaction OUT (อนุมัติแล้ว - ตัด stock)
            await connection.query(
              "INSERT INTO stock_transactions (stt_product_id, stt_user_id, stt_type, stt_quantity, stt_created_at, stt_ref_sf_id) VALUES (?, ?, 'OUT', ?, NOW(), ?)",
              [pd_id, userId, current[0].sfd_qty, sfId],
            );
            console.log("Logged transaction OUT (approved):", current[0].sfd_qty);
          }

          // ถ้า rejected → ไม่ทำอะไร (เพราะยังไม่ได้ตัด stock)
          if (status === "rejected") {
            console.log(`❌ [updateMultipleItemsStatus] Rejecting item: pd_id=${pd_id}, qty=${current[0].sfd_qty} (no stock changes needed)`);
          }
        }

        // 3. คำนวณสถานะรวมของใบเบิก
        const [stats] = await connection.query(
          `SELECT
            SUM(sfd_status = 'waiting') AS waiting,
            SUM(sfd_status = 'approved') AS approved,
            SUM(sfd_status = 'rejected') AS rejected
          FROM stock_form_detail WHERE sfd_sf_id = ?`,
          [sfId],
        );

        const { waiting, approved, rejected } = stats[0];
        console.log(
          "Stats - waiting:",
          waiting,
          "approved:",
          approved,
          "rejected:",
          rejected,
        );

        let newStatus = "waiting";

        if (waiting == 0) {
          if (approved > 0)
            newStatus = "approved"; // อนุมัติอย่างน้อย 1 ชิ้น
          else newStatus = "rejected"; // ไม่อนุมัติทั้งหมด
        }

        console.log("New form status:", newStatus);

        await connection.query(
          "UPDATE stock_form SET sf_status = ? WHERE sf_id = ?",
          [newStatus, sfId],
        );

        await connection.commit();
        console.log("Transaction committed successfully");
        return { formStatus: newStatus };
      } catch (error) {
        console.error("Error in updateMultipleItemsStatus:", error);
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    // อัปเดตสถานะใบเบิก (Manual)
    async updateFormStatus(sfCode, status) {
      const [res] = await db
        .promise()
        .query("UPDATE stock_form SET sf_status = ? WHERE sf_code = ?", [
          status,
          sfCode,
        ]);
      return res.affectedRows;
    },

    /* ================== IMPORT ================== */

    async importStock(items, userId = null) {
      const results = [];
      const errors = [];

      for (const [i, item] of items.entries()) {
        try {
          // ===============================
          // STEP 1: Validation
          // ===============================
          const qty = Number(item.pd_quantity);
          if (!item.pd_name || isNaN(qty) || qty <= 0 || !item.pd_unit_name) {
            throw new Error("ข้อมูลไม่ครบถ้วน หรือจำนวนไม่ถูกต้อง");
          }

          // ===============================
          // STEP 2: ตรวจสอบสินค้าซ้ำ
          // ===============================
          // ใช้ชื่อสินค้าเป็นหลัก
          let dupQuery = `
            SELECT pd_id FROM products
            WHERE TRIM(LOWER(pd_name)) = TRIM(LOWER(?))
            LIMIT 1
          `;
          let dupParams = [item.pd_name];

          // ค่อยเช็ค asset_code ถ้ามีจริง
          if (item.pd_asset_code && item.pd_asset_code.trim() !== "") {
            dupQuery = `
              SELECT pd_id FROM products
              WHERE TRIM(LOWER(pd_name)) = TRIM(LOWER(?))
              OR pd_asset_code = ?
              LIMIT 1
            `;
            dupParams.push(item.pd_asset_code);
          }

          const [dup] = await db.promise().query(dupQuery, dupParams);

          // ===============================
          // STEP 3: ถ้าซ้ำ → เพิ่มจำนวน (UPDATE)
          // ===============================
          if (dup.length > 0) {
            const [res] = await db.promise().query(
              `UPDATE products
               SET pd_quantity = pd_quantity + ?,
              pd_updated_at = NOW()
              WHERE pd_id = ?`,
              [qty, dup[0].pd_id],
            );

            console.log("UPDATED:", item.pd_name, "rows:", res.affectedRows);

            results.push({
              index: i,
              name: item.pd_name,
              action: "updated_quantity",
            });

            continue; // สำคัญมาก
          }

          // ===============================
          // STEP 4: ถ้าไม่ซ้ำ → INSERT
          // ===============================
          const unitId = await this.getOrCreateUnitId(item.pd_unit_name);

          let categoryId = null;
          if (item.pd_category_name) {
            const [ct] = await db
              .promise()
              .query("SELECT ct_id FROM categories WHERE ct_name = ?", [
                item.pd_category_name,
              ]);
            if (!ct.length) throw new Error("ไม่พบหมวดหมู่ที่ระบุ");
            categoryId = ct[0].ct_id;
          }

          // Insert
          const [insertResult] = await db.promise().query(
            `INSERT INTO products (pd_asset_code, pd_name, pd_category_id, pd_quantity, pd_unit_id, pd_updated_at)
                     VALUES (?, ?, ?, ?, ?, NOW())`,
            [item.pd_asset_code || null, item.pd_name, categoryId, qty, unitId],
          );

          const productId = insertResult.insertId;
          console.log(`📝 [importStock] Product inserted: ID=${productId}, name=${item.pd_name}, qty=${qty}, userId=${userId}`);

          // บันทึก transaction IN - ระบุชื่อ column ชัดเจน + userId
          console.log(`💰 [importStock] Recording transaction for product ${productId}...`);
          
          await db.promise().query(
            "INSERT INTO stock_transactions (stt_product_id, stt_user_id, stt_type, stt_quantity, stt_created_at) VALUES (?, ?, 'IN', ?, NOW())",
            [productId, userId, qty],
          );
          
          console.log(`✅ [importStock] Transaction recorded successfully for product ${productId}`);

          results.push({ index: i, name: item.pd_name });
        } catch (err) {
          errors.push({
            index: i,
            name: item.pd_name,
            message: err.message,
          });
        }
      }

      return {
        success: results.length,
        failed: errors.length,
        results,
        errors,
      };
    },

    async returnItem(sfCode, pdId, returnQty, userId) {
      const connection = await db.promise().getConnection();

      try {
        await connection.beginTransaction();

        // 1. หา sf_id
        const [sf] = await connection.query(
          `SELECT sf_id FROM stock_form WHERE sf_code = ?`,
          [sfCode],
        );

        if (!sf.length) throw new Error("FORM_NOT_FOUND");

        const sfId = sf[0].sf_id;

        // 2. คำนวณจำนวน withdraw ทั้งหมด
        const [withdrawRows] = await connection.query(
          `SELECT COALESCE(SUM(sfd_qty),0) total
       FROM stock_form_detail
       WHERE sfd_sf_id = ?
       AND sfd_pd_id = ?
       AND sfd_type = 'withdraw'
       AND sfd_status = 'approved'`,
          [sfId, pdId],
        );

        const totalWithdraw = withdrawRows[0].total;

        // 3. คำนวณจำนวน return แล้ว
        const [returnRows] = await connection.query(
          `SELECT COALESCE(SUM(sfd_qty),0) total
       FROM stock_form_detail
       WHERE sfd_sf_id = ?
       AND sfd_pd_id = ?
       AND sfd_type = 'return'`,
          [sfId, pdId],
        );

        const totalReturned = returnRows[0].total;

        const remaining = totalWithdraw - totalReturned;

        if (remaining <= 0) throw new Error("NOTHING_TO_RETURN");

        if (returnQty > remaining) throw new Error("RETURN_EXCEEDS_AVAILABLE");

        // 4. insert return record
        await connection.query(
          `INSERT INTO stock_form_detail
      (sfd_sf_id, sfd_pd_id, sfd_qty, sfd_type, sfd_status)
      VALUES (?, ?, ?, 'return', 'returned')`,
          [sfId, pdId, returnQty],
        );

        // 5. update stock
        await connection.query(
          `UPDATE products
       SET pd_quantity = pd_quantity + ?
       WHERE pd_id = ?`,
          [returnQty, pdId],
        );

        // บันทึก transaction IN (คืนของ) - ระบุชื่อ column ชัดเจน + userId
        await connection.query(
          "INSERT INTO stock_transactions (stt_product_id, stt_user_id, stt_type, stt_quantity, stt_created_at, stt_ref_sf_id) VALUES (?, ?, 'IN', ?, NOW(), ?)",
          [pdId, userId, returnQty, sfId],
        );

        await connection.commit();

        return true;
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    },
  };
};
