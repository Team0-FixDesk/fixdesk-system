const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middlewares/auth-middleware");

// --- Multer Config ---
const uploadDir = path.join(__dirname, "../../uploads"); // Path ออกไปที่ root/uploads
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({ storage: storage });

module.exports = (db) => {
  const router = express.Router();
  const stockService = require("../services/stock-service")(db);
  const stockController = require("../controllers/stock-controller")(
    stockService,
  );

  // --- Products ---
  router.get("/show-stock", authMiddleware, stockController.getAllProducts);
  router.post(
    "/add-stock",
    authMiddleware,
    upload.single("pd_upload_image"),
    stockController.addProduct,
  );
  router.put(
    "/update-stock/:id",
    authMiddleware,
    upload.single("pd_upload_image"),
    stockController.updateProduct,
  );
  router.delete(
    "/delete-stock/:id",
    authMiddleware,
    stockController.deleteProduct,
  );

  // --- Category ---
  router.get("/category", stockController.getCategories);
  router.post("/category", authMiddleware, stockController.addCategory);
  router.put("/category/:id", authMiddleware, stockController.updateCategory);
  router.delete(
    "/category/:id",
    authMiddleware,
    stockController.deleteCategory,
  );

  // --- Units ---
  router.get("/units", stockController.getUnits);

  // --- Stock Forms (Withdrawal) ---
  router.get("/stock-forms", authMiddleware, stockController.getAllStockForms);
  router.get(
    "/stock-forms/:id",
    authMiddleware,
    stockController.getUserStockForms,
  ); // ดูของ user คนนั้น
  router.get(
    "/stock-forms/detail/:sf_code",
    authMiddleware,
    stockController.getStockFormDetail,
  );

  // Actions
  router.post("/withdraw", authMiddleware, stockController.withdraw);
  router.put(
    "/stock-forms/update-status",
    authMiddleware,
    stockController.updateFormStatus,
  );
  router.put(
    "/stock-forms/detail/update-item-status",
    authMiddleware,
    stockController.updateItemStatus,
  );

  // --- Import ---
  router.post("/stock/import", authMiddleware, stockController.importStock);

  return router;
};
