<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import TableComponent from '@/components/table-component.vue'
import assignJobModalComponent from '@/components/assign-job-modal-component.vue'
import Swal from 'sweetalert2'

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

const columns = [
  'วันที่',
  'หมายเลขแจ้งซ่อม',
  'ชื่อผู้แจ้ง',
  'หน่วยงาน',
  'ประเภท',
  'ความเร่งด่วน',
  'สถานะงาน',
  'การดำเนินการ',
]

const rows = ref([])
const searchQuery = ref('')
const selectedStatuses = ref([])
const selectedUrgencies = ref([])
const showStatusFilter = ref(false)
const showUrgencyFilter = ref(false)
const selectedDate = ref('')

// ดึงข้อมูลรายการแจ้งซ่อมทั้งหมด (Admin)
async function fetchAllRepairs() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      Swal.fire('หมดเวลาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบใหม่', 'warning')
      router.push('/login')
      return
    }

    const res = await fetch(`${API_BASE}/admin/repairs`, { headers: getAuthHeaders() })
    if (res.status === 401) {
      Swal.fire('หมดเวลาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบใหม่', 'warning')
      sessionStorage.removeItem('token')
      localStorage.removeItem('token')
      router.push('/login')
      return
    }

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')

    rows.value = data.map((r) => {
      const urgencyBadge =
        {
          low: `<span class="inline-flex items-center justify-center h-8 font-medium text-green-600 bg-green-100 rounded-full w-28">ไม่เร่งด่วน</span>`,
          medium: `<span class="inline-flex items-center justify-center h-8 font-medium text-yellow-600 bg-yellow-100 rounded-full w-28">เร่งด่วน</span>`,
          high: `<span class="inline-flex items-center justify-center h-8 font-medium text-red-600 bg-red-100 rounded-full w-28">เร่งด่วนมาก</span>`,
        }[r.rf_urgency] || '-'

      const statusBadge =
        {
          pending: `<span class="inline-flex items-center justify-center h-8 font-medium rounded-full w-28 bg-amber-100 text-amber-700">รอดำเนินการ</span>`,
          in_progress: `<span class="inline-flex items-center justify-center h-8 font-medium text-blue-700 bg-blue-100 rounded-full w-28">กำลังดำเนินการ</span>`,
          done: `<span class="inline-flex items-center justify-center h-8 font-medium text-green-700 bg-green-100 rounded-full w-28">เสร็จสิ้น</span>`,
        }[r.rf_user_status] || '-'

      const createdAt = new Date(r.rf_create_at)
      const isAssigned = !!r.rf_assigned_tech_id

      return {
        date: createdAt, //วันที่ (Date object)
        code: r.rf_code, //หมายเลขแจ้งซ่อม
        requester: `${r.us_first_name} ${r.us_last_name}`, //ชื่อผู้แจ้ง
        department: r.department_name || '-', //หน่วยงาน
        type: r.tt_name || '-', //ประเภท
        urgencyKey: r.rf_urgency, // ความเร่งด่วน (key)
        statusKey: r.rf_user_status, // สถานะงาน (key)
        assigned: isAssigned,
        dateDisplay: createdAt.toLocaleDateString('th-TH'),
        urgencyBadge,
        statusBadge,
      }
    })
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
    // Toast notification
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    })
    Toast.fire({
      title: 'เกิดข้อผิดพลาด',
      text: err.message,
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626'
    })

    // Normal Alert (commented for session-related errors)
    // Swal.fire('เกิดข้อผิดพลาด', err.message, 'error')
  }
}

// FILTER
const filteredRows = computed(() => {
  const q = searchQuery.value.toLowerCase()
  const selectedDateObj = selectedDate.value ? new Date(selectedDate.value) : null

  // กรองข้อมูลตามเงื่อนไข
  const filtered = rows.value.filter((r) => {
    const matchSearch =
      r.code.toLowerCase().includes(q) ||
      r.requester.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q)

    const matchUrgency =
      selectedUrgencies.value.length === 0 || selectedUrgencies.value.includes(r.urgencyKey)
    const matchStatus =
      selectedStatuses.value.length === 0 || selectedStatuses.value.includes(r.statusKey)
    const matchDate = !selectedDateObj || r.date.toDateString() === selectedDateObj.toDateString()

    return matchSearch && matchUrgency && matchStatus && matchDate
  })

  // เรียงลำดับ: 1) ยังไม่มอบหมายขึ้นด้านบน 2) เรียงตามวันที่เก่าก่อน
  const sorted = filtered.sort((a, b) => {
    // ตรวจสอบการมอบหมาย (ยังไม่มอบหมาย ขึ้นบน)
    if (!a.assigned && b.assigned) return -1 // a ไม่มอบหมาย ขึ้นบน
    if (a.assigned && !b.assigned) return 1 // b ไม่มอบหมาย ขึ้นบน

    // ถ้าสถานะการมอบหมายเท่ากัน เรียงตามวันที่เก่าก่อน
    return a.date - b.date
  })

  // แปลงเป็นรูปแบบที่ TableComponent ต้องการ
  return sorted.map((r) => [
    r.dateDisplay,
    r.code,
    r.requester,
    r.department,
    r.type,
    r.urgencyBadge,
    r.statusBadge,
    'actions',
  ])
})

// Functions for Filters
function toggleStatusFilter() {
  showStatusFilter.value = !showStatusFilter.value
  if (showStatusFilter.value) {
    showUrgencyFilter.value = false
  }
}

function toggleUrgencyFilter() {
  showUrgencyFilter.value = !showUrgencyFilter.value
  if (showUrgencyFilter.value) {
    showStatusFilter.value = false
  }
}

function clearFilters() {
  selectedStatuses.value = []
  selectedUrgencies.value = []
  searchQuery.value = ''
  selectedDate.value = ''
}

function closeDropdown(e) {
  // ปิดทุก Dropdown ถ้าคลิกข้างนอก
  if (!e.target.closest('.relative')) {
    showStatusFilter.value = false
    showUrgencyFilter.value = false
  }
}
// ACTION BUTTONS
const goToDetail = (code) =>
  router.push({
    path: `/main/repair-detail/${code}`,
    state: { fromAdmin: true }, 
  })

async function handleAssign(code) {
  // เปลี่ยนเป็น Toast แทน Timer Alert
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
      }
    })
  const result = await Swal.fire({
    title: 'มอบหมายงาน',
    text: `ต้องการมอบหมายใบแจ้งซ่อม ${code} หรือไม่?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
  })
  if (result.isConfirmed) {
    Toast.fire({
      title: 'สำเร็จ',
      text: 'มอบหมายงานเรียบร้อยแล้ว',
      icon: 'success',
      background: '#f0f9ff',
      color: '#1e3a8a'
    })
  }
}

// Popup มอบหมายงาน
const showAssignPopup = ref(false)
const selectedRepairId = ref(null)

/* เปิด popup */
function openAssignPopup(repairId) {
  selectedRepairId.value = repairId
  showAssignPopup.value = true
}
function handleAssignSuccess() {
  fetchAllRepairs() // รีโหลดตาราง
}

onMounted(() => {
  fetchAllRepairs()
  document.addEventListener('click', closeDropdown)
})
onBeforeUnmount(() => document.removeEventListener('click', closeDropdown))
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-back mb-6">ตรวจสอบคำร้องแจ้งซ่อมทั้งหมด</h1>
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="ค้นหาใบแจ้งซ่อม / ผู้แจ้ง / ประเภท"
        class="w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
      />
      <input
        v-model="selectedDate"
        type="date"
        class="h-10 px-3 text-gray-700 bg-white border border-gray-300 rounded-lg"
      />
      <div class="relative">
        <button
          @click.stop="toggleStatusFilter"
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
          <label class="flex items-center py-1">
            <input
              type="checkbox"
              value="pending"
              v-model="selectedStatuses"
              class="w-4 h-4 text-blue-600"
            />
            <span class="ml-2">รอดำเนินการ</span>
          </label>
          <label class="flex items-center py-1">
            <input
              type="checkbox"
              value="in_progress"
              v-model="selectedStatuses"
              class="w-4 h-4 text-blue-600"
            />
            <span class="ml-2">กำลังดำเนินการ</span>
          </label>
          <label class="flex items-center py-1">
            <input
              type="checkbox"
              value="done"
              v-model="selectedStatuses"
              class="w-4 h-4 text-blue-600"
            />
            <span class="ml-2">เสร็จสิ้น</span>
          </label>
        </div>
      </div>
      <div class="relative">
        <button
          @click.stop="toggleUrgencyFilter"
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
          <label class="flex items-center py-1">
            <input
              type="checkbox"
              value="low"
              v-model="selectedUrgencies"
              class="w-4 h-4 text-blue-600"
            />
            <span class="ml-2">ไม่เร่งด่วน</span>
          </label>
          <label class="flex items-center py-1">
            <input
              type="checkbox"
              value="medium"
              v-model="selectedUrgencies"
              class="w-4 h-4 text-blue-600"
            />
            <span class="ml-2">เร่งด่วน</span>
          </label>
          <label class="flex items-center py-1">
            <input
              type="checkbox"
              value="high"
              v-model="selectedUrgencies"
              class="w-4 h-4 text-blue-600"
            />
            <span class="ml-2">เร่งด่วนมาก</span>
          </label>
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
      :columns="columns"
      :rows="filteredRows"
      :raw-rows="rows"
      :perPage="10"
      mode="assign"
      @detail="goToDetail"
      @assign="openAssignPopup"
    />
  </div>
  <assignJobModalComponent
    v-if="showAssignPopup"
    :repairId="selectedRepairId"
    @close="showAssignPopup = false"
    @success="handleAssignSuccess"
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
/* สไตล์สำหรับ Scrollbar ใน Dropdown */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}
</style>
