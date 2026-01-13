<script setup>
/* =========================
  Imports (external)
========================= */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

/* =========================
  Imports (internal components)
========================= */
import TableComponent from '@/components/table-component.vue'
import TableActions from '@/components/table-actions-component.vue'
import AssignJobModalComponent from '@/components/modal/assign-job-modal-component.vue'
import RepairFilterBar from '@/components/filters/repair-filter-bar-component.vue'

/* =========================
  Constants
========================= */
const API_BASE = import.meta.env.VITE_API_BASE

const STORAGE_KEYS = {
  token: 'token',
}

const TABLE_COLUMNS = [
  'หมายเลขแจ้งซ่อม',
  'รายละเอียด',
  'ความเร่งด่วน',
  'สถานะงาน',
  'การดำเนินการ',
]

const TH_LOCALE = 'th-TH'

/* =========================
  Router
========================= */
const router = useRouter()

/* =========================
  State (Filters for RepairFilterBar)
  (ชื่อคงเดิมเพราะ template ใช้งานอยู่)
========================= */
const searchInput = ref('')
const selectedUrgencies = ref([])
const selectedStatuses = ref([])
const selectedDate = ref('')

/* =========================
  State (UI / Modal)
========================= */
const showAssignModal = ref(false)
const assignRepairId = ref(null)
const openMenuId = ref(null)

/* =========================
  State (Table)
========================= */
const tableColumns = TABLE_COLUMNS
const tableRows = ref([])

/* =========================
  Helpers (reusable functions)
========================= */
function getAuthToken() {
  return sessionStorage.getItem(STORAGE_KEYS.token) || localStorage.getItem(STORAGE_KEYS.token)
}

function toLocalYmd(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatThaiDate(dateInput) {
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString(TH_LOCALE)
}

function buildRepairDetailHtml(repair) {
  const reporterName = `${repair.us_first_name ?? ''} ${repair.us_last_name ?? ''}`.trim()

  // NOTE: TableComponent น่าจะ render เป็น HTML (จึงคง </br> ตามของเดิมเพื่อไม่กระทบ UI)
  return (
    'วันที่แจ้ง: ' +
    formatThaiDate(repair.rf_create_at) +
    '</br>' +
    'ชื่อผู้แจ้ง: ' +
    reporterName +
    '</br>' +
    'หน่วยงาน: ' +
    (repair.department_name ?? '-') +
    '</br>' +
    'ประเภทแจ้งซ่อม : ' +
    (repair.tt_name ?? '-')
  )
}

async function fetchAdminRepairs() {
  const token = getAuthToken()
  if (!token) {
    console.error('Token not found. User may not be logged in.')
    return []
  }

  const response = await fetch(`${API_BASE}/admin/repairs`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.message || 'Failed to load repairs.'
    throw new Error(message)
  }

  // รองรับทั้งแบบเป็น array ตรง ๆ หรือห่อด้วย data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data

  return []
}

function mapRepairToTableRow(repair) {
  const createdDate = new Date(repair.rf_create_at)

  return {
    row: [
      repair.rf_code,
      buildRepairDetailHtml(repair),
      repair.rf_urgency,
      repair.rf_user_status,
      '',
    ],
    meta: {
      ...repair,
      createdDate: Number.isNaN(createdDate.getTime()) ? new Date(0) : createdDate,
    },
  }
}

/* =========================
  Data loader (template ใช้งานชื่อ loadAdminRepairs)
========================= */
async function loadAdminRepairs() {
  try {
    const repairs = await fetchAdminRepairs()
    tableRows.value = repairs.map(mapRepairToTableRow)
  } catch (error) {
    console.error('Failed to load admin repairs:', error?.message || error)
  }
}

/* =========================
  Computed: Filtered Rows
========================= */
const filteredRows = computed(() => {
  const search = (searchInput.value || '').toLowerCase()

  return tableRows.value.filter((item) => {
    const row = item.row
    const urgency = row[2]
    const status = row[3]

    const matchesSearch = row.join(' ').toLowerCase().includes(search)

    const matchesUrgency =
      selectedUrgencies.value.length === 0 || selectedUrgencies.value.includes(urgency)

    const matchesStatus =
      selectedStatuses.value.length === 0 || selectedStatuses.value.includes(status)

    const matchesDate =
      !selectedDate.value || toLocalYmd(item.meta.createdDate) === selectedDate.value

    return matchesSearch && matchesUrgency && matchesStatus && matchesDate
  })
})

/* =========================
  Actions (event handlers)
  (ชื่อคงเดิมเพราะ template เรียกใช้)
========================= */
const resetFilters = () => {
  searchInput.value = ''
  selectedUrgencies.value = []
  selectedStatuses.value = []
  selectedDate.value = ''
}

const openDetail = (code) => {
  router.push(`/main/repair-detail/${code}`)
}

const openAssignModal = (row) => {
  assignRepairId.value = row[0]
  showAssignModal.value = true
}

/* =========================
  Lifecycle
========================= */
onMounted(() => {
  loadAdminRepairs()
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-black mb-6">รายการแจ้งซ่อมทั้งหมด</h1>

    <!-- ---------------- Filters ---------------- -->
    <RepairFilterBar
      v-model:search="searchInput"
      v-model:urgencies="selectedUrgencies"
      v-model:statuses="selectedStatuses"
      v-model:date="selectedDate"
      @reset="resetFilters"
    />

    <!-- ---------------- Table ---------------- -->
    <TableComponent
      :columns="tableColumns"
      :rows="filteredRows.map((item) => item.row)"
      :perPage="10"
      :urgencyColumn="2"
      :statusColumn="3"
      :columnAlign="['left', 'left', 'center', 'center', 'center']"
    >
      <!-- คอลัมน์ Action (index 7) -->
      <template #cell-4="{ row, rowIndex }">
        <TableActions
          :row-id="row[0]"
          :open-menu-id="openMenuId"
          @toggle-menu="openMenuId = $event"
          role="assign"
          :row="row"
          :status="row[3]"
          :assigned-tech="filteredRows[rowIndex].meta.rf_assigned_tech_id"
          @assign="openAssignModal(row)"
          @detail="openDetail(row[0])"
        />
      </template>
    </TableComponent>
  </div>
  <AssignJobModalComponent
    v-if="showAssignModal"
    :repair-id="assignRepairId"
    @close="showAssignModal = false"
    @completed="loadAdminRepairs"
  />
</template>
