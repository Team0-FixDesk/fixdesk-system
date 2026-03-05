
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { getAdminRepairList } from '@/services/repair'

import TableComponent from '@/components/table-component.vue'
import InfoButtonComponent from '@/components/button/info-button-component.vue'
import RepairFilterBar from '@/components/filters/repair-filter-bar-component.vue'

import { useUserProfile } from '@/composables/useUserProfile.js'
import { useAuthToken } from '@/composables/useAuthToken'
import { useTruncateText } from '@/composables/useTruncateText.js'

const { truncateSentences } = useTruncateText()

const TH_LOCALE = 'th-TH'

const STATUS = {
  inProgress: 'in_progress',
  done: 'done',
  completed: 'completed',
  cancel: 'cancel',
  cancelled: 'cancelled',
}

const router = useRouter()

// Month/year selector (reuse style from manager view)
const monthLabels = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

const selectedMonthIndex = ref(new Date().getMonth())
const selectedYear = ref(new Date().getFullYear())

function yearsList(range = 3) {
  const y = new Date().getFullYear()
  const arr = []
  for (let i = y - range; i <= y + range; i++) arr.push(i)
  return arr
}

const availableYears = ref(yearsList(3))

function formatYearDisplay(year) {
  const buddhistYear = year + 543
  return `ปี ${buddhistYear} (${year})`
}

const { token, isAuthenticated, logout } = useAuthToken()
const {  fetchUserProfileData } = useUserProfile()

// Filter UI state (repair filter bar)
const searchInput = ref('')
const selectedStatuses = ref([])
const selectedDate = ref('')
const selectedUrgencies = ref([])
function resetFilters() {
  searchInput.value = ''
  selectedStatuses.value = []
  selectedDate.value = ''
  selectedUrgencies.value = []
}

const repairRequests = ref([])
const loading = ref(false)
const error = ref(null)


/* =========================
  Helpers (date)
========================= */
function toDateSafe(input) {
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? new Date(0) : d
}


function formatThaiDate(input) {
  const d = toDateSafe(input)
  if (d.getTime() === 0) return '-'
  return d.toLocaleDateString(TH_LOCALE)
}

function toLocalYMD(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/* =========================
  Helpers (status)
========================= */
function isCompletedStatus(status) {
  return status === STATUS.done || status === STATUS.completed
}

/* =========================
  Mapper
========================= */
function buildDetailHtml(r) {
  const reporterName = `${r.us_first_name || ''} ${r.us_last_name || ''}`.trim()
  return (
    'วันที่แจ้งซ่อม : ' +
    formatThaiDate(r.rf_create_at) +
    '</br>' +
    'ชื่อผู้แจ้ง : ' +
    reporterName +
    '</br>' +
    'หน่วยงาน : ' +
    (r.department_name || '-') +
    '</br>' +
    'เรื่องที่แจ้ง : ' +
    truncateSentences(r.rf_problem, 1) +
    '</br>' +
    'สถานที่ : ' +
    (r.bd_name ?? '-') + ' ' +
    'ชั้น ' + (r.fl_name ?? '-') + ' ' +
    (r.room_name ?? '-')
  )
}

function mapRepairToRow(r) {
  const rawDate = toDateSafe(r.rf_create_at)

  return {
    row: [r.rf_code, r.tt_name, buildDetailHtml(r), r.rf_urgency, r.rf_user_status, ''],
    meta: r,
    rawDate,
  }
}

function normalizeRepairs(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

/* =========================
  API
========================= */
async function fetchRepairRequests() {
  loading.value = true
  error.value = null

  try {
    if (!isAuthenticated.value) {
      logout()
      return
    }

    const payload = await getAdminRepairList(token.value)

    const repairs = normalizeRepairs(payload)
    repairRequests.value = repairs.map(mapRepairToRow)
  } catch (e) {
    error.value = e?.message || 'เกิดข้อผิดพลาด'
  } finally {
    loading.value = false
  }
}

/* =========================
  Computed: Filtered Rows
========================= */
const filteredRequests = computed(() => {
  // Show only completed/done repairs and match selected month/year, plus filter bar criteria
  const q = String(searchInput.value || '').trim().toLowerCase()

  return repairRequests.value.filter((item) => {
    const status = item.meta?.rf_user_status
    if (!isCompletedStatus(status)) return false

    const d = item.rawDate
    if (!d || !(d instanceof Date)) return false

    // Month/year match
    if (d.getFullYear() !== Number(selectedYear.value)) return false
    if (d.getMonth() !== Number(selectedMonthIndex.value)) return false

    // Search match (code, type, detail html)
    if (q) {
      const code = String(item.row?.[0] ?? '').toLowerCase()
      const type = String(item.row?.[1] ?? '').toLowerCase()
      const detail = String(item.row?.[2] ?? '').toLowerCase()
      if (!code.includes(q) && !type.includes(q) && !detail.includes(q)) return false
    }

    // Status filter (if provided)
    if (selectedStatuses.value.length > 0) {
      const rowStatus = String(item.row?.[4] ?? '')
      if (!selectedStatuses.value.includes(rowStatus)) return false
    }

    // Date filter from filter bar (YYYY-MM-DD)
    if (selectedDate.value) {
      if (toLocalYMD(d) !== selectedDate.value) return false
    }

    // Urgency filter (if provided)
    if (selectedUrgencies.value.length > 0) {
      const urgency = String(item.row?.[3] ?? '')
      if (!selectedUrgencies.value.includes(urgency)) return false
    }

    return true
  })
})

/* Table rows for display */
const rowsForDisplay = computed(() => filteredRequests.value.map((item) => item.row))

/* =========================
  Computed: Stats
========================= */
const completedTasks = computed(() => filteredRequests.value.length)

/* =========================
  Actions
========================= */
function goToRepairDetail(ticketId) {
  router.push(`/main/repair-detail/${ticketId}`)
}

/* =========================
  Lifecycle
========================= */
onMounted(() => {
  fetchUserProfileData()
  fetchRepairRequests()
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <!-- Header -->
    <div class="flex justify-between items-start mb-2">
      <div>
        <h1 class="text-xl font-bold text-black">ประวัติการแจ้งซ่อมที่ดำเนินการเสร็จสิ้น</h1>
      </div>

      <div class="flex flex-row gap-4 ml-auto">
        <div class="flex items-center gap-3 justify-end">
            <label class="text-sm font-medium text-gray-700">เลือกปี:</label>
            <select v-model.number="selectedYear" @change="refreshDashboard"
              class="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm">
              <option v-for="year in availableYears" :key="year" :value="year">
                {{ formatYearDisplay(year) }}
              </option>
            </select>
          </div>

        <div class="flex items-center gap-2 justify-end">
            <label class="text-sm font-medium text-gray-700">เลือกเดือน:</label>
            <select v-model.number="selectedMonthIndex" @change="refreshDashboard"
              class="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm">
              <option v-for="(m, idx) in monthLabels" :key="m" :value="idx">
                {{ m }}
              </option>
            </select>
          </div>
      </div>
    </div>

    <!-- Filters -->
    <RepairFilterBar
      mode="repair"
      v-model:search="searchInput"
      v-model:statuses="selectedStatuses"
      v-model:date="selectedDate"
      v-model:urgencies="selectedUrgencies"
      :show-status="false"
      :show-urgencies="true"
      @reset="resetFilters"
    />

    <div class="mb-2">
      <p class="text-sm text-gray-600">
        จำนวนงานซ่อมที่เสร็จสิ้น: <span class="font-semibold text-green-600">{{ completedTasks }}</span> รายการ
      </p>
    </div>

    <!-- Table -->
    <TableComponent
      :columns="[
        'หมายเลขแจ้งซ่อม',
        'ประเภทงาน',
        'รายละเอียดโดยย่อ',
        'ความเร่งด่วน',
        'สถานะงาน',
        'ตัวดำเนินการ',
      ]"
      :rows="rowsForDisplay"
      :perPage="10"
      :urgencyColumn="3"
      :statusColumn="4"
      :columnAlign="['left', 'left', 'left', 'center', 'center', 'center']"
      :id-column-index="0"
      :id-column-as-link="true"
      @detail="goToRepairDetail"
    >
      <template #cell-5="{ row }">
        <InfoButtonComponent @click="goToRepairDetail(row[0])" />
      </template>
    </TableComponent>
  </div>
</template>
