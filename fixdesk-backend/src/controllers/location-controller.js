module.exports = (locationService) => {
  return {
    /* --- BUILDING --- */
    async getBuildings(req, res) {
      try {
        const buildingList = await locationService.getAllBuildings();
        res.json(buildingList);
      } catch (error) {
        res.status(500).json({ message: "โหลดข้อมูลอาคารไม่สำเร็จ" });
      }
    },

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

    /* --- IMPORT --- */
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
  };
};
