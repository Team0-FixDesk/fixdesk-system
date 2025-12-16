<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TableComponent from '@/components/table-component.vue'
import repairButtonComponent from '@/components/repair-button-component.vue'
import acceptJobMadalComponent from '@/components/accept-job-madal-component.vue'
import Swal from 'sweetalert2'
import { jwtDecode } from 'jwt-decode'

const router = useRouter()
const route = useRoute()
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

const currentAcceptCode = ref(null)
const showAcceptPopup = ref(false)

/* --- State สำหรับ Filter --- */
const searchQuery = ref('')
const selectedStatuses = ref([])
const selectedUrgencies = ref([])
const showStatusFilter = ref(false)
const showUrgencyFilter = ref(false)
const selectedDate = ref('')

// เก็บข้อมูลดิบจาก backend (array of objects)
const rowsData = ref([])

const tokenData = ref(null)
function loadTokenData() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (token) {
    try {
      tokenData.value = jwtDecode(token)
    } catch (err) {
      console.warn('ไม่สามารถ decode token:', err)
      tokenData.value = null
    }
  }
}

/* Helper สำหรับแนบ Token */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/* --- [1] ฟังก์ชันรับค่า Filter จาก URL --- */
function applyFilterFromUrl() {
  const statusParam = route.query.status
  if (!statusParam) return

  // กรองตามวันที่ (Today)
  if (statusParam === 'today') {
    const today = new Date().toISOString().split('T')[0]
    selectedDate.value = today
  }
  // กรองตามสถานะ
  else {
    let targetStatus = ''
    if (statusParam === 'in_progress') targetStatus = 'in_progress'
    else if (statusParam === 'done') targetStatus = 'done'
    else if (statusParam === 'cancel') targetStatus = 'cancel'
    else if (statusParam === 'pending') targetStatus = 'pending'

    if (targetStatus) {
      selectedStatuses.value = [targetStatus]
    }
  }
}

/* --- [2] Computed สำหรับกรองข้อมูล (หัวใจสำคัญ) --- */
const filteredRowsData = computed(() => {
  const q = searchQuery.value.toLowerCase()
  const dateFilter = selectedDate.value

  return rowsData.value.filter((r) => {
    // 1. กรองคำค้นหา
    const code = String(r.rf_code || '').toLowerCase()
    const problem = String(r.rf_problem || '').toLowerCase()
    const dept = String(r.department_name || '').toLowerCase()
    const matchSearch = code.includes(q) || problem.includes(q) || dept.includes(q)

    // 2. กรองวันที่
    let matchDate = true
    if (dateFilter) {
      const rowDate = r.rf_create_at ? new Date(r.rf_create_at).toISOString().split('T')[0] : ''
      matchDate = rowDate === dateFilter
    }

    // 3. กรองสถานะ
    let matchStatus = true
    if (selectedStatuses.value.length > 0) {
      matchStatus = selectedStatuses.value.includes(r.rf_user_status)
    }

    // 4. กรองความเร่งด่วน
    let matchUrgency = true
    if (selectedUrgencies.value.length > 0) {
      matchUrgency = selectedUrgencies.value.includes(r.rf_urgency)
    }

    return matchSearch && matchDate && matchStatus && matchUrgency
  })
})

/* --- [3] สร้าง rawRows และ rowsForTable จาก "ข้อมูลที่กรองแล้ว" --- */
const rawRows = computed(() =>
  filteredRowsData.value.map((r) => ({
    rf_code: r.rf_code,
    code: r.rf_code,
    rf_user_status: r.rf_user_status,
    rf_urgency: r.rf_urgency,
    assigned: !!r.ra_id,
    ra_id: r.ra_id || null,
    ra_is_lead: r.ra_is_lead || 0,
    ra_assigned_at: r.ra_assigned_at || null,
    ra_accepted_at: r.ra_accepted_at || null,
  })),
)

// ฟังก์ชันช่วยตัดคำภาษาไทย
function truncateThaiText(text, wordLimit = 5) {
  if (!text || text === '-') return '-'
  const fullText = String(text)
  try {
    const segmenter = new Intl.Segmenter('th', { granularity: 'word' })
    const segments = [...segmenter.segment(fullText)]
    if (segments.length > wordLimit) {
      const shortText = segments
        .slice(0, wordLimit)
        .map((s) => s.segment)
        .join('')
      return `<span title="${fullText}" class="cursor-help">${shortText}...</span>`
    }
  } catch (err) {
    if (fullText.length > 40)
      return `<span title="${fullText}" class="cursor-help">${fullText.substring(0, 40)}...</span>`
  }
  return fullText
}

const rowsForTable = computed(() =>
  filteredRowsData.value.map((r) => {
    const dateStr = r.rf_create_at ? new Date(r.rf_create_at).toLocaleDateString('th-TH') : '-'
    const reporterName = `${r.us_first_name || ''} ${r.us_last_name || ''}`.trim() || '-'
    const department = r.department_name || '-'
    const problem = truncateThaiText(r.rf_problem || '-', 5)
    const parts = []
    if (r.bd_name) parts.push(r.bd_name)
    if (r.fl_name) parts.push(r.fl_name)
    if (r.room_name) parts.push(r.room_name)
    const placeText = parts.join(' / ') || '-'

    const statusBadge =
      {
        pending: `<span class="inline-flex items-center justify-center h-8 font-medium rounded-full w-28 bg-amber-100 text-amber-700">รอดำเนินการ</span>`,
        in_progress: `<span class="inline-flex items-center justify-center h-8 font-medium text-blue-700 bg-blue-100 rounded-full w-28">กำลังดำเนินการ</span>`,
        done: `<span class="inline-flex items-center justify-center h-8 font-medium text-green-700 bg-green-100 rounded-full w-28">เสร็จสิ้น</span>`,
        cancel: `<span class="inline-flex items-center justify-center h-8 font-medium text-gray-700 bg-gray-100 rounded-full w-28">ยกเลิก</span>`,
      }[String(r.rf_user_status || '').toLowerCase()] ||
      `<span class="inline-flex items-center justify-center h-8 font-medium rounded-full w-28">-</span>`

    return [
      dateStr, // 0
      r.rf_code, // 1
      reporterName, // 2
      department, // 3
      problem, // 4
      placeText, // 5 (แก้ไข index ตาม component)
      statusBadge, // 6
      'actions', // 7
    ]
  }),
)

/* --- [4] Fetch Function (ลบส่วนที่ซ้ำออก) --- */
async function fetchAllRepairs() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      Swal.fire('หมดเวลาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบใหม่', 'warning')
      router.push('/login')
      return
    }

    const res = await fetch(`${API_BASE}/technician/repairs`, { headers: getAuthHeaders() })
    if (res.status === 401) {
      Swal.fire('หมดเวลาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบใหม่', 'warning')
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
      router.push('/login')
      return
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `โหลดข้อมูลไม่สำเร็จ (status ${res.status})`)
    }

    const data = await res.json()
    rowsData.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('❌ โหลดข้อมูลไม่สำเร็จ:', err)
    Swal.fire('เกิดข้อผิดพลาด', err.message || 'โหลดข้อมูลไม่สำเร็จ', 'error')
  }
}

function clearFilters() {
  selectedStatuses.value = []
  selectedUrgencies.value = []
  searchQuery.value = ''
  selectedDate.value = ''
}

function closeDropdown(e) {
  if (!e.target.closest('.relative')) {
    showStatusFilter.value = false
    showUrgencyFilter.value = false
  }
}

const goToDetail = (code) =>
  router.push({ path: `/main/repair-detail/${code}`, state: { fromTechnician: true } })

function handleAccept(code) {
  currentAcceptCode.value = code
  showAcceptPopup.value = true
}

async function handleCloseJob(item) {
  const result = await Swal.fire({
    title: 'ปิดงานซ่อม',
    text: `คุณต้องการปิดงาน ${item.rf_code} ใช่หรือไม่`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ปิดงาน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#16a34a',
  })

  if (!result.isConfirmed) return

  try {
    const res = await fetch(
      `${API_BASE}/technician/close-job/${encodeURIComponent(item.rf_code)}`, // ✅ เปลี่ยน URL
      {
        method: 'PUT',
        headers: getAuthHeaders(),
      }
    )

    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(payload.message || 'ปิดงานไม่สำเร็จ')
    }

    Swal.fire('สำเร็จ', 'ปิดงานเรียบร้อยแล้ว', 'success')
    fetchAllRepairs()
  } catch (err) {
    Swal.fire('ผิดพลาด', err.message || 'ไม่สามารถปิดงานได้', 'error')
  }
}

function handleAcceptSuccess() {
  showAcceptPopup.value = false
  fetchAllRepairs()
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
  Toast.fire({
    title: 'รับงานสำเร็จ',
    icon: 'success',
    background: '#f0f9ff',
    color: '#1e3a8a',
  })
}

onMounted(() => {
  loadTokenData()
  fetchAllRepairs()
  document.addEventListener('click', closeDropdown)
  applyFilterFromUrl() // เรียกใช้ function ดึงค่าจาก URL
})

onBeforeUnmount(() => document.removeEventListener('click', closeDropdown))
</script>

<template>
  <div class="p-8 mx-auto bg-white shadow-md rounded-xl max-w-7xl">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-back">รายงานการแจ้งซ่อม</h1>
      <repairButtonComponent />
    </div>

    <div class="flex flex-wrap items-center gap-3 mb-6">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="ค้นหา"
        class="w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
      />
      <input
        v-model="selectedDate"
        type="date"
        class="h-10 px-3 text-gray-700 bg-white border border-gray-300 rounded-lg"
      />

      <div class="relative">
        <button
          @click.stop="showUrgencyFilter = !showUrgencyFilter"
          class="flex items-center gap-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg"
        >
          ความเร่งด่วน
          <img
            src="/icon/sidebar/chevron-down-icon.svg"
            class="w-4 h-4 opacity-70"
            :class="{ 'rotate-180': showUrgencyFilter }"
          />
        </button>
        <div
          v-if="showUrgencyFilter"
          class="absolute z-10 w-48 p-3 mt-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg"
        >
          <label class="flex items-center py-1"
            ><input
              type="checkbox"
              value="low"
              v-model="selectedUrgencies"
              class="w-4 h-4 text-blue-600"
            /><span class="ml-2">ไม่เร่งด่วน</span></label
          >
          <label class="flex items-center py-1"
            ><input
              type="checkbox"
              value="medium"
              v-model="selectedUrgencies"
              class="w-4 h-4 text-blue-600"
            /><span class="ml-2">เร่งด่วน</span></label
          >
          <label class="flex items-center py-1"
            ><input
              type="checkbox"
              value="high"
              v-model="selectedUrgencies"
              class="w-4 h-4 text-blue-600"
            /><span class="ml-2">เร่งด่วนมาก</span></label
          >
        </div>
      </div>

      <div class="relative">
        <button
          @click.stop="showStatusFilter = !showStatusFilter"
          class="flex items-center gap-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg"
        >
          สถานะ
          <img
            src="/icon/sidebar/chevron-down-icon.svg"
            class="w-4 h-4 opacity-70"
            :class="{ 'rotate-180': showStatusFilter }"
          />
        </button>
        <div
          v-if="showStatusFilter"
          class="absolute z-10 w-48 p-3 mt-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg"
        >
          <label class="flex items-center py-1"
            ><input
              type="checkbox"
              value="pending"
              v-model="selectedStatuses"
              class="w-4 h-4 text-blue-600"
            /><span class="ml-2">รอดำเนินการ</span></label
          >
          <label class="flex items-center py-1"
            ><input
              type="checkbox"
              value="in_progress"
              v-model="selectedStatuses"
              class="w-4 h-4 text-blue-600"
            /><span class="ml-2">กำลังดำเนินการ</span></label
          >
          <label class="flex items-center py-1"
            ><input
              type="checkbox"
              value="done"
              v-model="selectedStatuses"
              class="w-4 h-4 text-blue-600"
            /><span class="ml-2">เสร็จสิ้น</span></label
          >
        </div>
      </div>

      <transition name="fade">
        <button
          v-if="selectedStatuses.length || selectedUrgencies.length || searchQuery"
          @click="clearFilters"
          class="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ล้างตัวกรอง
        </button>
      </transition>
    </div>

    <TableComponent
      :columns="[
        'วันที่',
        'รหัสใบแจ้ง',
        'ผู้แจ้ง',
        'หน่วยงาน',
        'เรื่องที่แจ้ง',
        'สถานที่',
        'สถานะ',
        'ตัวดำเนินการ',
      ]"
      :rows="rowsForTable"
      :rawRows="rawRows"
      :perPage="10"
      mode="technician"
      @detail="goToDetail"
      @accept="handleAccept"
      @close-job="handleCloseJob"
    />
  </div>

  <acceptJobMadalComponent
    v-if="showAcceptPopup"
    :repairCode="currentAcceptCode"
    :currentUserId="tokenData?.us_id"
    @close="showAcceptPopup = false"
    @success="handleAcceptSuccess"
  />
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
