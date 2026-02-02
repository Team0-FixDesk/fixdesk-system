<script setup>
defineOptions({ name: 'TechnicianHomeView' })
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import CardHomeComponent from '@/components/card-home-component.vue'
import TableComponent from '@/components/table-component.vue'
import { jwtDecode } from 'jwt-decode' // ตรวจสอบว่ามีบรรทัดนี้

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE

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

// [เพิ่มใหม่]
const stockTableRows = computed(() => {
  return stockForms.value.slice(0, 5).map((form) => {
    const location = form.building_name || '-'
    const items = form.items ? form.items.split('\n') : []

    return [
      form.sf_code, // 0
      {
        date: new Date(form.sf_create_at).toLocaleString('th-TH', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        location,
        rf_code: form.rf_code, //  ตอนนี้จะมีค่า
      },
      items, //  ตอนนี้จะมีค่า
      form.sf_status,
      '',
    ]
  })
})

// --- [เพิ่มใหม่] Event Handler สำหรับคลิก Row ---
const onRepairRowClick = (item) => {
  const id = typeof item === 'object' && item !== null ? item.ticketId : item

  if (id) {
    router.push({
      path: `/main/repair-detail/${id}`,
      state: { fromTechnician: true },
    })
  } else {
    console.warn('Invalid ID clicked:', item)
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
function getBadgeHtml(text, type) {
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

    const decoded = jwtDecode(token)
    const userId = decoded.us_id

    let res = await fetch(`${API_BASE}/stock-forms/${userId}`, {
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
function truncateItem(text, maxWords = 5) {
  if (!text) return ''
  const [name] = text.split(' x')
  const words = name.split(' ')
  return words.length > maxWords ? words.slice(0, maxWords).join(' ') + '...' : name
}

function extractQuantity(item) {
  if (!item) return 1
  const match = item.match(/x\s*(\d+)/i)
  return match ? Number(match[1]) : 1
}

// --- Stats for Cards ---
const isToday = (d) => new Date(d).toDateString() === new Date().toDateString()
const statItems = computed(() => [
  {
    value: repairRequests.value.filter((r) => isToday(r.rawDate)).length,
    label: 'งานมอบหมายใหม่วันนี้',
    colorClass: 'text-amber-500',
    filterStatus: 'today',
  },
  {
    value: repairRequests.value.filter((r) => r.rf_user_status === 'in_progress').length,
    label: 'กำลังดำเนินการ',
    colorClass: 'text-blue-600',
    filterStatus: 'in_progress',
  },
  {
    value: repairRequests.value.filter((r) => r.rf_user_status === 'done').length,
    label: 'ดำเนินการเสร็จสิ้นทั้งหมด',
    colorClass: 'text-green-600',
    filterStatus: 'done',
  },
  {
    value: repairRequests.value.filter((r) => r.rf_user_status === 'cancel').length,
    label: 'งานที่ยกเลิก',
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
const openDetail = (rfCode) => {
  router.push(`/main/repair-detail/${rfCode}`)
}
</script>

<template>
  <div class="p-8 mx-auto bg-white shadow-md rounded-xl max-w-8xl">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">{{ technicianName }}</h1>
      <p class="mt-1 text-sm text-gray-600">
        ตรวจสอบสถานะงานซ่อมและจัดการรายการเบิกจ่ายวัสดุอุปกรณ์
      </p>
    </div>

    <div class="mt-4 mb-8">
      <CardHomeComponent :items="statItems" @click="onCardClick" />
    </div>

    <div class="grid grid-cols-1 gap-3 mb-8 lg:grid-cols-3">
      <div class="p-5 bg-white border border-gray-200 shadow-sm rounded-2xl lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
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
          :idColumnIndex="0"
          :id-column-as-link="true"
          @detail="(id) => onRepairRowClick(id)"
          :columnAlign="['left', 'left', 'left', 'left', 'center', 'center']"
        />
      </div>

      <div
        class="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 shadow-sm rounded-2xl"
      >
        <h2 class="self-start mb-6 text-lg font-bold text-gray-800">สัดส่วนงานทั้งหมด</h2>
        <div class="relative w-48 h-48">
          <div class="w-full h-full rounded-full" :style="donutChart"></div>
          <div
            class="absolute flex items-center justify-center w-32 h-32 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full top-1/2 left-1/2"
          >
            <span class="text-xs text-gray-400">ภาพรวม</span>
          </div>
        </div>
        <div class="grid w-full grid-cols-2 mt-6 text-xs gap-x-4 gap-y-2">
          <div class="flex items-center">
            <span class="w-3 h-3 mr-2 bg-green-600 rounded"></span>เสร็จสิ้น
          </div>
          <div class="flex items-center">
            <span class="w-3 h-3 mr-2 bg-orange-500 rounded"></span>กำลังทำ
          </div>
          <div class="flex items-center">
            <span class="w-3 h-3 mr-2 bg-red-600 rounded"></span>ยกเลิก
          </div>
          <div class="flex items-center">
            <span class="w-3 h-3 mr-2 bg-blue-700 rounded"></span>อื่นๆ
          </div>
        </div>
      </div>
    </div>

    <div class="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
      <div class="mb-4">
        <h2 class="text-xl font-bold text-gray-900">รายการเบิกของล่าสุด</h2>
        <p class="text-sm text-gray-500">5 รายการล่าสุด</p>
      </div>

      <TableComponent
        :columns="['รหัสรายการเบิกของ', 'รายละเอียด', 'รายการของเบิก', 'สถานะงาน', 'ตัวดำเนินการ']"
        :rows="stockTableRows"
        :perPage="5"
        :statusStockColumn="3"
        :columnAlign="['left', 'left', 'left', 'center']"
        @detail="(row)=>openDetail(row.rf_code)"
      >
        <template #cell-0="{ row }">
          <a
            href="#"
            @click.prevent="openDetail(row[1].rf_code)"
            class="text-blue-600 hover:text-blue-800 underline"
          >
            {{ row[0] }}
          </a>

        </template>
        <!-- รายการของ -->
        <template #cell-2="{ row }">
          <div class="space-y-1 text-sm">
            <div v-for="(item, i) in row[2]" :key="i" class="flex justify-between">
              <span class="truncate">{{ truncateItem(item) }}</span>
              <span class="text-gray-500">x{{ extractQuantity(item) }}</span>
            </div>
          </div>
        </template>

        <!-- รายละเอียด -->
        <template #cell-1="{ row }">
          <div class="space-y-1 text-sm">
            <div>วันที่เบิก: {{ row[1].date }}</div>
            <div>รหัสใบแจ้งซ่อม: {{ row[1].rf_code }}</div>
          </div>
        </template>

        <!-- ปุ่ม -->
        <template #cell-4="{ row }">
          <div class="flex justify-center">
            <button
              @click="openDetail(row[1].rf_code)"
              class="flex items-center gap-2 px-2 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
            >
              <img src="/icon/info-icon.svg" class="w-4 h-4" />
            </button>
          </div>
        </template>
      </TableComponent>
    </div>
  </div>
</template>
