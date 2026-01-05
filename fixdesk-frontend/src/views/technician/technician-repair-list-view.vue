<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import TableComponent from '@/components/table-component.vue'
import TableActionsComponent from '@/components/table-actions-component.vue'
import acceptJobModal from '@/components/modal/accept-job-modal-component.vue'

import Swal from 'sweetalert2'
import { jwtDecode } from 'jwt-decode'

// Router & API
const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE

// State
const tokenData = ref(null)
const tableRows = ref([])
const openMenuId = ref(null)

const searchQuery = ref('')
const selectedDate = ref('')
const selectedStatus = ref(['pending', 'in_progress'])

const showAcceptPopup = ref(false)
const currentAcceptCode = ref(null)

// Load token info
function loadTokenData() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) return

  try {
    tokenData.value = jwtDecode(token)
  } catch {
    tokenData.value = null
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) {
    throw new Error('TOKEN_NOT_FOUND')
  }
  return { Authorization: `Bearer ${token}` }
}

// Fetch repairs
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
    tableRows.value = data.map(formatRow)
  } catch (err) {
    Swal.fire('เกิดข้อผิดพลาด', err.message, 'error')
  }
}

// สร้าง row array ใหม่ตาม TableComponent มาตรฐาน
function formatRow(r) {
  const fullName = `${r.us_first_name || ''} ${r.us_last_name || ''}`.trim()

  const place = [r.bd_name, r.fl_name, r.room_name].filter(Boolean).join(' / ') || '-'

  return [
    r.rf_code, // 1 รหัสใบแจ้งซ่อม
    'วันที่แจ้ง: ' +
      new Date(r.rf_create_at).toLocaleDateString('th-TH') +
      '</br>' +
      'ชื่อผู้แจ้ง: ' +
      fullName +
      '</br>' +
      'หน่วยงาน: ' +
      r.department_name +
      '</br>' +
      'เรื่องที่แจ้ง: ' +
      r.rf_problem +
      '</br>' +
      'สถานที่: ' +
      place,
    r.rf_user_status,
    '', // 7 actions slot
  ]
}

// Computed Filtering
const filteredRows = computed(() => {
  const q = searchQuery.value.toLowerCase()

  return tableRows.value.filter((row) => {
    const matchSearch =
      row[0].toLowerCase().includes(q) || // รหัส
      row[1].toLowerCase().includes(q) || // รายละเอียด
      row[1].toLowerCase().includes(q) // สถานที่

    const matchStatus = selectedStatus.value.length === 0 || selectedStatus.value.includes(row[2])

    return matchSearch && matchStatus
  })
})

// Actions
function goToDetail(code) {
  router.push({
    path: `/main/repair-detail/${code}`,
    state: { fromTechnician: true },
  })
}

function handleAccept(code) {
  currentAcceptCode.value = code
  showAcceptPopup.value = true
}

function handleOpenStock(code) {
  sessionStorage.setItem('selected_rf_code', code)
  router.push('/main/technician-stock-list')
}

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

// Lifecycle
onMounted(() => {
  loadTokenData()
  loadRepairs()
})
</script>

<template>
  <div class="p-8 mx-auto max-w-7xl bg-white rounded-xl shadow-md">
    <h1 class="text-xl font-bold mb-6">รายการแจ้งซ่อมสำหรับช่าง</h1>

    <!-- Search -->
    <div class="flex gap-3 mb-6">
      <input
        v-model="searchQuery"
        placeholder="ค้นหา: หมายเลข / ผู้แจ้ง / อาการเสีย"
        class="w-[260px] h-10 px-4 rounded-lg border border-gray-300"
      />

      <input
        v-model="selectedDate"
        type="date"
        class="h-10 px-3 rounded-lg border border-gray-300"
      />
    </div>

    <!-- Table -->
    <TableComponent
      :columns="['รหัสใบแจ้ง', 'รายละเอียด', 'สถานะ', 'ดำเนินการ']"
      :rows="filteredRows"
      :perPage="10"
      :statusColumn="2"
      :columnAlign="['left', 'left','center', 'center']"
    >
      <template #cell-3="{ row }">
        <TableActionsComponent
          role="technician"
          :row-id="row[0]"
          :open-menu-id="openMenuId"
          @toggle-menu="openMenuId = $event"
          :row="row"
          :status="row[2]"
          @detail="goToDetail(row[0])"
          @accept="handleAccept(row[0])"
          @close-job="handleCloseJob(row[0])"
          @open-stock="handleOpenStock(row[0])"
        />
      </template>
    </TableComponent>

    <!-- Accept Job Modal -->
    <acceptJobModal
      v-if="showAcceptPopup"
      :repairCode="currentAcceptCode"
      :currentUserId="tokenData?.us_id"
      @close="showAcceptPopup = false"
      @success="loadRepairs"
    />
  </div>
</template>
