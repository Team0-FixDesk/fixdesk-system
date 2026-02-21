
import { ref } from 'vue'
// Composable สำหรับโหลดข้อมูลสถานที่/ประเภทงานที่ใช้ในฟอร์ม
// คืนค่า: รายการประเภทงาน, อาคาร, ชั้น, ห้อง และฟังก์ชันดึงข้อมูล
export function useRepairLocationData(API_BASE_URL) {
  const repairTypeList = ref([])
  const buildingList = ref([])
  const floorList = ref([])
  const roomList = ref([])

  async function fetchRepairTypeList() {
    try {
      const res = await fetch(`${API_BASE_URL}/technician-types`)
      if (!res.ok) throw new Error('โหลดข้อมูลประเภทไม่สำเร็จ')

      const data = await res.json()

      repairTypeList.value = data.map((item) => ({
        id: Number(item.tt_id),
        name: item.tt_name,
      }))
    } catch (err) {
      console.error(err)
    }
  }

  async function fetchBuildingList() {
    try {
      const res = await fetch(`${API_BASE_URL}/buildings`)
      if (!res.ok) throw new Error('โหลดข้อมูลอาคารไม่สำเร็จ')

      const data = await res.json()

      buildingList.value = data.map((b) => ({
        id: Number(b.building_id),
        name: b.building_name,
      }))
    } catch (err) {
      console.error(err)
    }
  }

  async function fetchFloorList(buildingId) {
    if (!buildingId) return

    try {
      const res = await fetch(`${API_BASE_URL}/floors/${buildingId}`)
      if (!res.ok) throw new Error('โหลดข้อมูลชั้นไม่สำเร็จ')

      const data = await res.json()

      floorList.value = data.map((f) => ({
        id: Number(f.floor_id),
        name: f.floor_name,
      }))
    } catch (err) {
      console.error(err)
    }
  }

  async function fetchRoomList(floorId) {
    if (!floorId) return

    try {
      const res = await fetch(`${API_BASE_URL}/rooms/${floorId}`)
      if (!res.ok) throw new Error('โหลดข้อมูลห้องไม่สำเร็จ')

      const data = await res.json()

      roomList.value = data.map((r) => ({
        id: Number(r.room_id),
        name: r.room_name,
      }))
    } catch (err) {
      console.error(err)
    }
  }

  return {
    repairTypeList,
    buildingList,
    floorList,
    roomList,
    fetchRepairTypeList,
    fetchBuildingList,
    fetchFloorList,
    fetchRoomList,
  }
}
