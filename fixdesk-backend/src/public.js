const express = require("express");

module.exports = function PublicRoutes(db) {
  const router = express.Router();

  // ค้นหาใบแจ้งซ่อมแบบ Public (ไม่ต้อง token)
  router.get("/search", (req, res) => {
    const keyword = req.query.keyword || "";
    if (!keyword.trim()) {
      return res.json([]); // ถ้าไม่มี keyword ไม่ต้องหาอะไร
    }

    const sql = `
      SELECT 
        rf.rf_code,
        rf.rf_problem,
        rf.rf_user_status,
        rf.rf_create_at,
        u.us_first_name_th AS reporter_firstname,
        u.us_last_name_th AS reporter_lastname,
        b.bd_name AS building_name,
        f.fl_name AS floor_name,
        r.room_name AS room_name
      FROM repair_form rf
      LEFT JOIN user u ON rf.rf_us_id = u.us_id
      LEFT JOIN room r ON rf.rf_room_id = r.room_id
      LEFT JOIN floor f ON r.room_fl_id = f.fl_id
      LEFT JOIN building b ON f.fl_bd_id = b.bd_id
      WHERE 
        rf.rf_code LIKE ? 
        OR u.us_first_name_th LIKE ?
        OR u.us_last_name_th LIKE ?
        OR u.us_department LIKE ?
      ORDER BY rf.rf_create_at DESC
      LIMIT 20
    `;

    const like = `%${keyword}%`;

    db.query(sql, [like, like, like, like], (err, results) => {
      if (err) {
        console.error("Public search error:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาด" });
      }
      res.json(results);
    });
  });

  return router;
};
