
 /**
 * =====================================================================
 * @file            admin-manage-location-view.vue
 * @module          มอดูลการจัดการสถานที่ - การจัดการข้อมูลสถานที่
 * @layer           View (Presentation Layer)
 * @version         1.1.0
 * @since           2025-10-21
 * @author          เศรษฐพงศ์ หอมชื่น
 * @lastModified    2026-03-03
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอสำหรับผู้ดูแลระบบ ใช้จัดการข้อมูลสถานที่ภายในระบบแจ้งซ่อม
 *  ผู้ดูแลระบบสามารถจัดการ:
 *    - อาคาร (Building)
 *    - ชั้น (Floor)
 *    - ห้อง (Room)
 *    - แสดงรายการห้องทั้งหมดในระบบ (จัดเรียงตาม อาคาร → ชั้น → ห้อง)
 *    - ค้นหา และกรองข้อมูลตามอาคาร / ชั้น
 *    - เพิ่มสถานที่
 *    - แก้ไขข้อมูลห้อง
 *    - ลบข้อมูลห้อง
 *    - นำเข้าสถานที่จากไฟล์ Excel
 *
 *  การปรับปรุงล่าสุด:
 *    - ปรับข้อความในหน้าจอให้สอดคล้องกับรูปแบบเดียวกับหน้าจัดการอื่น ๆ
 *    - เพิ่ม/ปรับ Toast แจ้งเตือนให้แสดงผลทันทีหลังดำเนินการสำเร็จ
 *    - ปรับรูปแบบการแจ้งเตือนให้ใช้โทนสีเดียวกันกับโมดูลอื่น
 *
 * @requires
 *   - vue
 *   - vue-router
 *   - sweetalert2
 *   - @iconify/vue
 *   - TableComponent
 *   - TableActionsComponent
 *   - ImportLocationModal
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - ปรับปรุงข้อความที่ใช้ให้เหมาะสม                 [2026-02-18, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - ปรับข้อความในหน้าจอ และปรับรูปแบบ Toast
 *     ให้สอดคล้องกับโมดูลอื่นในระบบ                  [2026-02-21, ธนภัทร จันทร์งาม]
 *   - แก้ไขสีปุ่ม                    [2026-02-27, เศรษฐพงศ์ หอมชื่น]
 *   - refactor(location): ใช้ Universal Edit Modal แทน Type-specific Modal สำหรับแก้ไขสถานที่
 *     [2026-03-03, นราธิป แสนทวีสุข]
 * =====================================================================
 */


<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { Icon } from '@iconify/vue'
import ImportButtonComponent from '@/components/button/import-button-component.vue'
import BaseButtonComponent from '@/components/button/base/base-button-component.vue'

import TableComponent from '@/components/table-component.vue'
import TableActionsComponent from '@/components/table-actions-component.vue'
import ImportLocationModal from '@/components/modal/import-location-excel-component.vue'

defineOptions({ name: 'AdminManageLocationView' })

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE
const fileInput = ref(null)

const showImportModal = ref(false)

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// ฟังก์ชันสำหรับเช็ค Token หมดอายุ
const handleAuthError = (status) => {
  if (status === 401) {
    Swal.fire({
      icon: 'warning',
      title: 'หมดเวลาเข้าสู่ระบบ',
      text: 'กรุณาเข้าสู่ระบบใหม่',
      confirmButtonText: 'ตกลง',
    }).then(() => {
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
      router.push('/login')
    })
    return true
  }
  return false
}

const buildings = ref([])
const floors = ref([])
const rooms = ref([])
const searchQuery = ref('')

// Filter states
const showBuildingFilter = ref(false)
const showFloorFilter = ref(false)
const selectedBuilding = ref('')
const selectedFloor = ref('')

// Modal states
const showViewModal = ref(false)
const showAddModal = ref(false)
const showEditModal = ref(false)

const modalFloors = ref([])
const bulkFloors = ref([])

// Data for modals
const viewData = ref({})
const addForm = ref({
  type: 'building',
  name: '',
  building_id: '',
  floor_id: '',
  bulk_mode: true,
  building_mode: 'existing',
  floor_mode: 'existing',
  new_building_name: '',
  new_floor_name: '',
  room_name: '',
})
const editForm = ref({
  type: '', // 'building', 'floor', 'room'

  // ข้อมูลอาคาร
  building_id: '',
  building_name: '',
  original_building_name: '', // เก็บค่าเดิมไว้เช็ค

  // ข้อมูลชั้น
  floor_id: '',
  floor_name: '',
  original_floor_name: '', // เก็บค่าเดิมไว้เช็ค

  // ข้อมูลห้อง
  room_id: '',
  room_name: '',
  original_room_name: '', // เก็บค่าเดิมไว้เช็ค
})

// Validation states
const validationErrors = ref({
  name: false,
  newBuildingName: false,
  newFloorName: false,
  roomName: false,
})

const errorMessages = ref({
  name: '',
  newBuildingName: '',
  newFloorName: '',
  roomName: '',
})

// VALIDATION FUNCTIONS
function validateAlphanumeric(value, fieldName, type = null) {
  // เช็คว่าเป็นชั้นหรือไม่
  const isFloorField = fieldName === 'newFloorName' ||
                       fieldName === 'floor_name' ||
                       type === 'floor' ||
                       (fieldName === 'name' && addForm.value.type === 'floor') ||
                       (fieldName === 'name' && editForm.value.type === 'floor')

  if (isFloorField) {
    const numberRegex = /^[0-9]+$/
    if (!value.trim()) {
      validationErrors.value[fieldName] = true
      errorMessages.value[fieldName] = `กรุณากรอกข้อมูล`
      return false
    }
    if (!numberRegex.test(value)) {
      validationErrors.value[fieldName] = true
      errorMessages.value[fieldName] = `กรุณากรอกชั้นเป็นตัวเลขเท่านั้น`
      return false
    }
    validationErrors.value[fieldName] = false
    errorMessages.value[fieldName] = ''
    return true
  }

  const regex = /^[ก-๙a-zA-Z0-9\s/]*$/

  if (!value.trim()) {
    validationErrors.value[fieldName] = true
    errorMessages.value[fieldName] = `กรุณากรอกข้อมูล`
    return false
  }

  if (!regex.test(value)) {
    validationErrors.value[fieldName] = true
    errorMessages.value[fieldName] = `กรุณากรอกชื่อ${getFieldLabel(fieldName)}เป็นตัวอักษรไทย อังกฤษ ตัวเลข และ / เท่านั้น`
    return false
  }

  validationErrors.value[fieldName] = false
  errorMessages.value[fieldName] = ''
  return true
}

function getFieldLabel(fieldName) {
  const labels = {
    name: 'ข้อมูล',
    newBuildingName: 'อาคาร',
    newFloorName: 'ชั้น',
    roomName: 'ห้อง',
  }
  return labels[fieldName] || ''
}

// FETCH ALL DATA - ฟังก์ชันหลักที่ใช้ดึงข้อมูลทั้งหมด
async function fetchAllData() {
  try {
    // พยายามใช้ endpoint ใหม่ก่อน
    const res = await fetch(`${API_BASE}/locations/all`, { headers: getAuthHeaders() })
    if (handleAuthError(res.status)) return

    const allData = await res.json()

    // แยกข้อมูลตามประเภท
    buildings.value = allData
      .filter((item) => item.type === 'building')
      .map((item) => ({
        building_id: item.id,
        building_name: item.name,
      }))

    floors.value = allData
      .filter((item) => item.type === 'floor')
      .map((item) => ({
        floor_id: item.id,
        floor_name: item.name,
        building_id: item.building_id || item.fl_bd_id, // รับทั้ง field เดิมและใหม่
        building_name: item.building,
      }))

    rooms.value = allData
      .filter((item) => item.type === 'room')
      .map((item) => ({
        room_id: item.id,
        room_name: item.name,
        floor_id: item.floor_id || item.room_fl_id, // รับทั้ง field เดิมและใหม่
        floor_name: item.floor,
        building_id: item.building_id,
        building_name: item.building,
      }))
  } catch (err) {
    console.error('Error fetching from /locations/all:', err)
    // ถ้า endpoint ใหม่ยังไม่มี ให้ใช้วิธีเก่า
    await fetchAllDataAlternative()
  }
}

// วิธีสำรองถ้า endpoint ใหม่ยังไม่มี
async function fetchAllDataAlternative() {
  try {
    // ดึงอาคารทั้งหมด
    const buildingsRes = await fetch(`${API_BASE}/buildings`, { headers: getAuthHeaders() })
    if (handleAuthError(buildingsRes.status)) return
    buildings.value = await buildingsRes.json()

    // ดึงชั้นทั้งหมดจาก endpoint ใหม่ (ถ้ามี)
    try {
      const floorsRes = await fetch(`${API_BASE}/floors`, { headers: getAuthHeaders() })
      if (floorsRes.ok) {
        const floorsData = await floorsRes.json()
        // แปลงข้อมูลให้ตรงกับโครงสร้าง
        floors.value = floorsData.map((floor) => ({
          floor_id: floor.floor_id,
          floor_name: floor.floor_name,
          building_id: floor.fl_bd_id || floor.building_id, // ใช้ fl_bd_id จาก response ใหม่
          building_name: floor.building_name,
        }))
      } else {
        // ถ้าไม่มี endpoint ใหม่ ให้ดึงตามอาคาร
        await fetchFloorsByBuilding()
      }
    } catch (err) {
      console.error('Error fetching all floors:', err)
      await fetchFloorsByBuilding()
    }

    // ดึงห้องทั้งหมดจาก endpoint ใหม่ (ถ้ามี)
    try {
      const roomsRes = await fetch(`${API_BASE}/rooms`, { headers: getAuthHeaders() })
      if (roomsRes.ok) {
        const roomsData = await roomsRes.json()
        // แปลงข้อมูลให้ตรงกับโครงสร้าง
        rooms.value = roomsData.map((room) => ({
          room_id: room.room_id,
          room_name: room.room_name,
          floor_id: room.room_fl_id || room.floor_id, // ใช้ room_fl_id จาก response ใหม่
          floor_name: room.floor_name,
          building_id: room.fl_bd_id || room.building_id,
          building_name: room.building_name,
        }))
      } else {
        // ถ้าไม่มี endpoint ใหม่ ให้ดึงตามชั้น
        await fetchRoomsByFloor()
      }
    } catch (err) {
      console.error('Error fetching all rooms:', err)
      await fetchRoomsByFloor()
    }
  } catch (err) {
    console.error('Error fetching location data:', err)
    // Toast notification
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
    Toast.fire({
      title: 'เกิดข้อผิดพลาด',
      text: 'ไม่สามารถโหลดข้อมูลสถานที่ได้',
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}

// Helper functions สำหรับวิธีเก่า
// Helper functions สำหรับวิธีเก่า
async function fetchFloorsByBuilding() {
  const allFloors = []
  for (const building of buildings.value) {
    const floorsRes = await fetch(`${API_BASE}/floors/${building.building_id}`, {
      headers: getAuthHeaders(),
    })
    if (floorsRes.ok) {
      const floorsData = await floorsRes.json()
      floorsData.forEach((floor) => {
        allFloors.push({
          floor_id: floor.floor_id,
          floor_name: floor.floor_name,
          building_id: building.building_id,
          building_name: building.building_name,
        })
      })
    }
  }
  floors.value = allFloors
}

async function fetchRoomsByFloor() {
  const allRooms = []
  for (const floor of floors.value) {
    const roomsRes = await fetch(`${API_BASE}/rooms/${floor.floor_id}`, {
      headers: getAuthHeaders(),
    })
    if (roomsRes.ok) {
      const roomsData = await roomsRes.json()
      roomsData.forEach((room) => {
        allRooms.push({
          room_id: room.room_id,
          room_name: room.room_name,
          floor_id: floor.floor_id,
          floor_name: floor.floor_name,
          building_id: floor.building_id,
          building_name: floor.building_name,
        })
      })
    }
  }
  rooms.value = allRooms
}

// COMPUTED DATA - แสดงเฉพาะห้องที่มีอยู่จริง (ไม่แสดงอาคารและชั้นเปล่าๆ)
const displayData = computed(() => {
  let data = []

  // แสดงเฉพาะห้องที่มีอยู่จริง
  rooms.value.forEach((room) => {
    const floor = floors.value.find((f) => f.floor_id == room.floor_id)
    const building = floor ? buildings.value.find((b) => b.building_id == floor.building_id) : null

    data.push({
      id: room.room_id,
      type: 'room',
      name: room.room_name,
      building: building ? building.building_name : '-',
      floor: floor ? floor.floor_name : '-',
      room: room.room_name,
      raw: room,
      sort_building: building ? building.building_name : 'zzz',
      sort_floor: floor ? floor.floor_name : 'zzz',
      sort_room: room.room_name,
      building_name: building ? building.building_name : '',
      floor_name: floor ? floor.floor_name : '',
      room_name: room.room_name,
      building_num: extractNumber(building ? building.building_name : ''),
      floor_num: extractNumber(floor ? floor.floor_name : ''),
      room_num: extractNumber(room.room_name),
    })
  })

  // กรองด้วย search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    data = data.filter((item) => item.name.toLowerCase().includes(query) || item.building.toLowerCase().includes(query) || item.floor.toLowerCase().includes(query) || item.room.toLowerCase().includes(query))
  }

  // กรองด้วยอาคารที่เลือก
  if (selectedBuilding.value) {
    const building = buildings.value.find((b) => b.building_id == selectedBuilding.value)
    const buildingName = building ? building.building_name : ''

    data = data.filter((item) => {
      return item.building === buildingName
    })
  }

  // กรองด้วยชั้นที่เลือก
  if (selectedFloor.value) {
    const floor = floors.value.find((f) => f.floor_id == selectedFloor.value)
    const floorName = floor ? floor.floor_name : ''

    data = data.filter((item) => {
      return item.floor === floorName
    })
  }

  // เรียงลำดับข้อมูล: อาคาร → ชั้น → ห้อง
  data.sort((a, b) => {
    // เรียงตามอาคารก่อน
    if (a.sort_building !== b.sort_building) {
      // พยายามเรียงตามตัวเลขถ้าเป็นตัวเลข
      if (a.building_num !== null && b.building_num !== null) {
        return a.building_num - b.building_num
      }
      return a.sort_building.localeCompare(b.sort_building, 'th')
    }

    // ถ้าอาคารเดียวกัน เรียงตามชั้น
    if (a.sort_floor !== b.sort_floor) {
      // พยายามเรียงตามตัวเลขถ้าเป็นตัวเลข
      if (a.floor_num !== null && b.floor_num !== null) {
        return a.floor_num - b.floor_num
      }
      return a.sort_floor.localeCompare(b.sort_floor, 'th')
    }

    // ถ้าชั้นเดียวกัน เรียงตามห้อง
    // พยายามเรียงตามตัวเลขถ้าเป็นตัวเลข
    if (a.room_num !== null && b.room_num !== null) {
      return a.room_num - b.room_num
    }
    return a.sort_room.localeCompare(b.sort_room, 'th')
  })

  return data
})

// ฟังก์ชันช่วยแยกตัวเลขจากสตริง
function extractNumber(str) {
  if (!str) return null
  const match = str.match(/\d+/)
  return match ? parseInt(match[0]) : null
}

// แก้ไข tableRows ให้มี ID เป็นคอลัมน์แรก
// Table rows (ใช้ TableComponent ใหม่)
const tableRowsList = computed(() => {
  return displayData.value.map((item) => {
    return [
      item.id, // 0: primary ID
      item.building, // 1: อาคาร
      item.floor, // 2: ชั้น
      item.room, // 3: ห้อง
      '', // 4: action (slot)
    ]
  })
})
const openMenuId = ref(null)

// เปลี่ยน columns ให้มี 5 คอลัมน์ แต่จะซ่อนคอลัมน์แรก
const columns = ['', 'อาคาร', 'ชั้น', 'ห้อง', 'ตัวดำเนินการ']

// Computed: กรองชั้นตามอาคารที่เลือก หรือแสดงชั้นที่ไม่ซ้ำ
const filteredFloors = computed(() => {
  if (selectedBuilding.value) {
    // ถ้าเลือกอาคาร → แสดงเฉพาะชั้นของอาคารนั้น
    return floors.value.filter((f) => f.building_id == selectedBuilding.value)
  } else {
    // ถ้าไม่เลือกอาคาร → แสดงชั้นที่ไม่ซ้ำกัน (unique by floor_name)
    const uniqueFloors = []
    const seenNames = new Set()
    for (const floor of floors.value) {
      if (!seenNames.has(floor.floor_name)) {
        seenNames.add(floor.floor_name)
        uniqueFloors.push(floor)
      }
    }
    return uniqueFloors
  }
})

// Filter functions
function toggleBuildingFilter() {
  showBuildingFilter.value = !showBuildingFilter.value
  if (showBuildingFilter.value) {
    showFloorFilter.value = false
  }
}

function toggleFloorFilter() {
  showFloorFilter.value = !showFloorFilter.value
  if (showFloorFilter.value) {
    showBuildingFilter.value = false
  }
}

function clearFilters() {
  selectedBuilding.value = ''
  selectedFloor.value = ''
  searchQuery.value = ''
}

// Close dropdown when clicking outside
function closeDropdown(event) {
  if (!event.target.closest('.relative')) {
    showBuildingFilter.value = false
    showFloorFilter.value = false
  }
}

// Handle filter changes
// async function handleBuildingChange() {
//   if (selectedBuilding.value) {
//     // โหลดชั้นของอาคารที่เลือก
//     try {
//       const res = await fetch(`${API_BASE}/floors/${selectedBuilding.value}`, { headers: getAuthHeaders() })
//       if (res.ok) {
//         const data = await res.json()
//         floors.value = data.map(floor => ({
//           ...floor,
//           building_id: selectedBuilding.value
//         }))
//       }
//     } catch (err) {
//       console.error('Error fetching floors:', err)
//     }
//   }
// }

// async function handleFloorChange() {
//   if (selectedFloor.value) {
//     // โหลดห้องของชั้นที่เลือก
//     try {
//       const res = await fetch(`${API_BASE}/rooms/${selectedFloor.value}`, { headers: getAuthHeaders() })
//       if (res.ok) {
//         const data = await res.json()
//         rooms.value = data.map(room => ({
//           ...room,
//           floor_id: selectedFloor.value
//         }))
//       }
//     } catch (err) {
//       console.error('Error fetching rooms:', err)
//     }
//   }
// }

// FUNCTION: สถิติสำหรับแต่ละ location
function getLocationStats(item) {
  const stats = {
    floors: [],
    rooms: [],
    floorCount: 0,
    roomCount: 0,
  }

  if (item.type === 'building') {
    // นับชั้นและห้องทั้งหมดในอาคารนี้
    const buildingId = item.raw?.building_id || item.id
    const buildingFloors = floors.value.filter((f) => f.building_id == buildingId)
    stats.floorCount = buildingFloors.length
    stats.floors = buildingFloors

    // นับห้องทั้งหมดในอาคารนี้
    buildingFloors.forEach((floor) => {
      const floorRooms = rooms.value.filter((r) => r.floor_id == floor.floor_id)
      stats.rooms.push(...floorRooms)
    })
    stats.roomCount = stats.rooms.length
  } else if (item.type === 'floor') {
    // นับห้องทั้งหมดในชั้นนี้
    const floorId = item.raw?.floor_id || item.id
    const floorRooms = rooms.value.filter((r) => r.floor_id == floorId)
    stats.rooms = floorRooms
    stats.roomCount = floorRooms.length
  }

  return stats
}

// MODAL FUNCTIONS
function openViewModal(id) {
  const item = displayData.value.find((item) => item.id == id)
  if (!item) return

  const stats = getLocationStats(item)

  viewData.value = {
    ...item.raw,
    id: item.id,
    type: item.type,
    displayName: item.name,
    building_name: item.building,
    floor_name: item.floor,
    room_name: item.room,
    building_id: item.raw?.building_id || (item.type === 'building' ? item.id : null),
    floor_id: item.raw?.floor_id || (item.type === 'floor' ? item.id : null),
    room_id: item.raw?.room_id || (item.type === 'room' ? item.id : null),
    stats: stats,
  }
  showViewModal.value = true
}

function closeViewModal() {
  showViewModal.value = false
  viewData.value = {}
}

function openAddModal() {
  // Reset form
  addForm.value = {
    type: 'building',
    name: '',
    building_id: '',
    floor_id: '',
    bulk_mode: true,
    building_mode: 'existing',
    floor_mode: 'existing',
    new_building_name: '',
    new_floor_name: '',
    room_name: '',
  }

  // Reset validation
  validationErrors.value = {
    name: false,
    newBuildingName: false,
    newFloorName: false,
    roomName: false,
  }

  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

async function openEditModal(id) {
  const item = displayData.value.find((item) => item.id == id)
  if (!item) return

  // รีเซ็ต editForm
  editForm.value = {
    type: item.type,
    building_id: '',
    building_name: '',
    original_building_name: '',
    floor_id: '',
    floor_name: '',
    original_floor_name: '',
    room_id: '',
    room_name: '',
    original_room_name: '',
  }

  // โหลดข้อมูลตาม type
  if (item.type === 'room') {
    // หาข้อมูลชั้นและอาคาร
    const floor = floors.value.find((f) => f.floor_id === item.raw.floor_id)
    const building = floor ? buildings.value.find((b) => b.building_id === floor.building_id) : null

    editForm.value.room_id = item.id
    editForm.value.room_name = item.name
    editForm.value.original_room_name = item.name
    editForm.value.floor_id = floor?.floor_id || ''
    editForm.value.floor_name = floor?.floor_name || ''
    editForm.value.original_floor_name = floor?.floor_name || ''
    editForm.value.building_id = building?.building_id || ''
    editForm.value.building_name = building?.building_name || ''
    editForm.value.original_building_name = building?.building_name || ''
  } else if (item.type === 'floor') {
    // หาข้อมูลอาคาร
    const building = buildings.value.find((b) => b.building_id === item.raw.building_id)

    editForm.value.floor_id = item.id
    editForm.value.floor_name = item.name
    editForm.value.original_floor_name = item.name
    editForm.value.building_id = building?.building_id || ''
    editForm.value.building_name = building?.building_name || ''
    editForm.value.original_building_name = building?.building_name || ''
  } else if (item.type === 'building') {
    editForm.value.building_id = item.id
    editForm.value.building_name = item.name
    editForm.value.original_building_name = item.name
  }

  showEditModal.value = true
}

// โหลดชั้นสำหรับ Edit Modal (เฉพาะชั้นในอาคารเดียวกัน)
async function loadFloorsForEdit(buildingId) {
  if (!buildingId) return

  try {
    const res = await fetch(`${API_BASE}/floors/${buildingId}`, {
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      const data = await res.json()

      // กรองให้เหลือเฉพาะชั้นที่ไม่ซ้ำกัน (unique by floor_id)
      const uniqueFloors = []
      const seenIds = new Set()

      for (const floor of data) {
        if (!seenIds.has(floor.floor_id)) {
          seenIds.add(floor.floor_id)
          uniqueFloors.push({
            floor_id: floor.floor_id,
            floor_name: floor.floor_name,
            building_id: buildingId,
          })
        }
      }

      editModalFloors.value = uniqueFloors
    }
  } catch (err) {
    console.error('Error fetching floors:', err)
  }
}

async function confirmDelete(username) {
  const item = displayData.value.find((item) => item.id == username)
  if (!item) return

  // เช็คการใช้งานในรายการแจ้งซ่อม
  try {
    const checkRes = await fetch(`${API_BASE}/locations/check-usage/${item.type}/${item.id}`, {
      headers: getAuthHeaders(),
    })
    const usageData = await checkRes.json()

    if (usageData.inUse) {
      // ถ้ามีการใช้งานอยู่ ไม่สามารถลบได้
      await Swal.fire({
        icon: 'error',
        title: 'ไม่สามารถลบได้',
        html: `<strong>"${item.name}"</strong> มีการใช้งานอยู่ใน <strong>${usageData.count}</strong> รายการแจ้งซ่อม<br><br>
               <small class="text-gray-600">กรุณาเปลี่ยนสถานที่ในรายการแจ้งซ่อมเหล่านั้นก่อน</small>`,
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#dc2626',
      })
      return
    }
  } catch (err) {
    console.error('Error checking usage:', err)
  }

  const typeText = item.type === 'building' ? 'อาคาร' : item.type === 'floor' ? 'ชั้น' : 'ห้อง'
  const result = await Swal.fire({
    title: 'ยืนยันการลบข้อมูล?',
    html: `คุณต้องการลบ${typeText} <strong>"${item.name}"</strong> หรือไม่?<br>
           <small>อาคาร: ${item.building} ชั้น: ${item.floor}</small>`,
    icon: 'warning',
    showCancelButton: true,
    reverseButtons: false,
    confirmButtonText: 'ยืนยันการลบ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#d4d4d4',
  })

  if (!result.isConfirmed) return

  try {
    let endpoint
    if (item.type === 'building') {
      endpoint = `/buildings/${item.id}`
    } else if (item.type === 'floor') {
      endpoint = `/floors/${item.id}`
    } else {
      endpoint = `/rooms/${item.id}`
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    if (handleAuthError(res.status)) return

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'ลบไม่สำเร็จ')
    }

    // Toast notification
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
      },
    })
    Toast.fire({
      title: 'สำเร็จ!',
      text: `ลบ${typeText}เรียบร้อยแล้ว`,
      icon: 'success',
      background: '#f0f9ff',
      color: '#1e3a8a',
    })

    await refreshData()
  } catch (err) {
    // Toast notification
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
    Toast.fire({
      title: 'เกิดข้อผิดพลาด',
      text: err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล',
      icon: 'error',
    })
  }
}

// SAVE FUNCTIONS
async function saveAddLocation() {
  // Validate based on mode
  if (addForm.value.bulk_mode) {
    // Bulk create validation
    if (addForm.value.building_mode === 'new' && !validateAlphanumeric(addForm.value.new_building_name, 'newBuildingName')) {
      return
    }
    if (addForm.value.floor_mode === 'new' && !validateAlphanumeric(addForm.value.new_floor_name, 'newFloorName')) {
      return
    }
    if (!validateAlphanumeric(addForm.value.room_name, 'roomName')) {
      return
    }

    await bulkCreateLocation()
  } else {
    // Single create validation
    if (!validateAlphanumeric(addForm.value.name, 'name')) {
      return
    }

    if (addForm.value.type === 'floor' && !addForm.value.building_id) {
      await Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูล',
        text: 'กรุณาเลือกอาคาร',
        confirmButtonColor: '#F59E0B',
      })
      return
    }

    if (addForm.value.type === 'room' && (!addForm.value.building_id || !addForm.value.floor_id)) {
      await Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูล',
        text: 'กรุณาเลือกอาคารและชั้น',
        confirmButtonColor: '#F59E0B',
      })
      return
    }

    await saveSingleLocation()
  }
}

async function saveSingleLocation() {
  try {
    const endpoint = addForm.value.type === 'building' ? '/buildings' : addForm.value.type === 'floor' ? '/floors' : '/rooms'

    const body = addForm.value.type === 'building' ? { bd_name: addForm.value.name } : addForm.value.type === 'floor' ? { fl_name: addForm.value.name, fl_bd_id: addForm.value.building_id } : { room_name: addForm.value.name, room_fl_id: addForm.value.floor_id }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })

    if (handleAuthError(res.status)) return

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'บันทึกไม่สำเร็จ')
    }

    closeAddModal()

    // Toast notification
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
      },
    })
    await Toast.fire({
      icon: 'success',
      title: 'เพิ่มข้อมูลเรียบร้อยแล้ว',
    })

    await refreshData()
  } catch (err) {
    await Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      confirmButtonColor: '#EF4444',
    })
  }
}

async function bulkCreateLocation() {
  try {
    let buildingId = addForm.value.building_id
    let floorId = addForm.value.floor_id

    // 1. สร้างอาคารใหม่ถ้าต้องการ
    if (addForm.value.building_mode === 'new') {
      const res = await fetch(`${API_BASE}/buildings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ bd_name: addForm.value.new_building_name.trim() }),
      })

      if (handleAuthError(res.status)) return

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'สร้างอาคารไม่สำเร็จ')
      }

      buildingId = data.bd_id
    }

    // 2. สร้างชั้นใหม่ถ้าต้องการ
    if (addForm.value.floor_mode === 'new') {
      if (!buildingId) {
        await Swal.fire({
          icon: 'warning',
          title: 'กรุณากรอกข้อมูล',
          text: 'กรุณาเลือกหรือสร้างอาคารก่อน',
          confirmButtonColor: '#F59E0B',
        })
        return
      }

      const res = await fetch(`${API_BASE}/floors`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fl_name: addForm.value.new_floor_name.trim(),
          fl_bd_id: buildingId,
        }),
      })

      if (handleAuthError(res.status)) return

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'สร้างชั้นไม่สำเร็จ')
      }

      floorId = data.fl_id
    }

    // 3. สร้างห้อง (required)
    if (!floorId) {
      await Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูล',
        text: 'กรุณาเลือกหรือสร้างชั้นก่อน',
        confirmButtonColor: '#F59E0B',
      })
      return
    }

    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        room_name: addForm.value.room_name.trim(),
        room_fl_id: floorId,
      }),
    })

    if (handleAuthError(res.status)) return

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'สร้างห้องไม่สำเร็จ')
    }

    closeAddModal()

    // Toast notification
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
      },
    })
    await Toast.fire({
      icon: 'success',
      title: 'สร้างสถานที่เรียบร้อยแล้ว',
    })

    await refreshData()
  } catch (err) {
    await Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: err.message || 'เกิดข้อผิดพลาดในการสร้างสถานที่',
      confirmButtonColor: '#EF4444',
    })
  }
}

function closeEditModal() {
  showEditModal.value = false
  editForm.value = {
    type: '',
    building_id: '',
    building_name: '',
    original_building_name: '',
    floor_id: '',
    floor_name: '',
    original_floor_name: '',
    room_id: '',
    room_name: '',
    original_room_name: '',
  }
}

async function saveEditLocation() {
  // Validate เฉพาะฟิลด์ที่มีข้อมูล (based on original values)
  let hasError = false

  // ต้องมีอาคารเสมอ
  if (editForm.value.original_building_name && !validateAlphanumeric(editForm.value.building_name, 'building_name')) {
    hasError = true
  }

  // ถ้ามีชั้นใน original ให้ validate
  if (editForm.value.original_floor_name && !validateAlphanumeric(editForm.value.floor_name, 'floor_name', 'floor')) {
    hasError = true
  }

  // ถ้ามีห้องใน original ให้ validate
  if (editForm.value.original_room_name && !validateAlphanumeric(editForm.value.room_name, 'room_name')) {
    hasError = true
  }

  if (hasError) {
    return
  }

  // เช็คว่ามีการเปลี่ยนแปลงหรือไม่ (เฉพาะฟิลด์ที่มีค่า)
  const buildingChanged = editForm.value.original_building_name &&
                         editForm.value.building_name !== editForm.value.original_building_name
  const floorChanged = editForm.value.original_floor_name &&
                      editForm.value.floor_name !== editForm.value.original_floor_name
  const roomChanged = editForm.value.original_room_name &&
                     editForm.value.room_name !== editForm.value.original_room_name

  if (!buildingChanged && !floorChanged && !roomChanged) {
    await Swal.fire({
      icon: 'info',
      title: 'ไม่มีการเปลี่ยนแปลง',
      text: 'ข้อมูลยังคงเหมือนเดิม',
      confirmButtonColor: '#3B82F6',
    })
    return
  }

  // สร้างข้อความยืนยัน
  let changesText = []
  if (buildingChanged) changesText.push(`อาคาร: "${editForm.value.original_building_name}" → "${editForm.value.building_name}"`)
  if (floorChanged) changesText.push(`ชั้น: "${editForm.value.original_floor_name}" → "${editForm.value.floor_name}"`)
  if (roomChanged) changesText.push(`ห้อง: "${editForm.value.original_room_name}" → "${editForm.value.room_name}"`)

  const result = await Swal.fire({
    title: 'ยืนยันการแก้ไขข้อมูล?',
    html: `<div class="text-left">
      <p class="mb-2">คุณต้องการแก้ไขข้อมูลดังนี้:</p>
      <ul class="list-disc list-inside space-y-1 text-sm">
        ${changesText.map(t => `<li>${t}</li>`).join('')}
      </ul>
    </div>`,
    icon: 'question',
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#0048EF',
    cancelButtonColor: '#d4d4d4',
  })

  if (!result.isConfirmed) {
    return
  }

  try {
    const updatePromises = []
    const successMessages = []

    // 1. อัปเดตอาคาร
    if (buildingChanged && editForm.value.building_id) {
      updatePromises.push(
        fetch(`${API_BASE}/buildings/${editForm.value.building_id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ bd_name: editForm.value.building_name }),
        }).then(async (res) => {
          if (handleAuthError(res.status)) throw new Error('Authentication error')
          const data = await res.json()
          if (!res.ok) throw new Error(data.message || 'อัปเดตอาคารไม่สำเร็จ')
          successMessages.push('อาคาร')
        })
      )
    }

    // 2. อัปเดตชั้น
    if (floorChanged && editForm.value.floor_id) {
      updatePromises.push(
        fetch(`${API_BASE}/floors/${editForm.value.floor_id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ fl_name: editForm.value.floor_name }),
        }).then(async (res) => {
          if (handleAuthError(res.status)) throw new Error('Authentication error')
          const data = await res.json()
          if (!res.ok) throw new Error(data.message || 'อัปเดตชั้นไม่สำเร็จ')
          successMessages.push('ชั้น')
        })
      )
    }

    // 3. อัปเดตห้อง
    if (roomChanged && editForm.value.room_id) {
      updatePromises.push(
        fetch(`${API_BASE}/rooms/${editForm.value.room_id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            room_name: editForm.value.room_name,
            room_fl_id: editForm.value.floor_id,
          }),
        }).then(async (res) => {
          if (handleAuthError(res.status)) throw new Error('Authentication error')
          const data = await res.json()
          if (!res.ok) throw new Error(data.message || 'อัปเดตห้องไม่สำเร็จ')
          successMessages.push('ห้อง')
        })
      )
    }

    // รอให้ทุก API calls เสร็จ
    await Promise.all(updatePromises)

    closeEditModal()

    // Toast notification
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
      },
    })
    await Toast.fire({
      icon: 'success',
      title: 'สำเร็จ!',
      text: `แก้ไข${successMessages.join(', ')}เรียบร้อยแล้ว`,
      background: '#f0f9ff',
      color: '#1e3a8a',
    })

    await refreshData()
  } catch (err) {
    await Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      confirmButtonColor: '#EF4444',
    })
  }
}

// Helper functions for modal
async function handleModalBuildingChange() {
  if (addForm.value.building_id) {
    try {
      const res = await fetch(`${API_BASE}/floors/${addForm.value.building_id}`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()

        // กรองให้เหลือเฉพาะชั้นที่ไม่ซ้ำกัน (unique by floor_id)
        const uniqueFloors = []
        const seenIds = new Set()

        for (const floor of data) {
          if (!seenIds.has(floor.floor_id)) {
            seenIds.add(floor.floor_id)
            uniqueFloors.push({
              floor_id: floor.floor_id,
              floor_name: floor.floor_name,
              building_id: addForm.value.building_id,
            })
          }
        }

        modalFloors.value = uniqueFloors
      }
    } catch (err) {
      console.error('Error fetching floors:', err)
    }
  }
  addForm.value.floor_id = ''
}

async function handleBulkBuildingChange() {
  if (addForm.value.building_mode === 'existing' && addForm.value.building_id) {
    try {
      const res = await fetch(`${API_BASE}/floors/${addForm.value.building_id}`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()

        // กรองให้เหลือเฉพาะชั้นที่ไม่ซ้ำกัน (unique by floor_id)
        const uniqueFloors = []
        const seenIds = new Set()

        for (const floor of data) {
          if (!seenIds.has(floor.floor_id)) {
            seenIds.add(floor.floor_id)
            uniqueFloors.push({
              floor_id: floor.floor_id,
              floor_name: floor.floor_name,
              building_id: addForm.value.building_id,
            })
          }
        }

        bulkFloors.value = uniqueFloors
      }
    } catch (err) {
      console.error('Error fetching floors:', err)
    }
  }
  addForm.value.floor_id = ''
  addForm.value.floor_mode = 'existing'
}

async function refreshData() {
  await fetchAllData()
}

function handleImportSuccess() {
  Swal.fire({
    icon: 'success',
    title: 'นำเข้าสถานที่เรียบร้อยแล้ว',
  })
  showImportModal.value = false
}

function handleImportError(message) {
  Swal.fire({
    icon: 'error',
    title: message || 'นำเข้าสถานที่ไม่สำเร็จ',
  })
}


// Lifecycle hooks
onMounted(async () => {
  await refreshData()
  document.addEventListener('click', closeDropdown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-lg sm:text-xl font-bold text-black mb-6">จัดการข้อมูลสถานที่ในระบบ</h1>

    <!-- ฟิลเตอร์ -->
    <div class="mb-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
        <div class="flex flex-wrap items-center gap-3">
          <!-- ค้นหา -->
          <input v-model="searchQuery" type="text" placeholder="ค้นหารายการสถานที่" class="w-full sm:w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 text-gray-500" />

          <!-- ฟิลเตอร์อาคาร -->
          <div class="relative">
            <button @click.stop="toggleBuildingFilter" class="h-10 flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-500">
              {{ selectedBuilding ? buildings.find((b) => b.building_id == selectedBuilding)?.building_name || 'อาคาร' : 'อาคาร' }}
              <Icon icon="meteor-icons:chevron-down" style="color: gray" class="w-4 h-4 opacity-70 transition-transform duration-200" :class="{ 'rotate-180': showBuildingFilter }" />
            </button>

            <div v-if="showBuildingFilter" class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-500 z-10 max-h-60 overflow-y-auto">
              <label class="flex items-center py-1 hover:bg-gray-50 rounded px-2">
                <input type="radio" :value="''" v-model="selectedBuilding" @change="handleBuildingChange" class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">ทุกอาคาร</span>
              </label>
              <label v-for="building in buildings" :key="building.building_id" class="flex items-center py-1 hover:bg-gray-50 rounded px-2">
                <input type="radio" :value="building.building_id" v-model="selectedBuilding" @change="handleBuildingChange" class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">{{ building.building_name }}</span>
              </label>
            </div>
          </div>

          <!-- ฟิลเตอร์ชั้น -->
          <div class="relative">
            <button @click.stop="toggleFloorFilter" class="h-10 flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-500">
              {{ selectedFloor ? floors.find((f) => f.floor_id == selectedFloor)?.floor_name || 'ชั้น' : 'ชั้น' }}
              <Icon icon="meteor-icons:chevron-down" style="color: gray" class="w-4 h-4 opacity-70 transition-transform duration-200" :class="{ 'rotate-180': showFloorFilter }" />
            </button>

            <div v-if="showFloorFilter" class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10 max-h-60 overflow-y-auto">
              <label class="flex items-center py-1 hover:bg-gray-50 rounded px-2">
                <input type="radio" :value="''" v-model="selectedFloor" @change="handleFloorChange" class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">ทุกชั้น</span>
              </label>
              <label v-for="floor in filteredFloors" :key="floor.floor_id" class="flex items-center py-1 hover:bg-gray-50 rounded px-2">
                <input type="radio" :value="floor.floor_id" v-model="selectedFloor" @change="handleFloorChange" class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">{{ floor.floor_name }}</span>
              </label>
            </div>
          </div>

          <!-- ล้างตัวกรอง -->
          <button v-if="selectedBuilding || selectedFloor || searchQuery" @click="clearFilters" class="text-blue-600 hover:text-blue-700 text-sm font-medium">ล้างตัวกรอง</button>
        </div>

        <div class="flex items-center gap-3">
          <!-- Import Excel (ปุ่มรอง เข้าธีม) -->
          <ImportButtonComponent @click="showImportModal = true">
            <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="handleFileChange" />
            <Icon icon="fluent:add-12-filled" width="20" height="20" />
          </ImportButtonComponent>

          <!-- เพิ่มสถานที่ (ปุ่มหลัก) -->
          <BaseButtonComponent @click="openAddModal" class="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium shadow-sm transition">
            <Icon icon="fluent:add-12-filled" width="20" height="20" />
            เพิ่มสถานที่
          </BaseButtonComponent>
        </div>
      </div>

      <!-- ตาราง -->
      <div class="-mx-2 sm:mx-0 overflow-x-auto">
        <TableComponent :columns="columns" :rows="tableRowsList" :perPage="10" :idColumnIndex="0" :hiddenColumns="[0]" :column-align="['left', 'left', 'left', 'left', 'center']" @detail="openViewModal" @edit="openEditModal" @delete="confirmDelete">
          <!-- slot: action column -->
          <template #cell-4="{ row }">
            <TableActionsComponent role="admin" :row-id="row[0]" :open-menu-id="openMenuId" :row="row" :status="null" @toggle-menu="openMenuId = $event" @detail="openViewModal(row[0])" @edit="openEditModal(row[0])" @delete="confirmDelete(row[0])" />
          </template>
        </TableComponent>
      </div>
    </div>

    <!-- View Modal -->
    <div v-if="showViewModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0" @click.self="closeViewModal">
      <div class="bg-white rounded-lg p-4 sm:p-6 md:p-8 w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
        <!-- Header with icon -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="bg-blue-400 p-3 rounded-full">
              <Icon icon="material-symbols:info-outline-rounded" width="24" height="24" style="color: #ffffff" />
            </div>
            <h2 class="text-xl font-bold text-gray-800">รายละเอียด{{ viewData.type === 'building' ? 'อาคาร' : viewData.type === 'floor' ? 'ชั้น' : 'ห้อง' }}</h2>
          </div>
        </div>

        <!-- ข้อมูลหลัก -->
        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
          <div>
            <h3 class="text-lg font-bold text-gray-800 mb-1">{{ viewData.displayName }}</h3>
            <p class="text-sm text-gray-600">
              <span v-if="viewData.type === 'floor' || viewData.type === 'room'">อาคาร: {{ viewData.building_name }}</span>
              <span v-if="viewData.type === 'room'" class="ml-3">ชั้น: {{ viewData.floor_name }}</span>
            </p>
          </div>
        </div>

        <!-- สถิติและรายละเอียด -->
        <div v-if="viewData.type === 'building'" class="space-y-4">
          <!-- สถิติอาคาร -->
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div class="flex items-center gap-3">
                <div class="bg-blue-400 p-2 rounded-lg">
                  <Icon icon="material-symbols:layers" width="24" height="24" style="color: white" />
                </div>
                <div>
                  <p class="text-sm text-gray-600">จำนวนชั้น</p>
                  <p class="text-2xl font-bold text-blue-700">{{ viewData.stats?.floorCount || 0 }}</p>
                </div>
              </div>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div class="flex items-center gap-3">
                <div class="bg-green-400 p-2 rounded-lg">
                  <Icon icon="material-symbols:door-sliding" width="24" height="24" style="color: white" />
                </div>
                <div>
                  <p class="text-sm text-gray-600">จำนวนห้อง</p>
                  <p class="text-2xl font-bold text-green-700">{{ viewData.stats?.roomCount || 0 }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- รายการชั้น -->
          <div v-if="viewData.stats?.floors.length > 0">
            <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Icon icon="material-symbols:list" width="20" height="20" />
              รายการชั้นในอาคาร
            </h4>
            <div class="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
              <div class="space-y-2">
                <div v-for="floor in viewData.stats.floors" :key="floor.floor_id" class="bg-white p-3 rounded border border-gray-200">
                  <div class="flex items-center gap-2">
                    <Icon icon="material-symbols:layers" width="18" height="18" class="text-blue-500" />
                    <span class="font-medium">ชั้น {{ floor.floor_name }}</span>
                    <span class="text-sm text-gray-500">
                      ({{ rooms.value.filter(r => r.floor_id == floor.floor_id).length }} ห้อง)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- รายการห้อง -->
          <div v-if="viewData.stats?.rooms.length > 0">
            <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Icon icon="material-symbols:door-sliding" width="20" height="20" />
              รายการห้องทั้งหมด
            </h4>
            <div class="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
              <div class="grid grid-cols-2 gap-2">
                <div v-for="room in viewData.stats.rooms" :key="room.room_id" class="bg-white p-2 rounded border border-gray-200">
                  <div class="flex items-center gap-2">
                    <Icon icon="material-symbols:door-sliding" width="16" height="16" class="text-green-500" />
                    <span class="text-sm font-medium">{{ room.room_name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- สถิติชั้น -->
        <div v-else-if="viewData.type === 'floor'" class="space-y-4">
          <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div class="flex items-center gap-3">
              <div class="bg-green-400 p-2 rounded-lg">
                <Icon icon="material-symbols:door-sliding" width="24" height="24" style="color: white" />
              </div>
              <div>
                <p class="text-sm text-gray-600">จำนวนห้อง</p>
                <p class="text-2xl font-bold text-green-700">{{ viewData.stats?.roomCount || 0 }}</p>
              </div>
            </div>
          </div>

          <!-- รายการห้อง -->
          <div v-if="viewData.stats?.rooms.length > 0">
            <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Icon icon="material-symbols:door-sliding" width="20" height="20" />
              รายการห้องในชั้น
            </h4>
            <div class="bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
              <div class="grid grid-cols-2 gap-2">
                <div v-for="room in viewData.stats.rooms" :key="room.room_id" class="bg-white p-2 rounded border border-gray-200">
                  <div class="flex items-center gap-2">
                    <Icon icon="material-symbols:door-sliding" width="16" height="16" class="text-green-500" />
                    <span class="text-sm font-medium">{{ room.room_name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ข้อมูลห้อง -->
        <div v-else class="space-y-4">
          <!-- แสดงข้อมูลอาคารและชั้นของห้อง -->
          <div class="grid grid-cols-1 gap-3">
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div class="flex items-center gap-2 mb-1">
                <Icon icon="material-symbols:apartment" width="20" height="20" class="text-blue-600" />
                <span class="text-sm font-semibold text-gray-700">อาคาร</span>
              </div>
              <p class="text-base font-bold text-gray-800 ml-7">{{ viewData.building_name }}</p>
            </div>
            <div class="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div class="flex items-center gap-2 mb-1">
                <Icon icon="material-symbols:layers" width="20" height="20" class="text-purple-600" />
                <span class="text-sm font-semibold text-gray-700">ชั้น</span>
              </div>
              <p class="text-base font-bold text-gray-800 ml-7">{{ viewData.floor_name }}</p>
            </div>
          </div>
        </div>

        <!-- ปุ่มปิด -->
        <div class="flex gap-3 mt-6">
          <button type="button" @click="closeViewModal" class="flex-1 px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-medium transition">ปิด</button>
          <button
            @click="openEditModal(viewData.type === 'building' ? viewData.building_id : viewData.type === 'floor' ? viewData.floor_id : viewData.room_id); closeViewModal()"
            class="flex-1 px-5 py-2 bg-orange-400 hover:bg-orange-500 text-white rounded-md font-medium transition flex items-center justify-center gap-2">
            <Icon icon="fluent:edit-24-regular" width="18" height="18" />
            แก้ไขข้อมูล
          </button>
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0" @click.self="closeAddModal">
      <div class="bg-white rounded-lg p-8 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <!-- Header with icon -->
        <div class="flex items-center gap-3 mb-6">
          <div class="bg-green-100 p-3 rounded-full">
            <Icon icon="fluent:add-12-filled" width="20" height="20" />
          </div>
          <h2 class="text-xl font-bold text-gray-800">เพิ่มสถานที่</h2>
        </div>

        <p class="text-gray-600 text-sm mb-6">เลือกประเภทที่ต้องการเพิ่ม</p>

        <!-- โหมดการเพิ่ม -->
        <div class="space-y-4 mb-6">
          <label class="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400">
            <!-- <input type="radio" v-model="addForm.bulk_mode" :value="true" class="w-5 h-5 text-blue-600 mt-1" /> -->
            <div class="ml-3">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-gray-800">สร้างหลายระดับพร้อมกัน</span>
                <!-- <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">เร็วกว่า</span> -->
              </div>
              <p class="text-xs text-gray-500 mt-1">สร้างอาคาร + ชั้น + ห้อง ในครั้งเดียว</p>
            </div>
          </label>

          <!-- <label class="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400" :class="!addForm.bulk_mode ? 'border-blue-600 bg-blue-50' : 'border-gray-200'">
            <input type="radio" v-model="addForm.bulk_mode" :value="false" class="w-5 h-5 text-blue-600 mt-1" />
            <div class="ml-3">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-gray-800">เพิ่มทีละระดับ</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">เลือกเพิ่ม อาคาร, ชั้น หรือ ห้อง ทีละอย่าง</p>
            </div>
          </label> -->
        </div>
        <!-- ปิดไว้ก่อน รอ PO คอมเมนต์
        <div v-if="!addForm.bulk_mode" class="space-y-4">

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"> ประเภท <span class="text-red-500">*</span> </label>
            <select v-model="addForm.type" class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none">
              <option value="building">อาคาร</option>
              <option value="floor">ชั้น</option>
              <option value="room">ห้อง</option>
            </select>
          </div>


          <div v-if="addForm.type === 'floor' || addForm.type === 'room'">
            <label class="block text-sm font-medium text-gray-700 mb-2"> อาคาร <span class="text-red-500">*</span> </label>
            <select v-model="addForm.building_id" @change="handleModalBuildingChange" class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none">
              <option value="">เลือกอาคาร</option>
              <option v-for="building in buildings" :key="building.building_id" :value="building.building_id">
                {{ building.building_name }}
              </option>
            </select>
          </div>


          <div v-if="addForm.type === 'room'">
            <label class="block text-sm font-medium text-gray-700 mb-2"> ชั้น <span class="text-red-500">*</span> </label>
            <select v-if="addForm.type === 'room'" v-model="addForm.floor_id" :disabled="!addForm.building_id" class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:bg-gray-100">
              <option value="">เลือกชั้น</option>
              <option v-for="floor in modalFloors" :key="floor.floor_id" :value="floor.floor_id">
                {{ floor.floor_name }}
              </option>
            </select>
          </div>


          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              ชื่อ{{ addForm.type === 'building' ? 'อาคาร' : addForm.type === 'floor' ? 'ชั้น' : 'ห้อง' }}
              <span class="text-red-500">*</span>
            </label>
            <input v-model="addForm.name" type="text" :placeholder="`ระบุชื่อ${addForm.type === 'building' ? 'อาคาร' : addForm.type === 'floor' ? 'ชั้น' : 'ห้อง'}`" :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.name ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-400']" @input="() => validateAlphanumeric(addForm.name, 'name')" @blur="() => validateAlphanumeric(addForm.name, 'name')" />
            <p v-if="validationErrors.name" class="text-red-500 text-sm mt-1">
              {{ errorMessages.name }}
            </p>
          </div>
        </div>
        -->

        <!-- Bulk Mode -->
        <div class="space-y-4">
          <!-- อาคาร -->
          <div class="border-2 border-gray-200 rounded-lg p-4 space-y-3">
            <h3 class="font-semibold text-gray-800">อาคาร</h3>

            <label class="flex items-center gap-2">
              <input type="radio" v-model="addForm.building_mode" value="existing" class="w-4 h-4 text-blue-600" />
              <span class="text-sm font-medium">เลือกจากอาคารที่มีอยู่</span>
            </label>

            <select v-if="addForm.building_mode === 'existing'" v-model="addForm.building_id" @change="handleBulkBuildingChange" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none">
              <option value="">-- เลือกอาคาร --</option>
              <option v-for="building in buildings" :key="building.building_id" :value="building.building_id">
                {{ building.building_name }}
              </option>
            </select>

            <label class="flex items-center gap-2 mt-3">
              <input type="radio" v-model="addForm.building_mode" value="new" class="w-4 h-4 text-blue-600" />
              <span class="text-sm font-medium">สร้างอาคารใหม่</span>
            </label>

            <div v-if="addForm.building_mode === 'new'" class="space-y-2">
              <input v-model="addForm.new_building_name" type="text" placeholder="ชื่ออาคารใหม่" :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.newBuildingName ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-400']" @input="() => validateAlphanumeric(addForm.new_building_name, 'newBuildingName')" @blur="() => validateAlphanumeric(addForm.new_building_name, 'newBuildingName')" />
              <p v-if="validationErrors.newBuildingName" class="text-red-500 text-sm mt-1">
                {{ errorMessages.newBuildingName }}
              </p>
            </div>
          </div>

          <!-- ชั้น -->
          <div class="border-2 border-gray-200 rounded-lg p-4 space-y-3">
            <h3 class="font-semibold text-gray-800">ชั้น</h3>

            <label class="flex items-center gap-2">
              <input type="radio" v-model="addForm.floor_mode" value="existing" :disabled="addForm.building_mode === 'new' || !addForm.building_id" class="w-4 h-4 text-blue-600 disabled:opacity-50" />
              <span
                class="text-sm font-medium"
                :class="{
                  'text-gray-400': addForm.building_mode === 'new' || !addForm.building_id,
                }"
              >
                เลือกจากชั้นที่มีอยู่
              </span>
            </label>

            <select v-if="addForm.floor_mode === 'existing'" v-model="addForm.floor_id" :disabled="addForm.building_mode === 'new' || !addForm.building_id" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:bg-gray-100">
              <option value="">-- เลือกชั้น --</option>
              <option v-for="floor in bulkFloors" :key="floor.floor_id" :value="floor.floor_id">
                {{ floor.floor_name }}
              </option>
            </select>

            <label class="flex items-center gap-2 mt-3">
              <input type="radio" v-model="addForm.floor_mode" value="new" class="w-4 h-4 text-blue-600" />
              <span class="text-sm font-medium">สร้างชั้นใหม่</span>
            </label>

            <div v-if="addForm.floor_mode === 'new'" class="space-y-2">
              <input v-model="addForm.new_floor_name" type="text" placeholder="ชื่อชั้นใหม่" :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.newFloorName ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-400']" @input="() => validateAlphanumeric(addForm.new_floor_name, 'newFloorName')" @blur="() => validateAlphanumeric(addForm.new_floor_name, 'newFloorName')" />
              <p v-if="validationErrors.newFloorName" class="text-red-500 text-sm mt-1">
                {{ errorMessages.newFloorName }}
              </p>
            </div>
          </div>

          <!-- ห้อง -->
          <div class="border-2 border-blue-200 rounded-lg p-4 space-y-3 bg-blue-50">
            <h3 class="font-semibold text-gray-800">ห้อง <span class="text-red-500">*</span></h3>

            <div class="space-y-2">
              <input v-model="addForm.room_name" type="text" placeholder="ชื่อห้อง (ต้องระบุ)" :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.roomName ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-400']" @input="() => validateAlphanumeric(addForm.room_name, 'roomName')" @blur="() => validateAlphanumeric(addForm.room_name, 'roomName')" />
              <p v-if="validationErrors.roomName" class="text-red-500 text-sm mt-1">
                {{ errorMessages.roomName }}
              </p>
            </div>
            <p class="text-xs text-gray-600">ห้องจะถูกสร้างในชั้นที่เลือกหรือสร้างขึ้นมาใหม่</p>
          </div>
        </div>

        <!-- ปุ่ม -->
        <div class="flex gap-3 mt-6">
          <button type="button" @click="closeAddModal" class="flex-1 px-4 py-2.5 border border-gray-300 text-white rounded-lg bg-neutral-300 hover:bg-neutral-400 transition-colors font-medium">ยกเลิก</button>
          <button type="button" @click="saveAddLocation" class="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors font-medium">เพิ่มสถานที่</button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0" @click.self="closeEditModal">
      <div class="bg-white rounded-lg p-8 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <!-- Header with icon -->
        <div class="flex items-center gap-3 mb-4">
          <div class="bg-orange-400 p-3 rounded-full">
            <Icon icon="fluent:edit-24-regular" width="24" height="24" style="color: #ffffff" />
          </div>
          <div class="flex-1">
            <h2 class="text-xl font-bold text-gray-800">แก้ไขข้อมูลสถานที่</h2>
            <p class="text-sm text-gray-500">แก้ไข อาคาร / ชั้น / ห้อง ได้ในที่เดียว</p>
          </div>
        </div>

        <div class="space-y-4">
          <!-- 1. ชื่ออาคาร -->
          <div v-if="editForm.original_building_name">
            <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Icon icon="material-symbols:apartment" width="18" height="18" class="text-blue-600" />
              ชื่ออาคาร
              <span class="text-red-500">*</span>

            </label>
            <input
              v-model="editForm.building_name"
              type="text"
              placeholder="ระบุชื่ออาคาร"
              :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.building_name ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-400']"
              @input="() => validateAlphanumeric(editForm.building_name, 'building_name')"
              @blur="() => validateAlphanumeric(editForm.building_name, 'building_name')"
            />
            <p v-if="validationErrors.building_name" class="text-red-500 text-sm mt-1">
              {{ errorMessages.building_name }}
            </p>
          </div>

          <!-- 2. ชื่อชั้น -->
          <div v-if="editForm.original_floor_name">
            <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Icon icon="material-symbols:layers" width="18" height="18" class="text-purple-600" />
              ชื่อชั้น (ตัวเลขเท่านั้น)
              <span class="text-red-500">*</span>
            </label>
            <input
              v-model="editForm.floor_name"
              type="text"
              placeholder="ระบุชื่อชั้น (เช่น 1, 2, 3)"
              :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.floor_name ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-purple-400']"
              @input="() => validateAlphanumeric(editForm.floor_name, 'floor_name', 'floor')"
              @blur="() => validateAlphanumeric(editForm.floor_name, 'floor_name', 'floor')"
            />
            <p v-if="validationErrors.floor_name" class="text-red-500 text-sm mt-1">
              {{ errorMessages.floor_name }}
            </p>
          </div>

          <!-- 3. ชื่อห้อง -->
          <div v-if="editForm.original_room_name">
            <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Icon icon="material-symbols:meeting-room" width="18" height="18" class="text-green-600" />
              ชื่อห้อง
              <span class="text-red-500">*</span>
            </label>
            <input
              v-model="editForm.room_name"
              type="text"
              placeholder="ระบุชื่อห้อง"
              :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.room_name ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-green-400']"
              @input="() => validateAlphanumeric(editForm.room_name, 'room_name')"
              @blur="() => validateAlphanumeric(editForm.room_name, 'room_name')"
            />
            <p v-if="validationErrors.room_name" class="text-red-500 text-sm mt-1">
              {{ errorMessages.room_name }}
            </p>
          </div>

          <!-- คำอธิบาย -->
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p class="text-sm text-gray-700 flex items-start gap-2">
              <Icon icon="material-symbols:info-outline" width="18" height="18" class="text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <span v-if="editForm.type === 'building'">สามารถแก้ไขชื่ออาคารได้ ชั้นและห้องทั้งหมดภายในจะอัปเดตชื่ออาคารอัตโนมัติ</span>
                <span v-else-if="editForm.type === 'floor'">สามารถแก้ไขชื่ออาคารและชั้นได้ ห้องทั้งหมดภายในจะอัปเดตชื่ออัตโนมัติ</span>
                <span v-else>สามารถแก้ไขชื่อได้ทั้ง 3 ระดับในครั้งเดียว ระบบจะบันทึกเฉพาะส่วนที่มีการเปลี่ยนแปลง</span>
              </span>
            </p>
          </div>
        </div>

        <!-- ปุ่ม -->
        <div class="flex gap-3 mt-6">
          <button type="button" @click="closeEditModal" class="flex-1 px-4 py-2.5 border border-gray-300 text-white rounded-lg bg-neutral-300 hover:bg-neutral-400 transition-colors font-medium">ยกเลิก</button>
          <button type="button" @click="saveEditLocation" class="flex-1 px-4 py-2.5 bg-orange-400 hover:bg-orange-500 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2">
            <Icon icon="material-symbols:save" width="18" height="18" />
            บันทึกการแก้ไข
          </button>
        </div>
      </div>
    </div>
  </div>
  <ImportLocationModal v-if="showImportModal" @close="showImportModal = false" @refresh="refreshData()" @success="handleImportSuccess" @error="handleImportError" />
</template>

<style scoped>
/* Custom styles */
select:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

button:disabled {
  cursor: not-allowed;
}

/* Ensure dropdown z-index */
.relative {
  position: relative;
}
</style>
