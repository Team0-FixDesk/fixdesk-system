<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import TableComponent from '@/components/table-component.vue'
import RepairButton from '@/components/repair-button-component.vue'
import { useRouter } from 'vue-router'
import Sweetalert from 'sweetalert2'

defineOptions({ name: 'MyListView' })

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

/* --- คอลัมน์ตาราง --- */
const columns = [
  'วันที่',
  'ใบแจ้งซ่อม',
  'หมายเลขครุภัณฑ์',
  'หน่วยงาน',
  'ความเร่งด่วน',
  'สถานะงาน',
  'ตัวดำเนินการ',
]

/* --- state / refs --- */
// rows: เก็บข้อมูลที่รับจาก API (แต่ละแถวเป็น array ตามที่ TableComponent คาดหวัง)
const rows = ref([])

// ช่องค้นหา
const searchQuery = ref('')

// ตัวกรองสถานะ และ ความเร่งด่วน
const selectedStatusFilters = ref([]) // ตัวกรองสถานะ (pending, in_progress, done)
const selectedUrgencyFilters = ref([]) // ตัวกรองความเร่งด่วน (low, medium, high)

// เปิด/ปิด dropdown
const statusFilterOpen = ref(false)
const urgencyFilterOpen = ref(false)

// เลือกวันที่
const selectedDate = ref('')

/* --- ฟังก์ชันช่วย (JWT decode) --- */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return {}
  }
}

/* --- ดึงข้อมูลรายการแจ้งซ่อมของผู้ใช้ --- */
/* ชื่อใหม่: loadMyRepairs เพื่อสื่อว่ากำลังโหลดข้อมูล */
async function loadMyRepairs() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) return
  const payload = parseJwt(token)
  const userId = payload.us_id

  try {
    // หาก API ต้องการ Authorization header ให้เพิ่ม headers: { Authorization: `Bearer ${token}` }
    const res = await fetch(`${API_BASE}/my-repairs/${userId}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')

    // แปลงข้อมูลเป็นรูปแบบที่ TableComponent คาดหวัง (array ของ array)
    rows.value = data.map((repair) => {
      // สร้าง badge สำหรับความเร่งด่วน (HTML string)
      let urgencyBadge = '-'
      switch (repair.rf_urgency) {
        case 'high':
          urgencyBadge = `<span class='inline-flex justify-center items-center w-36 h-8 rounded-full bg-red-100 text-red-600 font-semibold'>เร่งด่วนมาก</span>`
          break
        case 'medium':
          urgencyBadge = `<span class='inline-flex justify-center items-center w-36 h-8 rounded-full bg-amber-50 text-amber-500 font-semibold'>เร่งด่วน</span>`
          break
        case 'low':
          urgencyBadge = `<span class='inline-flex justify-center items-center w-36 h-8 rounded-full bg-green-100 text-green-600 font-semibold'>ไม่เร่งด่วน</span>`
          break
      }

      // สร้าง badge สำหรับสถานะงาน (HTML string)
      const statusBadge = (() => {
        switch (repair.rf_user_status) {
          case 'pending':
            return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-amber-50 text-amber-500 font-semibold">รอดำเนินการ</span>`
          case 'in_progress':
            return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">กำลังดำเนินการ</span>`
          case 'done':
            return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-green-100 text-green-600 font-semibold">ดำเนินการเสร็จสิ้น</span>`
          default:
            return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-gray-100 text-gray-500 font-semibold">ยกเลิก</span>`
        }
      })()

      return [
        new Date(repair.rf_create_at).toLocaleDateString('th-TH'),
        repair.rf_code,
        repair.rf_prop_number || '-',
        repair.department_name || '-',
        urgencyBadge,
        statusBadge,
        'actions',
      ]
    })
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
  }
}

/* --- computed: แถวที่จะแสดง (กรองแล้ว) --- */
/* ชื่อใหม่: visibleRows (อ่านว่า แถวที่เห็น/แสดง) */
const visibleRows = computed(() => {
  const q = searchQuery.value.toLowerCase()
  const selUrg = selectedUrgencyFilters.value
  const selStat = selectedStatusFilters.value
  const selDate = selectedDate.value

  return rows.value.filter((row) => {
    // row shape: [dateDisplay, code, propNumber, department, urgencyBadge, statusBadge, 'actions']
    const dateDisplay = String(row[0] || '')
    const code = String(row[1] || '').toLowerCase()
    const prop = String(row[2] || '').toLowerCase()
    const dept = String(row[3] || '').toLowerCase()
    const urgencyBadgeHtml = String(row[4] || '')
    const statusBadgeHtml = String(row[5] || '')

    // ค้นหาแบบพื้นฐาน (ใบแจ้งซ่อม / ครุภัณฑ์ / หน่วยงาน)
    const matchSearch = code.includes(q) || prop.includes(q) || dept.includes(q)

    // เนื่องจากเราเก็บ badge เป็น HTML string — หา key จากข้อความไทยใน badge
    const urgencyKey = urgencyBadgeHtml.includes('เร่งด่วนมาก')
      ? 'high'
      : urgencyBadgeHtml.includes('เร่งด่วน')
        ? 'medium'
        : urgencyBadgeHtml.includes('ไม่เร่งด่วน')
          ? 'low'
          : ''

    const statusKey = statusBadgeHtml.includes('รอดำเนินการ')
      ? 'pending'
      : statusBadgeHtml.includes('กำลังดำเนินการ')
        ? 'in_progress'
        : statusBadgeHtml.includes('ดำเนินการเสร็จสิ้น')
          ? 'done'
          : ''

    const matchUrgency = selUrg.length === 0 || selUrg.includes(urgencyKey)
    const matchStatus = selStat.length === 0 || selStat.includes(statusKey)

    const matchDate =
      !selDate ||
      new Date(dateDisplay).toLocaleDateString('th-TH') ===
        new Date(selDate).toLocaleDateString('th-TH')

    return matchSearch && matchUrgency && matchStatus && matchDate
  })
})

/* --- ฟังก์ชันสลับเปิด/ปิด Dropdown (ให้เปิดได้ทีละอัน) --- */
function toggleUrgencyFilter() {
  urgencyFilterOpen.value = !urgencyFilterOpen.value
  // ถ้าเปิด Urgency ให้ปิด Status ทันที
  if (urgencyFilterOpen.value) {
    statusFilterOpen.value = false
  }
}

function toggleStatusFilter() {
  statusFilterOpen.value = !statusFilterOpen.value
  // ถ้าเปิด Status ให้ปิด Urgency ทันที
  if (statusFilterOpen.value) {
    urgencyFilterOpen.value = false
  }
}

/* --- รีเซ็ตตัวกรอง --- */
function resetFilters() {
  selectedUrgencyFilters.value = []
  selectedStatusFilters.value = []
  searchQuery.value = ''
  selectedDate.value = ''
}

/* --- ปิด dropdown เมื่อคลิกรอบนอก --- */
function handleOutsideClick(e) {
  if (!e.target.closest('.relative')) {
    statusFilterOpen.value = false
    urgencyFilterOpen.value = false
  }
}

/* --- lifecycle --- */
onMounted(() => {
  loadMyRepairs()
  document.addEventListener('click', handleOutsideClick)
})
onBeforeUnmount(() => document.removeEventListener('click', handleOutsideClick))

/* --- ปุ่ม action --- */
const openDetail = (code) => router.push(`/main/repair-detail/${code}`)
const openEdit = (code) => router.push(`/main/repair-edit/${code}`)

/* --- ลบรายการ --- */
async function deleteRepair(repairCode) {
  const result = await Sweetalert.fire({
    title: 'ลบรายการนี้?',
    text: `คุณต้องการลบใบแจ้งซ่อมหมายเลข ${repairCode} หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ลบเลย',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#e53e3e',
  })
  if (!result.isConfirmed) return

  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const res = await fetch(`${API_BASE}/my-repairs/${repairCode}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'ลบไม่สำเร็จ')

    rows.value = rows.value.filter((r) => r[1] !== repairCode)
    Sweetalert.fire('สำเร็จ', 'ลบรายการเรียบร้อยแล้ว', 'success')
  } catch (err) {
    console.error('ลบไม่สำเร็จ:', err)
    Sweetalert.fire('เกิดข้อผิดพลาด', err.message, 'error')
  }
}
</script>

<template>
  <!-- ตาราง -->
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-black mb-6">รายการของฉัน</h1>
    <!-- ฟิลเตอร์ -->
    <div class="mb-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาใบแจ้งซ่อม / หน่วยงาน / ครุภัณฑ์"
            class="w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
          />
          <input
            v-model="selectedDate"
            type="date"
            class="h-10 px-3 rounded-lg border border-gray-300 bg-white text-gray-700"
          />

          <!-- ความเร่งด่วน -->
          <div class="relative">
            <button
              @click.stop="toggleUrgencyFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700"
            >
              ความเร่งด่วน
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200"
                :class="{ 'rotate-180': urgencyFilterOpen }"
                alt="toggle"
              />
            </button>
            <div
              v-if="urgencyFilterOpen"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10"
            >
              <label class="flex items-center py-1">
                <input
                  type="checkbox"
                  value="low"
                  v-model="selectedUrgencyFilters"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">ไม่เร่งด่วน</span>
              </label>
              <label class="flex items-center py-1">
                <input
                  type="checkbox"
                  value="medium"
                  v-model="selectedUrgencyFilters"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">เร่งด่วน</span>
              </label>
              <label class="flex items-center py-1">
                <input
                  type="checkbox"
                  value="high"
                  v-model="selectedUrgencyFilters"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">เร่งด่วนมาก</span>
              </label>
            </div>
          </div>

          <!-- สถานะ -->
          <div class="relative">
            <button
              @click.stop="toggleStatusFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700"
            >
              สถานะ
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200"
                :class="{ 'rotate-180': statusFilterOpen }"
                alt="toggle"
              />
            </button>
            <div
              v-if="statusFilterOpen"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10"
            >
              <label class="flex items-center py-1">
                <input
                  type="checkbox"
                  value="pending"
                  v-model="selectedStatusFilters"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">รอดำเนินการ</span>
              </label>
              <label class="flex items-center py-1">
                <input
                  type="checkbox"
                  value="in_progress"
                  v-model="selectedStatusFilters"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">กำลังดำเนินการ</span>
              </label>
              <label class="flex items-center py-1">
                <input
                  type="checkbox"
                  value="done"
                  v-model="selectedStatusFilters"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">ดำเนินการเสร็จสิ้น</span>
              </label>
            </div>
          </div>

          <!-- ปุ่มล้างตัวกรอง -->
          <transition name="fade">
            <button
              v-if="selectedStatusFilters.length || selectedUrgencyFilters.length || searchQuery"
              @click="resetFilters"
              class="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ล้างตัวกรอง
            </button>
          </transition>
        </div>

        <!-- ปุ่มแจ้งซ่อม -->
        <RepairButton />
      </div>
    </div>

    <!-- ตาราง -->
    <div class="p-3 mx-auto max-w-8xl">
      <TableComponent
        :columns="columns"
        :rows="visibleRows"
        :perPage="10"
        mode="user"
        @delete="deleteRepair"
        @detail="openDetail"
        @edit="openEdit"
      />
    </div>
  </div>
</template>
