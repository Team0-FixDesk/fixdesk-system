const express = require("express");
const authMiddleware = require("../middlewares/auth-middleware");

module.exports = (db) => {
  const router = express.Router();
  const techService = require("../services/technician-service")(db);
  const techController = require("../controllers/technician-controller")(
    techService,
  );

  // --- Technician Management (Admin) ---
  router.get("/technicians", authMiddleware, techController.getTechnicians);

  // --- Technician Types ---
  router.get("/technician-types", techController.getTypes);
  router.post("/technician-types", techController.createType);
  router.put("/technician-types/:id", techController.updateType);
  router.delete("/technician-types/:id", techController.deleteType);

  // --- Technician Tasks (My Job) ---
  router.get(
    "/technician/repairs",
    authMiddleware,
    techController.getMyRepairs,
  );
  router.get("/technician/history", authMiddleware, techController.getHistory);
  router.get(
    "/technician/my-stock-forms",
    authMiddleware,
    techController.getMyStockForms,
  );

  // --- Actions ---
  router.put(
    "/technician/close-job/:rf_code",
    authMiddleware,
    techController.closeJob,
  );
  router.post("/withdraw", authMiddleware, techController.withdrawStock); // *ชื่อ Path ซ้ำกับ stock-routes แต่ Logic แยกกันตามบริบทของ User*

  return router;
};
