<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { jwtDecode } from 'jwt-decode'

/* ========================
   Components
========================*/
import TableComponent from '@/components/table-component.vue'
import TableActionsComponent from '@/components/table-actions-component.vue'
import AcceptJobModal from '@/components/modal/accept-job-modal-component.vue'

/* =========================
   Router & API
======================== */
const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE

/* =========================
   Reactive State
======================== */
const tokenData = ref(null)
const tableRows = ref([])
const openMenuId = ref(null)

const searchQuery = ref('')
const selectedDate = ref('')
const selectedStatusFilter = ref('all')
const allowedStatuses = ['pending', 'in_progress', 'outsource']

const showAcceptPopup = ref(false)
const currentAcceptCode = ref(null)

/* =========================
   Utility Functions
======================== */

/**
 * โหลดข้อมูล token ของผู้ใช้งานจาก localStorage หรือ sessionStorage
 */
function loadTokenData() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) return

  try {
    tokenData.value = jwtDecode(token)
  } catch {
    tokenData.value = null
  }
}

/**
 * สร้าง Header สำหรับ API ที่มี Token
 * @returns {Object} headers
 */
function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) throw new Error('TOKEN_NOT_FOUND')
  return { Authorization: `Bearer ${token}` }
}

/* =========================
   Fetch & Data Processing
======================== */

/**
 * ดึงรายการแจ้งซ่อมจาก API และกรองเฉพาะสถานะที่อนุญาต
 */
async function loadRepairs() {
  try {
    const res = await fetch(`${API_BASE}/technician/repairs`, {
      headers: getAuthHeaders(),
    })

    if (res.status === 401) {
      Swal.fire('หมดเวลาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบใหม่', 'warning')
      router.push('/login')
      return
    }

    const data = await res.json()
    tableRows.value = data
      .filter(r => allowedStatuses.includes(r.rf_user_status))
      .map(formatRow)
  } catch (err) {
    Swal.fire('เกิดข้อผิดพลาด', err.message, 'error')
  }
}

/**
 * จัดรูปแบบข้อมูลแถวให้สอดคล้องกับ TableComponent
 * @param {Object} r - ข้อมูลการแจ้งซ่อม
 * @returns {Array} formattedRow
 */
function formatRow(r) {
  const fullName = `${r.us_first_name || ''} ${r.us_last_name || ''}`.trim()
  const place = [r.bd_name, r.fl_name, r.room_name].filter(Boolean).join(' / ') || '-'

  return [
    r.rf_code, // รหัสใบแจ้งซ่อม
    `วันที่แจ้ง: ${new Date(r.rf_create_at).toLocaleDateString('th-TH')} </br>
     ชื่อผู้แจ้ง: ${fullName}</br>
     หน่วยงาน: ${r.department_name}</br>
     เรื่องที่แจ้ง: ${r.rf_problem}</br>
     สถานที่: ${place}`,
    r.rf_user_status,
    '', // ช่องสำหรับ actions
  ]
}

/* =========================
   Computed Properties
======================== */

/**
 * คำนวณรายการที่ผ่านการค้นหาและกรองตามสถานะ
 */
const filteredRows = computed(() => {
  const query = searchQuery.value.toLowerCase()

  return tableRows.value.filter(row => {
    const matchSearch = row[0].toLowerCase().includes(query) || row[1].toLowerCase().includes(query)
    const matchStatus = selectedStatusFilter.value === 'all' || row[2] === selectedStatusFilter.value
    return matchSearch && matchStatus
  })
})

/* =========================
   Actions
======================== */

/**
 * เปิดหน้ารายละเอียดใบแจ้งซ่อม
 * @param {string} code - รหัสใบแจ้งซ่อม
 */
function goToDetail(code) {
  router.push({
    path: `/main/repair-detail/${code}`,
    state: { fromTechnician: true },
  })
}

/**
 * เปิด Modal เพื่อยืนยันการรับงาน
 * @param {string} code
 */
function handleAccept(code) {
  currentAcceptCode.value = code
  showAcceptPopup.value = true
}

/**
 * เปิดหน้า Stock List โดยบันทึก code ใน session
 * @param {string} code
 */
function handleOpenStock(code) {
  sessionStorage.setItem('selected_rf_code', code)
  router.push('/main/technician-stock-list')
}

/**
 * ปิดงานซ่อม (Close Job)
 * @param {string} code
 */
async function handleCloseJob(code) {
  const result = await Swal.fire({
    title: 'ปิดงานซ่อม',
    text: `คุณต้องการปิดงาน ${code} ใช่หรือไม่`,
    showCancelButton: true,
    confirmButtonText: 'ปิดงาน',
  })

  if (!result.isConfirmed) return

  try {
    const res = await fetch(`${API_BASE}/technician/close-job/${code}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tech_summary: 'งานเสร็จแล้ว',
        tech_remark: '',
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    Swal.fire('สำเร็จ', 'ปิดงานแล้ว', 'success')
    loadRepairs()
  } catch (err) {
    Swal.fire('ผิดพลาด', err.message, 'error')
  }
}

/* =========================
   Lifecycle Hooks
======================== */
onMounted(() => {
  loadTokenData()
  loadRepairs()
})
</script>

<template>
  <div class="max-w-7xl mx-auto p-8 bg-white rounded-xl shadow-md">
    <h1 class="mb-6 text-xl font-bold">รายการแจ้งซ่อมสำหรับช่าง</h1>

    <!-- Search & Filter Controls -->
    <div class="flex flex-wrap gap-3 mb-6">
      <input
        v-model="searchQuery"
        placeholder="ค้นหา: หมายเลข / ผู้แจ้ง / อาการเสีย"
        class="w-[260px] h-10 px-4 border border-gray-300 rounded-lg"
      />

      <input
        v-model="selectedDate"
        type="date"
        class="h-10 px-3 border border-gray-300 rounded-lg"
      />

      <select
        v-model="selectedStatusFilter"
        class="h-10 px-3 text-sm text-gray-700 border border-gray-300 rounded-lg"
      >
        <option value="all">ทุกสถานะ</option>
        <option value="pending">รอดำเนินการ</option>
        <option value="in_progress">กำลังดำเนินการ</option>
        <option value="outsource">จ้างช่างภายนอก</option>
      </select>
    </div>

    <!-- Table Component -->
    <TableComponent
      :columns="['รหัสใบแจ้ง', 'รายละเอียด', 'สถานะ', 'ดำเนินการ']"
      :rows="filteredRows"
      :perPage="10"
      :statusColumn="2"
      :columnAlign="['left', 'left', 'center', 'center']"
      :id-column-index="0"
      :id-column-as-link="true"
      @detail="goToDetail"
    >
      <template #cell-3="{ row }">
        <TableActionsComponent
          role="technician"
          :row-id="row[0]"
          :open-menu-id="openMenuId"
          :row="row"
          :status="row[2]"
          @toggle-menu="openMenuId = $event"
          @detail="goToDetail(row[0])"
          @accept="handleAccept(row[0])"
          @close-job="handleCloseJob(row[0])"
          @open-stock="handleOpenStock(row[0])"
        />
      </template>
    </TableComponent>

    <!-- Accept Job Modal -->
    <AcceptJobModal
      v-if="showAcceptPopup"
      :repairCode="currentAcceptCode"
      :currentUserId="tokenData?.us_id"
      @close="showAcceptPopup = false"
      @success="loadRepairs"
    />
  </div>
</template>
