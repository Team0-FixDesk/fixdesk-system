const express = require("express");
const { authMiddleware } = require("../auth");

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
    ORDER BY pd.pd_id DESC
  `;

    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching inventory:", err);
        return res
          .status(500)
          .json({ message: "ดึงข้อมูลคลังสินค้าไม่สำเร็จ", error: err.message });
      }
      res.json(results);
    });
  });

  router.post("/add-stock", authMiddleware, (req, res) => {
    const {
      pd_asset_code,
      pd_name,
      pd_category_id,
      pd_quantity,
      pd_unit_id,
      pd_upload_image
    } = req.body;

    // Validate required fields
    if (!pd_asset_code || !pd_name || !pd_category_id || !pd_quantity || !pd_unit_id) {
      return res.status(400).json({
        message: "Missing required fields",
        required: ["pd_asset_code", "pd_name", "pd_category_id", "pd_quantity", "pd_unit_id"]
      });
    }

    const query = `
      INSERT INTO products 
      (pd_asset_code, pd_name, pd_category_id, pd_quantity, pd_unit_id, pd_upload_image, pd_updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [pd_asset_code, pd_name, pd_category_id, pd_quantity, pd_unit_id, pd_upload_image || null];

    db.query(query, params, (err, results) => {
      if (err) {
        console.error("Error adding stock:", err);
        return res.status(500).json({
          message: "Failed to add inventory item",
          error: err.message
        });
      }
      res.status(201).json({
        message: "Inventory item added successfully",
        id: results.insertId
      });
    });
  });

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

  return router;
};


