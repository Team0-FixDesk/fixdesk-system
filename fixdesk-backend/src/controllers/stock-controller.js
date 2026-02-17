/**
 * =====================================================================
 * @file            : stock-controller.js
 * @module          : จัดการ Stock และ Stock Forms
 * @layer           : Controller Layer (API Controller)
 * @version         : 1.0.0
 * @since           : 2026-02-17
 * @lastModified    : 2026-02-17
 * @lastModifiedBy  : นายพชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  Controller สำหรับจัดการ API ของระบบคลังวัสดุ/อุปกรณ์
 *  ทำหน้าที่รับ request จาก client และเรียกใช้ stockService
 *  เพื่อดำเนินการ business logic และส่ง response กลับ
 *
 *  รองรับการทำงาน:
 *    - จัดการสินค้า (เพิ่ม, แก้ไข, ลบ, แสดงรายการ)
 *    - จัดการหมวดหมู่
 *    - จัดการใบเบิกสินค้า
 *    - เบิกสินค้า
 *    - อนุมัติ/ปฏิเสธสินค้า
 *    - คืนสินค้า
 *
 * @requires
 *   - stock-service.js
 *   - express
 *
 * @author
 *   - นายพชร ไพศรีสกุล
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  - เพิ่มระบบคืนสินค้า (returnItem)   [2026-02-17, นายพชร ไพศรีสกุล]
 * =====================================================================
 */

module.exports = (stockService) => {
  return {
    /* --- Products --- */
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

    /* --- Category --- */
    async getCategories(req, res) {
      try {
        const result = await stockService.getAllCategories();
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: "ดึงหมวดหมู่ไม่สำเร็จ" });
      }
    },

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

    /* --- Units --- */
    async getUnits(req, res) {
      try {
        const result = await stockService.getAllUnits();
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: "ดึงหน่วยนับไม่สำเร็จ" });
      }
    },

    /* --- Stock Forms (Withdrawal) --- */
    async getAllStockForms(req, res) {
      try {
        const result = await stockService.getStockForms();
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: "ดึงข้อมูลใบเบิกไม่สำเร็จ" });
      }
    },

    async getUserStockForms(req, res) {
      try {
        const result = await stockService.getStockForms(req.params.id);
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: "ดึงข้อมูลใบเบิกไม่สำเร็จ" });
      }
    },

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

    async withdraw(req, res) {
      try {
        const { repair_code, items } = req.body;
        if (!items || items.length === 0)
          return res.status(400).json({ message: "ไม่มีรายการสินค้า" });

        const userId = req.user.us_id || req.user.id;
        const sfCode = await stockService.createWithdraw(
          userId,
          repair_code,
          items,
        );

        res.json({ message: "เบิกสินค้าเรียบร้อย", sf_code: sfCode });
      } catch (err) {
        if (err.message === "REPAIR_NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบใบแจ้งซ่อม" });
        if (err.message.includes("INSUFFICIENT_STOCK"))
          return res.status(400).json({ message: "สินค้าไม่เพียงพอ" });
        res
          .status(500)
          .json({ message: "เบิกสินค้าไม่สำเร็จ", error: err.message });
      }
    },

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
    async returnItem(req, res) {
      try {
        const { sf_code, pd_id } = req.body;

        const userId = req.user.us_id;

        await stockService.returnItem(sf_code, pd_id, userId);

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
