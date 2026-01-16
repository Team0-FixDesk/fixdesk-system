const express = require("express");

module.exports = function PublicRoutes(db) {
  const router = express.Router();

  router.get("/search", (req, res) => {
    const keyword = req.query.keyword || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!keyword.trim()) {
      return res.json({
        data: [],
        total: 0,
      });
    }

    const like = `%${keyword}%`;

    // query นับจำนวนทั้งหมด
    const countSql = `
      SELECT COUNT(*) AS total
      FROM repair_form rf
      LEFT JOIN user u ON rf.rf_us_id = u.us_id
      WHERE 
        rf.rf_code LIKE ?
        OR u.us_first_name_th LIKE ?
        OR u.us_last_name_th LIKE ?
        OR u.us_department LIKE ?
    `;

    // query ข้อมูลตามหน้า
    const dataSql = `
      SELECT 
        rf.rf_code,
        rf.rf_problem,
        rf.rf_user_status,
        rf.rf_create_at,
        u.us_first_name_th AS reporter_firstname,
        u.us_last_name_th AS reporter_lastname,
        u.us_department AS reporter_department,
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
      LIMIT ? OFFSET ?
    `;

    db.query(countSql, [like, like, like, like], (err, countResult) => {
      if (err) {
        console.error("Count error:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาด" });
      }

      const total = countResult[0].total;

      db.query(
        dataSql,
        [like, like, like, like, limit, offset],
        (err, dataResult) => {
          if (err) {
            console.error("Data error:", err);
            return res.status(500).json({ message: "เกิดข้อผิดพลาด" });
          }

          res.json({
            data: dataResult,
            total,
          });
        }
      );
    });
  });

  return router;
};
