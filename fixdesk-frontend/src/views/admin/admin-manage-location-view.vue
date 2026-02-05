<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { Icon } from '@iconify/vue'
import ImportButtonComponent from '@/components/button/import-button-component.vue'
import BaseButtonComponent from '@/components/button/base/base-button-component.vue'

import TableComponent from '@/components/table-component.vue'
import TableActionsComponent from '@/components/table-actions-component.vue'

defineOptions({ name: 'AdminManageLocationView' })

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE
const excelFile = ref(null)
const isImporting = ref(false)
const fileInput = ref(null)

async function importExcel() {
  if (!excelFile.value) {
    await Swal.fire({
      icon: 'warning',
      title: 'กรุณาเลือกไฟล์',
      text: 'กรุณาเลือกไฟล์ Excel (.xlsx)',
    })
    return
  }

  const confirm = await Swal.fire({
    title: 'ยืนยันการนำเข้าไฟล์',
    html: `
      คุณต้องการนำเข้าไฟล์ Excel นี้หรือไม่?<br>
      <small class="text-gray-500">ระบบจะเพิ่มข้อมูลสถานที่ลงในฐานข้อมูล</small>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'นำเข้า',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true,
  })

  if (!confirm.isConfirmed) {
    resetFileInput()
    return
  }

  const formData = new FormData()
  formData.append('file', excelFile.value)

  try {
    isImporting.value = true

    const res = await fetch(`${API_BASE}/locations/import/xlsx`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeaders().Authorization,
      },
      body: formData,
    })

    if (handleAuthError(res.status)) return

    const contentType = res.headers.get('content-type')

    let data = null
    if (contentType && contentType.includes('application/json')) {
      data = await res.json()
    } else {
      throw new Error('Backend response ไม่ใช่ JSON')
    }

    if (!res.ok) {
      throw new Error(data.message || 'Import ล้มเหลว')
    }

    await Swal.fire({
      icon: 'success',
      title: 'สำเร็จ',
      text: 'นำเข้าข้อมูลจาก Excel เรียบร้อยแล้ว',
    })

    resetFileInput()
    await refreshData()
  } catch (err) {
    await Swal.fire({
      icon: 'error',
      title: 'Import ล้มเหลว',
      text: err.message,
    })
    resetFileInput()
  } finally {
    isImporting.value = false
  }
}

function handleFileChange(e) {
  excelFile.value = e.target.files[0]
  importExcel()
}

function resetFileInput() {
  excelFile.value = null
  if (fileInput.value) {
    fileInput.value.value = '' // ⭐ ตัวนี้แหละที่แก้ปัญหา
  }
}

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
  id: '',
  type: '',
  name: '',
  building_id: '',
  floor_id: '',
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
function validateAlphanumeric(value, fieldName) {
  if (fieldName === 'newFloorName' || (fieldName === 'name' && addForm.value.type === 'floor')) {
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
    errorMessages.value[fieldName] =
      `กรุณากรอกชื่อ${getFieldLabel(fieldName)}เป็นตัวอักษรไทย อังกฤษ ตัวเลข และ / เท่านั้น`
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

// COMPUTED DATA - แสดงข้อมูลเฉพาะห้องที่มีอยู่จริง
const displayData = computed(() => {
  let data = []

  // เพิ่มข้อมูลเฉพาะห้องที่มีอยู่จริง (ไม่แสดงอาคารและชั้นเปล่าๆ)
  rooms.value.forEach((room) => {
    const floor = floors.value.find((f) => f.floor_id == room.floor_id)
    const building = floor ? buildings.value.find((b) => b.building_id == floor.building_id) : null

    // เพิ่มข้อมูลห้อง
    data.push({
      id: room.room_id,
      type: 'room',
      name: room.room_name,
      building: building ? building.building_name : '-',
      floor: floor ? floor.floor_name : '-',
      room: room.room_name,
      raw: room,
      // เพิ่ม field สำหรับการเรียงลำดับ
      sort_building: building ? building.building_name : 'zzz',
      sort_floor: floor ? floor.floor_name : 'zzz',
      sort_room: room.room_name,
      // เพิ่มข้อมูลสำหรับการจัดเรียงตัวเลข
      building_name: building ? building.building_name : '',
      floor_name: floor ? floor.floor_name : '',
      room_name: room.room_name,
      // แยกตัวเลขจากชื่อสำหรับการเรียงลำดับ
      building_num: extractNumber(building ? building.building_name : ''),
      floor_num: extractNumber(floor ? floor.floor_name : ''),
      room_num: extractNumber(room.room_name),
    })
  })

  // กรองด้วย search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    data = data.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.building.toLowerCase().includes(query) ||
        item.floor.toLowerCase().includes(query) ||
        item.room.toLowerCase().includes(query),
    )
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
const tableRows = computed(() => {
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
const columns = ['', 'อาคาร', 'ชั้น', 'ห้อง', 'การจัดการ']

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

// MODAL FUNCTIONS
function openViewModal(id) {
  const item = displayData.value.find((item) => item.id == id)
  if (!item) return

  viewData.value = {
    ...item.raw,
    type: item.type,
    displayName: item.name,
    building_name: item.building,
    floor_name: item.floor,
    room_name: item.room,
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

function openEditModal(id) {
  const item = displayData.value.find((item) => item.id == id)
  if (!item) return

  // สำหรับห้อง ต้องหาชั้นและอาคาร
  const floor = floors.value.find((f) => f.floor_name === item.floor)
  const building = buildings.value.find((b) => b.building_name === item.building)

  editForm.value = {
    id: item.id,
    type: item.type,
    name: item.name,
    building_id: building ? building.building_id : '',
    floor_id: floor ? floor.floor_id : '',
  }

  showEditModal.value = true
}

async function confirmDelete(username) {
  const item = displayData.value.find((item) => item.id == username)
  if (!item) return

  const result = await Swal.fire({
    title: 'ยืนยันการลบ',
    html: `คุณต้องการลบห้อง <strong>"${item.name}"</strong> หรือไม่?<br>
           <small>อาคาร: ${item.building}, ชั้น: ${item.floor}</small>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ลบเลย',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    reverseButtons: true,
  })

  if (!result.isConfirmed) return

  try {
    const endpoint = `/rooms/${item.id}`

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
      text: 'ลบห้องเรียบร้อยแล้ว',
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
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}

// SAVE FUNCTIONS
async function saveAddLocation() {
  // Validate based on mode
  if (addForm.value.bulk_mode) {
    // Bulk create validation
    if (
      addForm.value.building_mode === 'new' &&
      !validateAlphanumeric(addForm.value.new_building_name, 'newBuildingName')
    ) {
      return
    }
    if (
      addForm.value.floor_mode === 'new' &&
      !validateAlphanumeric(addForm.value.new_floor_name, 'newFloorName')
    ) {
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
    const endpoint =
      addForm.value.type === 'building'
        ? '/buildings'
        : addForm.value.type === 'floor'
          ? '/floors'
          : '/rooms'

    const body =
      addForm.value.type === 'building'
        ? { bd_name: addForm.value.name }
        : addForm.value.type === 'floor'
          ? { fl_name: addForm.value.name, fl_bd_id: addForm.value.building_id }
          : { room_name: addForm.value.name, room_fl_id: addForm.value.floor_id }

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
      title: 'สำเร็จ!',
      text: 'เพิ่มข้อมูลเรียบร้อยแล้ว',
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
      title: 'สำเร็จ!',
      text: 'สร้างสถานที่เรียบร้อยแล้ว',
      background: '#f0f9ff',
      color: '#1e3a8a',
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
    id: '',
    type: '',
    name: '',
    building_id: '',
    floor_id: '',
  }
}

async function saveEditLocation() {
  // Validate
  if (!validateAlphanumeric(editForm.value.name, 'name')) {
    return
  }
  const result = await Swal.fire({
    title: 'ยืนยันการแก้ไขข้อมูล?',
    text: 'คุณต้องการบันทึกการแก้ไขนี้หรือไม่?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#f97316',
  })

  if (!result.isConfirmed) {
    return
  }

  try {
    const endpoint = '/rooms'
    const method = 'PUT'
    const url = `${API_BASE}${endpoint}/${editForm.value.id}`

    const body = {
      room_name: editForm.value.name,
      room_fl_id: editForm.value.floor_id,
    }

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })

    if (handleAuthError(res.status)) return

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'บันทึกไม่สำเร็จ')
    }

    closeEditModal()

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
      title: 'สำเร็จ!',
      text: 'แก้ไขข้อมูลห้องเรียบร้อยแล้ว',
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
        modalFloors.value = data.map((floor) => ({
          floor_id: floor.floor_id,
          floor_name: floor.floor_name,
          building_id: addForm.value.building_id,
        }))
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
        bulkFloors.value = data.map((floor) => ({
          floor_id: floor.floor_id,
          floor_name: floor.floor_name,
          building_id: addForm.value.building_id,
        }))
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
    <h1 class="text-lg sm:text-xl font-bold text-black mb-6">จัดการสถานที่ในระบบ</h1>

    <!-- ฟิลเตอร์ -->
    <div class="mb-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
        <div class="flex flex-wrap items-center gap-3">
          <!-- ค้นหา -->
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาอาคาร / ชั้น / ห้อง"
            class="w-full sm:w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 text-gray-700"
          />

          <!-- ฟิลเตอร์อาคาร -->
          <div class="relative">
            <button
              @click.stop="toggleBuildingFilter"
              class="h-10 flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700"
            >
              {{
                selectedBuilding
                  ? buildings.find((b) => b.building_id == selectedBuilding)?.building_name ||
                    'อาคาร'
                  : 'อาคาร'
              }}
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200"
                :class="{ 'rotate-180': showBuildingFilter }"
              />
            </button>

            <div
              v-if="showBuildingFilter"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10 max-h-60 overflow-y-auto"
            >
              <label class="flex items-center py-1 hover:bg-gray-50 rounded px-2">
                <input
                  type="radio"
                  :value="''"
                  v-model="selectedBuilding"
                  @change="handleBuildingChange"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">ทุกอาคาร</span>
              </label>
              <label
                v-for="building in buildings"
                :key="building.building_id"
                class="flex items-center py-1 hover:bg-gray-50 rounded px-2"
              >
                <input
                  type="radio"
                  :value="building.building_id"
                  v-model="selectedBuilding"
                  @change="handleBuildingChange"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">{{ building.building_name }}</span>
              </label>
            </div>
          </div>

          <!-- ฟิลเตอร์ชั้น -->
          <div class="relative">
            <button
              @click.stop="toggleFloorFilter"
              class="h-10 flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700"
            >
              {{
                selectedFloor
                  ? floors.find((f) => f.floor_id == selectedFloor)?.floor_name || 'ชั้น'
                  : 'ชั้น'
              }}
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200"
                :class="{ 'rotate-180': showFloorFilter }"
              />
            </button>

            <div
              v-if="showFloorFilter"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10 max-h-60 overflow-y-auto"
            >
              <label class="flex items-center py-1 hover:bg-gray-50 rounded px-2">
                <input
                  type="radio"
                  :value="''"
                  v-model="selectedFloor"
                  @change="handleFloorChange"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">ทุกชั้น</span>
              </label>
              <label
                v-for="floor in filteredFloors"
                :key="floor.floor_id"
                class="flex items-center py-1 hover:bg-gray-50 rounded px-2"
              >
                <input
                  type="radio"
                  :value="floor.floor_id"
                  v-model="selectedFloor"
                  @change="handleFloorChange"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">{{ floor.floor_name }}</span>
              </label>
            </div>
          </div>

          <!-- ล้างตัวกรอง -->
          <button
            v-if="selectedBuilding || selectedFloor || searchQuery"
            @click="clearFilters"
            class="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ล้างตัวกรอง
          </button>
        </div>

        <div class="flex items-center gap-3">
          <!-- Import Excel (ปุ่มรอง เข้าธีม) -->
          <ImportButtonComponent>
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx"
              class="hidden"
              @change="handleFileChange"
            />
            <Icon icon="fluent:add-12-filled" width="20" height="20" />
          </ImportButtonComponent>

          <!-- เพิ่มสถานที่ (ปุ่มหลัก) -->
          <BaseButtonComponent
            @click="openAddModal"
            class="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-[#1E48D1] hover:bg-[#1539a9] text-white font-medium shadow-sm transition"
          >
            <Icon icon="fluent:add-12-filled" width="20" height="20" />
            เพิ่มสถานที่
          </BaseButtonComponent>
        </div>
      </div>

      <!-- ตาราง -->
      <div class="-mx-2 sm:mx-0 overflow-x-auto">
        <TableComponent
          :columns="columns"
          :rows="tableRows"
          :perPage="10"
          :idColumnIndex="0"
          :hiddenColumns="[0]"
          :column-align="['left', 'left', 'left', 'left', 'center']"
          @detail="openViewModal"
          @edit="openEditModal"
          @delete="confirmDelete"
        >
          <!-- slot: action column -->
          <template #cell-4="{ row }">
            <TableActionsComponent
              role="admin"
              :row-id="row[0]"
              :open-menu-id="openMenuId"
              :row="row"
              :status="null"
              @toggle-menu="openMenuId = $event"
              @detail="openViewModal(row[0])"
              @edit="openEditModal(row[0])"
              @delete="confirmDelete(row[0])"
            />
          </template>
        </TableComponent>
      </div>
    </div>

    <!-- View Modal -->
    <div
      v-if="showViewModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0"
      @click.self="closeViewModal"
    >
      <div
        class="bg-white rounded-lg p-4 sm:p-6 md:p-8 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <!-- Header with icon -->
        <div class="flex items-center gap-3 mb-6">
          <div class="bg-blue-100 p-3 rounded-full">
            <img src="/icon/info-icon.svg" alt="View Location" class="w-8 h-8" />
          </div>
          <h2 class="text-xl font-bold text-gray-800">รายละเอียดสถานที่</h2>
        </div>

        <p class="text-gray-600 text-sm mb-6">
          ข้อมูล{{
            viewData.type === 'building' ? 'อาคาร' : viewData.type === 'floor' ? 'ชั้น' : 'ห้อง'
          }}
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5"> ประเภท </label>
            <input
              :value="
                viewData.type === 'building' ? 'อาคาร' : viewData.type === 'floor' ? 'ชั้น' : 'ห้อง'
              "
              type="text"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              ชื่อ{{
                viewData.type === 'building' ? 'อาคาร' : viewData.type === 'floor' ? 'ชั้น' : 'ห้อง'
              }}
            </label>
            <input
              :value="
                viewData.displayName ||
                viewData.building_name ||
                viewData.floor_name ||
                viewData.room_name
              "
              type="text"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>

          <div v-if="viewData.type === 'floor' || viewData.type === 'room'">
            <label class="block text-sm font-medium text-gray-700 mb-1.5"> อาคาร </label>
            <input
              :value="viewData.building_name || '-'"
              type="text"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>

          <div v-if="viewData.type === 'room'">
            <label class="block text-sm font-medium text-gray-700 mb-1.5"> ชั้น </label>
            <input
              :value="viewData.floor_name || '-'"
              type="text"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5"> รหัส </label>
            <input
              :value="viewData.building_id || viewData.floor_id || viewData.room_id || '-'"
              type="text"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>
        </div>

        <!-- ปุ่มปิด -->
        <div class="flex justify-end mt-6">
          <button
            type="button"
            @click="closeViewModal"
            class="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-medium transition"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0"
      @click.self="closeAddModal"
    >
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
          <label
            class="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400"
            :class="addForm.bulk_mode ? 'border-blue-600 bg-blue-50' : 'border-gray-200'"
          >
            <input
              type="radio"
              v-model="addForm.bulk_mode"
              :value="true"
              class="w-5 h-5 text-blue-600 mt-1"
            />
            <div class="ml-3">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-gray-800">สร้างหลายระดับพร้อมกัน</span>
                <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"
                  >เร็วกว่า</span
                >
              </div>
              <p class="text-xs text-gray-500 mt-1">สร้างอาคาร + ชั้น + ห้อง ในครั้งเดียว</p>
            </div>
          </label>

          <label
            class="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400"
            :class="!addForm.bulk_mode ? 'border-blue-600 bg-blue-50' : 'border-gray-200'"
          >
            <input
              type="radio"
              v-model="addForm.bulk_mode"
              :value="false"
              class="w-5 h-5 text-blue-600 mt-1"
            />
            <div class="ml-3">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-gray-800">เพิ่มทีละระดับ</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">เลือกเพิ่ม อาคาร, ชั้น หรือ ห้อง ทีละอย่าง</p>
            </div>
          </label>
        </div>

        <!-- Single Mode -->
        <div v-if="!addForm.bulk_mode" class="space-y-4">
          <!-- เลือกประเภท -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              ประเภท <span class="text-red-500">*</span>
            </label>
            <select
              v-model="addForm.type"
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="building">อาคาร</option>
              <option value="floor">ชั้น</option>
              <option value="room">ห้อง</option>
            </select>
          </div>

          <!-- เลือกอาคาร (สำหรับชั้นและห้อง) -->
          <div v-if="addForm.type === 'floor' || addForm.type === 'room'">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              อาคาร <span class="text-red-500">*</span>
            </label>
            <select
              v-model="addForm.building_id"
              @change="handleModalBuildingChange"
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="">เลือกอาคาร</option>
              <option
                v-for="building in buildings"
                :key="building.building_id"
                :value="building.building_id"
              >
                {{ building.building_name }}
              </option>
            </select>
          </div>

          <!-- เลือกชั้น (สำหรับห้อง) -->
          <div v-if="addForm.type === 'room'">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              ชั้น <span class="text-red-500">*</span>
            </label>
            <select
              v-if="addForm.type === 'room'"
              v-model="addForm.floor_id"
              :disabled="!addForm.building_id"
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:bg-gray-100"
            >
              <option value="">เลือกชั้น</option>
              <option v-for="floor in modalFloors" :key="floor.floor_id" :value="floor.floor_id">
                {{ floor.floor_name }}
              </option>
            </select>
          </div>

          <!-- ชื่อ -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              ชื่อ{{
                addForm.type === 'building' ? 'อาคาร' : addForm.type === 'floor' ? 'ชั้น' : 'ห้อง'
              }}
              <span class="text-red-500">*</span>
            </label>
            <input
              v-model="addForm.name"
              type="text"
              :placeholder="`ระบุชื่อ${addForm.type === 'building' ? 'อาคาร' : addForm.type === 'floor' ? 'ชั้น' : 'ห้อง'}`"
              :class="[
                'w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors',
                validationErrors.name
                  ? 'border-red-500 focus:ring-red-400 bg-red-50'
                  : 'border-gray-300 focus:ring-blue-400',
              ]"
              @input="() => validateAlphanumeric(addForm.name, 'name')"
              @blur="() => validateAlphanumeric(addForm.name, 'name')"
            />
            <p v-if="validationErrors.name" class="text-red-500 text-sm mt-1">
              {{ errorMessages.name }}
            </p>
          </div>
        </div>

        <!-- Bulk Mode -->
        <div v-if="addForm.bulk_mode" class="space-y-4">
          <!-- อาคาร -->
          <div class="border-2 border-gray-200 rounded-lg p-4 space-y-3">
            <h3 class="font-semibold text-gray-800">อาคาร</h3>

            <label class="flex items-center gap-2">
              <input
                type="radio"
                v-model="addForm.building_mode"
                value="existing"
                class="w-4 h-4 text-blue-600"
              />
              <span class="text-sm font-medium">เลือกจากอาคารที่มีอยู่</span>
            </label>

            <select
              v-if="addForm.building_mode === 'existing'"
              v-model="addForm.building_id"
              @change="handleBulkBuildingChange"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="">-- เลือกอาคาร --</option>
              <option
                v-for="building in buildings"
                :key="building.building_id"
                :value="building.building_id"
              >
                {{ building.building_name }}
              </option>
            </select>

            <label class="flex items-center gap-2 mt-3">
              <input
                type="radio"
                v-model="addForm.building_mode"
                value="new"
                class="w-4 h-4 text-blue-600"
              />
              <span class="text-sm font-medium">สร้างอาคารใหม่</span>
            </label>

            <div v-if="addForm.building_mode === 'new'" class="space-y-2">
              <input
                v-model="addForm.new_building_name"
                type="text"
                placeholder="ชื่ออาคารใหม่"
                :class="[
                  'w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors',
                  validationErrors.newBuildingName
                    ? 'border-red-500 focus:ring-red-400 bg-red-50'
                    : 'border-gray-300 focus:ring-blue-400',
                ]"
                @input="() => validateAlphanumeric(addForm.new_building_name, 'newBuildingName')"
                @blur="() => validateAlphanumeric(addForm.new_building_name, 'newBuildingName')"
              />
              <p v-if="validationErrors.newBuildingName" class="text-red-500 text-sm mt-1">
                {{ errorMessages.newBuildingName }}
              </p>
            </div>
          </div>

          <!-- ชั้น -->
          <div class="border-2 border-gray-200 rounded-lg p-4 space-y-3">
            <h3 class="font-semibold text-gray-800">ชั้น</h3>

            <label class="flex items-center gap-2">
              <input
                type="radio"
                v-model="addForm.floor_mode"
                value="existing"
                :disabled="addForm.building_mode === 'new' || !addForm.building_id"
                class="w-4 h-4 text-blue-600 disabled:opacity-50"
              />
              <span
                class="text-sm font-medium"
                :class="{
                  'text-gray-400': addForm.building_mode === 'new' || !addForm.building_id,
                }"
              >
                เลือกจากชั้นที่มีอยู่
              </span>
            </label>

            <select
              v-if="addForm.floor_mode === 'existing'"
              v-model="addForm.floor_id"
              :disabled="addForm.building_mode === 'new' || !addForm.building_id"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:bg-gray-100"
            >
              <option value="">-- เลือกชั้น --</option>
              <option v-for="floor in bulkFloors" :key="floor.floor_id" :value="floor.floor_id">
                {{ floor.floor_name }}
              </option>
            </select>

            <label class="flex items-center gap-2 mt-3">
              <input
                type="radio"
                v-model="addForm.floor_mode"
                value="new"
                class="w-4 h-4 text-blue-600"
              />
              <span class="text-sm font-medium">สร้างชั้นใหม่</span>
            </label>

            <div v-if="addForm.floor_mode === 'new'" class="space-y-2">
              <input
                v-model="addForm.new_floor_name"
                type="text"
                placeholder="ชื่อชั้นใหม่"
                :class="[
                  'w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors',
                  validationErrors.newFloorName
                    ? 'border-red-500 focus:ring-red-400 bg-red-50'
                    : 'border-gray-300 focus:ring-blue-400',
                ]"
                @input="() => validateAlphanumeric(addForm.new_floor_name, 'newFloorName')"
                @blur="() => validateAlphanumeric(addForm.new_floor_name, 'newFloorName')"
              />
              <p v-if="validationErrors.newFloorName" class="text-red-500 text-sm mt-1">
                {{ errorMessages.newFloorName }}
              </p>
            </div>
          </div>

          <!-- ห้อง -->
          <div class="border-2 border-blue-200 rounded-lg p-4 space-y-3 bg-blue-50">
            <h3 class="font-semibold text-gray-800">ห้อง <span class="text-red-500">*</span></h3>

            <div class="space-y-2">
              <input
                v-model="addForm.room_name"
                type="text"
                placeholder="ชื่อห้อง (ต้องระบุ)"
                :class="[
                  'w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors',
                  validationErrors.roomName
                    ? 'border-red-500 focus:ring-red-400 bg-red-50'
                    : 'border-gray-300 focus:ring-blue-400',
                ]"
                @input="() => validateAlphanumeric(addForm.room_name, 'roomName')"
                @blur="() => validateAlphanumeric(addForm.room_name, 'roomName')"
              />
              <p v-if="validationErrors.roomName" class="text-red-500 text-sm mt-1">
                {{ errorMessages.roomName }}
              </p>
            </div>
            <p class="text-xs text-gray-600">ห้องจะถูกสร้างในชั้นที่เลือกหรือสร้างขึ้นมาใหม่</p>
          </div>
        </div>

        <!-- ปุ่ม -->
        <div class="flex gap-3 mt-6">
          <button
            type="button"
            @click="closeAddModal"
            class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            @click="saveAddLocation"
            class="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors font-medium"
          >
            เพิ่มสถานที่
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0"
      @click.self="closeEditModal"
    >
      <div class="bg-white rounded-lg p-8 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <!-- Header with icon -->
        <div class="flex items-center gap-3 mb-6">
          <div class="bg-orange-100 p-3 rounded-full">
            <img src="/icon/edit-icon.svg" alt="Edit Location" class="w-8 h-8" />
          </div>
          <h2 class="text-xl font-bold text-gray-800">
            แก้ไข{{
              editForm.type === 'building' ? 'อาคาร' : editForm.type === 'floor' ? 'ชั้น' : 'ห้อง'
            }}
          </h2>
        </div>

        <p class="text-gray-600 text-sm mb-6">คุณต้องการบันทึกการแก้ไขข้อมูลหรือไม่</p>

        <div class="space-y-4">
          <!-- แสดงประเภท (disabled) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2"> ประเภท </label>
            <input
              :value="
                editForm.type === 'building' ? 'อาคาร' : editForm.type === 'floor' ? 'ชั้น' : 'ห้อง'
              "
              type="text"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>

          <!-- แสดงอาคาร (สำหรับชั้นและห้อง, disabled) -->
          <div v-if="editForm.type === 'floor' || editForm.type === 'room'">
            <label class="block text-sm font-medium text-gray-700 mb-2"> อาคาร </label>
            <input
              :value="
                buildings.find((b) => b.building_id == editForm.building_id)?.building_name || '-'
              "
              type="text"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>

          <!-- แสดงชั้น (สำหรับห้อง, disabled) -->
          <div v-if="editForm.type === 'room'">
            <label class="block text-sm font-medium text-gray-700 mb-2"> ชั้น </label>
            <input
              :value="floors.find((f) => f.floor_id == editForm.floor_id)?.floor_name || '-'"
              type="text"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>

          <!-- ชื่อ -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              ชื่อ{{
                editForm.type === 'building' ? 'อาคาร' : editForm.type === 'floor' ? 'ชั้น' : 'ห้อง'
              }}
              <span class="text-red-500">*</span>
            </label>
            <input
              v-model="editForm.name"
              type="text"
              :class="[
                'w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors',
                validationErrors.name
                  ? 'border-red-500 focus:ring-red-400 bg-red-50'
                  : 'border-gray-300 focus:ring-blue-400',
              ]"
              @input="() => validateAlphanumeric(editForm.name, 'name')"
              @blur="() => validateAlphanumeric(editForm.name, 'name')"
            />
            <p v-if="validationErrors.name" class="text-red-500 text-sm mt-1">
              {{ errorMessages.name }}
            </p>
          </div>
        </div>

        <!-- ปุ่ม -->
        <div class="flex gap-3 mt-6">
          <button
            type="button"
            @click="closeEditModal"
            class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            @click="saveEditLocation"
            class="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors font-medium"
          >
            บันทึกการแก้ไข
          </button>
        </div>
      </div>
    </div>
  </div>
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
