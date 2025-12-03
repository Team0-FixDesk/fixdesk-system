<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import TableComponent from '@/components/table-component.vue'

defineOptions({ name: 'AdminManageLocationView' })

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

const buildings = ref([])
const floors = ref([])
const rooms = ref([])
const searchQuery = ref('')
const selectedBuilding = ref('')
const selectedFloor = ref('')
const perPage = 10
const sortOrder = ref('ก-ฮ') // 'ก-ฮ', 'ฮ-ก'

// Modal state
const showModal = ref(false)
const modalMode = ref('add') // 'add' or 'edit'
const modalStep = ref(1) // 1: เลือกประเภท, 2: กรอกข้อมูล
const modalType = ref('building') // 'building', 'floor', 'room'
const bulkCreateMode = ref(false) // true = สร้างหลายระดับพร้อมกัน
const modalData = ref({
  id: null,
  name: '',
  building_id: '',
  floor_id: '',
})
// Bulk create state
const buildingMode = ref('existing') // 'existing' or 'new'
const floorMode = ref('existing') // 'existing' or 'new'
const newBuildingName = ref('')
const newFloorName = ref('')
const roomName = ref('')

// ✅ Table columns
const columns = ['อาคาร', 'ID', 'ชั้น', 'ห้อง', 'ตัวดำเนินการ']

// FETCH DATA
async function fetchBuildings() {
  try {
    const res = await fetch(`${API_BASE}/buildings`)
    const data = await res.json()
    buildings.value = data
  } catch (err) {
    console.error('Error fetching buildings:', err)
  }
}

async function fetchFloors(buildingId) {
  try {
    console.log('fetchFloors called with buildingId:', buildingId)
    const res = await fetch(`${API_BASE}/floors/${buildingId}`)
    const data = await res.json()
    console.log('fetchFloors response:', data)
    console.table(data) // แสดงเป็นตาราง
    if (data.length > 0) {
      console.log('First floor object keys:', Object.keys(data[0]))
      console.log('First floor object:', JSON.stringify(data[0], null, 2))
    }
    floors.value = data
  } catch (err) {
    console.error('Error fetching floors:', err)
  }
}

async function fetchRooms(floorId) {
  try {
    console.log('fetchRooms called with floorId:', floorId)
    const res = await fetch(`${API_BASE}/rooms/${floorId}`)
    const data = await res.json()
    console.log('fetchRooms response:', data)
    console.table(data) // แสดงเป็นตาราง
    if (data.length > 0) {
      console.log('First room object keys:', Object.keys(data[0]))
      console.log('First room object:', JSON.stringify(data[0], null, 2))
    }
    rooms.value = data
  } catch (err) {
    console.error('Error fetching rooms:', err)
  }
}

// COMPUTED DATA
const displayData = computed(() => {
  let data = []

  // ขั้นที่ 1: ถ้าไม่เลือกอาคาร แสดงอาคารทั้งหมด
  if (!selectedBuilding.value) {
    data = buildings.value.map((b) => ({
      name: b.building_name,
      building: b.building_name,
      floor: '-',
      room: '-',
      id: b.building_id,
      type: 'building',
    }))
  }
  // ขั้นที่ 2: ถ้าเลือกอาคารแล้ว แต่ยังไม่เลือกชั้น แสดงชั้นทั้งหมดของอาคารนั้น
  else if (selectedBuilding.value && !selectedFloor.value) {
    const buildingName =
      buildings.value.find((b) => b.building_id == selectedBuilding.value)?.building_name || '-'
    data = floors.value.map((f) => ({
      name: f.floor_name,
      building: buildingName,
      floor: f.floor_name,
      room: '-',
      id: f.floor_id,
      type: 'floor',
    }))
  }
  // ขั้นที่ 3: ถ้าเลือกอาคารและชั้นแล้ว แสดงห้องทั้งหมดของชั้นนั้น
  else if (selectedBuilding.value && selectedFloor.value) {
    const buildingName =
      buildings.value.find((b) => b.building_id == selectedBuilding.value)?.building_name || '-'
    const floorName = floors.value.find((f) => f.floor_id == selectedFloor.value)?.floor_name || '-'
    data = rooms.value.map((r) => ({
      name: r.room_name,
      building: buildingName,
      floor: floorName,
      room: r.room_name,
      id: r.room_id,
      type: 'room',
    }))
  }
  // Filter by search query
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
  // Sort
  if (sortOrder.value === 'ก-ฮ') {
    data.sort((a, b) => a.name.localeCompare(b.name, 'th'))
  } else {
    data.sort((a, b) => b.name.localeCompare(a.name, 'th'))
  }

  return data
})

// ✅ Detail view computed properties
const modalDetailData = computed(() => {
  if (!modalData.value.id || modalMode.value !== 'view') return null

  const currentItem = displayData.value.find(item => item.id === modalData.value.id)
  if (!currentItem) return null

  // หาชั้นที่เกี่ยวข้อง
  let relevantFloors = []

  if (currentItem.type === 'building') {
    // สำหรับอาคาร: API /floors/{buildingId} ส่งกลับชั้นของอาคารนั้นอยู่แล้ว
    relevantFloors = floors.value
    console.log('Building floors (no filter needed):', relevantFloors)
  }
  else if (currentItem.type === 'floor') {
    // สำหรับชั้น: API /rooms/{floorId} ส่งกลับห้องในชั้นนั้นอยู่แล้ว
    // ไม่ต้อง filter floors เพราะแสดงแค่รายห้องในชั้นนี้
    relevantFloors = [{
      floor_id: currentItem.id,
      floor_name: currentItem.name,
      // rooms จะถูกใช้โดยตรงจาก rooms.value ที่โหลดมา
    }]
    console.log('Floor detail (single floor):', relevantFloors)
  }
  else if (currentItem.type === 'room') {
    // สำหรับห้อง: แสดงข้อมูลห้องเดียว ไม่ต้องแสดง floors อื่น
    relevantFloors = []
    console.log('Room detail (no floors needed)')
  }

  const floorDetails = relevantFloors.map(floor => {
    const floorId = floor.floor_id || floor.fl_id || floor.id
    // หาห้องในแต่ละชั้น
    let floorRooms = []

    if (currentItem.type === 'building') {
      // สำหรับอาคาร: filter จาก rooms ที่ collect มาจากหลายชั้น
      floorRooms = rooms.value.filter(room => {
        const roomFloorName = room.floor_name
        const currentFloorName = floor.floor_name || floor.fl_name
        const isMatch = roomFloorName === currentFloorName
        return isMatch
      })
    }
    else if (currentItem.type === 'floor') {
      // สำหรับชั้น: ใช้ rooms.value ทั้งหมดเพราะ API ส่งกลับห้องในชั้นนั้นอยู่แล้ว
      floorRooms = rooms.value
    }

    console.log('Room processing:', {
      itemType: currentItem.type,
      floorName: floor.floor_name || floor.fl_name,
      roomsCount: floorRooms.length,
      rooms: floorRooms
    })

    console.log('Floor detail:', {
      floor,
      floorId,
      floorName: floor.floor_name || floor.fl_name,
      roomsFound: floorRooms.length,
      rooms: floorRooms
    })

    return {
      floorId: floorId,
      floorName: floor.floor_name || floor.fl_name,
      roomCount: floorRooms.length,
      rooms: floorRooms.map(room => ({
        id: room.room_id || room.rm_id || room.id,
        name: room.room_name || room.rm_name || room.name
      }))
    }
  })

  // คำนวณสถิติรวม
  const totalFloors = floorDetails.length
  const totalRooms = floorDetails.reduce((sum, floor) => sum + floor.roomCount, 0)

  console.log('modalDetailData computed:', {
    currentItem,
    relevantFloors,
    floorDetails,
    totalFloors,
    totalRooms,
    rawFloors: floors.value,
    rawRooms: rooms.value
  })

  return {
    type: currentItem.type,
    name: currentItem.name,
    buildingName: currentItem.building || currentItem.name,
    floorName: currentItem.floor,
    totalFloors,
    totalRooms,
    floorDetails,
    // ข้อมูลเฉพาะ
    ...(currentItem.type === 'floor' && {
      buildingName: currentItem.building,
      floorRooms: floorDetails[0]?.rooms || []
    }),
    ...(currentItem.type === 'room' && {
      buildingName: currentItem.building,
      floorName: currentItem.floor
    })
  }
})

// ✅ Convert data to table rows format
const tableRows = computed(() => {
  return displayData.value.map((item) => [
    item.building,
    item.id, // TableComponent ใช้ row[1] เป็น ID (ซ่อนใน column 1)
    item.floor,
    item.room,
    'actions' // This will be handled by TableComponent
  ])
})



// ACIONS
async function handleBuildingChange() {
  if (selectedBuilding.value) {
    await fetchFloors(selectedBuilding.value)
  } else {
    floors.value = []
  }
  selectedFloor.value = ''
  rooms.value = []
}

async function handleFloorChange() {
  if (selectedFloor.value) {
    await fetchRooms(selectedFloor.value)
  } else {
    rooms.value = []
  }
}

function handleClearFilters() {
  selectedBuilding.value = ''
  selectedFloor.value = ''
  floors.value = []
  rooms.value = []
  searchQuery.value = ''
}

function handleEdit(id) {
  // TableComponent ส่ง ID มา (row[1])
  const item = displayData.value.find(item => item.id === id)
  if (!item) return

  console.log('Edit:', item)
  modalMode.value = 'edit'
  modalStep.value = 2 // ข้าม step 1 เพราะรู้ type แล้ว
  modalType.value = item.type
  modalData.value = {
    id: item.id,
    name: item.name,
    building_id:
      item.type === 'floor'
        ? selectedBuilding.value
        : item.type === 'room'
          ? selectedBuilding.value
          : '',
    floor_id: item.type === 'room' ? selectedFloor.value : '',
  }

  // โหลดข้อมูล floors ถ้าเป็น room
  if (item.type === 'room' && selectedBuilding.value) {
    fetchFloors(selectedBuilding.value)
  }

  showModal.value = true
}

async function handleDetail(id) {
  // TableComponent ส่ง ID มา (row[1])
  const item = displayData.value.find(item => item.id === id)
  if (!item) return

  // แสดง modal ในโหมดดูรายละเอียด (ไม่สามารถแก้ไขได้)
  modalMode.value = 'view'
  modalStep.value = 2
  modalType.value = item.type
  modalData.value = {
    id: item.id,
    name: item.name,
    building_id:
      item.type === 'floor'
        ? selectedBuilding.value
        : item.type === 'room'
          ? selectedBuilding.value
          : '',
    floor_id: item.type === 'room' ? selectedFloor.value : '',
  }

  // โหลดข้อมูลที่จำเป็นสำหรับแสดงรายละเอียด
  try {
    if (item.type === 'building') {
      // โหลดชั้นทั้งหมดในอาคาร
      console.log('Fetching floors for building:', item.id)
      await fetchFloors(item.id)
      console.log('Floors loaded:', floors.value)

      // รอ floors โหลดเสร็จ แล้วโหลดห้องในแต่ละชั้น
      const allRooms = []
      const floorPromises = floors.value.map(async (floor) => {
        const floorId = floor.floor_id || floor.fl_id
        if (floorId) {
          try {
            const res = await fetch(`${API_BASE}/rooms/${floorId}`)
            const roomData = await res.json()
            return roomData.map(room => ({
              ...room,
              floor_id: floorId,
              floor_name: floor.floor_name || floor.fl_name
            }))
          } catch (err) {
            console.error(`Error fetching rooms for floor ${floorId}:`, err)
            return []
          }
        }
        return []
      })

      const roomArrays = await Promise.all(floorPromises)
      roomArrays.forEach(roomArray => {
        allRooms.push(...roomArray)
      })

      rooms.value = allRooms
      console.log('Building detail loaded:', {
        buildingId: item.id,
        floorsCount: floors.value.length,
        totalRooms: allRooms.length,
        floors: floors.value,
        rooms: allRooms
      })
    }
    else if (item.type === 'floor') {
      // โหลดห้องทั้งหมดในชั้น
      await fetchRooms(item.id)
    }
    else if (item.type === 'room') {
      // สำหรับห้อง ต้องโหลดข้อมูลอาคารและชั้นที่เกี่ยวข้อง
      // หา building_id จาก item.building
      const building = buildings.value.find(b =>
        (b.building_name || b.bd_name) === item.building
      )
      if (building) {
        const buildingId = building.building_id || building.bd_id
        await fetchFloors(buildingId)

        // โหลดห้องทั้งหมดในอาคารเพื่อแสดงรายละเอียด
        const allRooms = []
        for (const floor of floors.value) {
          const floorId = floor.floor_id || floor.fl_id
          if (floorId) {
            try {
              const res = await fetch(`${API_BASE}/rooms/${floorId}`)
              const roomData = await res.json()
              allRooms.push(...roomData)
            } catch (err) {
              console.error(`Error fetching rooms for floor ${floorId}:`, err)
            }
          }
        }
        rooms.value = allRooms
      }
    }
  } catch (error) {
    console.error('Error loading detail data:', error)
  }

  showModal.value = true
}

function handleDelete(id) {
  // TableComponent ส่ง ID มา (row[1])
  const item = displayData.value.find(item => item.id === id)
  if (!item) return

  console.log('Delete:', item)
  confirmDelete(item)
}

async function confirmDelete(item) {
  const result = await Swal.fire({
    title: 'ยืนยันการลบ',
    html: `คุณต้องการลบ <strong>"${item.name}"</strong> หรือไม่?`,
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
    const endpoint =
      item.type === 'building'
        ? `/buildings/${item.id}`
        : item.type === 'floor'
          ? `/floors/${item.id}`
          : `/rooms/${item.id}`

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'ลบไม่สำเร็จ')
    }

    await Swal.fire({
      icon: 'success',
      title: 'สำเร็จ!',
      text: 'ลบข้อมูลเรียบร้อยแล้ว',
      confirmButtonColor: '#1E48D1',
      timer: 1500,
      showConfirmButton: false,
    })

    await refreshData()
  } catch (err) {
    await Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล',
      confirmButtonColor: '#EF4444',
    })
  }
}

function handleAdd() {
  console.log('Add new location')

  modalMode.value = 'add'
  modalStep.value = 1 // เริ่มจาก step 1: เลือกประเภท
  modalType.value = 'building' // default
  bulkCreateMode.value = false
  modalData.value = {
    id: null,
    name: '',
    building_id: selectedBuilding.value || '',
    floor_id: selectedFloor.value || '',
  }
  // Reset bulk create state
  buildingMode.value = 'existing'
  floorMode.value = 'existing'
  newBuildingName.value = ''
  newFloorName.value = ''
  roomName.value = ''

  showModal.value = true
}




function closeModal() {
  showModal.value = false
  modalStep.value = 1
  bulkCreateMode.value = false
  modalData.value = {
    id: null,
    name: '',
    building_id: '',
    floor_id: '',
  }
  // Reset bulk create state
  buildingMode.value = 'existing'
  floorMode.value = 'existing'
  newBuildingName.value = ''
  newFloorName.value = ''
  roomName.value = ''
}

async function saveLocation() {
  if (!modalData.value.name.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'กรุณากรอกข้อมูล',
      text: 'กรุณากรอกชื่อ',
      confirmButtonColor: '#F59E0B',
    })
    return
  }

  // ตรวจสอบว่ามี building_id สำหรับ floor และ room
  if (modalType.value === 'floor' && !modalData.value.building_id) {
    await Swal.fire({
      icon: 'warning',
      title: 'กรุณากรอกข้อมูล',
      text: 'กรุณาเลือกอาคาร',
      confirmButtonColor: '#F59E0B',
    })
    return
  }

  if (modalType.value === 'room' && (!modalData.value.building_id || !modalData.value.floor_id)) {
    await Swal.fire({
      icon: 'warning',
      title: 'กรุณากรอกข้อมูล',
      text: 'กรุณาเลือกอาคารและชั้น',
      confirmButtonColor: '#F59E0B',
    })
    return
  }

  try {
    const endpoint =
      modalType.value === 'building'
        ? '/buildings'
        : modalType.value === 'floor'
          ? '/floors'
          : '/rooms'

    const method = modalMode.value === 'add' ? 'POST' : 'PUT'
    const url =
      modalMode.value === 'edit'
        ? `${API_BASE}${endpoint}/${modalData.value.id}`
        : `${API_BASE}${endpoint}`

    const body =
      modalType.value === 'building'
        ? { bd_name: modalData.value.name }
        : modalType.value === 'floor'
          ? { fl_name: modalData.value.name, fl_bd_id: modalData.value.building_id }
          : { room_name: modalData.value.name, room_fl_id: modalData.value.floor_id }

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'บันทึกไม่สำเร็จ')
    }

    closeModal()

    await Swal.fire({
      icon: 'success',
      title: 'สำเร็จ!',
      text: modalMode.value === 'add' ? 'เพิ่มข้อมูลเรียบร้อยแล้ว' : 'แก้ไขข้อมูลเรียบร้อยแล้ว',
      confirmButtonColor: '#1E48D1',
      timer: 1500,
      showConfirmButton: false,
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

function nextStep() {
  if (modalStep.value === 1) {
    modalStep.value = 2
    // โหลดข้อมูล floors ถ้าเลือก room และมี building_id
    if (modalType.value === 'room' && modalData.value.building_id) {
      fetchFloors(modalData.value.building_id)
    }
  }
}

function prevStep() {
  if (modalStep.value === 2 && modalMode.value === 'add') {
    modalStep.value = 1
  }
}

async function handleModalBuildingChange() {
  if (modalData.value.building_id) {
    await fetchFloors(modalData.value.building_id)
  }
  modalData.value.floor_id = ''
}

async function handleBulkBuildingChange() {
  if (buildingMode.value === 'existing' && modalData.value.building_id) {
    await fetchFloors(modalData.value.building_id)
  }
  modalData.value.floor_id = ''
  floorMode.value = 'existing'
}

// ฟังก์ชันสำหรับ Bulk Create
async function bulkCreateLocation() {
  try {
    let buildingId = modalData.value.building_id
    let floorId = modalData.value.floor_id

    // 1. สร้างอาคารถ้าเป็นแบบใหม่
    if (buildingMode.value === 'new') {
      if (!newBuildingName.value.trim()) {
        await Swal.fire({
          icon: 'warning',
          title: 'กรุณากรอกข้อมูล',
          text: 'กรุณากรอกชื่ออาคารใหม่',
          confirmButtonColor: '#F59E0B',
        })
        return
      }

      const res = await fetch(`${API_BASE}/buildings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ bd_name: newBuildingName.value.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'สร้างอาคารไม่สำเร็จ')
      }

      buildingId = data.bd_id
      console.log('สร้างอาคารสำเร็จ:', data)
    }

    // 2. สร้างชั้นถ้าเป็นแบบใหม่
    if (floorMode.value === 'new') {
      if (!newFloorName.value.trim()) {
        await Swal.fire({
          icon: 'warning',
          title: 'กรุณากรอกข้อมูล',
          text: 'กรุณากรอกชื่อชั้นใหม่',
          confirmButtonColor: '#F59E0B',
        })
        return
      }

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
          fl_name: newFloorName.value.trim(),
          fl_bd_id: buildingId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'สร้างชั้นไม่สำเร็จ')
      }

      floorId = data.fl_id
      console.log('สร้างชั้นสำเร็จ:', data)
    }

    // 3. สร้างห้อง (required)
    if (!roomName.value.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูล',
        text: 'กรุณากรอกชื่อห้อง',
        confirmButtonColor: '#F59E0B',
      })
      return
    }

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
        room_name: roomName.value.trim(),
        room_fl_id: floorId,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'สร้างห้องไม่สำเร็จ')
    }

    console.log('สร้างห้องสำเร็จ:', data)

    closeModal()

    await Swal.fire({
      icon: 'success',
      title: 'สำเร็จ!',
      text: 'สร้างสถานที่เรียบร้อยแล้ว',
      confirmButtonColor: '#1E48D1',
      timer: 1500,
      showConfirmButton: false,
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

async function refreshData() {
  await fetchBuildings()
  if (selectedBuilding.value) {
    await fetchFloors(selectedBuilding.value)
  }
  if (selectedFloor.value) {
    await fetchRooms(selectedFloor.value)
  }
}



onMounted(async () => {
  await fetchBuildings()
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-4 sm:p-6 lg:p-8 mx-auto max-w-7xl">
    <!-- 🔹 หัวข้อ -->
    <h1 class="text-xl font-bold text-black mb-2">สถานที่ทั้งหมด</h1>
    <p class="text-sm text-gray-600 mb-6">ค้นหาตรองและเรียงลำดับรายการอาคาร ชั้น ห้อง</p>

    <!-- แถบค้นหาและตัวกรอง -->
    <div class="flex items-center gap-3 mb-6">
      <!-- ช่องค้นหา -->
      <div class="relative flex-1 max-w-xs">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหา"
          class="w-full border border-gray-300 rounded-lg px-4 py-2 pr-12 focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
        <button
          class="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-blue-600 hover:bg-blue-700 rounded px-3 py-1.5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </div>

      <!-- Dropdown เรียงลำดับ -->
      <select
        v-model="sortOrder"
        class="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm"
      >
        <option value="ก-ฮ">เรียงตามอักษร ก-ฮ</option>
        <option value="ฮ-ก">เรียงตามอักษร ฮ-ก</option>
      </select>

      <!-- Dropdown เลือกอาคาร -->
      <select
        v-model="selectedBuilding"
        @change="handleBuildingChange"
        class="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm min-w-[150px]"
      >
        <option value="">ทุกอาคาร</option>
        <option
          v-for="building in buildings"
          :key="building.building_id"
          :value="building.building_id"
        >
          {{ building.building_name }}
        </option>
      </select>

      <!-- Dropdown เลือกชั้น (แสดงเมื่อเลือกอาคารแล้ว) -->
      <select
        v-if="selectedBuilding"
        v-model="selectedFloor"
        @change="handleFloorChange"
        class="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm min-w-[150px]"
      >
        <option value="">ทุกชั้น</option>
        <option v-for="floor in floors" :key="floor.floor_id" :value="floor.floor_id">
          {{ floor.floor_name }}
        </option>
      </select>

      <!-- ปุ่มล้างตัวกรอง -->
      <button
        v-if="selectedBuilding || searchQuery"
        @click="handleClearFilters"
        class="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
      >
        ล้างตัวกรอง
      </button>

      <!-- ปุ่มเพิ่มสถานที่ -->
      <button
        @click="handleAdd"
        class="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm whitespace-nowrap"
      >
        <span class="text-xl leading-none">+</span>
        <span>เพิ่มสถานที่</span>
      </button>
    </div>

    <!-- ตาราง -->
    <!-- ✅ Table Component -->
    <TableComponent
      :columns="columns"
      :rows="tableRows"
      :perPage="perPage"
      mode="full"
      @detail="handleDetail"
      @edit="handleEdit"
      @delete="handleDelete"
    />

    <!-- 🔹 Modal เพิ่ม/แก้ไขสถานที่ -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      @click="closeModal"
    >
      <div
        class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative"
        @click.stop
      >
        <!-- Header (ติดด้านบน) -->
        <div class="sticky top-0 bg-white z-10 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-gray-100">
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-bold text-gray-800">
              {{
                modalMode === 'add' ? 'เพิ่มสถานที่'
                : modalMode === 'edit' ? 'แก้ไขสถานที่'
                : 'รายละเอียดสถานที่'
              }}
            </h2>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <!-- Content (scrollable) -->
        <div class="overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6" style="max-height: calc(80vh - 140px);">
          <!-- Progress Steps (เฉพาะโหมด add) -->
          <div v-if="modalMode === 'add'" class="flex items-center justify-center mb-6 gap-2 pt-4">
            <div class="flex items-center">
              <div
                :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors',
                  modalStep === 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                ]"
              >
                1
              </div>
              <span class="ml-2 text-sm font-medium text-gray-700">เลือกประเภท</span>
            </div>

            <div class="w-12 h-0.5 bg-gray-300 mx-2"></div>

            <div class="flex items-center">
              <div
                :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors',
                  modalStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600',
                ]"
              >
                2
              </div>
              <span class="ml-2 text-sm font-medium text-gray-700">กรอกข้อมูล</span>
            </div>
          </div>

          <!-- Step 1: เลือกประเภท (เฉพาะโหมด add) -->
          <div v-if="modalMode === 'add' && modalStep === 1" class="space-y-4">
            <p class="text-sm text-gray-600 mb-4">คุณต้องการเพิ่มสถานที่แบบไหน?</p>

            <!-- Mode Selection -->
            <div class="space-y-3 mb-6">
              <!-- Single Level Mode -->
              <label class="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400"
                :class="!bulkCreateMode ? 'border-blue-600 bg-blue-50' : 'border-gray-200'"
              >
                <input
                  type="radio"
                  :checked="!bulkCreateMode"
                  @change="bulkCreateMode = false"
                  class="w-5 h-5 text-blue-600 mt-1"
                />
                <div class="ml-3">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-gray-800">เพิ่มทีละระดับ</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">เลือกเพิ่ม อาคาร, ชั้น หรือ ห้อง ทีละอย่าง</p>
                </div>
              </label>

              <!-- Bulk Create Mode -->
              <label class="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400"
                :class="bulkCreateMode ? 'border-blue-600 bg-blue-50' : 'border-gray-200'"
              >
                <input
                  type="radio"
                  :checked="bulkCreateMode"
                  @change="bulkCreateMode = true"
                  class="w-5 h-5 text-blue-600 mt-1"
                />
                <div class="ml-3">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-gray-800">สร้างหลายระดับพร้อมกัน</span>
                    <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">เร็วกว่า</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">สร้างอาคาร + ชั้น + ห้อง ในครั้งเดียว</p>
                </div>
              </label>
            </div>

            <!-- Type Selection (แสดงเมื่อเลือก Single Level Mode) -->
            <div v-if="!bulkCreateMode" class="space-y-3">
              <p class="text-sm font-semibold text-gray-700 mb-2">เลือกประเภท:</p>

              <!-- Option: Building -->
              <label class="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400"
                :class="modalType === 'building' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'"
              >
                <input
                  type="radio"
                  v-model="modalType"
                  value="building"
                  class="w-5 h-5 text-blue-600"
                />
                <div class="ml-3">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-gray-800">อาคาร</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">เพิ่มอาคารใหม่</p>
                </div>
              </label>

              <!-- Option: Floor -->
              <label class="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400"
                :class="modalType === 'floor' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'"
              >
                <input
                  type="radio"
                  v-model="modalType"
                  value="floor"
                  class="w-5 h-5 text-blue-600"
                />
                <div class="ml-3">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-gray-800">ชั้น</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">เพิ่มชั้นในอาคาร</p>
                </div>
              </label>

              <!-- Option: Room -->
              <label class="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-400"
                :class="modalType === 'room' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'"
              >
                <input
                  type="radio"
                  v-model="modalType"
                  value="room"
                  class="w-5 h-5 text-blue-600"
                />
                <div class="ml-3">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-gray-800">ห้อง</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">เพิ่มห้องในชั้น</p>
                </div>
              </label>
            </div>

            <!-- Actions for Step 1 -->
            <div class="flex gap-3 mt-6">
              <button
                @click="closeModal"
                class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
              >
                ยกเลิก
              </button>
              <button
                @click="nextStep"
                class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                ถัดไป →
              </button>
            </div>
          </div>

          <!-- Step 2: กรอกข้อมูล -->
          <div v-if="modalStep === 2" class="space-y-4">

            <!-- 🔍 Detail View Mode -->
            <div v-if="modalMode === 'view' && modalDetailData" class="space-y-6">

              <!-- Summary Card (ไม่แสดงเมื่อมีการ filter ชั้น) -->
              <div v-if="!selectedFloor" :class="[
                'rounded-lg p-4',
                modalDetailData.type === 'building' ? 'bg-blue-50' : 'bg-purple-50'
              ]">
                <h3 :class="[
                  'text-lg font-bold mb-3',
                  modalDetailData.type === 'building' ? 'text-blue-800' :
                  modalDetailData.type === 'floor' ? 'text-green-800' : 'text-purple-800'
                ]">
                  ข้อมูล{{ modalDetailData.type === 'building' ? 'อาคาร' :
                            modalDetailData.type === 'floor' ? 'ชั้น' : 'ห้อง' }}
                </h3>

                <!-- ข้อมูลหลัก -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <p class="text-gray-700">
                    <span class="font-semibold">ชื่อ{{ modalDetailData.type === 'building' ? 'อาคาร' :
                                                      modalDetailData.type === 'floor' ? 'ชั้น' : 'ห้อง' }}:</span>
                    {{ modalDetailData.name }}
                  </p>

                  <p v-if="modalDetailData.type !== 'building'" class="text-gray-700">
                    <span class="font-semibold">อาคาร:</span> {{ modalDetailData.buildingName }}
                  </p>

                  <p v-if="modalDetailData.type === 'room'" class="text-gray-700">
                    <span class="font-semibold">ชั้น:</span> {{ modalDetailData.floorName }}
                  </p>
                </div>

                <!-- สถิติ -->
                <div class="grid grid-cols-2 gap-4">
                  <div class="bg-white rounded-lg p-3 text-center">
                    <div class="text-2xl font-bold text-blue-600">{{ modalDetailData.totalFloors }}</div>
                    <div class="text-sm text-gray-600">ชั้นทั้งหมด</div>
                  </div>
                  <div class="bg-white rounded-lg p-3 text-center">
                    <div class="text-2xl font-bold text-green-600">{{ modalDetailData.totalRooms }}</div>
                    <div class="text-sm text-gray-600">ห้องทั้งหมด</div>
                  </div>
                </div>
              </div>

              <!-- Detailed Breakdown (ไม่แสดงเมื่อมีการ filter ชั้น) -->
              <div v-if="!selectedFloor && modalDetailData.floorDetails.length > 0" class="space-y-4">
                <h4 class="font-semibold text-gray-800 flex items-center gap-2">
                  รายละเอียดแต่ละชั้น
                  <span class="text-sm font-normal text-gray-600">({{ modalDetailData.totalFloors }} ชั้น)</span>
                </h4>

                <div class="space-y-3">
                  <div
                    v-for="(floor, index) in modalDetailData.floorDetails"
                    :key="floor.floorId || index"
                    class="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div class="flex justify-between items-center mb-3">
                      <h5 class="font-medium text-gray-800">{{ floor.floorName }}</h5>
                      <span class="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                        {{ floor.roomCount }} ห้อง
                      </span>
                    </div>

                    <div v-if="floor.rooms.length > 0" class="mt-2">
                      <p class="text-sm text-gray-600 mb-2">ห้องในชั้นนี้:</p>
                      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        <div
                          v-for="room in floor.rooms"
                          :key="room.id || room.name"
                          class="text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 text-center hover:bg-gray-50 transition-colors"
                        >
                          <span class="font-medium">{{ room.name || room }}</span>
                        </div>
                      </div>
                    </div>
                    <p v-else class="text-sm text-gray-500 italic">ยังไม่มีห้องในชั้นนี้</p>
                  </div>
                </div>
              </div>

              <!-- Floor Detail - Simple Room List (เมื่อมีการ filter ชั้น) -->
              <div v-if="selectedFloor && modalDetailData.floorDetails.length > 0" class="space-y-4">
                <div v-for="(floor, index) in modalDetailData.floorDetails" :key="floor.floorId || index">
                  <div v-if="floor.rooms.length > 0" class="space-y-3">
                    <h4 class="font-semibold text-gray-800">รายชื่อห้องทั้งหมด</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      <div
                        v-for="room in floor.rooms"
                        :key="room.id || room.name"
                        class="bg-white border border-gray-300 rounded-lg px-3 py-2 text-center hover:bg-gray-50 transition-colors"
                      >
                        <span class="font-medium">{{ room.name || room }}</span>
                      </div>
                    </div>
                  </div>
                  <p v-else class="text-gray-500 italic text-center py-8">ยังไม่มีห้องในชั้นนี้</p>
                </div>
              </div>
            </div>

            <!-- Bulk Create Mode -->
            <div v-if="bulkCreateMode" class="space-y-4">
              <div class="flex items-center gap-2 p-3 bg-blue-50 rounded-lg mb-4">
                <span class="font-semibold text-blue-800">สร้างหลายระดับพร้อมกัน</span>
              </div>

              <!-- Building Section -->
              <div class="border-2 border-gray-200 rounded-lg p-4 space-y-3">
                <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                  <span>อาคาร</span>
                </h3>

                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    v-model="buildingMode"
                    value="existing"
                    class="w-4 h-4 text-blue-600"
                  />
                  <span class="text-sm font-medium">เลือกจากอาคารที่มีอยู่</span>
                </label>
                <select
                  v-if="buildingMode === 'existing'"
                  v-model="modalData.building_id"
                  :disabled="modalMode === 'view'"
                  @change="handleBulkBuildingChange"
                  :class="[
                    'w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none',
                    modalMode === 'view' ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' : 'border-gray-300'
                  ]"
                >
                  <option value="">-- เลือกอาคาร --</option>
                  <option v-for="building in buildings" :key="building.building_id" :value="building.building_id">
                    {{ building.building_name }}
                  </option>
                </select>

                <label class="flex items-center gap-2 mt-3">
                  <input
                    type="radio"
                    v-model="buildingMode"
                    value="new"
                    class="w-4 h-4 text-blue-600"
                  />
                  <span class="text-sm font-medium">สร้างอาคารใหม่</span>
                </label>
                <input
                  v-if="buildingMode === 'new'"
                  v-model="newBuildingName"
                  type="text"
                  placeholder="ชื่ออาคารใหม่"
                  class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>

              <!-- Floor Section -->
              <div class="border-2 border-gray-200 rounded-lg p-4 space-y-3">
                <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                  <span>ชั้น</span>
                </h3>

                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    v-model="floorMode"
                    value="existing"
                    :disabled="buildingMode === 'new' || !modalData.building_id"
                    class="w-4 h-4 text-blue-600 disabled:opacity-50"
                  />
                  <span class="text-sm font-medium" :class="{'text-gray-400': buildingMode === 'new' || !modalData.building_id}">
                    เลือกจากชั้นที่มีอยู่
                  </span>
                </label>
                <select
                  v-if="floorMode === 'existing'"
                  v-model="modalData.floor_id"
                  :disabled="modalMode === 'view' || buildingMode === 'new' || !modalData.building_id"
                  :class="[
                    'w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none',
                    modalMode === 'view' || buildingMode === 'new' || !modalData.building_id
                      ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                      : 'border-gray-300'
                  ]"
                >
                  <option value="">-- เลือกชั้น --</option>
                  <option v-for="floor in floors" :key="floor.floor_id" :value="floor.floor_id">
                    {{ floor.floor_name }}
                  </option>
                </select>

                <label class="flex items-center gap-2 mt-3">
                  <input
                    type="radio"
                    v-model="floorMode"
                    value="new"
                    class="w-4 h-4 text-blue-600"
                  />
                  <span class="text-sm font-medium">สร้างชั้นใหม่</span>
                </label>
                <input
                  v-if="floorMode === 'new'"
                  v-model="newFloorName"
                  type="text"
                  placeholder="ชื่อชั้นใหม่"
                  class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>

              <!-- Room Section -->
              <div class="border-2 border-blue-200 rounded-lg p-4 space-y-3 bg-blue-50">
                <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                  <span>ห้อง <span class="text-red-500">*</span></span>
                </h3>

                <input
                  v-model="roomName"
                  type="text"
                  placeholder="ชื่อห้อง (ต้องระบุ)"
                  class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
                <p class="text-xs text-gray-600">
                   ห้องจะถูกสร้างในชั้นที่เลือกหรือสร้างขึ้นมาใหม่
                </p>
              </div>

              <!-- Actions for Bulk Create -->
              <div class="flex gap-3 mt-6">
                <button
                  @click="prevStep"
                  class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
                >
                  ← ย้อนกลับ
                </button>
                <button
                  @click="bulkCreateLocation"
                  class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  สร้างทั้งหมด
                </button>
              </div>
            </div>

            <!-- Single Level Mode (แบบเดิม) -->
            <div v-else>
              <!-- เลือกอาคาร (สำหรับ floor และ room) -->
              <div v-if="modalType === 'floor' || modalType === 'room'">
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  อาคาร <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="modalData.building_id"
                  :disabled="modalMode === 'edit' || modalMode === 'view'"
                  @change="handleModalBuildingChange"
                  :class="[
                    'w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none',
                    modalMode === 'edit' || modalMode === 'view'
                      ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                      : 'border-gray-300'
                  ]"
                >
                  <option value="">เลือกอาคาร</option>
                  <option v-for="building in buildings" :key="building.building_id" :value="building.building_id">
                    {{ building.building_name }}
                  </option>
                </select>
              </div>

              <!-- เลือกชั้น (สำหรับ room) -->
              <div v-if="modalType === 'room'">
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  ชั้น <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="modalData.floor_id"
                  :disabled="modalMode === 'edit' || modalMode === 'view' || !modalData.building_id"
                  :class="[
                    'w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none',
                    modalMode === 'edit' || modalMode === 'view' || !modalData.building_id
                      ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                      : 'border-gray-300'
                  ]"
                >
                  <option value="">เลือกชั้น</option>
                  <option v-for="floor in floors" :key="floor.floor_id" :value="floor.floor_id">
                    {{ floor.floor_name }}
                  </option>
                </select>
              </div>

              <!-- ชื่อ -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  ชื่อ{{ modalType === 'building' ? 'อาคาร' : modalType === 'floor' ? 'ชั้น' : 'ห้อง' }}
                  <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="modalData.name"
                  type="text"
                  :placeholder="`ระบุชื่อ${modalType === 'building' ? 'อาคาร' : modalType === 'floor' ? 'ชั้น' : 'ห้อง'}`"
                  :disabled="modalMode === 'view'"
                  :class="[
                    'w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none',
                    modalMode === 'view' ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' : 'border-gray-300'
                  ]"
                  @keyup.enter="modalMode !== 'view' && saveLocation"
                />
              </div>

              <!-- Actions for Single Level -->
              <div class="flex gap-3 mt-6">
                <button
                  v-if="modalMode === 'add'"
                  @click="prevStep"
                  class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
                >
                  ← ย้อนกลับ
                </button>
                <button
                  v-else
                  @click="closeModal"
                  class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
                >
                  ยกเลิก
                </button>
                <button
                  v-if="modalMode !== 'view'"
                  @click="saveLocation"
                  class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  {{ modalMode === 'add' ? 'เพิ่ม' : 'บันทึก' }}
                </button>
                <button
                  v-if="modalMode === 'view'"
                  @click="closeModal"
                  class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions (ติดด้านล่าง) -->
        <div class="sticky bottom-0 bg-white z-10 px-4 sm:px-6 py-4 border-t border-gray-100">
          <!-- ย้าย action buttons -->
          <div class="flex gap-3">
          </div>
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
</style>
