<script setup>
/* ===================== Imports ===================== */
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Sweetalert from 'sweetalert2'

import TableComponent from '@/components/table-component.vue'
import TableActions from '@/components/table-actions-component.vue'
import RepairButton from '@/components/repair-button-component.vue'
import RepairFilterBar from '@/components/filters/repair-filter-bar-component.vue'

import { useAuthToken } from '@/composables/useAuthToken'


defineOptions({ name: 'MyListView' })

/* ===================== Router & Config ===================== */
const router = useRouter()
const route = useRoute()
const API_BASE = import.meta.env.VITE_API_BASE

/* ===================== Table Structure ===================== */
const tableColumns = [
  'หมายเลขแจ้งซ่อม',
  'ประเภทงาน',
  'รายละเอียด',
  'ความเร่งด่วน',
  'สถานะงาน',
  'ตัวดำเนินการ',
]

const tableRows = ref([])
const openMenuId = ref(null)


const { token, userId, isAuthenticated, logout } = useAuthToken()

/* ===================== Filters ===================== */
const searchInput = ref('')
const selectedStatuses = ref([])
const selectedUrgencies = ref([])
const selectedDate = ref('')

/* ===================== Utils ===================== */
function extractThaiDate(cell) {
  const match = cell.match(/วันที่แจ้ง:\s*([\d/]+)/)
  return match ? match[1] : null
}

/* ===================== Data Loader ===================== */
async function loadMyRepairs() {
  if (!isAuthenticated.value) {
    logout()
    return
  }

  try {
    const response = await fetch(`${API_BASE}/my-repairs/${userId.value}`, {
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'LOAD_FAILED')
    }

    tableRows.value = data.map((repair) => {
      const location = repair.bd_name
        ? `${repair.bd_name} ${repair.fl_name} ${repair.room_name}`
        : '-'

      return [
        repair.rf_code,
        repair.tt_name,
        'วันที่แจ้ง: ' +
          new Date(repair.rf_create_at).toLocaleDateString('th-TH') +
          '<br>' +
          'สถานที่: ' +
          location,
        repair.rf_urgency,
        repair.rf_user_status,
        '',
      ]
    })
  } catch (error) {
    console.error('Load my repairs failed:', error.message)
  }
}


/* ===================== Computed ===================== */
const filteredRows = computed(() => {
  const search = searchInput.value.toLowerCase()
  const dateFilter = selectedDate.value

  return tableRows.value.filter((row) => {
    const dateFromRow = extractThaiDate(row[2])
    const code = String(row[0]).toLowerCase()
    const type = String(row[1]).toLowerCase()
    const location = String(row[2]).toLowerCase()
    const urgency = row[3]
    const status = row[4]

    // ค้นหา
    const matchesSearch =
      code.includes(search) || type.includes(search) || location.includes(search)

    // Filter urgencies
    const matchesUrgency =
      selectedUrgencies.value.length === 0 || selectedUrgencies.value.includes(urgency)

    // Filter status
    const matchesStatus =
      selectedStatuses.value.length === 0 || selectedStatuses.value.includes(status)

    // Filter by date
    const matchesDate =
      !dateFilter || dateFromRow === new Date(dateFilter).toLocaleDateString('th-TH')

    return matchesSearch && matchesUrgency && matchesStatus && matchesDate
  })
})

/* ===================== Actions ===================== */
function resetFilters() {
  selectedUrgencies.value = []
  selectedStatuses.value = []
  searchInput.value = ''
  selectedDate.value = ''
}

// Navigation handlers
const openDetail = (code) => router.push(`/main/repair-detail/${code}`)
const openEdit = (code) => router.push(`/main/repair-edit/${code}`)

// Delete Repair
async function deleteRepair(repairCode) {
  if (!isAuthenticated.value) {
    logout()
    return
  }
  const confirm = await Sweetalert.fire({
    title: 'ลบรายการนี้?',
    text: `คุณต้องการลบใบแจ้งซ่อมหมายเลข ${repairCode} หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ลบเลย',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#e53e3e',
  })

  if (!confirm.isConfirmed) return

  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const response = await fetch(`${API_BASE}/my-repairs/${repairCode}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.message)

    tableRows.value = tableRows.value.filter((row) => row[0] !== repairCode)

    Sweetalert.fire({
      toast: true,
      position: 'top-end',
      title: 'ลบสำเร็จ',
      text: `ลบใบแจ้งซ่อมหมายเลข ${repairCode} แล้ว`,
      icon: 'success',
      timer: 2500,
      showConfirmButton: false,
    })
  } catch (err) {
    Sweetalert.fire({
      toast: true,
      position: 'top-end',
      title: 'เกิดข้อผิดพลาด',
      text: err.message,
      icon: 'error',
      timer: 2500,
      showConfirmButton: false,
    })
  }
}

/* ===================== Lifecycle ===================== */
onMounted(() => {
  loadMyRepairs()
  // pre-filter จาก query เช่น ?status=pending
  if (route.query.status && ['pending', 'in_progress', 'done'].includes(route.query.status)) {
    selectedStatuses.value = [route.query.status]
  }
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-black mb-6">รายการของฉัน</h1>

    <RepairFilterBar
      mode="repair"
      v-model:search="searchInput"
      v-model:statuses="selectedStatuses"
      v-model:urgencies="selectedUrgencies"
      v-model:date="selectedDate"
      @reset="resetFilters"
    >
      <template #right>
        <RepairButton />
      </template>
    </RepairFilterBar>

    <!-- ------------------ Table ------------------ -->
    <div class="p-3 mx-auto max-w-8xl">
      <TableComponent
        :columns="tableColumns"
        :rows="filteredRows"
        :perPage="10"
        :urgencyColumn="3"
        :statusColumn="4"
        :columnAlign="['left', 'left', 'left', 'center', 'center', 'center']"
        :id-column-index="0"
        @detail="openDetail"
      >
        <!-- คอลัมน์ Action (index 6) -->
        <template #cell-5="{ row }">
          <TableActions
            :row-id="row[0]"
            :open-menu-id="openMenuId"
            @toggle-menu="openMenuId = $event"
            role="user"
            :row="row"
            :status="row[4]"
            @detail="openDetail(row[0])"
            @edit="openEdit(row[0])"
            @delete="deleteRepair(row[0])"
          />
        </template>
      </TableComponent>
    </div>
  </div>
</template>
