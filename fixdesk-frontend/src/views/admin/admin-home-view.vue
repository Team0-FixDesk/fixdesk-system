<script setup>
import CardHomeComponent from '@/components/card-home-component.vue'
import repairButtonComponent from '@/components/repair-button-component.vue'
import TableComponent from '@/components/table-component.vue'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Sweetalert from 'sweetalert2'

const router = useRouter()

/* --- API state --- */
const repairRequests = ref([])
const loading = ref(false)
const error = ref(null)

/* --- map helpers (ประกาศก่อน rowsForTable) --- */
const mapUrgency = (urgency) => {
  const urgencyMap = {
    high: 'เร่งด่วนมาก',
    medium: 'เร่งด่วน',
    low: 'ไม่เร่งด่วน',
  }
  return urgencyMap[urgency] || 'เร่งด่วน'
}

const mapStatus = (status) => {
  const statusMap = {
    pending: 'รอดำเนินการ',
    in_progress: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก',
  }
  return statusMap[status] || 'รอดำเนินการ'
}

/* --- ดึงข้อมูลจาก API --- */
const fetchRepairRequests = async () => {
  loading.value = true
  error.value = null
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      throw new Error('ไม่พบ token การเข้าสู่ระบบ')
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE}/admin/repairs`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      throw new Error('เกิดข้อผิดพลาดในการดึงข้อมูล')
    }

    const data = await response.json()
    repairRequests.value = data.map((item) => ({
      date: new Date(item.rf_create_at).toLocaleDateString('th-TH'),
      rawDate: new Date(item.rf_create_at),
      ticketId: item.rf_code,
      requesterName: `${item.us_first_name || ''} ${item.us_last_name || ''}`.trim(),
      type: item.tt_name || '-',
      assetId: item.rf_prop_number || '-',
      department: item.department_name || '-',
      urgency: mapUrgency(item.rf_urgency),
      status: mapStatus(item.rf_user_status),
      technicianName:
        item.tech_first_name && item.tech_last_name
          ? `${item.tech_first_name} ${item.tech_last_name}`
          : 'ยังไม่มอบหมาย',
    }))
  } catch (err) {
    console.error('Error fetching repair requests:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

/* --- แปลงเป็น rows สำหรับ TableComponent (array of arrays) --- */
// แปลง repairRequests -> rows ที่มีคอลัมน์ครบตามต้องการ
const rowsForTable = computed(() =>
  repairRequests.value.map((r) => {
    const urgencyHtml =
      r.urgency === 'เร่งด่วนมาก'
        ? `<span class='inline-flex justify-center items-center w-28 h-8 rounded-full bg-red-100 text-red-600 font-semibold'>เร่งด่วนมาก</span>`
        : r.urgency === 'เร่งด่วน'
          ? `<span class='inline-flex justify-center items-center w-28 h-8 rounded-full bg-amber-50 text-amber-500 font-semibold'>เร่งด่วน</span>`
          : `<span class='inline-flex justify-center items-center w-28 h-8 rounded-full bg-green-100 text-green-600 font-semibold'>ไม่เร่งด่วน</span>`

    const statusHtml =
      r.status === 'รอดำเนินการ'
        ? `<span class='inline-flex justify-center items-center w-28 h-8 rounded-full bg-amber-50 text-amber-500 font-semibold'>รอดำเนินการ</span>`
        : r.status === 'กำลังดำเนินการ'
          ? `<span class='inline-flex justify-center items-center w-28 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold'>กำลังดำเนินการ</span>`
          : r.status === 'เสร็จสิ้น'
            ? `<span class='inline-flex justify-center items-center w-28 h-8 rounded-full bg-green-100 text-green-600 font-semibold'>เสร็จสิ้น</span>`
            : `<span class='inline-flex justify-center items-center w-28 h-8 rounded-full bg-gray-100 text-gray-500 font-semibold'>ยกเลิก</span>`

    return [
      r.date || '-', // วันที่
      r.ticketId || '-', // ใบแจ้งซ่อม
      r.requesterName || '-', // ชื่อผู้แจ้ง
      r.type || '-', // ประเภท
      r.department || '-', // หน่วยงาน
      urgencyHtml, // ความเร่งด่วน (HTML badge)
      statusHtml, // สถานะงาน (HTML badge)
      'actions', // ปุ่มรายละเอียด / edit / delete (TableComponent จะเรนเดอร์)
    ]
  }),
)

/* --- สถิติ (เดิม) --- */
const isToday = (request) => {
  const today = new Date()
  const date = request.rawDate || new Date(request.date)
  return date.toDateString() === today.toDateString()
}

const isWithinLastSevenDays = (request) => {
  const today = new Date()
  const date = request.rawDate || new Date(request.date)
  const diffTime = Math.abs(today - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 7
}

const todayTasksCount = computed(
  () => repairRequests.value.filter((request) => isToday(request)).length,
)
const inProgressTasksCount = computed(
  () => repairRequests.value.filter((request) => request.status === 'กำลังดำเนินการ').length,
)
const completedTasksCount = computed(
  () =>
    repairRequests.value.filter(
      (request) => request.status === 'เสร็จสิ้น' && isWithinLastSevenDays(request),
    ).length,
)
const cancelledTasksCount = computed(
  () =>
    repairRequests.value.filter(
      (request) => request.status === 'ยกเลิก' && isWithinLastSevenDays(request),
    ).length,
)

const statItems = computed(() => [
  { value: todayTasksCount.value, label: 'งานทั้งหมดในวันนี้', colorClass: 'text-blue-600' },
  { value: inProgressTasksCount.value, label: 'กำลังดำเนินการ', colorClass: 'text-orange-500' },
  { value: completedTasksCount.value, label: 'เสร็จสิ้น (7 วัน)', colorClass: 'text-green-600' },
  { value: cancelledTasksCount.value, label: 'ยกเลิก (7 วัน)', colorClass: 'text-red-600' },
])

/* --- Pagination (ถ้า TableComponent มี pagination ในตัว คุณอาจไม่ต้องใช้ค่าพวกนี้) --- */
const itemsPerPage = 5

/* --- Actions --- */
const goToRepairDetail = (ticketId) => {
  router.push(`/main/repair-detail/${ticketId}`)
}

/* ลบรายการ (Admin) */
async function deleteRepair(ticketId) {
  const result = await Sweetalert.fire({
    title: 'ลบรายการนี้?',
    text: `คุณต้องการลบใบแจ้งซ่อมหมายเลข ${ticketId} หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ลบเลย',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#e53e3e',
  })
  if (!result.isConfirmed) return

  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/admin/repairs/${ticketId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.message || 'ลบไม่สำเร็จ')

    // เอาออกจาก repairRequests
    repairRequests.value = repairRequests.value.filter((r) => r.ticketId !== ticketId)
    Sweetalert.fire('สำเร็จ', 'ลบรายการเรียบร้อยแล้ว', 'success')
  } catch (err) {
    console.error('ลบไม่สำเร็จ:', err)
    Sweetalert.fire('เกิดข้อผิดพลาด', err.message || 'ลบไม่สำเร็จ', 'error')
  }
}

/* --- onMounted --- */
onMounted(() => {
  fetchRepairRequests()
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-8xl">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">หน้าแรก</h1>
        <p class="text-gray-600">ภาพรวมงานแจ้งเรียนแจ้งซ่อม</p>
      </div>
      <div class="flex space-x-2">
        <button
          @click="fetchRepairRequests"
          :disabled="loading"
          class="bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded-md flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          รีเฟรช
        </button>
        <repairButtonComponent />
      </div>
    </div>

    <!-- Stats -->
    <CardHomeComponent :items="statItems" />

    <!-- Table (ใช้ TableComponent) -->
    <div class="p-3 mx-auto max-w-8xl">
      <TableComponent
        :columns="[
          'วันที่',
          'ใบแจ้งซ่อม',
          'ชื่อผู้แจ้ง',
          'ประเภท',
          'หน่วยงาน',
          'ความเร่งด่วน',
          'สถานะงาน',
          'รายละเอียด',
        ]"
        :rows="rowsForTable"
        :raw-rows="repairRequests"
        :perPage="itemsPerPage"
        mode="admin"
        @detail="(payload) => goToRepairDetail(payload?.ticketId || payload || payload?.id)"
        @delete="(payload) => deleteRepair(payload?.ticketId || payload || payload?.id)"
      />
    </div>
  </div>
</template>

<style>
.empty-row td {
  border-bottom: 1px solid #e5e7eb;
}
</style>
