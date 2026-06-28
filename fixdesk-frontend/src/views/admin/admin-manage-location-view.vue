<script setup>
/**
 * =====================================================================
 * @file            admin-manage-location-view.vue
 * @module          มอดูลการจัดการสถานที่ - การจัดการข้อมูลสถานที่
 * @layer           View (Presentation Layer)
 * @version         1.4.0
 * @since           2025-10-21
 * @author          เศรษฐพงศ์ หอมชื่น
 * @contributors
 * - พชร ไพศรีสกุล
 * - นราธิป แสนทวีสุข
 * - เศรษฐพงศ์ หอมชื่่น
 * - ปฏิพัทธ์ จงนันทพันธ์กุล
 *
 * @lastModified    2026-06-28
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 * - ตารางหลักแสดงเฉพาะระดับ "อาคาร"
 * - View Modal: อ่านข้อมูล Tree อย่างเดียว
 * - Edit Modal (ใหม่): เป็นระบบ Location Manager สามารถแก้ไขชื่ออาคาร
 * เพิ่มชั้น, เพิ่มห้อง, เปลี่ยนเลขชั้น และลบข้อมูลได้เบ็ดเสร็จในหน้าต่างเดียว
 * =====================================================================
 */

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { handleUnauthorized } from '@/utils/auth.util'
import { Icon } from '@iconify/vue'
import ImportButtonComponent from '@/components/button/import-button-component.vue'
import BaseButtonComponent from '@/components/button/base/base-button-component.vue'

import TableComponent from '@/components/table-component.vue'
import TableActionsComponent from '@/components/table-actions-component.vue'
import UniversalImportModal from '@/components/modal/universal-import-modal.vue'

defineOptions({ name: 'AdminManageLocationView' })

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE
const fileInput = ref(null)

const showImportModal = ref(false)

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

const handleAuthError = (status) => {
  if (status === 401) {
    handleUnauthorized(router)
    return true
  }
  return false
}

const buildings = ref([])
const floors = ref([])
const rooms = ref([])
const searchQuery = ref('')

const showBuildingFilter = ref(false)
const showFloorFilter = ref(false)
const selectedBuilding = ref('')
const selectedFloor = ref('')
const screenSize = ref('lg')

// Modal states
const showViewModal = ref(false)
const showAddModal = ref(false)
const showEditModal = ref(false)

const bulkFloors = ref([])
const modalExpandedFloors = ref([])

function toggleModalFloor(id) {
  const idx = modalExpandedFloors.value.indexOf(id)
  if (idx > -1) {
    modalExpandedFloors.value.splice(idx, 1)
  } else {
    modalExpandedFloors.value.push(id)
  }
}

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
  building_id: '',
  building_name: '',
  original_building_name: '',
})

const validationErrors = ref({
  newBuildingName: false,
  newFloorName: false,
  roomName: false,
})

const errorMessages = ref({
  newBuildingName: '',
  newFloorName: '',
  roomName: '',
})

function validateAlphanumeric(value, fieldName) {
  if (fieldName === 'newFloorName') {
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
    errorMessages.value[fieldName] = `กรุณากรอกข้อมูลเป็นตัวอักษรไทย อังกฤษ ตัวเลข และ / เท่านั้น`
    return false
  }
  validationErrors.value[fieldName] = false
  errorMessages.value[fieldName] = ''
  return true
}

async function fetchAllData() {
  try {
    const res = await fetch(`${API_BASE}/locations/all`, { headers: getAuthHeaders() })
    if (handleAuthError(res.status)) return

    const allData = await res.json()
    buildings.value = allData.filter((item) => item.type === 'building').map((item) => ({ building_id: item.id, building_name: item.name }))
    floors.value = allData.filter((item) => item.type === 'floor').map((item) => ({ floor_id: item.id, floor_name: item.name, building_id: item.building_id || item.fl_bd_id, building_name: item.building }))
    rooms.value = allData.filter((item) => item.type === 'room').map((item) => ({ room_id: item.id, room_name: item.name, floor_id: item.floor_id || item.room_fl_id, floor_name: item.floor, building_id: item.building_id, building_name: item.building }))
  } catch (err) {
    await fetchAllDataAlternative()
  }
}

async function fetchAllDataAlternative() {
  try {
    const buildingsRes = await fetch(`${API_BASE}/buildings`, { headers: getAuthHeaders() })
    if (handleAuthError(buildingsRes.status)) return
    buildings.value = await buildingsRes.json()

    try {
      const floorsRes = await fetch(`${API_BASE}/floors`, { headers: getAuthHeaders() })
      if (floorsRes.ok) {
        const floorsData = await floorsRes.json()
        floors.value = floorsData.map((floor) => ({ floor_id: floor.floor_id, floor_name: floor.floor_name, building_id: floor.fl_bd_id || floor.building_id, building_name: floor.building_name }))
      } else {
        await fetchFloorsByBuilding()
      }
    } catch (err) {
      await fetchFloorsByBuilding()
    }

    try {
      const roomsRes = await fetch(`${API_BASE}/rooms`, { headers: getAuthHeaders() })
      if (roomsRes.ok) {
        const roomsData = await roomsRes.json()
        rooms.value = roomsData.map((room) => ({ room_id: room.room_id, room_name: room.room_name, floor_id: room.room_fl_id || room.floor_id, floor_name: room.floor_name, building_id: room.fl_bd_id || room.building_id, building_name: room.building_name }))
      } else {
        await fetchRoomsByFloor()
      }
    } catch (err) {
      await fetchRoomsByFloor()
    }
  } catch (err) {
    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถโหลดข้อมูลสถานที่ได้', icon: 'error' })
  }
}

async function fetchFloorsByBuilding() {
  const allFloors = []
  for (const building of buildings.value) {
    const res = await fetch(`${API_BASE}/floors/${building.building_id}`, { headers: getAuthHeaders() })
    if (res.ok) {
      const data = await res.json()
      data.forEach((floor) => { allFloors.push({ floor_id: floor.floor_id, floor_name: floor.floor_name, building_id: building.building_id, building_name: building.building_name }) })
    }
  }
  floors.value = allFloors
}

async function fetchRoomsByFloor() {
  const allRooms = []
  for (const floor of floors.value) {
    const res = await fetch(`${API_BASE}/rooms/${floor.floor_id}`, { headers: getAuthHeaders() })
    if (res.ok) {
      const data = await res.json()
      data.forEach((room) => { allRooms.push({ room_id: room.room_id, room_name: room.room_name, floor_id: floor.floor_id, floor_name: floor.floor_name, building_id: floor.building_id, building_name: floor.building_name }) })
    }
  }
  rooms.value = allRooms
}

function extractNumber(str) {
  if (!str) return null
  const match = str.match(/\d+/)
  return match ? parseInt(match[0]) : null
}

const displayData = computed(() => {
  let visibleBuildings = buildings.value
  if (selectedBuilding.value) visibleBuildings = visibleBuildings.filter(b => b.building_id == selectedBuilding.value)
  if (selectedFloor.value) {
    const bIdsWithFloor = floors.value.filter(f => f.floor_id == selectedFloor.value).map(f => f.building_id)
    visibleBuildings = visibleBuildings.filter(b => bIdsWithFloor.includes(b.building_id))
  }
  let searchQ = searchQuery.value.toLowerCase().trim()
  if (searchQ) {
    visibleBuildings = visibleBuildings.filter(b => {
      if (b.building_name.toLowerCase().includes(searchQ)) return true;
      const bFloors = floors.value.filter(f => f.building_id == b.building_id)
      if (bFloors.some(f => f.floor_name.toLowerCase().includes(searchQ))) return true;
      const bRooms = rooms.value.filter(r => bFloors.some(f => f.floor_id == r.floor_id))
      if (bRooms.some(r => r.room_name.toLowerCase().includes(searchQ))) return true;
      return false;
    })
  }

  visibleBuildings.sort((a,b) => {
    const numA = extractNumber(a.building_name)
    const numB = extractNumber(b.building_name)
    if (numA !== null && numB !== null && numA !== numB) return numA - numB
    return a.building_name.localeCompare(b.building_name, 'th')
  })

  return visibleBuildings.map(b => {
    const bFloors = floors.value.filter(f => f.building_id == b.building_id)
    const bRooms = rooms.value.filter(r => bFloors.some(f => f.floor_id == r.floor_id))
    bFloors.sort((a,b) => {
      const nA = extractNumber(a.floor_name)
      const nB = extractNumber(b.floor_name)
      if (nA !== null && nB !== null && nA !== nB) return nA - nB
      return a.floor_name.localeCompare(b.floor_name, 'th')
    })
    return {
      id: `b-${b.building_id}`,
      raw_id: b.building_id,
      type: 'building',
      name: b.building_name,
      displayName: b.building_name,
      statsText: `${bFloors.length} ชั้น / ${bRooms.length} ห้อง`,
      floors: bFloors,
      rooms: bRooms
    }
  })
})

const openMenuId = ref(null)
const columns = ['', 'รายชื่ออาคาร', 'จำนวนชั้น / ห้อง', 'ตัวดำเนินการ']
const tableRowsList = computed(() => { return displayData.value.map((item) => [ item.id, item, item.statsText, '' ]) })

const filteredFloors = computed(() => {
  if (selectedBuilding.value) return floors.value.filter((f) => f.building_id == selectedBuilding.value)
  const uniqueFloors = []
  const seenNames = new Set()
  for (const floor of floors.value) {
    if (!seenNames.has(floor.floor_name)) {
      seenNames.add(floor.floor_name)
      uniqueFloors.push(floor)
    }
  }
  return uniqueFloors
})

function toggleBuildingFilter() {
  showBuildingFilter.value = !showBuildingFilter.value
  if (showBuildingFilter.value) showFloorFilter.value = false
}
function toggleFloorFilter() {
  showFloorFilter.value = !showFloorFilter.value
  if (showFloorFilter.value) showBuildingFilter.value = false
}
function clearFilters() {
  selectedBuilding.value = ''; selectedFloor.value = ''; searchQuery.value = ''
}
function closeDropdown(event) {
  if (!event.target.closest('.relative')) { showBuildingFilter.value = false; showFloorFilter.value = false }
}

// -------------------------------------------------------------
// View Modal (Read Only)
// -------------------------------------------------------------
function openViewModal(raw_id) {
  const item = displayData.value.find((b) => b.raw_id == raw_id)
  if (!item) return
  modalExpandedFloors.value = []
  viewData.value = {
    id: item.raw_id,
    displayName: item.name,
    stats: { floorCount: item.floors.length, roomCount: item.rooms.length, floors: item.floors }
  }
  showViewModal.value = true
}

// Helper ให้ View Modal และ Edit Modal
function getRoomsForFloor(floorId) {
  return rooms.value.filter(r => r.floor_id == floorId).sort((a,b) => {
    const numA = extractNumber(a.room_name)
    const numB = extractNumber(b.room_name)
    if (numA !== null && numB !== null && numA !== numB) return numA - numB
    return a.room_name.localeCompare(b.room_name, 'th')
  })
}

// -------------------------------------------------------------
// Edit Manager Modal (ระบบจัดการย่อย)
// -------------------------------------------------------------
function openEditModal(type, raw_id) {
  if (type !== 'building') return; // เปิด Edit Manager ที่ระดับอาคารเท่านั้น

  const item = buildings.value.find(b => b.building_id == raw_id)
  if (!item) return

  editForm.value = {
    building_id: item.building_id,
    building_name: item.building_name,
    original_building_name: item.building_name,
  }
  
  modalExpandedFloors.value = [] // Reset expand
  showEditModal.value = true
}

const editBuildingFloors = computed(() => {
  if (!editForm.value.building_id) return []
  return floors.value.filter(f => f.building_id == editForm.value.building_id).sort((a,b) => {
    const nA = extractNumber(a.floor_name)
    const nB = extractNumber(b.floor_name)
    if (nA !== null && nB !== null && nA !== nB) return nA - nB
    return a.floor_name.localeCompare(b.floor_name, 'th')
  })
})

const editBuildingRooms = computed(() => {
  return (floorId) => {
    return rooms.value.filter(r => r.floor_id == floorId).sort((a, b) => {
      const numA = extractNumber(a.room_name)
      const numB = extractNumber(b.room_name)
      if (numA !== null && numB !== null && numA !== numB) return numA - numB
      return a.room_name.localeCompare(b.room_name, 'th')
    })
  }
})

// ฟังก์ชันอัปเดตแค่ชื่ออาคารหลัก
async function saveBuildingNameOnly() {
  const newName = editForm.value.building_name.trim()
  if (!newName) {
    Swal.fire({ icon: 'warning', title: 'กรุณากรอกชื่ออาคาร' })
    return
  }
  if (!/^[ก-๙a-zA-Z0-9\s/]+$/.test(newName)) {
    Swal.fire({ icon: 'warning', title: 'รูปแบบไม่ถูกต้อง', text: 'กรุณากรอกข้อมูลเป็นตัวอักษรไทย อังกฤษ ตัวเลข และ / เท่านั้น' })
    return
  }
  if (newName === editForm.value.original_building_name) {
    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'ไม่มีการเปลี่ยนแปลง', showConfirmButton: false, timer: 1500 })
    return
  }

  try {
    const res = await fetch(`${API_BASE}/buildings/${editForm.value.building_id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ bd_name: newName })
    })
    if (handleAuthError(res.status)) return
    if (!res.ok) throw new Error('อัปเดตไม่สำเร็จ')
    
    editForm.value.original_building_name = newName
    await refreshData()
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'อัปเดตชื่ออาคารสำเร็จ', showConfirmButton: false, timer: 2000 })
  } catch(err) {
    Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
  }
}

// Inline Prompt - เพิ่มชั้น
async function promptAddFloor() {
  const { value: floorName } = await Swal.fire({
    title: 'เพิ่มชั้นใหม่',
    input: 'text',
    inputPlaceholder: 'ระบุตัวเลขชั้น (เช่น 1, 2, 3)',
    showCancelButton: true,
    confirmButtonText: 'เพิ่มชั้น',
    cancelButtonText: 'ยกเลิก',
    inputValidator: (value) => {
      if (!value.trim()) return 'กรุณาระบุชั้น'
      if (!/^[0-9]+$/.test(value)) return 'ระบุเป็นตัวเลขเท่านั้น'
    }
  })
  
  if (floorName) {
    try {
      const res = await fetch(`${API_BASE}/floors`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ fl_name: floorName.trim(), fl_bd_id: editForm.value.building_id })
      })
      if (handleAuthError(res.status)) return
      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ')
      
      await refreshData()
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'เพิ่มชั้นสำเร็จ', showConfirmButton: false, timer: 2000 })
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
    }
  }
}

// Inline Prompt - แก้ไขชั้น
async function promptEditFloor(floor) {
  const { value: floorName } = await Swal.fire({
    title: 'แก้ไขเลขชั้น',
    input: 'text',
    inputValue: floor.floor_name,
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    inputValidator: (value) => {
      if (!value.trim()) return 'กรุณาระบุชั้น'
      if (!/^[0-9]+$/.test(value)) return 'ระบุเป็นตัวเลขเท่านั้น'
    }
  })
  
  if (floorName && floorName.trim() !== floor.floor_name) {
    try {
      const res = await fetch(`${API_BASE}/floors/${floor.floor_id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ fl_name: floorName.trim() })
      })
      if (handleAuthError(res.status)) return
      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ')
      
      await refreshData()
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'เปลี่ยนเลขชั้นสำเร็จ', showConfirmButton: false, timer: 2000 })
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
    }
  }
}

// Inline Prompt - เพิ่มห้อง
async function promptAddRoom(floorId) {
  const { value: roomName } = await Swal.fire({
    title: 'เพิ่มห้อง',
    input: 'text',
    inputPlaceholder: 'ระบุชื่อห้องใหม่',
    showCancelButton: true,
    confirmButtonText: 'เพิ่มห้อง',
    cancelButtonText: 'ยกเลิก',
    inputValidator: (value) => {
      if (!value.trim()) return 'กรุณาระบุชื่อห้อง'
      if (!/^[ก-๙a-zA-Z0-9\s/]+$/.test(value)) return 'รูปแบบข้อมูลไม่ถูกต้อง'
    }
  })
  
  if (roomName) {
    try {
      const res = await fetch(`${API_BASE}/rooms`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ room_name: roomName.trim(), room_fl_id: floorId })
      })
      if (handleAuthError(res.status)) return
      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ')
      
      await refreshData()
      // เปิด Tree ของชั้นที่เพิ่งเพิ่มอัตโนมัติ
      if (!modalExpandedFloors.value.includes(floorId)) modalExpandedFloors.value.push(floorId)
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'เพิ่มห้องสำเร็จ', showConfirmButton: false, timer: 2000 })
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
    }
  }
}

// Inline Prompt - แก้ไขห้อง
async function promptEditRoom(room) {
  const { value: roomName } = await Swal.fire({
    title: 'แก้ไขชื่อห้อง',
    input: 'text',
    inputValue: room.room_name,
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    inputValidator: (value) => {
      if (!value.trim()) return 'กรุณาระบุชื่อห้อง'
      if (!/^[ก-๙a-zA-Z0-9\s/]+$/.test(value)) return 'รูปแบบข้อมูลไม่ถูกต้อง'
    }
  })
  
  if (roomName && roomName.trim() !== room.room_name) {
    try {
      const res = await fetch(`${API_BASE}/rooms/${room.room_id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ room_name: roomName.trim(), room_fl_id: room.floor_id })
      })
      if (handleAuthError(res.status)) return
      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ')
      
      await refreshData()
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'แก้ไขชื่อห้องสำเร็จ', showConfirmButton: false, timer: 2000 })
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message })
    }
  }
}

// การลบรองรับใช้จากทุกที่ (หน้าหลัก และใน Manager)
async function confirmDelete(type, raw_id) {
  let name = ''
  if (type === 'building') {
    name = buildings.value.find(x => x.building_id == raw_id)?.building_name || ''
  } else if (type === 'floor') {
    name = floors.value.find(x => x.floor_id == raw_id)?.floor_name || ''
  } else if (type === 'room') {
    name = rooms.value.find(x => x.room_id == raw_id)?.room_name || ''
  }

  if (!name) return

  try {
    const checkRes = await fetch(`${API_BASE}/locations/check-usage/${type}/${raw_id}`, { headers: getAuthHeaders() })
    const usageData = await checkRes.json()

    if (usageData.inUse) {
      await Swal.fire({
        icon: 'error',
        title: 'ไม่สามารถลบได้',
        html: `<strong>"${name}"</strong> มีการใช้งานอยู่ใน <strong>${usageData.count}</strong> รายการแจ้งซ่อม<br><br>
               <small class="text-gray-600">กรุณาเปลี่ยนสถานที่ในรายการเหล่านั้นก่อน</small>`,
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#dc2626',
      })
      return
    }
  } catch (err) { console.error('Error checking usage:', err) }

  const typeText = type === 'building' ? 'อาคาร' : type === 'floor' ? 'ชั้น' : 'ห้อง'

  const result = await Swal.fire({
    title: 'ยืนยันการลบ?',
    html: `คุณต้องการลบ${typeText} <strong>"${name}"</strong> หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ยืนยันการลบ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#dc2626',
  })

  if (!result.isConfirmed) return

  try {
    const endpoint = type === 'building' ? `/buildings/${raw_id}` : type === 'floor' ? `/floors/${raw_id}` : `/rooms/${raw_id}`
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE', headers: getAuthHeaders() })

    if (handleAuthError(res.status)) return
    if (!res.ok) throw new Error('ลบไม่สำเร็จ')

    await refreshData()
    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, title: 'สำเร็จ!', text: `ลบ${typeText}เรียบร้อยแล้ว`, icon: 'success' })
    
    // ถ้าลบอาคารหลัก ให้ปิดหน้าต่าง Edit Manager (เพราะไม่มีข้อมูลแล้ว)
    if (type === 'building' && showEditModal.value && editForm.value.building_id == raw_id) {
      showEditModal.value = false
    }
  } catch (err) {
    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, title: 'เกิดข้อผิดพลาด', text: err.message, icon: 'error' })
  }
}

function openAddModal() {
  addForm.value = { type: 'building', name: '', building_id: '', floor_id: '', bulk_mode: true, building_mode: 'existing', floor_mode: 'existing', new_building_name: '', new_floor_name: '', room_name: '' }
  validationErrors.value = { newBuildingName: false, newFloorName: false, roomName: false }
  showAddModal.value = true
}

async function saveAddLocation() {
  if (addForm.value.bulk_mode) {
    if (addForm.value.building_mode === 'new' && !validateAlphanumeric(addForm.value.new_building_name, 'newBuildingName')) return
    if (addForm.value.floor_mode === 'new' && !validateAlphanumeric(addForm.value.new_floor_name, 'newFloorName')) return
    if (!validateAlphanumeric(addForm.value.room_name, 'roomName')) return
    await bulkCreateLocation()
  }
}

async function bulkCreateLocation() {
  try {
    let buildingId = addForm.value.building_id
    let floorId = addForm.value.floor_id

    if (addForm.value.building_mode === 'new') {
      const res = await fetch(`${API_BASE}/buildings`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ bd_name: addForm.value.new_building_name.trim() }) })
      if (handleAuthError(res.status)) return
      const data = await res.json(); buildingId = data.bd_id
    }
    if (addForm.value.floor_mode === 'new') {
      if (!buildingId) { Swal.fire({ icon: 'warning', title: 'กรุณาเลือกอาคาร' }); return }
      const res = await fetch(`${API_BASE}/floors`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ fl_name: addForm.value.new_floor_name.trim(), fl_bd_id: buildingId }) })
      if (handleAuthError(res.status)) return
      const data = await res.json(); floorId = data.fl_id
    }
    if (!floorId) { Swal.fire({ icon: 'warning', title: 'กรุณาเลือกชั้น' }); return }

    const res = await fetch(`${API_BASE}/rooms`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ room_name: addForm.value.room_name.trim(), room_fl_id: floorId }) })
    if (handleAuthError(res.status)) return
    
    showAddModal.value = false
    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, icon: 'success', title: 'สร้างสถานที่เรียบร้อยแล้ว' })
    await refreshData()
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message })
  }
}

async function handleBulkBuildingChange() {
  if (addForm.value.building_mode === 'existing' && addForm.value.building_id) {
    try {
      const res = await fetch(`${API_BASE}/floors/${addForm.value.building_id}`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        const uniqueFloors = []
        const seenIds = new Set()
        for (const floor of data) {
          if (!seenIds.has(floor.floor_id)) {
            seenIds.add(floor.floor_id); uniqueFloors.push({ floor_id: floor.floor_id, floor_name: floor.floor_name, building_id: addForm.value.building_id })
          }
        }
        bulkFloors.value = uniqueFloors
      }
    } catch (err) { console.error('Error fetching floors:', err) }
  }
  addForm.value.floor_id = ''; addForm.value.floor_mode = 'existing'
}

async function refreshData() {
  await fetchAllData()
}

const toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true })

function handleImportSuccess() { toast.fire({ icon: 'success', title: 'นำเข้าสถานที่เรียบร้อยแล้ว', background: '#FFFFFF', color: '#1e3a8a' }); showImportModal.value = false }
function handleImportError(message) { toast.fire({ icon: 'error', title: message || 'นำเข้าสถานที่ไม่สำเร็จ', background: '#FFFFFF', color: '#dc2626' }) }
function handleResize() { screenSize.value = window.innerWidth < 768 ? 'sm' : 'lg' }

onMounted(async () => {
  await refreshData()
  document.addEventListener('click', closeDropdown)
  window.addEventListener('resize', handleResize)
  handleResize()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-8xl">
    <h1 class="text-lg sm:text-xl font-bold text-black mb-6">จัดการข้อมูลสถานที่ในระบบ</h1>

    <div class="mb-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหารายการสถานที่ (อาคาร/ชั้น/ห้อง)"
            class="w-full sm:w-[280px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 text-gray-500"
          />

          <div class="relative">
            <button @click.stop="toggleBuildingFilter" class="h-10 flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-500">
              {{ selectedBuilding ? buildings.find((b) => b.building_id == selectedBuilding)?.building_name || 'อาคาร' : 'อาคาร' }}
              <Icon icon="meteor-icons:chevron-down" class="w-4 h-4 opacity-70 transition-transform duration-200" :class="{ 'rotate-180': showBuildingFilter }" />
            </button>
            <div v-if="showBuildingFilter" class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-500 z-10 max-h-60 overflow-y-auto">
              <label class="flex items-center py-1 hover:bg-gray-50 rounded px-2 cursor-pointer">
                <input type="radio" :value="''" v-model="selectedBuilding" class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">ทุกอาคาร</span>
              </label>
              <label v-for="building in buildings" :key="building.building_id" class="flex items-center py-1 hover:bg-gray-50 rounded px-2 cursor-pointer">
                <input type="radio" :value="building.building_id" v-model="selectedBuilding" class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">{{ building.building_name }}</span>
              </label>
            </div>
          </div>

          <div class="relative">
            <button @click.stop="toggleFloorFilter" class="h-10 flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-500">
              {{ selectedFloor ? floors.find((f) => f.floor_id == selectedFloor)?.floor_name || 'ชั้น' : 'ชั้น' }}
              <Icon icon="meteor-icons:chevron-down" class="w-4 h-4 opacity-70 transition-transform duration-200" :class="{ 'rotate-180': showFloorFilter }" />
            </button>
            <div v-if="showFloorFilter" class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10 max-h-60 overflow-y-auto">
              <label class="flex items-center py-1 hover:bg-gray-50 rounded px-2 cursor-pointer">
                <input type="radio" :value="''" v-model="selectedFloor" class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">ทุกชั้น</span>
              </label>
              <label v-for="floor in filteredFloors" :key="floor.floor_id" class="flex items-center py-1 hover:bg-gray-50 rounded px-2 cursor-pointer">
                <input type="radio" :value="floor.floor_id" v-model="selectedFloor" class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">{{ floor.floor_name }}</span>
              </label>
            </div>
          </div>

          <button v-if="selectedBuilding || selectedFloor || searchQuery" @click="clearFilters" class="text-blue-600 hover:text-blue-700 text-sm font-medium">ล้างตัวกรอง</button>
        </div>

        <div class="flex items-center gap-3">
          <ImportButtonComponent @click="showImportModal = true">
            <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="handleFileChange" />
            <Icon icon="fluent:add-12-filled" width="20" height="20" />
          </ImportButtonComponent>
          <BaseButtonComponent @click="openAddModal" class="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium shadow-sm transition">
            <Icon icon="fluent:add-12-filled" width="20" height="20" /> เพิ่มสถานที่
          </BaseButtonComponent>
        </div>
      </div>

      <div class="-mx-2 sm:mx-0 overflow-x-auto">
        <TableComponent
          :columns="columns"
          :rows="tableRowsList"
          :perPage="10"
          :idColumnIndex="1"
          :hiddenColumns="[0]"
          :column-align="['left', 'left', 'left', 'center']"
          :action-column-index="3"
        >
          <template #cell-1="{ row }">
            <div class="flex items-center gap-2">
              <Icon icon="material-symbols:apartment" class="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span class="font-bold text-gray-800">{{ row[1].displayName }}</span>
            </div>
          </template>

          <template #cell-3="{ row }">
            <TableActionsComponent
              role="admin"
              :row-id="row[0]"
              :open-menu-id="openMenuId"
              :row="row"
              :status="null"
              @toggle-menu="openMenuId = $event"
              @detail="openViewModal(row[1].raw_id)"
              @edit="openEditModal('building', row[1].raw_id)"
              @delete="confirmDelete('building', row[1].raw_id)"
            />
          </template>
        </TableComponent>
      </div>
    </div>

    <div v-if="showViewModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0" @click.self="showViewModal = false">
      <div class="bg-white rounded-lg p-4 sm:p-6 md:p-8 w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="bg-blue-400 p-3 rounded-full">
              <Icon icon="material-symbols:info-outline-rounded" width="24" height="24" style="color: #ffffff" />
            </div>
            <h2 class="text-xl font-bold text-gray-800">รายละเอียดอาคาร</h2>
          </div>
        </div>

        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
          <h3 class="text-lg font-bold text-gray-800">{{ viewData.displayName }}</h3>
          <p class="text-sm text-gray-600 mt-1">รายละเอียดโครงสร้างชั้นและห้องภายในอาคาร (โหมดดูข้อมูลเท่านั้น)</p>
        </div>

        <div class="space-y-4">
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

          <div class="mt-6">
            <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Icon icon="material-symbols:account-tree" width="20" height="20" class="text-gray-600" /> โครงสร้างชั้นและห้อง
            </h4>
            
            <div v-if="viewData.stats?.floors.length === 0" class="text-center py-4 bg-gray-50 rounded-lg text-gray-500 text-sm">ยังไม่มีข้อมูลในอาคารนี้</div>
            <div v-else class="space-y-3">
              <div v-for="floor in viewData.stats.floors" :key="floor.floor_id" class="border border-gray-200 rounded-lg overflow-hidden">
                <div class="bg-gray-50 p-3 flex items-center cursor-pointer hover:bg-gray-100 transition-colors select-none" @click="toggleModalFloor(floor.floor_id)">
                  <Icon icon="meteor-icons:chevron-down" class="w-4 h-4 text-gray-500 transition-transform duration-200 mr-3" :class="{ '-rotate-90': !modalExpandedFloors.includes(floor.floor_id) }" />
                  <Icon icon="material-symbols:layers" width="18" height="18" class="text-purple-600 mr-2" />
                  <span class="font-semibold text-gray-700">ชั้น {{ floor.floor_name }}</span>
                  <span class="text-sm text-gray-500 ml-2">({{ getRoomsForFloor(floor.floor_id).length }} ห้อง)</span>
                </div>
                <div v-if="modalExpandedFloors.includes(floor.floor_id)" class="p-3 bg-white border-t border-gray-200">
                  <div v-if="getRoomsForFloor(floor.floor_id).length === 0" class="text-sm text-gray-400 text-center py-2">ไม่มีห้องในชั้นนี้</div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div v-for="room in getRoomsForFloor(floor.floor_id)" :key="room.room_id" class="flex items-center gap-2 p-2 border border-gray-100 rounded bg-gray-50">
                      <Icon icon="material-symbols:door-sliding" class="text-green-600 w-4 h-4" />
                      <span class="text-sm font-medium text-gray-800">ห้อง {{ room.room_name }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-6"><button @click="showViewModal = false" class="w-full px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition">ปิดหน้าต่าง</button></div>
      </div>
    </div>

    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0" @click.self="showEditModal = false">
      <div class="bg-white rounded-lg w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 md:p-8">
        
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <div class="bg-orange-400 p-3 rounded-full shadow-sm">
            <Icon icon="fluent:edit-24-regular" width="24" height="24" style="color: #ffffff" />
          </div>
          <div class="flex-1">
            <h2 class="text-xl font-bold text-gray-800">ตัวจัดการข้อมูลอาคาร</h2>
            <p class="text-sm text-gray-500">จัดการข้อมูล ชื่ออาคาร / ชั้น และ ห้อง แบบครบวงจร</p>
          </div>
        </div>

        <div class="bg-blue-50 p-4 sm:p-5 rounded-lg border border-blue-200 mb-6">
           <label class="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
             <Icon icon="material-symbols:apartment" class="text-blue-600" /> เปลี่ยนชื่ออาคาร
           </label>
           <div class="flex flex-col sm:flex-row gap-3">
              <input v-model="editForm.building_name" class="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 outline-none" placeholder="ระบุชื่ออาคารใหม่" />
              <button @click="saveBuildingNameOnly" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium shadow-sm transition whitespace-nowrap">
                 อัปเดตชื่ออาคาร
              </button>
           </div>
        </div>

        <div>
           <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-gray-800 flex items-center gap-2">
                 <Icon icon="material-symbols:account-tree" class="text-gray-600" width="20" height="20" /> โครงสร้างชั้นและห้อง
              </h3>
              <button @click="promptAddFloor" class="bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1.5 rounded font-semibold transition flex items-center gap-1.5 shadow-sm text-sm">
                 <Icon icon="fluent:add-12-filled" /> เพิ่มชั้นใหม่
              </button>
           </div>

           <div class="space-y-4">
              <div v-if="editBuildingFloors.length === 0" class="text-center py-8 bg-gray-50 rounded-lg border border-gray-200 text-gray-500">
                 <Icon icon="material-symbols:layers-outline" width="32" height="32" class="mx-auto mb-2 opacity-50" />
                 อาคารนี้ยังไม่มีชั้น <br/>กดปุ่ม "เพิ่มชั้นใหม่" เพื่อเริ่มต้น
              </div>

              <div v-for="floor in editBuildingFloors" :key="floor.floor_id" class="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
                 <div class="bg-gray-100 p-3 sm:px-4 flex flex-wrap justify-between items-center gap-3 border-b border-gray-200">
                    <div class="flex items-center gap-2">
                       <Icon icon="material-symbols:layers" class="text-purple-600 w-5 h-5" />
                       <span class="font-bold text-gray-800 text-base">ชั้น {{ floor.floor_name }}</span>
                       <span class="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full ml-1">{{ editBuildingRooms(floor.floor_id).length }} ห้อง</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                       <button @click="promptAddRoom(floor.floor_id)" class="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1.5 rounded font-medium transition flex items-center gap-1 border border-green-200 shadow-sm">
                          <Icon icon="fluent:add-12-filled" /> เพิ่มห้อง
                       </button>
                       <div class="w-px h-5 bg-gray-300 mx-1"></div>
                       <button @click="promptEditFloor(floor)" class="p-1.5 text-orange-500 hover:bg-orange-100 rounded transition" title="เปลี่ยนเลขชั้น">
                          <Icon icon="fluent:edit-24-regular" width="18" height="18" />
                       </button>
                       <button @click="confirmDelete('floor', floor.floor_id)" class="p-1.5 text-red-500 hover:bg-red-100 rounded transition" title="ลบชั้นนี้">
                          <Icon icon="fluent:delete-24-regular" width="18" height="18" />
                       </button>
                    </div>
                 </div>
                 
                 <div class="p-3 sm:p-4 bg-gray-50">
                    <div v-if="editBuildingRooms(floor.floor_id).length === 0" class="text-sm text-gray-400 text-center py-2 bg-white rounded border border-dashed border-gray-200">
                       ยังไม่มีห้องในชั้นนี้
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                       <div v-for="room in editBuildingRooms(floor.floor_id)" :key="room.room_id" class="flex items-center justify-between p-2.5 border border-gray-200 rounded-md bg-white hover:border-gray-300 transition shadow-sm group">
                          <div class="flex items-center gap-2 min-w-0">
                             <Icon icon="material-symbols:door-sliding" class="text-green-600 w-4 h-4 flex-shrink-0" />
                             <span class="text-sm font-medium text-gray-700 truncate">{{ room.room_name }}</span>
                          </div>
                          <div class="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                             <button @click="promptEditRoom(room)" class="p-1.5 text-orange-500 hover:bg-orange-100 rounded" title="แก้ไขชื่อห้อง">
                                <Icon icon="fluent:edit-24-regular" width="16" height="16" />
                             </button>
                             <button @click="confirmDelete('room', room.room_id)" class="p-1.5 text-red-500 hover:bg-red-100 rounded" title="ลบห้อง">
                                <Icon icon="fluent:delete-24-regular" width="16" height="16" />
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div class="mt-8 pt-4 border-t border-gray-100">
           <button @click="showEditModal = false" class="w-full px-4 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-bold transition shadow-md">
              เสร็จสิ้นการจัดการ / ปิดหน้าต่าง
           </button>
        </div>
      </div>
    </div>

    <div v-if="showAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0" @click.self="showAddModal = false">
      <div class="bg-white rounded-lg p-8 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center gap-3 mb-6">
          <div class="bg-green-100 p-3 rounded-full">
            <Icon icon="fluent:add-12-filled" width="20" height="20" />
          </div>
          <h2 class="text-xl font-bold text-gray-800">เพิ่มสถานที่ (สร้างหลายระดับพร้อมกัน)</h2>
        </div>

        <div class="space-y-4">
          <div class="border-2 border-gray-200 rounded-lg p-4 space-y-3">
            <h3 class="font-semibold text-gray-800">อาคาร</h3>
            <label class="flex items-center gap-2">
              <input type="radio" v-model="addForm.building_mode" value="existing" class="w-4 h-4 text-blue-600" />
              <span class="text-sm font-medium">เลือกจากอาคารที่มีอยู่</span>
            </label>
            <select v-if="addForm.building_mode === 'existing'" v-model="addForm.building_id" @change="handleBulkBuildingChange" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none">
              <option value="">-- เลือกอาคาร --</option>
              <option v-for="building in buildings" :key="building.building_id" :value="building.building_id">{{ building.building_name }}</option>
            </select>
            <label class="flex items-center gap-2 mt-3">
              <input type="radio" v-model="addForm.building_mode" value="new" class="w-4 h-4 text-blue-600" />
              <span class="text-sm font-medium">สร้างอาคารใหม่</span>
            </label>
            <div v-if="addForm.building_mode === 'new'" class="space-y-2">
              <input v-model="addForm.new_building_name" type="text" placeholder="ชื่ออาคารใหม่" :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.newBuildingName ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-400']" @input="() => validateAlphanumeric(addForm.new_building_name, 'newBuildingName')" @blur="() => validateAlphanumeric(addForm.new_building_name, 'newBuildingName')" />
              <p v-if="validationErrors.newBuildingName" class="text-red-500 text-sm mt-1">{{ errorMessages.newBuildingName }}</p>
            </div>
          </div>

          <div class="border-2 border-gray-200 rounded-lg p-4 space-y-3">
            <h3 class="font-semibold text-gray-800">ชั้น</h3>
            <label class="flex items-center gap-2">
              <input type="radio" v-model="addForm.floor_mode" value="existing" :disabled="addForm.building_mode === 'new' || !addForm.building_id" class="w-4 h-4 text-blue-600 disabled:opacity-50" />
              <span class="text-sm font-medium" :class="{'text-gray-400': addForm.building_mode === 'new' || !addForm.building_id}">เลือกจากชั้นที่มีอยู่</span>
            </label>
            <select v-if="addForm.floor_mode === 'existing'" v-model="addForm.floor_id" :disabled="addForm.building_mode === 'new' || !addForm.building_id" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:bg-gray-100">
              <option value="">-- เลือกชั้น --</option>
              <option v-for="floor in bulkFloors" :key="floor.floor_id" :value="floor.floor_id">{{ floor.floor_name }}</option>
            </select>
            <label class="flex items-center gap-2 mt-3">
              <input type="radio" v-model="addForm.floor_mode" value="new" class="w-4 h-4 text-blue-600" />
              <span class="text-sm font-medium">สร้างชั้นใหม่</span>
            </label>
            <div v-if="addForm.floor_mode === 'new'" class="space-y-2">
              <input v-model="addForm.new_floor_name" type="text" placeholder="ชื่อชั้นใหม่ (ตัวเลขเท่านั้น)" :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.newFloorName ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-400']" @input="() => validateAlphanumeric(addForm.new_floor_name, 'newFloorName')" @blur="() => validateAlphanumeric(addForm.new_floor_name, 'newFloorName')" />
              <p v-if="validationErrors.newFloorName" class="text-red-500 text-sm mt-1">{{ errorMessages.newFloorName }}</p>
            </div>
          </div>

          <div class="border-2 border-blue-200 rounded-lg p-4 space-y-3 bg-blue-50">
            <h3 class="font-semibold text-gray-800">ห้อง <span class="text-red-500">*</span></h3>
            <div class="space-y-2">
              <input v-model="addForm.room_name" type="text" placeholder="ชื่อห้อง (ต้องระบุ)" :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.roomName ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-400']" @input="() => validateAlphanumeric(addForm.room_name, 'roomName')" @blur="() => validateAlphanumeric(addForm.room_name, 'roomName')" />
              <p v-if="validationErrors.roomName" class="text-red-500 text-sm mt-1">{{ errorMessages.roomName }}</p>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button type="button" @click="showAddModal = false" class="flex-1 px-4 py-2.5 border border-gray-300 text-white rounded-lg bg-neutral-300 hover:bg-neutral-400 transition-colors font-medium">ยกเลิก</button>
          <button type="button" @click="saveAddLocation" class="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors font-medium">สร้างสถานที่</button>
        </div>
      </div>
    </div>
  </div>

  <UniversalImportModal
    v-if="showImportModal"
    type="locations"
    title="สถานที่"
    templateFileName="Template_Location_Import.xlsx"
    @close="showImportModal = false"
    @refresh="refreshData()"
    @success="handleImportSuccess"
    @error="handleImportError"
  />
</template>

<style scoped>
select:disabled { background-color: #f3f4f6; cursor: not-allowed; }
button:disabled { cursor: not-allowed; }
.relative { position: relative; }
</style>