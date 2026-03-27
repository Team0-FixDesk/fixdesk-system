/**
 * =====================================================================
 * @file            location.controller.js
 * @layer           Controller Layer (Presentation Layer)
 * @version         1.2.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *   - นราธิป แสนทวีสุข
 *
 * @lastModified    2026-03-03
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 *  Controller สำหรับจัดการข้อมูลสถานที่ (Location Management)
 *  ทำหน้าที่รับ request จาก client และเรียกใช้งาน locationService
 *
 *  รองรับการจัดการ:
 *    - อาคาร (Building)
 *    - ชั้น (Floor)
 *    - ห้อง (Room)
 *    - Import ข้อมูล Location
 *    - ตรวจสอบการใช้งานสถานที่ในใบแจ้งซ่อมก่อนแก้ไข/ลบ
 * 
 * @usedBy
 *  - location-route.js 
 * 
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *   - Initial implementation Location Controller ตาม Layered Architecture
 *  [2026-02-10, พชร ไพศรีสกุล] V 1.1.0
 *  - เพิ่มฟังก์ชัน Import ข้อมูล Location แบบ Bulk และเพิ่มการตรวจสอบการใช้งานสถานที่ในใบแจ้งซ่อมก่อนแก้ไข/ลบ
 *  [2026-03-03, นราธิป แสนทวีสุข] V 1.2.0
 *  - เพิ่ม checkUsageInRepairs() controller function
 *  - เพื่อตรวจสอบการใช้งานสถานที่ในใบแจ้งซ่อมก่อนแก้ไข/ลบ     
 *
 * =====================================================================
 */

module.exports = (locationService) => {
  return {
    /**
     * ดึงรายการอาคารทั้งหมด
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {Promise<void>}
     */
    async getBuildings(req, res) {
      try {
        const buildingList = await locationService.getAllBuildings();
        res.json(buildingList);
      } catch (error) {
        res.status(500).json({ message: "โหลดข้อมูลอาคารไม่สำเร็จ" });
      }
    },

    /**
     * สร้างอาคารใหม่
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async createBuilding(req, res) {
      try {
        const { bd_name } = req.body;
        if (!bd_name || !bd_name.trim())
          return res.status(400).json({ message: "กรุณากรอกชื่ออาคาร" });

        const newId = await locationService.createBuilding(bd_name.trim());
        res.status(201).json({
          message: "เพิ่มอาคารสำเร็จ",
          bd_id: newId,
          bd_name: bd_name.trim(),
        });
      } catch (error) {
        if (error.message === "DUPLICATE_NAME")
          return res.status(400).json({ message: "ชื่ออาคารนี้มีอยู่แล้ว" });
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มอาคาร" });
      }
    },

    /**
     * แก้ไขข้อมูลอาคาร
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async updateBuilding(req, res) {
      try {
        const { id } = req.params;
        const { bd_name } = req.body;
        if (!bd_name || !bd_name.trim())
          return res.status(400).json({ message: "กรุณากรอกชื่ออาคาร" });

        await locationService.updateBuilding(id, bd_name.trim());
        res.json({ message: "แก้ไขอาคารสำเร็จ" });
      } catch (error) {
        if (error.message === "NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบอาคาร" });
        if (error.message === "DUPLICATE_NAME")
          return res.status(400).json({ message: "ชื่ออาคารนี้มีอยู่แล้ว" });
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการแก้ไข" });
      }
    },

    /**
     * ลบอาคาร
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async deleteBuilding(req, res) {
      try {
        await locationService.deleteBuilding(req.params.id);
        res.json({ message: "ลบอาคารสำเร็จ" });
      } catch (error) {
        if (error.message === "DEPENDENCY_EXISTS")
          return res.status(400).json({ message: "ลบไม่ได้ มีชั้นใช้งานอยู่" });
        if (error.message === "NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบอาคาร" });
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบ" });
      }
    },

    /* --- FLOOR --- */
    /**
     * ดึงรายการชั้นทั้งหมด หรือ ตามอาคาร
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async getFloors(req, res) {
      try {
        // ถ้ามี buildingId ส่งมา ก็ค้นหาเฉพาะตึกนั้น
        if (req.params.buildingId) {
          const floorList = await locationService.getFloorsByBuilding(
            req.params.buildingId,
          );
          return res.json(floorList);
        }
        // ถ้าไม่มี ส่งทั้งหมด
        const floorList = await locationService.getAllFloors();
        res.json(floorList);
      } catch (error) {
        res.status(500).json({ message: "โหลดข้อมูลชั้นไม่สำเร็จ" });
      }
    },

    /**
     * สร้างชั้นใหม่
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async createFloor(req, res) {
      try {
        const { fl_name, fl_bd_id } = req.body;
        if (!fl_name?.trim() || !fl_bd_id)
          return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });

        const newId = await locationService.createFloor(
          fl_name.trim(),
          fl_bd_id,
        );
        res.status(201).json({ message: "เพิ่มชั้นสำเร็จ", fl_id: newId });
      } catch (error) {
        if (error.message === "PARENT_NOT_FOUND")
          return res.status(400).json({ message: "ไม่พบอาคารที่ระบุ" });
        if (error.message === "DUPLICATE_NAME")
          return res.status(400).json({ message: "ชื่อชั้นซ้ำในอาคารนี้" });
        res.status(500).json({ message: "เกิดข้อผิดพลาด" });
      }
    },

    /**
     * แก้ไขข้อมูลชั้น
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async updateFloor(req, res) {
      try {
        const { fl_name, fl_bd_id } = req.body;
        if (!fl_name?.trim() || !fl_bd_id)
          return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });

        await locationService.updateFloor(
          req.params.id,
          fl_name.trim(),
          fl_bd_id,
        );
        res.json({ message: "แก้ไขชั้นสำเร็จ" });
      } catch (error) {
        if (error.message === "NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบชั้น" });
        if (error.message === "PARENT_NOT_FOUND")
          return res.status(400).json({ message: "ไม่พบอาคาร" });
        if (error.message === "DUPLICATE_NAME")
          return res.status(400).json({ message: "ชื่อชั้นซ้ำ" });
        res.status(500).json({ message: "เกิดข้อผิดพลาด" });
      }
    },

    /**
     * ลบชั้น
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async deleteFloor(req, res) {
      try {
        await locationService.deleteFloor(req.params.id);
        res.json({ message: "ลบชั้นสำเร็จ" });
      } catch (error) {
        if (error.message === "DEPENDENCY_EXISTS")
          return res.status(400).json({ message: "ลบไม่ได้ มีห้องใช้งานอยู่" });
        if (error.message === "NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบชั้น" });
        res.status(500).json({ message: "เกิดข้อผิดพลาด" });
      }
    },

    /* --- ROOM --- */
    /**
     * ดึงรายการห้องทั้งหมด หรือ ตามชั้น
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async getRooms(req, res) {
      try {
        if (req.params.floorId) {
          const roomList = await locationService.getRoomsByFloor(
            req.params.floorId,
          );
          return res.json(roomList);
        }
        const roomList = await locationService.getAllRooms();
        res.json(roomList);
      } catch (error) {
        res.status(500).json({ message: "โหลดข้อมูลห้องไม่สำเร็จ" });
      }
    },

    /**
     * สร้างห้องใหม่
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async createRoom(req, res) {
      try {
        const { room_name, room_fl_id } = req.body;
        if (!room_name?.trim() || !room_fl_id)
          return res.status(400).json({ message: "ข้อมูลไม่ครบ" });

        const newId = await locationService.createRoom(
          room_name.trim(),
          room_fl_id,
        );
        res.status(201).json({ message: "เพิ่มห้องสำเร็จ", room_id: newId });
      } catch (error) {
        if (error.message === "PARENT_NOT_FOUND")
          return res.status(400).json({ message: "ไม่พบชั้นที่ระบุ" });
        if (error.message === "DUPLICATE_NAME")
          return res.status(400).json({ message: "ชื่อห้องซ้ำ" });
        res.status(500).json({ message: "เกิดข้อผิดพลาด" });
      }
    },

    /**
     * แก้ไขข้อมูลห้อง
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async updateRoom(req, res) {
      try {
        const { room_name, room_fl_id } = req.body;
        if (!room_name?.trim() || !room_fl_id)
          return res.status(400).json({ message: "ข้อมูลไม่ครบ" });

        await locationService.updateRoom(
          req.params.id,
          room_name.trim(),
          room_fl_id,
        );
        res.json({ message: "แก้ไขห้องสำเร็จ" });
      } catch (error) {
        if (error.message === "NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบห้อง" });
        if (error.message === "PARENT_NOT_FOUND")
          return res.status(400).json({ message: "ไม่พบชั้น" });
        if (error.message === "DUPLICATE_NAME")
          return res.status(400).json({ message: "ชื่อห้องซ้ำ" });
        res.status(500).json({ message: "เกิดข้อผิดพลาด" });
      }
    },

    /**
     * ลบห้อง
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async deleteRoom(req, res) {
      try {
        await locationService.deleteRoom(req.params.id);
        res.json({ message: "ลบห้องสำเร็จ" });
      } catch (error) {
        if (error.message === "DEPENDENCY_EXISTS")
          return res
            .status(400)
            .json({ message: "ลบไม่ได้ มีใบแจ้งซ่อมใช้อยู่" });
        if (error.message === "NOT_FOUND")
          return res.status(404).json({ message: "ไม่พบห้อง" });
        res.status(500).json({ message: "เกิดข้อผิดพลาด" });
      }
    },

    /* --- IMPORT CONTROLLER --- */
    /**
     * Import ข้อมูล Location แบบ Bulk
     *
     * @author พชร ไพศรีสกุล
     * @since 2026-02-10
     * @lastModified 2026-02-10
     * @lastModifiedBy พชร ไพศรีสกุล
     * @contributors
     *  - พชร ไพศรีสกุล
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async importLocations(req, res) {
      try {
        const { locations } = req.body;
        if (!Array.isArray(locations) || !locations.length) {
          return res.status(400).json({ message: "ไม่มีข้อมูลสำหรับ Import" });
        }
        await locationService.importLocations(locations);
        res.json({ message: "Import Location สำเร็จ" });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .json({ message: "Import ล้มเหลว", error: error.message });
      }
    },

    /* --- USAGE CHECK CONTROLLER --- */
    /**
     * เช็คการใช้งาน Building, Floor หรือ Room ในรายการแจ้งซ่อม
     *
     * @author GitHub Copilot
     * @since 2026-03-02
     * @lastModified 2026-03-02
     * @lastModifiedBy GitHub Copilot
     *
     * @param {Object} req
     * @param {Object} res
     * @returns {Promise<void>}
     */
    async checkUsageInRepairs(req, res) {
      try {
        const { type, id } = req.params;
        
        if (!['building', 'floor', 'room'].includes(type)) {
          return res.status(400).json({ message: 'ประเภทไม่ถูกต้อง' });
        }
        
        if (!id || isNaN(id)) {
          return res.status(400).json({ message: 'ID ไม่ถูกต้อง' });
        }
        
        const result = await locationService.checkUsageInRepairs(type, id);
        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ 
          message: 'เกิดข้อผิดพลาดในการตรวจสอบการใช้งาน',
          error: error.message 
        });
      }
    },
  };
};
