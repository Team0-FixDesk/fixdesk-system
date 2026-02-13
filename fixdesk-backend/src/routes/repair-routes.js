const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middlewares/auth-middleware");

module.exports = (db) => {
  const router = express.Router();
  const repairService = require("../services/repair-service")(db);
  const repairController = require("../controllers/repair-controller")(
    repairService,
  );

  // --- Multer Config ---
  const repairUploadPath = path.join(__dirname, "../../uploads/repair");
  if (!fs.existsSync(repairUploadPath)) {
    fs.mkdirSync(repairUploadPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, repairUploadPath),
    filename: (req, file, cb) => {
      const dateTimeStamp = new Date()
        .toISOString()
        .replace(/[:.-]/g, "")
        .slice(0, 15);
      const randomSuffix = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      const ext = path.extname(file.originalname);
      cb(null, `RF_${dateTimeStamp}_${randomSuffix}${ext}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mov|wmv/;
    if (
      allowedTypes.test(path.extname(file.originalname).toLowerCase()) &&
      allowedTypes.test(file.mimetype)
    ) {
      return cb(null, true);
    }
    cb(new Error("รองรับเฉพาะไฟล์รูปภาพและวิดีโอเท่านั้น"));
  };

  const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024, files: 5 },
    fileFilter,
  });

  // ================= ROUTES (PATH เดิมทั้งหมด) =================

  // --- Upload / Delete Files ---
  router.post(
    "/upload-repair-files",
    upload.array("files", 5),
    repairController.uploadFiles,
  );
  router.delete("/delete-file/:filename", repairController.deleteFile);

  // --- Create Repair ---
  // แบบมีไฟล์แนบ
  router.post(
    "/repair-requests-with-files",
    upload.array("files", 5),
    repairController.createRepair,
  );
  // แบบ JSON (ส่ง path มาเอง)
  router.post(
    "/repair-requests",
    express.json(),
    repairController.createRepair,
  );

  // --- Update Repair ---
  router.put(
    "/repair-requests-with-files/:code",
    upload.array("files", 5),
    repairController.updateRepair,
  );
  router.put("/repair-requests/:code", repairController.updateRepair);

  // --- General View ---
  router.get(
    "/admin/repairs",
    authMiddleware,
    repairController.getAdminRepairs,
  );
  router.get("/my-repairs/:userId", repairController.getUserRepairs);
  router.delete(
    "/my-repairs/:code",
    authMiddleware,
    repairController.deleteRepair,
  );

  // --- Detail ---
  router.get("/repair-requests/:code", repairController.getRepairDetail);

  // --- Assignment ---
  router.post(
    "/assign-repair",
    authMiddleware,
    repairController.assignIndividual,
  );
  router.post(
    "/assign-repair-team",
    authMiddleware,
    repairController.assignTeam,
  );

  // --- Technician Actions ---
  router.put(
    "/technician/accept-job/:code",
    authMiddleware,
    repairController.acceptJob,
  );
  router.get(
    "/technician/repairs",
    authMiddleware,
    repairController.getTechRepairs,
  );

  // --- Stats ---
  router.get("/repair-stats/:userId", repairController.getStats);

  return router;
};
