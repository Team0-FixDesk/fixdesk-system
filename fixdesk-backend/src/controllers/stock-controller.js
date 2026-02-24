/**
 * =====================================================================
 * @file            stock-controller.js
 * @layer           Controller (Presentation Layer)
 * @version         1.3.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *   - นราธิป แสนทวีสุข
 *   - ปฏิพัทธ์ จงนันทพันธ์กุล
 *
 * @lastModified    2026-02-23
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  Controller สำหรับจัดการระบบคลังวัสดุ/อุปกรณ์ (Stock Management)
 *  ทำหน้าที่รับ request จาก client และเรียกใช้งาน stockService
 *
 *  รองรับการทำงาน:
 *    - จัดการสินค้า (Products)
 *    - จัดการหมวดหมู่ (Categories)
 *    - จัดการหน่วยนับ (Units)
 *    - จัดการใบเบิกสินค้า (Stock Forms)
 *    - เบิกสินค้า (Withdraw)
 *    - อนุมัติ/ปฏิเสธรายการ
 *    - Import ข้อมูลสินค้า
 *    - คืนสินค้า (Return Item)
 *
 * @usedBy
 *   - stock.route.js
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - Refactor โครงสร้างตาม Coding Standard V1.7.2
 *     [2026-02-10, พชร ไพศรีสกุล] V1.0.0
 *   - Allow approving and rejecting items in same requisition
 *     [2026-02-14, นราธิป แสนทวีสุข] V1.1.0
 *   - เพิ่มระบบการคืนอุปกรณ์ (Return Item)
 *     [2026-02-17, พชร ไพศรีสกุล] V1.2.0
 *   - แก้ไขข้อความแจ้งเตือน  
 *     [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล] V1.2.1
 *   - รองรับการคืนอุปกรณ์แบบบางส่วน (Partial Return)ปรับปรุง logic การคืนและการคำนวณ stock ให้รองรับการคืนหลายครั้ง
 *     [2026-02-23, พชร ไพศรีสกุล] V1.3.0
 *
 * =====================================================================
 */

module.exports = (stockService) => {
  return {
    /* --- PRODUCT CONTROLLER --- */
    /**
     * ดึงรายการสินค้าทั้งหมด
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-17
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *  - นราธิป แสนทวีสุข
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async getAllProducts(req, res) {
      try {
        const products = await stockService.getAllProducts();
        res.json(products);
      } catch (err) {
        res
          .status(500)
          .json({ message: "ดึงข้อมูลสินค้าไม่สำเร็จ", error: err.message });
      }
    },

    /**
     * เพิ่มสินค้าใหม่
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-17
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async addProduct(req, res) {
      try {
        const {
          pd_asset_code,
          pd_name,
          pd_category_id,
          pd_quantity,
          pd_unit_id,
        } = req.body;

        if (!pd_name || !pd_category_id || !pd_quantity || !pd_unit_id) {
          return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        const data = {
          assetCode: pd_asset_code,
          name: pd_name,
          categoryId: pd_category_id,
          quantity: pd_quantity,
          unitName: pd_unit_id, // Frontend ส่งมาเป็น Text ชื่อ unit
        };
        const filename = req.file ? req.file.filename : null;

        const newId = await stockService.addProduct(data, filename);
        res.status(201).json({ message: "เพิ่มสินค้าสำเร็จ", id: newId });
      } catch (err) {
        res
          .status(500)
          .json({ message: "เพิ่มสินค้าไม่สำเร็จ", error: err.message });
      }
    },

    /**
     * แก้ไขข้อมูลสินค้า
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-17
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async updateProduct(req, res) {
      try {
        const { id } = req.params;
        const {
          pd_asset_code,
          pd_name,
          pd_detail,
          pd_category_id,
          pd_quantity,
          pd_unit_id,
        } = req.body;

        const data = {
          assetCode: pd_asset_code,
          name: pd_name,
          detail: pd_detail,
          categoryId: pd_category_id,
          quantity: pd_quantity,
          unitName: pd_unit_id,
        };
        const newFilename = req.file ? req.file.filename : null;

        await stockService.updateProduct(id, data, newFilename);
        res.json({ message: "แก้ไขสินค้าสำเร็จ" });
      } catch (err) {
        if (err.message === "NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบสินค้า" });
        res
          .status(500)
          .json({ message: "แก้ไขสินค้าไม่สำเร็จ", error: err.message });
      }
    },

    /**
     * ลบสินค้า
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-17
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async deleteProduct(req, res) {
      try {
        await stockService.deleteProduct(req.params.id);
        res.json({ message: "ลบสินค้าสำเร็จ" });
      } catch (err) {
        if (err.message === "PRODUCT_NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบสินค้า" });
        res
          .status(500)
          .json({ message: "ลบสินค้าไม่สำเร็จ", error: err.message });
      }
    },

    /* --- CATEGORY CONTROLLER --- */
    /**
     * ดึงรายการหมวดหมู่ทั้งหมด
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-14
     * @lastModifiedBy นราธิป แสนทวีสุข
     * @contributors
     *  - พชร ไพศรีสกุล
     *  - นราธิป แสนทวีสุข
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async getCategories(req, res) {
      try {
        const result = await stockService.getAllCategories();
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: "ดึงหมวดหมู่ไม่สำเร็จ" });
      }
    },

    /**
     * เพิ่มหมวดหมู่สินค้าใหม่
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-14
     * @lastModifiedBy นราธิป แสนทวีสุข
     * @contributors
     *  - พชร ไพศรีสกุล
     *  - นราธิป แสนทวีสุข
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async addCategory(req, res) {
      try {
        const { ct_name } = req.body;
        if (!ct_name?.trim())
          return res.status(400).json({ message: "กรุณากรอกชื่อหมวดหมู่" });

        const newId = await stockService.addCategory(ct_name.trim());
        res.status(201).json({ message: "เพิ่มหมวดหมู่สำเร็จ", ct_id: newId });
      } catch (err) {
        if (err.message === "DUPLICATE_NAME")
          return res.status(400).json({ message: "ชื่อหมวดหมู่ซ้ำ" });
        res.status(500).json({ message: "เพิ่มหมวดหมู่ไม่สำเร็จ" });
      }
    },

    /**
     * แก้ไขข้อมูลหมวดหมู่สินค้า
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-14
     * @lastModifiedBy นราธิป แสนทวีสุข
     * @contributors
     *  - พชร ไพศรีสกุล
     *  - นราธิป แสนทวีสุข
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async updateCategory(req, res) {
      try {
        const { ct_name } = req.body;
        if (!ct_name?.trim())
          return res.status(400).json({ message: "กรุณากรอกชื่อหมวดหมู่" });

        await stockService.updateCategory(req.params.id, ct_name.trim());
        res.json({ message: "แก้ไขหมวดหมู่สำเร็จ" });
      } catch (err) {
        if (err.message === "DUPLICATE_NAME")
          return res.status(400).json({ message: "ชื่อหมวดหมู่ซ้ำ" });
        if (err.message === "NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบหมวดหมู่" });
        res.status(500).json({ message: "แก้ไขหมวดหมู่ไม่สำเร็จ" });
      }
    },

    /**
     * ลบหมวดหมู่สินค้า
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-14
     * @lastModifiedBy นราธิป แสนทวีสุข
     * @contributors
     *  - พชร ไพศรีสกุล
     *  - นราธิป แสนทวีสุข
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async deleteCategory(req, res) {
      try {
        await stockService.deleteCategory(req.params.id);
        res.json({ message: "ลบหมวดหมู่สำเร็จ" });
      } catch (err) {
        if (err.message === "DEPENDENCY_EXISTS")
          return res
            .status(400)
            .json({ message: "ลบไม่ได้ มีสินค้าในหมวดหมู่นี้" });
        if (err.message === "NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบหมวดหมู่" });
        res.status(500).json({ message: "ลบหมวดหมู่ไม่สำเร็จ" });
      }
    },

    /* --- UNIT CONTROLLER --- */
    /**
     * ดึงรายการหน่วยนับสินค้า (Units)
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-14
     * @lastModifiedBy นราธิป แสนทวีสุข
     * @contributors
     *  - พชร ไพศรีสกุล
     *  - นราธิป แสนทวีสุข
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async getUnits(req, res) {
      try {
        const result = await stockService.getAllUnits();
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: "ดึงหน่วยนับไม่สำเร็จ" });
      }
    },

    /* --- STOCK FORM CONTROLLER --- */
    /**
     * ดึงรายการใบเบิกสินค้าทั้งหมด
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-17
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async getAllStockForms(req, res) {
      try {
        const result = await stockService.getStockForms();
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: "ดึงข้อมูลใบเบิกไม่สำเร็จ" });
      }
    },

    /**
     * ดึงรายการใบเบิกสินค้าของผู้ใช้งาน
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-17
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async getUserStockForms(req, res) {
      try {
        const result = await stockService.getStockForms(req.params.id);
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: "ดึงข้อมูลใบเบิกไม่สำเร็จ" });
      }
    },

    /**
     * ดึงรายละเอียดใบเบิกสินค้า
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-17
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async getStockFormDetail(req, res) {
      try {
        const result = await stockService.getStockFormDetail(
          req.params.sf_code,
        );
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: "ดึงรายละเอียดไม่สำเร็จ" });
      }
    },

    /**
     * สร้างใบเบิกสินค้า (Withdraw)
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-17
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async withdraw(req, res) {
      try {
        const { repair_code, items } = req.body;
        if (!items || items.length === 0)
          return res.status(400).json({ message: "ไม่มีรายการวัสดุ/อุปกรณ์" });

        const userId = req.user.us_id || req.user.id;
        const sfCode = await stockService.createWithdraw(
          userId,
          repair_code,
          items,
        );

        res.json({ message: "ส่งคำขอเบิกเรียบร้อย", sf_code: sfCode });
      } catch (err) {
        if (err.message === "REPAIR_NOT_FOUND")
          return res
            .status(404)
            .json({ message: "ไม่พบรายการแจ้งซ่อมที่ต้องการ" });
        if (err.message.includes("INSUFFICIENT_STOCK"))
          return res
            .status(400)
            .json({ message: "จำนวนวัสดุ/อุปกรณ์ที่ต้องการเบิกไม่เพียงพอ" });
        res
          .status(500)
          .json({ message: "ส่งคำขอเบิกไม่สำเร็จ", error: err.message });
      }
    },

    /**
     * อัปเดตสถานะรายการสินค้าในใบเบิก
     *
     * @author นราธิป แสนทวีสุข
     * @since 2026-02-14
     * @lastModified 2026-02-14
     * @lastModifiedBy นราธิป แสนทวีสุข
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async updateItemStatus(req, res) {
      try {
        const { sf_code, pd_id, status } = req.body;
        if (!sf_code || !pd_id || !["approved", "rejected"].includes(status)) {
          return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง" });
        }

        const result = await stockService.updateItemStatus(
          sf_code,
          pd_id,
          status,
        );
        res.json({ message: "บันทึกผลการพิจารณาสำเร็จ", ...result });
      } catch (err) {
        if (err.message === "ALREADY_PROCESSED")
          return res
            .status(400)
            .json({ message: "รายการนี้ถูกดำเนินการไปแล้ว" });
        res
          .status(500)
          .json({ message: "บันทึกผลไม่สำเร็จ", error: err.message });
      }
    },

    /**
     * อัปเดตสถานะหลายรายการสินค้า
     *
     * @author นราธิป แสนทวีสุข
     * @since 2026-02-14
     * @lastModified 2026-02-14
     * @lastModifiedBy นราธิป แสนทวีสุข
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async updateMultipleItemsStatus(req, res) {
      try {
        const { sf_code, items } = req.body;

        if (!sf_code || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง" });
        }

        const result = await stockService.updateMultipleItemsStatus(
          sf_code,
          items,
        );
        res.json({ message: "บันทึกผลการพิจารณาสำเร็จ", ...result });
      } catch (err) {
        if (err.message === "ALREADY_PROCESSED")
          return res
            .status(400)
            .json({ message: "รายการนี้ถูกดำเนินการไปแล้ว" });
        if (err.message === "FORM_NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบใบเบิก" });
        res
          .status(500)
          .json({ message: "บันทึกผลไม่สำเร็จ", error: err.message });
      }
    },

    /**
     * อัปเดตสถานะใบเบิกสินค้า
     *
     * @author นราธิป แสนทวีสุข
     * @since 2026-02-14
     * @lastModified 2026-02-14
     * @lastModifiedBy นราธิป แสนทวีสุข
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async updateFormStatus(req, res) {
      try {
        const { sf_code, status } = req.body;
        const affected = await stockService.updateFormStatus(sf_code, status);

        if (affected === 0)
          return res.status(404).json({ message: "ไม่พบใบเบิก" });
        res.json({ message: "อัปเดตสถานะสำเร็จ", sf_status: status });
      } catch (err) {
        res.status(500).json({ message: "อัปเดตสถานะไม่สำเร็จ" });
      }
    },

    // --- Import ข้อมูลสินค้า ---
    /**
     * Import ข้อมูลสินค้าเข้าสู่ระบบ
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-17
     * @lastModified 2026-02-17
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async importStock(req, res) {
      try {
        const { items } = req.body;
        if (!Array.isArray(items) || !items.length) {
          return res.status(400).json({ message: "ไม่มีข้อมูลสำหรับ Import" });
        }

        const result = await stockService.importStock(items);
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: "Import ล้มเหลว", error: err.message });
      }
    },

    /**
     * คืนสินค้าเข้าสู่ระบบ
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-17
     * @lastModified 2026-02-17
     * @lastModifiedBy พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async returnItem(req, res) {
      try {
        const { sf_code, pd_id, quantity } = req.body;

        const userId = req.user.us_id;

        if (!quantity || quantity <= 0)
          return res.status(400).json({
            message: "จำนวนไม่ถูกต้อง",
          });

        await stockService.returnItem(sf_code, pd_id, quantity, userId);

        res.json({
          message: "คืนอุปกรณ์สำเร็จ",
        });
      } catch (err) {
        res.status(500).json({
          message: err.message,
        });
      }
    },
  };
};
