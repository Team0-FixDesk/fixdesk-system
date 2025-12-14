<script setup>
defineOptions({ name: 'TechnicianHomeView' })
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import CardHomeComponent from '@/components/card-home-component.vue'
import TableComponent from '@/components/table-component.vue'
import { jwtDecode } from 'jwt-decode' // ตรวจสอบว่ามีบรรทัดนี้

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// --- State ---
const repairRequests = ref([])
const stockForms = ref([])
const loading = ref(false)
const loadingStock = ref(false)
const technicianName = ref('เจ้าหน้าที่')

const fetchUserProfile = async () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) return

  try {
    const decoded = jwtDecode(token)
    const userId = decoded.us_id // หรือ field id ใน token ของคุณ

    const res = await fetch(`${API_BASE}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.ok) {
      const userData = await res.json()
      if (userData.us_first_name_th) {
        technicianName.value =
          `${userData.us_first_name_th} ${userData.us_last_name_th || ''}`.trim()
      }
    }
  } catch (err) {
    console.error('โหลดข้อมูลผู้ใช้ไม่สำเร็จ', err)
  }
}

const sortedRepairs = computed(() => {
  return [...repairRequests.value]
    .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate))
    .slice(0, 5)
})

const repairTableRows = computed(() => {
  return sortedRepairs.value.map((r) => [
    r.rf_code,
    r.rf_problem || '-',
    r.department_name || '-',
    `${r.building_name || ''} ${r.room_name || ''}`,
    getBadgeHtml(r.urgency, 'urgency'),
    getBadgeHtml(r.status, 'status'),
  ])
})

// [เพิ่มใหม่] ส่งตัวนี้ไปให้ TableComponent (ผ่าน prop rawRows)
const repairTableRaw = computed(() => {
  return sortedRepairs.value.map((r) => ({
    ticketId: r.rf_code, // หรือ id ที่คุณใช้เป็น key ในการเปิดหน้า detail
    // ... อาจจะใส่ property อื่นๆ เผื่อไว้ก็ได้
  }))
})

// 2. Stock Table (เพิ่ม stockTableRaw)
const sortedStocks = computed(() => {
  return [...stockForms.value].sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate)).slice(0, 5)
})

const stockTableRows = computed(() => {
  return sortedStocks.value.map((s) => [
    s.related_rf_code || '-',
    s.sf_code,
    s.requester_department || '-',
    getBadgeHtml(s.urgency, 'urgency'),
    getBadgeHtml(s.status, 'status'),
    `<button class="text-blue-600 hover:underline">รายละเอียด</button>`,
  ])
})

// [เพิ่มใหม่]
const stockTableRaw = computed(() => {
  return sortedStocks.value.map((s) => ({
    withdrawCode: s.sf_code,
    // ...
  }))
})

// --- [เพิ่มใหม่] Event Handler สำหรับคลิก Row ---
const onRepairRowClick = (item) => {
  const id = typeof item === 'object' && item !== null ? item.ticketId : item

  if (id) {
    router.push(`/main/repair-detail/${id}`)
  } else {
    console.warn('Invalid ID clicked:', item)
  }
}

const onStockRowClick = (item) => {
  const id = (typeof item === 'object' && item !== null) ? item.withdrawCode : item;
  if (id) {
    // router.push(`/main/stock-detail/${id}`)
    console.log('Open stock detail:', id)
  }
}

// --- Helper Functions ---
const mapUrgency = (u) =>
  ({ high: 'เร่งด่วนมาก', medium: 'เร่งด่วน', low: 'ไม่เร่งด่วน' })[u] || 'เร่งด่วน'
const mapStatus = (s) =>
  ({ pending: 'รอดำเนินการ', in_progress: 'กำลังดำเนินการ', done: 'เสร็จสิ้น', cancel: 'ยกเลิก' })[
    s
  ] || 'รอดำเนินการ'
const mapStockStatus = (s) =>
  ({ waiting: 'รอดำเนินการ', approved: 'อนุมัติ', rejected: 'ปฏิเสธ', completed: 'เสร็จสิ้น' })[
    s
  ] || '-'

// Function to generate HTML badge string for TableComponent
const getBadgeHtml = (text, type) => {
  let colorClass = 'bg-gray-100 text-gray-600'

  if (type === 'urgency') {
    if (text === 'เร่งด่วนมาก') colorClass = 'bg-red-100 text-red-700'
    else if (text === 'เร่งด่วน') colorClass = 'bg-amber-100 text-amber-700'
    else colorClass = 'bg-green-100 text-green-700'
  } else if (type === 'status') {
    if (text === 'รอดำเนินการ' || text === 'waiting') colorClass = 'bg-amber-100 text-amber-700'
    else if (text === 'กำลังดำเนินการ') colorClass = 'bg-blue-100 text-blue-700'
    else if (text === 'เสร็จสิ้น' || text === 'อนุมัติ') colorClass = 'bg-green-100 text-green-700'
    else if (text === 'ยกเลิก' || text === 'ปฏิเสธ') colorClass = 'bg-red-100 text-red-700'
  }

  return `<span class="inline-flex items-center justify-center h-8 font-medium rounded-full w-28 ${colorClass}">${text}</span>`
}

// --- Fetch Data Functions ---
const fetchRepairRequests = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) return

    const res = await fetch(`${API_BASE}/technician/repairs`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Fetch failed')

    const data = await res.json()
    repairRequests.value = data.map((item) => ({
      ...item,
      rawDate: item.rf_create_at, // เก็บ raw date เพื่อ sort
      status: mapStatus(item.rf_user_status),
      urgency: mapUrgency(item.rf_urgency),
    }))
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const fetchStockForms = async () => {
  loadingStock.value = true
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) return

    let res = await fetch(`${API_BASE}/my-stock-forms`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok && res.status === 404) {
      res = await fetch(`${API_BASE}/stock-forms`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    }

    if (!res.ok) throw new Error('Fetch stock failed')

    const data = await res.json()
    stockForms.value = data.map((item) => ({
      ...item,
      rawDate: item.sf_create_at,
      status: mapStockStatus(item.sf_status),
      urgency: mapUrgency(item.sf_urgency),
    }))
  } catch (err) {
    console.error(err)
  } finally {
    loadingStock.value = false
  }
}

// --- Stats for Cards ---
const isToday = (d) => new Date(d).toDateString() === new Date().toDateString()
const statItems = computed(() => [
  {
    value: repairRequests.value.filter((r) => isToday(r.rawDate)).length,
    label: 'งานมอบหมายใหม่ (วันนี้)',
    colorClass: 'text-blue-600',
    filterStatus: 'today',
  },
  {
    value: repairRequests.value.filter((r) => r.rf_user_status === 'in_progress').length,
    label: 'กำลังดำเนินการ',
    colorClass: 'text-orange-500',
    filterStatus: 'in_progress',
  },
  {
    value: repairRequests.value.filter((r) => r.rf_user_status === 'done').length,
    label: 'เสร็จสิ้น (ทั้งหมด)',
    colorClass: 'text-green-600',
    filterStatus: 'done',
  },
  {
    value: repairRequests.value.filter((r) => r.rf_user_status === 'cancel').length,
    label: 'ยกเลิก',
    colorClass: 'text-red-600',
    filterStatus: 'cancel',
  },
])

// --- Chart Data ---
const donutChart = computed(() => {
  const total = repairRequests.value.length || 1
  const done = repairRequests.value.filter((r) => r.rf_user_status === 'done').length
  const prog = repairRequests.value.filter((r) => r.rf_user_status === 'in_progress').length
  const cancel = repairRequests.value.filter((r) => r.rf_user_status === 'cancel').length

  const p1 = Math.round((done / total) * 100)
  const p2 = p1 + Math.round((prog / total) * 100)
  const p3 = p2 + Math.round((cancel / total) * 100)

  return {
    backgroundImage: `conic-gradient(#16a34a 0% ${p1}%, #f97316 ${p1}% ${p2}%, #dc2626 ${p2}% ${p3}%, #1d4ed8 ${p3}% 100%)`,
  }
})

// --- Actions ---
const onCardClick = (item) =>
  router.push({ path: '/main/technician-repair-list', query: { status: item.filterStatus } })

onMounted(() => {
  fetchRepairRequests()
  fetchStockForms()
  fetchUserProfile()
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-8xl">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">{{ technicianName }}</h1>
      <p class="text-sm text-gray-600 mt-1">
        ตรวจสอบสถานะงานซ่อมและจัดการรายการเบิกจ่ายวัสดุอุปกรณ์
      </p>
    </div>

    <div class="mt-4 mb-8">
      <CardHomeComponent :items="statItems" @click="onCardClick" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 lg:col-span-2">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h2 class="text-xl font-bold text-gray-900">งานที่ได้รับมอบหมายล่าสุด</h2>
            <p class="text-sm text-gray-500">5 รายการล่าสุด</p>
          </div>
          <button
            @click="router.push('/main/technician-repair-list')"
            class="text-sm text-blue-600 hover:underline"
          >
            ดูทั้งหมด
          </button>
        </div>

        <TableComponent
          :columns="['เลขใบงาน', 'หัวข้อ', 'หน่วยงาน', 'สถานที่', 'ความเร่งด่วน', 'สถานะ']"
          :rows="repairTableRows"
          :rawRows="repairTableRaw"
          :perPage="5"
          mode="view-only"
          :idColumnIndex="0"  @detail="(id) => onRepairRowClick(id)"
        />
      </div>

      <div
        class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-center items-center"
      >
        <h2 class="text-lg font-bold text-gray-800 mb-6 self-start">สัดส่วนงานทั้งหมด</h2>
        <div class="relative w-48 h-48">
          <div class="w-full h-full rounded-full" :style="donutChart"></div>
          <div
            class="absolute top-1/2 left-1/2 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
          >
            <span class="text-gray-400 text-xs">ภาพรวม</span>
          </div>
        </div>
        <div class="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-xs w-full">
          <div class="flex items-center">
            <span class="w-3 h-3 rounded bg-green-600 mr-2"></span>เสร็จสิ้น
          </div>
          <div class="flex items-center">
            <span class="w-3 h-3 rounded bg-orange-500 mr-2"></span>กำลังทำ
          </div>
          <div class="flex items-center">
            <span class="w-3 h-3 rounded bg-red-600 mr-2"></span>ยกเลิก
          </div>
          <div class="flex items-center">
            <span class="w-3 h-3 rounded bg-blue-700 mr-2"></span>อื่นๆ
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div class="mb-4">
        <h2 class="text-xl font-bold text-gray-900">รายการเบิกของล่าสุด</h2>
        <p class="text-sm text-gray-500">5 รายการล่าสุด</p>
      </div>

      <TableComponent
        :columns="['อ้างอิงใบงาน', 'รหัสใบเบิก', 'หน่วยงาน', 'ความเร่งด่วน', 'สถานะ', 'จัดการ']"
        :rows="stockTableRows"
        :rawRows="stockTableRaw"
        :perPage="5"
        mode="view-only"
        @detail="(item) => onStockRowClick(item)"
      />
    </div>
  </div>
</template>
