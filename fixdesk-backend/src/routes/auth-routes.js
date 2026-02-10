const express = require("express");

module.exports = (db) => {
  const router = express.Router();

  // เชื่อม Service และ Controller เข้าด้วยกัน
  const authService = require("../services/auth-service")(db);
  const authController = require("../controllers/auth-controller")(authService);

  /* ===================== LOGIN ===================== */
  // POST /login
  router.post("/login", authController.login);

  return router;
};
