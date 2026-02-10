const express = require("express");
const authMiddleware = require("../middlewares/auth-middleware"); // เรียกใช้ Middleware ที่แยกไฟล์ไปแล้ว

module.exports = (db) => {
  const router = express.Router();
  const locationService = require("../services/location-service")(db);
  const locationController = require("../controllers/location-controller")(
    locationService,
  );

  // --- Buildings ---
  router.get("/buildings", locationController.getBuildings);
  router.post("/buildings", authMiddleware, locationController.createBuilding);
  router.put(
    "/buildings/:id",
    authMiddleware,
    locationController.updateBuilding,
  );
  router.delete(
    "/buildings/:id",
    authMiddleware,
    locationController.deleteBuilding,
  );

  // --- Floors ---
  router.get("/floors", locationController.getFloors); // ทั้งหมด
  router.get("/floors/:buildingId", locationController.getFloors); // ตามตึก (ใช้ฟังก์ชันเดียวกัน แยก Logic ใน Controller)
  router.post("/floors", authMiddleware, locationController.createFloor);
  router.put("/floors/:id", authMiddleware, locationController.updateFloor);
  router.delete("/floors/:id", authMiddleware, locationController.deleteFloor);

  // --- Rooms ---
  router.get("/rooms", locationController.getRooms); // ทั้งหมด
  router.get("/rooms/:floorId", locationController.getRooms); // ตามชั้น
  router.post("/rooms", authMiddleware, locationController.createRoom);
  router.put("/rooms/:id", authMiddleware, locationController.updateRoom);
  router.delete("/rooms/:id", authMiddleware, locationController.deleteRoom);

  // --- Extra ---
  // router.get("/locations/all", ...); // *หากต้องการใช้ API รวม ก็เพิ่ม Service/Controller ได้ตาม Pattern เดิม
  router.post(
    "/locations/import",
    authMiddleware,
    locationController.importLocations,
  );

  return router;
};
