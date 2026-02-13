module.exports = (publicService) => {
  return {
    // ฟังก์ชันจัดการ Request ค้นหา
    async search(req, res) {
      try {
        // รับค่าจาก URL Query (เช่น ?keyword=คอม&page=1&limit=10)
        const keyword = req.query.keyword || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // คำนวณจุดเริ่มต้นข้อมูล (Offset)
        const offset = (page - 1) * limit;

        // ถ้าไม่ได้กรอกคำค้นหา ให้ส่ง Array เปล่ากลับไปเลย (ไม่เปลือง Database)
        if (!keyword.trim()) {
          return res.json({
            data: [],
            total: 0,
          });
        }

        // เรียก Service เพื่อไปดึงข้อมูลจาก Database
        const result = await publicService.searchRepairForms(
          keyword,
          limit,
          offset,
        );

        // ส่งข้อมูลกลับไปให้หน้าบ้าน
        return res.json({
          data: result.data,
          total: result.total,
        });
      } catch (error) {
        // กรณีเกิด Error (เช่น Database หลุด)
        console.error("[PUBLIC][SEARCH]", error);
        return res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
      }
    },
  };
};
