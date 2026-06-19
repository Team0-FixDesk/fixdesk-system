/**
 * =====================================================================
 * @file            admin-repair-list.view.vue
 * @module          มอดูลผู้ดูแลระบบ - การมอบหมายงานให้ช่างผู้รับผิดชอบหลัก
 * @layer           View (Presentation Layer)
 * @version         1.0.1
 * @since           2025-10-21
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-02-20
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอสำหรับมอบหมายงานซ่อมของผู้ดูแลระบบ
 *  แสดงรายการแจ้งซ่อมทั้งหมดในระบบ
 *  ผู้ดูแลระบบสามารถ:
 *   - ดูรายการแจ้งซ่อมทั้งหมด
 *   - ค้นหา และกรองข้อมูลตามสถานะ ความเร่งด่วน และวันที่
 *   - ดูรายละเอียดงานซ่อม
 *   - มอบหมายงานซ่อมให้ช่างซ่อมผู้รับผิดชอบหลัก
 *   - Responsive: แสดงเป็น Card บนหน้าจอขนาด
 *
 * @changelog
 *   [2026-06-16] V1.0.1
 *   - เพิ่ม Responsive Card View สำหรับหน้าจอขนาด
 * =====================================================================
 */

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

import TableComponent from '@/components/table-component.vue'
import TableActions from '@/components/table-actions-component.vue'
import AssignJobModalComponent from '@/components/modal/assign-job-modal-component.vue'
import RepairFilterBar from '@/components/filters/repair-filter-bar-component.vue'

import { useTruncateText } from '@/composables/useTruncateText.js'

const { truncateSentences } = useTruncateText()

const API_BASE = import.meta.env.VITE_API_BASE

const STORAGE_KEYS = { token: 'token' }

const TABLE_COLUMNS = ['หมายเลขแจ้งซ่อม', 'รายละเอียดโดยย่อ', 'ความเร่งด่วน', 'สถานะงาน', 'ตัวดำเนินการ']

const TH_LOCALE = 'th-TH'

const router = useRouter()

const searchInput = ref('')
const selectedUrgencies = ref([])
const selectedStatuses = ref([])
const selectedDate = ref('')

const showAssignModal = ref(false)
const assignRepairId = ref(null)
const openMenuId = ref(null)

const tableColumns = TABLE_COLUMNS
const tableRowsList = ref([])

// --- Responsive ---
const rowMetaByCode = computed(() => {
  const map = new Map()
  for (const item of filteredRows.value) {
    map.set(item.row[0], item.meta)
  }
  return map
})

function getMetaByCode(code) {
  return rowMetaByCode.value.get(code)
}
const screenSize = ref('lg')

function handleResize() {
  screenSize.value = window.innerWidth < 768 ? 'sm' : 'lg'
}

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
  return (
    'วันที่แจ้งซ่อม : ' + formatThaiDate(repair.rf_create_at) + '</br>' +
    'ชื่อผู้แจ้ง : ' + reporterName + '</br>' +
    'หน่วยงาน : ' + (repair.department_name ?? '-') + '</br>' +
    'ประเภทงานซ่อม : ' + (repair.tt_name ?? '-') + '</br>' +
    'เรื่องที่แจ้ง : ' + truncateSentences(repair.rf_problem, 2) + '</br>' +
    'สถานที่ : ' + (repair.bd_name ?? '-') + ' ' +
    'ชั้น ' + (repair.fl_name ?? '-') + ' ' +
    (repair.room_name ?? '-')
  )
}

function buildRepairDetailPlain(repair) {
  const reporterName = `${repair.us_first_name ?? ''} ${repair.us_last_name ?? ''}`.trim()
  return {
    date: formatThaiDate(repair.rf_create_at),
    reporter: reporterName,
    department: repair.department_name ?? '-',
    type: repair.tt_name ?? '-',
    problem: truncateSentences(repair.rf_problem, 2),
    location:
      (repair.bd_name ?? '-') +
      ' ชั้น ' + (repair.fl_name ?? '-') +
      ' ' + (repair.room_name ?? '-'),
  }
}

async function fetchAdminRepairs() {
  const token = getAuthToken()
  if (!token) return []

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

  return Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : [])
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
    detail: buildRepairDetailPlain(repair),
    meta: {
      ...repair,
      createdDate: Number.isNaN(createdDate.getTime()) ? new Date(0) : createdDate,
    },
  }
}

async function loadAdminRepairs() {
  try {
    const repairs = await fetchAdminRepairs()
    tableRowsList.value = repairs.map(mapRepairToTableRow)
  } catch (error) {}
}

const filteredRows = computed(() => {
  const search = (searchInput.value || '').toLowerCase()

  return tableRowsList.value.filter((item) => {
    const row = item.row
    const urgency = row[2]
    const status = row[3]

    if (status === 'done') return false

    const matchesSearch = row.join(' ').toLowerCase().includes(search)
    const matchesUrgency = selectedUrgencies.value.length === 0 || selectedUrgencies.value.includes(urgency)
    const matchesStatus = selectedStatuses.value.length === 0 || selectedStatuses.value.includes(status)
    const matchesDate = !selectedDate.value || toLocalYmd(item.meta.createdDate) === selectedDate.value

    return matchesSearch && matchesUrgency && matchesStatus && matchesDate
  })
})

const resetFilters = () => {
  searchInput.value = ''
  selectedUrgencies.value = []
  selectedStatuses.value = []
  selectedDate.value = ''
}

const openDetail = (code) => {
  router.push({ path: `/main/repair-detail/${code}`, state: { fromAdmin: true } })
}

const openAssignModal = (row) => {
  assignRepairId.value = row[0]
  showAssignModal.value = true
}

// --- Badge Helpers ---
function urgencyClass(urgency) {
  switch (urgency) {
    case 'urgent': return 'bg-red-100 text-red-700'
    case 'normal': return 'bg-blue-100 text-blue-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function urgencyLabel(urgency) {
  switch (urgency) {
    case 'urgent': return 'ด่วน'
    case 'normal': return 'ปกติ'
    default: return urgency || '-'
  }
}

function statusClass(status) {
  switch (status) {
    case 'done':
    case 'completed': return 'bg-green-100 text-green-700'
    case 'in_progress': return 'bg-yellow-100 text-yellow-700'
    case 'cancel':
    case 'cancelled': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function statusLabel(status) {
  switch (status) {
    case 'done':
    case 'completed': return 'เสร็จสิ้น'
    case 'in_progress': return 'กำลังดำเนินการ'
    case 'cancel':
    case 'cancelled': return 'ยกเลิก'
    default: return status || '-'
  }
}

onMounted(() => {
  loadAdminRepairs()
  window.addEventListener('resize', handleResize)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-black mb-6">รายการคำร้องแจ้งซ่อม</h1>

    <!-- Filters -->
    <RepairFilterBar
      mode="admin"
      v-model:search="searchInput"
      v-model:urgencies="selectedUrgencies"
      v-model:statuses="selectedStatuses"
      v-model:date="selectedDate"
      @reset="resetFilters"
    />

    <!-- Desktop Table View -->
    <div  class="-mx-2 overflow-x-auto sm:mx-0">
      <TableComponent
        :columns="tableColumns"
        :rows="filteredRows.map((item) => item.row)"
        :perPage="10"
        :urgencyColumn="2"
        :statusColumn="3"
        :columnAlign="['left', 'left', 'center', 'center', 'center']"
        :id-column-index="0"
        :id-column-as-link="true"
        :action-column-index="4"

        @detail="openDetail"
      >
        <template #cell-4="{ row }">
          <TableActions
            :row-id="row[0]"
            :open-menu-id="openMenuId"
            @toggle-menu="openMenuId = $event"
            role="assign"
            :row="row"
            :status="row[3]"
            :assigned-tech="getMetaByCode(row[0])?.rf_assigned_tech_id"
            @assign="openAssignModal(row)"
            @detail="openDetail(row[0])"
          />
        </template>
      </TableComponent>
    </div>
 
  </div>

  <AssignJobModalComponent
    v-if="showAssignModal"
    :repair-id="assignRepairId"
    @close="showAssignModal = false"
    @completed="loadAdminRepairs"
  />
</template>
