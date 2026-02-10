const express = require("express");
const authMiddleware = require("../middlewares/auth-middleware");

module.exports = (db) => {
  const router = express.Router();
  const userService = require("../services/user-service")(db);
  const userController = require("../controllers/user-controller")(userService);

  // --- Public / General Data ---
  router.get("/titles", authMiddleware, userController.getTitles);
  router.get("/roles", authMiddleware, userController.getRoles);

  // --- User Management (CRUD) ---
  router.get("/users", authMiddleware, userController.getUsers); // ดูทั้งหมด
  router.post("/users", userController.createUser); // สร้างใหม่ (บางทีอาจไม่ต้องใช้ auth ถ้าเป็น register, แต่ถ้า admin สร้างให้ก็ใส่ auth)
  router.get("/users/:id", authMiddleware, userController.getUserById); // ดูรายคน
  router.put("/users/:id", authMiddleware, userController.updateUser); // แก้ไข (Admin)
  router.delete("/users/:id", authMiddleware, userController.deleteUser); // ลบ

  // --- Personal Profile ---
  router.get("/user/:id", userController.getUserById); // ใช้ฟังก์ชันเดียวกับ getUsers/:id ได้เลยถ้าข้อมูลเหมือนกัน หรือแยกถ้าจำเป็น
  router.put("/edit-personal/:id", userController.updatePersonalProfile);

  // --- Import ---
  router.post("/users/import", authMiddleware, userController.importUsers);

  return router;
};
