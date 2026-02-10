const express = require("express");

module.exports = (db) => {
  const router = express.Router();

  // เชื่อม Service และ Controller
  const publicService = require("../services/public-service")(db);
  const publicController = require("../controllers/public-controller")(
    publicService,
  );

  /* ===================== SEARCH ===================== */
  // เส้นทาง: GET /public/search
  router.get("/search", publicController.search);

  return router;
};
