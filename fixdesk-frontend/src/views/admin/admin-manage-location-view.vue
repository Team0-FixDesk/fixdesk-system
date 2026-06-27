<script setup>
/**
 * =====================================================================
 * @file            admin-manage-location-view.vue
 * @module          มอดูลการจัดการสถานที่ - การจัดการข้อมูลสถานที่
 * @layer           View (Presentation Layer)
 * @version         1.3.1
 * @since           2025-10-21
 * @author          เศรษฐพงศ์ หอมชื่น
 * @contributors
 * - เศรษฐพงศ์ หอมชื่น
 * - ปฏิพัทธ์ จงนันทพันธ์กุล
 * - ธนภัทร จันทร์งาม
 * - นราธิป แสนทวีสุข
 * - พชร ไพศรีสกุล
 *
 * @lastModified    2026-06-27
 * @lastModifiedBy  Gemini
 * ---------------------------------------------------------------------
 * @description
 * - ตารางหลักแสดงเฉพาะ "อาคาร" และสรุปจำนวนชั้น/ห้อง
 * - โครงสร้าง Tree (ชั้น -> ห้อง) อยู่ใน View Modal
 * - แก้ไขบั๊กปุ่ม Edit ให้ทำงานได้ 100% ตามโครงสร้างเดิม
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

const modalFloors = ref([])
const bulkFloors = ref([])

// State สำหรับ Tree View ใน Modal
const modalExpandedFloors = ref([])

function toggleModalFloor(id) {
  const idx = modalExpandedFloors.value.indexOf(id)
  if (idx > -1) {
    modalExpandedFloors.value.splice(idx, 1)
  } else {
    modalExpandedFloors.value.push(id)
  }
}

function getRoomsForFloor(floorId) {
  return rooms.value.filter(r => r.floor_id == floorId).sort((a, b) => {
    const numA = extractNumber(a.room_name)
    const numB = extractNumber(b.room_name)
    if (numA !== null && numB !== null && numA !== numB) return numA - numB
    return a.room_name.localeCompare(b.room_name, 'th')
  })
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
})

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

function validateAlphanumeric(value, fieldName, type = null) {
  const isFloorField =
    fieldName === 'newFloorName' ||
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

// ตารางหลักแสดงเฉพาะข้อมูล "อาคาร"
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

  visibleBuildings.sort((a, b) => {
    const numA = extractNumber(a.building_name)
    const numB = extractNumber(b.building_name)
    if (numA !== null && numB !== null && numA !== numB) return numA - numB
    return a.building_name.localeCompare(b.building_name, 'th')
  })

  return visibleBuildings.map(b => {
    const bFloors = floors.value.filter(f => f.building_id == b.building_id)
    const bRooms = rooms.value.filter(r => bFloors.some(f => f.floor_id == r.floor_id))

    bFloors.sort((a, b) => {
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

const tableRowsList = computed(() => {
  return displayData.value.map((item) => {
    return [item.id, item, item.statsText, '']
  })
})

const filteredFloors = computed(() => {
  if (selectedBuilding.value) {
    return floors.value.filter((f) => f.building_id == selectedBuilding.value)
  } else {
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

function toggleBuildingFilter() {
  showBuildingFilter.value = !showBuildingFilter.value
  if (showBuildingFilter.value) showFloorFilter.value = false
}

function toggleFloorFilter() {
  showFloorFilter.value = !showFloorFilter.value
  if (showFloorFilter.value) showBuildingFilter.value = false
}

function clearFilters() {
  selectedBuilding.value = ''
  selectedFloor.value = ''
  searchQuery.value = ''
}

function closeDropdown(event) {
  if (!event.target.closest('.relative')) {
    showBuildingFilter.value = false
    showFloorFilter.value = false
  }
}

function openViewModal(raw_id) {
  const item = displayData.value.find((b) => b.raw_id == raw_id)
  if (!item) return

  modalExpandedFloors.value = []

  viewData.value = {
    id: item.raw_id,
    type: 'building',
    displayName: item.name,
    building_name: item.name,
    stats: {
      floors: item.floors,
      rooms: item.rooms,
      floorCount: item.floors.length,
      roomCount: item.rooms.length
    }
  }
  showViewModal.value = true
}

function closeViewModal() {
  showViewModal.value = false
  viewData.value = {}
}

function openAddModal() {
  addForm.value = { type: 'building', name: '', building_id: '', floor_id: '', bulk_mode: true, building_mode: 'existing', floor_mode: 'existing', new_building_name: '', new_floor_name: '', room_name: '' }
  validationErrors.value = { name: false, newBuildingName: false, newFloorName: false, roomName: false }
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

// ฟังก์ชันเปิด Modal แก้ไข
async function openEditModal(type, raw_id) {
  editForm.value = { type, building_id: '', building_name: '', original_building_name: '', floor_id: '', floor_name: '', original_floor_name: '', room_id: '', room_name: '', original_room_name: '' }
  validationErrors.value = { name: false, newBuildingName: false, newFloorName: false, roomName: false, building_name: false, floor_name: false, room_name: false }

  if (type === 'room') {
    const item = rooms.value.find(r => r.room_id == raw_id)
    const floor = floors.value.find(f => f.floor_id == item?.floor_id)
    const building = buildings.value.find(b => b.building_id == floor?.building_id)

    editForm.value.room_id = item?.room_id || ''
    editForm.value.room_name = item?.room_name || ''
    editForm.value.original_room_name = item?.room_name || ''
    editForm.value.floor_id = floor?.floor_id || ''
    editForm.value.floor_name = floor?.floor_name || ''
    editForm.value.original_floor_name = floor?.floor_name || ''
    editForm.value.building_id = building?.building_id || ''
    editForm.value.building_name = building?.building_name || ''
    editForm.value.original_building_name = building?.building_name || ''
  } else if (type === 'floor') {
    const item = floors.value.find(f => f.floor_id == raw_id)
    const building = buildings.value.find(b => b.building_id == item?.building_id)

    editForm.value.floor_id = item?.floor_id || ''
    editForm.value.floor_name = item?.floor_name || ''
    editForm.value.original_floor_name = item?.floor_name || ''
    editForm.value.building_id = building?.building_id || ''
    editForm.value.building_name = building?.building_name || ''
    editForm.value.original_building_name = building?.building_name || ''
  } else if (type === 'building') {
    const item = buildings.value.find(b => b.building_id == raw_id)
    editForm.value.building_id = item?.building_id || ''
    editForm.value.building_name = item?.building_name || ''
    editForm.value.original_building_name = item?.building_name || ''
  }

  showEditModal.value = true
}

async function confirmDelete(type, raw_id) {
  let name = ''
  let bName = ''
  let fName = ''

  if (type === 'building') {
    const b = buildings.value.find(x => x.building_id == raw_id)
    name = b?.building_name || ''
    bName = name
  } else if (type === 'floor') {
    const f = floors.value.find(x => x.floor_id == raw_id)
    name = f?.floor_name || ''
    bName = buildings.value.find(b => b.building_id == f?.building_id)?.building_name || ''
    fName = name
  } else if (type === 'room') {
    const r = rooms.value.find(x => x.room_id == raw_id)
    name = r?.room_name || ''
    const f = floors.value.find(f => f.floor_id == r?.floor_id)
    fName = f?.floor_name || ''
    bName = buildings.value.find(b => b.building_id == f?.building_id)?.building_name || ''
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
               <small class="text-gray-600">กรุณาเปลี่ยนสถานที่ในรายการแจ้งซ่อมเหล่านั้นก่อน</small>`,
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#dc2626',
      })
      return
    }
  } catch (err) {
    console.error('Error checking usage:', err)
  }

  const typeText = type === 'building' ? 'อาคาร' : type === 'floor' ? 'ชั้น' : 'ห้อง'
  const locDetail = type === 'room' ? `อาคาร: ${bName} ชั้น: ${fName}` : type === 'floor' ? `อาคาร: ${bName}` : ''

  const result = await Swal.fire({
    title: 'ยืนยันการลบข้อมูล?',
    html: `คุณต้องการลบ${typeText} <strong>"${name}"</strong> หรือไม่?
           ${locDetail ? `<br><small>${locDetail}</small>` : ''}`,
    icon: 'warning',
    showCancelButton: true,
    reverseButtons: false,
    confirmButtonText: 'ยืนยันการลบ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#a3a3a3',
  })

  if (!result.isConfirmed) return

  try {
    const endpoint = type === 'building' ? `/buildings/${raw_id}` : type === 'floor' ? `/floors/${raw_id}` : `/rooms/${raw_id}`
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE', headers: getAuthHeaders() })

    if (handleAuthError(res.status)) return
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'ลบไม่สำเร็จ')

    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2500, title: 'สำเร็จ!', text: `ลบ${typeText}เรียบร้อยแล้ว`, icon: 'success' })
    await refreshData()
  } catch (err) {
    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, title: 'เกิดข้อผิดพลาด', text: err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล', icon: 'error' })
  }
}

async function saveAddLocation() {
  if (addForm.value.bulk_mode) {
    if (addForm.value.building_mode === 'new' && !validateAlphanumeric(addForm.value.new_building_name, 'newBuildingName')) return
    if (addForm.value.floor_mode === 'new' && !validateAlphanumeric(addForm.value.new_floor_name, 'newFloorName')) return
    if (!validateAlphanumeric(addForm.value.room_name, 'roomName')) return
    await bulkCreateLocation()
  } else {
    if (!validateAlphanumeric(addForm.value.name, 'name')) return

    if (addForm.value.type === 'floor' && !addForm.value.building_id) {
      await Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูล', text: 'กรุณาเลือกอาคาร', confirmButtonColor: '#F59E0B' })
      return
    }

    if (addForm.value.type === 'room' && (!addForm.value.building_id || !addForm.value.floor_id)) {
      await Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูล', text: 'กรุณาเลือกอาคารและชั้น', confirmButtonColor: '#F59E0B' })
      return
    }

    await saveSingleLocation()
  }
}

async function saveSingleLocation() {
  try {
    const endpoint = addForm.value.type === 'building' ? '/buildings' : addForm.value.type === 'floor' ? '/floors' : '/rooms'
    const body = addForm.value.type === 'building' ? { bd_name: addForm.value.name } : addForm.value.type === 'floor' ? { fl_name: addForm.value.name, fl_bd_id: addForm.value.building_id } : { room_name: addForm.value.name, room_fl_id: addForm.value.floor_id }

    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) })
    if (handleAuthError(res.status)) return
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'บันทึกไม่สำเร็จ')

    closeAddModal()
    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, icon: 'success', title: 'เพิ่มข้อมูลเรียบร้อยแล้ว' })
    await refreshData()
  } catch (err) {
    await Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', confirmButtonColor: '#EF4444' })
  }
}

async function bulkCreateLocation() {
  try {
    let buildingId = addForm.value.building_id
    let floorId = addForm.value.floor_id

    if (addForm.value.building_mode === 'new') {
      const res = await fetch(`${API_BASE}/buildings`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ bd_name: addForm.value.new_building_name.trim() }) })
      if (handleAuthError(res.status)) return
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'สร้างอาคารไม่สำเร็จ')
      buildingId = data.bd_id
    }

    if (addForm.value.floor_mode === 'new') {
      if (!buildingId) {
        await Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูล', text: 'กรุณาเลือกหรือสร้างอาคารก่อน', confirmButtonColor: '#F59E0B' })
        return
      }
      const res = await fetch(`${API_BASE}/floors`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ fl_name: addForm.value.new_floor_name.trim(), fl_bd_id: buildingId }) })
      if (handleAuthError(res.status)) return
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'สร้างชั้นไม่สำเร็จ')
      floorId = data.fl_id
    }

    if (!floorId) {
      await Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูล', text: 'กรุณาเลือกหรือสร้างชั้นก่อน', confirmButtonColor: '#F59E0B' })
      return
    }

    const res = await fetch(`${API_BASE}/rooms`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ room_name: addForm.value.room_name.trim(), room_fl_id: floorId }) })
    if (handleAuthError(res.status)) return
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'สร้างห้องไม่สำเร็จ')

    closeAddModal()
    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, icon: 'success', title: 'สร้างสถานที่เรียบร้อยแล้ว' })
    await refreshData()
  } catch (err) {
    await Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message || 'เกิดข้อผิดพลาดในการสร้างสถานที่', confirmButtonColor: '#EF4444' })
  }
}

function closeEditModal() {
  showEditModal.value = false
  editForm.value = { type: '', building_id: '', building_name: '', original_building_name: '', floor_id: '', floor_name: '', original_floor_name: '', room_id: '', room_name: '', original_room_name: '' }
}

async function saveEditLocation() {
  let hasError = false
  if (editForm.value.original_building_name && !validateAlphanumeric(editForm.value.building_name, 'building_name')) hasError = true
  if (editForm.value.original_floor_name && !validateAlphanumeric(editForm.value.floor_name, 'floor_name', 'floor')) hasError = true
  if (editForm.value.original_room_name && !validateAlphanumeric(editForm.value.room_name, 'room_name')) hasError = true
  if (hasError) return

  const buildingChanged = editForm.value.original_building_name && editForm.value.building_name !== editForm.value.original_building_name
  const floorChanged = editForm.value.original_floor_name && editForm.value.floor_name !== editForm.value.original_floor_name
  const roomChanged = editForm.value.original_room_name && editForm.value.room_name !== editForm.value.original_room_name

  if (!buildingChanged && !floorChanged && !roomChanged) {
    await Swal.fire({ icon: 'info', title: 'ไม่มีการเปลี่ยนแปลง', text: 'ข้อมูลยังคงเหมือนเดิม', confirmButtonColor: '#3B82F6' })
    return
  }

  let changesText = []
  if (buildingChanged) changesText.push(`อาคาร: "${editForm.value.original_building_name}" → "${editForm.value.building_name}"`)
  if (floorChanged) changesText.push(`ชั้น: "${editForm.value.original_floor_name}" → "${editForm.value.floor_name}"`)
  if (roomChanged) changesText.push(`ห้อง: "${editForm.value.original_room_name}" → "${editForm.value.room_name}"`)

  const result = await Swal.fire({
    title: 'ยืนยันการแก้ไขข้อมูล?',
    html: `<div class="text-left"><p class="mb-2">คุณต้องการแก้ไขข้อมูลดังนี้:</p><ul class="list-disc list-inside space-y-1 text-sm">${changesText.map((t) => `<li>${t}</li>`).join('')}</ul></div>`,
    icon: 'question',
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#fb923c',
    cancelButtonColor: '#d4d4d4',
  })

  if (!result.isConfirmed) return

  try {
    const updatePromises = []
    const successMessages = []

    if (buildingChanged && editForm.value.building_id) {
      updatePromises.push(
        fetch(`${API_BASE}/buildings/${editForm.value.building_id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ bd_name: editForm.value.building_name }) }).then(async (res) => {
          if (handleAuthError(res.status)) throw new Error('Authentication error')
          const data = await res.json()
          if (!res.ok) throw new Error(data.message || 'อัปเดตอาคารไม่สำเร็จ')
          successMessages.push('อาคาร')
        })
      )
    }

    if (floorChanged && editForm.value.floor_id) {
      updatePromises.push(
        fetch(`${API_BASE}/floors/${editForm.value.floor_id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ fl_name: editForm.value.floor_name }) }).then(async (res) => {
          if (handleAuthError(res.status)) throw new Error('Authentication error')
          const data = await res.json()
          if (!res.ok) throw new Error(data.message || 'อัปเดตชั้นไม่สำเร็จ')
          successMessages.push('ชั้น')
        })
      )
    }

    if (roomChanged && editForm.value.room_id) {
      updatePromises.push(
        fetch(`${API_BASE}/rooms/${editForm.value.room_id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ room_name: editForm.value.room_name, room_fl_id: editForm.value.floor_id }) }).then(async (res) => {
          if (handleAuthError(res.status)) throw new Error('Authentication error')
          const data = await res.json()
          if (!res.ok) throw new Error(data.message || 'อัปเดตห้องไม่สำเร็จ')
          successMessages.push('ห้อง')
        })
      )
    }

    await Promise.all(updatePromises)
    closeEditModal()
    Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, icon: 'success', title: 'สำเร็จ!', text: `แก้ไข${successMessages.join(', ')}เรียบร้อยแล้ว` })
    await refreshData()
  } catch (err) {
    await Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', confirmButtonColor: '#EF4444' })
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
            seenIds.add(floor.floor_id)
            uniqueFloors.push({ floor_id: floor.floor_id, floor_name: floor.floor_name, building_id: addForm.value.building_id })
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

const toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true })

function handleImportSuccess() {
  toast.fire({ icon: 'success', title: 'นำเข้าสถานที่เรียบร้อยแล้ว', background: '#FFFFFF', color: '#1e3a8a' })
  showImportModal.value = false
}

function handleImportError(message) {
  toast.fire({ icon: 'error', title: message || 'นำเข้าสถานที่ไม่สำเร็จ', background: '#FFFFFF', color: '#dc2626' })
}

function handleResize() {
  screenSize.value = window.innerWidth < 768 ? 'sm' : 'lg'
}

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
          <input v-model="searchQuery" type="text" placeholder="ค้นหารายการสถานที่ (อาคาร/ชั้น/ห้อง)"
            class="w-full sm:w-[280px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 text-gray-500" />

          <div class="relative">
            <button @click.stop="toggleBuildingFilter"
              class="h-10 flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-500">
              {{selectedBuilding ? buildings.find((b) => b.building_id == selectedBuilding)?.building_name || 'อาคาร' :
              'อาคาร' }}
              <Icon icon="meteor-icons:chevron-down" style="color: gray"
                class="w-4 h-4 opacity-70 transition-transform duration-200"
                :class="{ 'rotate-180': showBuildingFilter }" />
            </button>
            <div v-if="showBuildingFilter"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-500 z-10 max-h-60 overflow-y-auto">
              <label class="flex items-center py-1 hover:bg-gray-50 rounded px-2 cursor-pointer">
                <input type="radio" :value="''" v-model="selectedBuilding"
                  class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">ทุกอาคาร</span>
              </label>
              <label v-for="building in buildings" :key="building.building_id"
                class="flex items-center py-1 hover:bg-gray-50 rounded px-2 cursor-pointer">
                <input type="radio" :value="building.building_id" v-model="selectedBuilding"
                  class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">{{ building.building_name }}</span>
              </label>
            </div>
          </div>

          <div class="relative">
            <button @click.stop="toggleFloorFilter"
              class="h-10 flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-500">
              {{selectedFloor ? floors.find((f) => f.floor_id == selectedFloor)?.floor_name || 'ชั้น' : 'ชั้น'}}
              <Icon icon="meteor-icons:chevron-down" style="color: gray"
                class="w-4 h-4 opacity-70 transition-transform duration-200"
                :class="{ 'rotate-180': showFloorFilter }" />
            </button>
            <div v-if="showFloorFilter"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10 max-h-60 overflow-y-auto">
              <label class="flex items-center py-1 hover:bg-gray-50 rounded px-2 cursor-pointer">
                <input type="radio" :value="''" v-model="selectedFloor" class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">ทุกชั้น</span>
              </label>
              <label v-for="floor in filteredFloors" :key="floor.floor_id"
                class="flex items-center py-1 hover:bg-gray-50 rounded px-2 cursor-pointer">
                <input type="radio" :value="floor.floor_id" v-model="selectedFloor"
                  class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">{{ floor.floor_name }}</span>
              </label>
            </div>
          </div>

          <button v-if="selectedBuilding || selectedFloor || searchQuery" @click="clearFilters"
            class="text-blue-600 hover:text-blue-700 text-sm font-medium">ล้างตัวกรอง</button>
        </div>

        <div class="flex items-center gap-3">
          <ImportButtonComponent @click="showImportModal = true">
            <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="handleFileChange" />
            <Icon icon="fluent:add-12-filled" width="20" height="20" />
          </ImportButtonComponent>
          <BaseButtonComponent @click="openAddModal"
            class="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium shadow-sm transition">
            <Icon icon="fluent:add-12-filled" width="20" height="20" /> เพิ่มสถานที่
          </BaseButtonComponent>
        </div>
      </div>

      <div class="-mx-2 sm:mx-0 overflow-x-auto">
        <TableComponent :columns="columns" :rows="tableRowsList" :perPage="10" :idColumnIndex="1" :hiddenColumns="[0]"
          :column-align="['left', 'left', 'left', 'center']" :action-column-index="3">
          <template #cell-1="{ row }">
            <div class="flex items-center gap-2">
              <Icon icon="material-symbols:apartment" class="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span class="font-bold text-gray-800">{{ row[1].displayName }}</span>
            </div>
          </template>

          <template #cell-3="{ row }">
            <TableActionsComponent role="admin" :row-id="row[0]" :open-menu-id="openMenuId" :row="row" :status="null"
              @toggle-menu="openMenuId = $event" @detail="openViewModal(row[1].raw_id)"
              @edit="openEditModal('building', row[1].raw_id)" @delete="confirmDelete('building', row[1].raw_id)" />
          </template>
        </TableComponent>
      </div>
    </div>

    <div v-if="showViewModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0"
      @click.self="closeViewModal">
      <div class="bg-white rounded-lg p-4 sm:p-6 md:p-8 w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="bg-blue-400 p-3 rounded-full">
              <Icon icon="material-symbols:info-outline-rounded" width="24" height="24" style="color: #ffffff" />
            </div>
            <h2 class="text-xl font-bold text-gray-800">รายละเอียดอาคาร</h2>
          </div>
        </div>

        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded flex justify-between items-center">
          <div>
            <h3 class="text-lg font-bold text-gray-800">{{ viewData.displayName }}</h3>
            <p class="text-sm text-gray-600 mt-1">คลิกที่ลูกศร ˅ ด้านล่างเพื่อดูห้องในแต่ละชั้น</p>
          </div>
          <button @click="openEditModal('building', viewData.id); closeViewModal()"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded text-sm font-medium transition">
            <Icon icon="fluent:edit-24-regular" width="16" height="16" /> แก้ไขชื่ออาคาร
          </button>
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
              <Icon icon="material-symbols:account-tree" width="20" height="20" class="text-gray-600" />
              โครงสร้างภายในอาคาร
            </h4>

            <div v-if="viewData.stats?.floors.length === 0"
              class="text-center py-4 bg-gray-50 rounded-lg text-gray-500 text-sm">
              ยังไม่มีข้อมูลชั้นและห้องในอาคารนี้
            </div>

            <div v-else class="space-y-3">
              <div v-for="floor in viewData.stats.floors" :key="floor.floor_id"
                class="border border-gray-200 rounded-lg overflow-hidden">
                <div
                  class="bg-gray-50 p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  @click="toggleModalFloor(floor.floor_id)">
                  <div class="flex items-center gap-3">
                    <Icon icon="meteor-icons:chevron-down"
                      class="w-4 h-4 text-gray-500 transition-transform duration-200"
                      :class="{ '-rotate-90': !modalExpandedFloors.includes(floor.floor_id) }" />
                    <Icon icon="material-symbols:layers" width="18" height="18" class="text-purple-600" />
                    <span class="font-semibold text-gray-700">ชั้น {{ floor.floor_name }}</span>
                    <span class="text-sm text-gray-500">({{ getRoomsForFloor(floor.floor_id).length }} ห้อง)</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button @click.stop="openEditModal('floor', floor.floor_id); closeViewModal()"
                      class="p-1.5 text-orange-500 hover:bg-orange-100 rounded-md transition" title="แก้ไขชื่อชั้น">
                      <Icon icon="fluent:edit-24-regular" width="18" height="18" />
                    </button>
                    <button @click.stop="confirmDelete('floor', floor.floor_id); closeViewModal()"
                      class="p-1.5 text-red-500 hover:bg-red-100 rounded-md transition" title="ลบชั้นนี้">
                      <Icon icon="fluent:delete-24-regular" width="18" height="18" />
                    </button>
                  </div>
                </div>

                <div v-if="modalExpandedFloors.includes(floor.floor_id)" class="p-3 bg-white border-t border-gray-200">
                  <div v-if="getRoomsForFloor(floor.floor_id).length === 0"
                    class="text-sm text-gray-400 text-center py-3">
                    - ยังไม่มีห้องในชั้นนี้ -
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div v-for="room in getRoomsForFloor(floor.floor_id)" :key="room.room_id"
                      class="flex items-center justify-between p-2 border border-gray-100 rounded bg-gray-50 hover:border-gray-200 transition group">
                      <div class="flex items-center gap-2">
                        <Icon icon="material-symbols:door-sliding" class="text-green-600 w-4 h-4" />
                        <span class="text-sm font-medium text-gray-800">ห้อง {{ room.room_name }}</span>
                      </div>
                      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button @click="openEditModal('room', room.room_id); closeViewModal()"
                          class="p-1 text-orange-500 hover:bg-orange-100 rounded" title="แก้ไขห้อง">
                          <Icon icon="fluent:edit-24-regular" width="16" height="16" />
                        </button>
                        <button @click="confirmDelete('room', room.room_id); closeViewModal()"
                          class="p-1 text-red-500 hover:bg-red-100 rounded" title="ลบห้อง">
                          <Icon icon="fluent:delete-24-regular" width="16" height="16" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button type="button" @click="closeViewModal"
            class="flex-1 px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition">ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>

    <div v-if="showAddModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0"
      @click.self="closeAddModal">
      <div class="bg-white rounded-lg p-8 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center gap-3 mb-6">
          <div class="bg-green-100 p-3 rounded-full">
            <Icon icon="fluent:add-12-filled" width="20" height="20" />
          </div>
          <h2 class="text-xl font-bold text-gray-800">เพิ่มสถานที่</h2>
        </div>

        <p class="text-gray-600 text-sm mb-6">เลือกประเภทที่ต้องการเพิ่ม</p>

        <div class="space-y-4 mb-6">
          <label class="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400">
            <div class="ml-3">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-gray-800">สร้างหลายระดับพร้อมกัน</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">สร้างอาคาร + ชั้น + ห้อง ในครั้งเดียว</p>
            </div>
          </label>
        </div>

        <div class="space-y-4">
          <div class="border-2 border-gray-200 rounded-lg p-4 space-y-3">
            <h3 class="font-semibold text-gray-800">อาคาร</h3>
            <label class="flex items-center gap-2">
              <input type="radio" v-model="addForm.building_mode" value="existing" class="w-4 h-4 text-blue-600" />
              <span class="text-sm font-medium">เลือกจากอาคารที่มีอยู่</span>
            </label>
            <select v-if="addForm.building_mode === 'existing'" v-model="addForm.building_id"
              @change="handleBulkBuildingChange"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none">
              <option value="">-- เลือกอาคาร --</option>
              <option v-for="building in buildings" :key="building.building_id" :value="building.building_id">{{
                building.building_name }}</option>
            </select>
            <label class="flex items-center gap-2 mt-3">
              <input type="radio" v-model="addForm.building_mode" value="new" class="w-4 h-4 text-blue-600" />
              <span class="text-sm font-medium">สร้างอาคารใหม่</span>
            </label>
            <div v-if="addForm.building_mode === 'new'" class="space-y-2">
              <input v-model="addForm.new_building_name" type="text" placeholder="ชื่ออาคารใหม่"
                :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.newBuildingName ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-400']"
                @input="() => validateAlphanumeric(addForm.new_building_name, 'newBuildingName')"
                @blur="() => validateAlphanumeric(addForm.new_building_name, 'newBuildingName')" />
              <p v-if="validationErrors.newBuildingName" class="text-red-500 text-sm mt-1">{{
                errorMessages.newBuildingName
                }}</p>
            </div>
          </div>

          <div class="border-2 border-gray-200 rounded-lg p-4 space-y-3">
            <h3 class="font-semibold text-gray-800">ชั้น</h3>
            <label class="flex items-center gap-2">
              <input type="radio" v-model="addForm.floor_mode" value="existing"
                :disabled="addForm.building_mode === 'new' || !addForm.building_id"
                class="w-4 h-4 text-blue-600 disabled:opacity-50" />
              <span class="text-sm font-medium"
                :class="{ 'text-gray-400': addForm.building_mode === 'new' || !addForm.building_id }">เลือกจากชั้นที่มีอยู่</span>
            </label>
            <select v-if="addForm.floor_mode === 'existing'" v-model="addForm.floor_id"
              :disabled="addForm.building_mode === 'new' || !addForm.building_id"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none disabled:bg-gray-100">
              <option value="">-- เลือกชั้น --</option>
              <option v-for="floor in bulkFloors" :key="floor.floor_id" :value="floor.floor_id">{{ floor.floor_name }}
              </option>
            </select>
            <label class="flex items-center gap-2 mt-3">
              <input type="radio" v-model="addForm.floor_mode" value="new" class="w-4 h-4 text-blue-600" />
              <span class="text-sm font-medium">สร้างชั้นใหม่</span>
            </label>
            <div v-if="addForm.floor_mode === 'new'" class="space-y-2">
              <input v-model="addForm.new_floor_name" type="text" placeholder="ชื่อชั้นใหม่"
                :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.newFloorName ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-400']"
                @input="() => validateAlphanumeric(addForm.new_floor_name, 'newFloorName')"
                @blur="() => validateAlphanumeric(addForm.new_floor_name, 'newFloorName')" />
              <p v-if="validationErrors.newFloorName" class="text-red-500 text-sm mt-1">{{ errorMessages.newFloorName }}
              </p>
            </div>
          </div>

          <div class="border-2 border-blue-200 rounded-lg p-4 space-y-3 bg-blue-50">
            <h3 class="font-semibold text-gray-800">ห้อง <span class="text-red-500">*</span></h3>
            <div class="space-y-2">
              <input v-model="addForm.room_name" type="text" placeholder="ชื่อห้อง (ต้องระบุ)"
                :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.roomName ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-400']"
                @input="() => validateAlphanumeric(addForm.room_name, 'roomName')"
                @blur="() => validateAlphanumeric(addForm.room_name, 'roomName')" />
              <p v-if="validationErrors.roomName" class="text-red-500 text-sm mt-1">{{ errorMessages.roomName }}</p>
            </div>
            <p class="text-xs text-gray-600">ห้องจะถูกสร้างในชั้นที่เลือกหรือสร้างขึ้นมาใหม่</p>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button type="button" @click="closeAddModal"
            class="flex-1 px-4 py-2.5 border border-gray-300 text-white rounded-lg bg-neutral-300 hover:bg-neutral-400 transition-colors font-medium">ยกเลิก</button>
          <button type="button" @click="saveAddLocation"
            class="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors font-medium">เพิ่มสถานที่</button>
        </div>
      </div>
    </div>

    <div v-if="showEditModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0"
      @click.self="closeEditModal">
      <div class="bg-white rounded-lg p-8 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
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
          <div v-if="editForm.original_building_name">
            <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Icon icon="material-symbols:apartment" width="18" height="18" class="text-blue-600" /> ชื่ออาคาร <span
                class="text-red-500">*</span>
            </label>
            <input v-model="editForm.building_name" type="text" placeholder="ระบุชื่ออาคาร"
              :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.building_name ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-400']"
              @input="() => validateAlphanumeric(editForm.building_name, 'building_name')"
              @blur="() => validateAlphanumeric(editForm.building_name, 'building_name')" />
            <p v-if="validationErrors.building_name" class="text-red-500 text-sm mt-1">{{ errorMessages.building_name }}
            </p>
          </div>

          <div v-if="editForm.original_floor_name">
            <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Icon icon="material-symbols:layers" width="18" height="18" class="text-purple-600" /> ชื่อชั้น
              (ตัวเลขเท่านั้น) <span class="text-red-500">*</span>
            </label>
            <input v-model="editForm.floor_name" type="text" placeholder="ระบุชื่อชั้น (เช่น 1, 2, 3)"
              :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.floor_name ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-purple-400']"
              @input="() => validateAlphanumeric(editForm.floor_name, 'floor_name', 'floor')"
              @blur="() => validateAlphanumeric(editForm.floor_name, 'floor_name', 'floor')" />
            <p v-if="validationErrors.floor_name" class="text-red-500 text-sm mt-1">{{ errorMessages.floor_name }}</p>
          </div>

          <div v-if="editForm.original_room_name">
            <label class="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Icon icon="material-symbols:meeting-room" width="18" height="18" class="text-green-600" /> ชื่อห้อง <span
                class="text-red-500">*</span>
            </label>
            <input v-model="editForm.room_name" type="text" placeholder="ระบุชื่อห้อง"
              :class="['w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors', validationErrors.room_name ? 'border-red-500 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-green-400']"
              @input="() => validateAlphanumeric(editForm.room_name, 'room_name')"
              @blur="() => validateAlphanumeric(editForm.room_name, 'room_name')" />
            <p v-if="validationErrors.room_name" class="text-red-500 text-sm mt-1">{{ errorMessages.room_name }}</p>
          </div>

          <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p class="text-sm text-gray-700 flex items-start gap-2">
              <Icon icon="material-symbols:info-outline" width="18" height="18"
                class="text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <span v-if="editForm.type === 'building'">สามารถแก้ไขชื่ออาคารได้
                  ชั้นและห้องทั้งหมดภายในจะอัปเดตชื่ออาคารอัตโนมัติ</span>
                <span v-else-if="editForm.type === 'floor'">สามารถแก้ไขชื่ออาคารและชั้นได้
                  ห้องทั้งหมดภายในจะอัปเดตชื่ออัตโนมัติ</span>
                <span v-else>สามารถแก้ไขชื่อได้ทั้ง 3 ระดับในครั้งเดียว ระบบจะบันทึกเฉพาะส่วนที่มีการเปลี่ยนแปลง</span>
              </span>
            </p>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button type="button" @click="closeEditModal"
            class="flex-1 px-4 py-2.5 border border-gray-300 text-white rounded-lg bg-neutral-300 hover:bg-neutral-400 transition-colors font-medium">ยกเลิก</button>
          <button type="button" @click="saveEditLocation"
            class="flex-1 px-4 py-2.5 bg-orange-400 hover:bg-orange-500 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2">
            <Icon icon="material-symbols:save" width="18" height="18" /> บันทึกการแก้ไข
          </button>
        </div>
      </div>
    </div>
  </div>

  <UniversalImportModal v-if="showImportModal" type="locations" title="สถานที่"
    templateFileName="Template_Location_Import.xlsx" @close="showImportModal = false" @refresh="refreshData()"
    @success="handleImportSuccess" @error="handleImportError" />
</template>

<style scoped>
select:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

button:disabled {
  cursor: not-allowed;
}

.relative {
  position: relative;
}
</style>