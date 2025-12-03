const express = require("express");
const { authMiddleware } = require("../auth");

module.exports = function StockRoutes(db) {
  const router = express.Router();

  // ดึงรายการใบเบิกทั้งหมด
  router.get("/stock-forms", authMiddleware, (req, res) => {
    const query = `
    SELECT
      sf.sf_id,
      sf.sf_code,
      sf.sf_create_at,
      sf.sf_update_at,
      sf.sf_urgency,
      sf.sf_status,
      sf.sf_us_id,
      sf.sf_rf_id,
      u.us_first_name_th AS requester_first_name,
      u.us_last_name_th AS requester_last_name,
      u.us_department AS requester_department,
      rf.rf_code AS related_rf_code,
      b.bd_name AS building_name,
      f.fl_name AS floor_name,
      r.room_name AS room_name
    FROM stock_form sf
    LEFT JOIN user u ON sf.sf_us_id = u.us_id
    LEFT JOIN repair_form rf ON sf.sf_rf_id = rf.rf_id
    LEFT JOIN room r ON rf.rf_room_id = r.room_id
    LEFT JOIN floor f ON r.room_fl_id = f.fl_id
    LEFT JOIN building b ON f.fl_bd_id = b.bd_id
    ORDER BY sf.sf_create_at DESC
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.error("Error fetching stock forms:", err);
        return res
          .status(500)
          .json({ message: "ดึงข้อมูลใบเบิกไม่สำเร็จ", error: err.message });
      }
      res.json(results);
    });
  });

  return router;
};
