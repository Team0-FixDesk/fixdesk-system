<script setup>
/* =========================
  Imports (external)
========================= */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

/* =========================
  Imports (components)
========================= */
import CardHomeComponent from '@/components/card-home-component.vue'
import repairButtonComponent from '@/components/repair-button-component.vue'
import TableComponent from '@/components/table-component.vue'

/* =========================
  Imports (composables)
========================= */
import { useUserProfile } from '@/composables/useUserProfile.js'
import { useAuthToken } from '@/composables/useAuthToken'

/* =========================
  Constants
========================= */
const API_BASE = import.meta.env.VITE_API_BASE
const TH_LOCALE = 'th-TH'

const STATUS = {
  inProgress: 'in_progress',
  done: 'done',
  completed: 'completed',
  cancel: 'cancel',
  cancelled: 'cancelled',
}

/* =========================
  Router
========================= */
const router = useRouter()

/* =========================
  Composables
========================= */
const { token, isAuthenticated, logout } = useAuthToken()
const { displayName, displayDepartment, fetchUserProfile } = useUserProfile(API_BASE)

/* =========================
  State
========================= */
const repairRequests = ref([])
const loading = ref(false)
const error = ref(null)

/**
 * today / in_progress / completed_7days / cancelled_7days
 * null = show all
 */
const currentFilter = ref(null)

/* =========================
  Helpers (date)
========================= */
function toDateSafe(input) {
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? new Date(0) : d
}

function isSameDay(a, b) {
  return a.toDateString() === b.toDateString()
}

function isWithinLastDays(date, days) {
  const now = new Date()
  const diffMs = Math.abs(now - date)
  return diffMs / (1000 * 60 * 60 * 24) <= days
}

function formatThaiDate(input) {
  const d = toDateSafe(input)
  if (d.getTime() === 0) return '-'
  return d.toLocaleDateString(TH_LOCALE)
}

/* =========================
  Helpers (status)
========================= */
function isCompletedStatus(status) {
  return status === STATUS.done || status === STATUS.completed
}

function isCancelledStatus(status) {
  return status === STATUS.cancel || status === STATUS.cancelled
}

/* =========================
  Mapper
========================= */
function buildDetailHtml(r) {
  const reporterName = `${r.us_first_name || ''} ${r.us_last_name || ''}`.trim()

  // NOTE: คงรูปแบบ </br> เดิมไว้เพื่อไม่กระทบ UI ของ TableComponent
  return (
    'วันที่แจ้ง: ' +
    formatThaiDate(r.rf_create_at) +
    '</br>' +
    'ชื่อผู้แจ้ง: ' +
    reporterName +
    '</br>' +
    'หน่วยงาน: ' +
    (r.department_name || '-')
  )
}

function mapRepairToRow(r) {
  const rawDate = toDateSafe(r.rf_create_at)

  return {
    row: [
      r.rf_code,
      r.tt_name,
      buildDetailHtml(r),
      r.rf_urgency,
      r.rf_user_status,
      '',
    ],
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

    const response = await fetch(`${API_BASE}/admin/repairs`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token.value}`,
        'Content-Type': 'application/json',
      },
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(payload?.message || 'โหลดข้อมูลล้มเหลว')
    }

    const repairs = normalizeRepairs(payload)
    repairRequests.value = repairs.map(mapRepairToRow)
  } catch (e) {
    error.value = e?.message || 'เกิดข้อผิดพลาด'
  } finally {
    loading.value = false
  }
}

/* =========================
  Filter helpers (ใช้ใน computed)
========================= */
function isToday(item) {
  return isSameDay(item.rawDate, new Date())
}

function isWithin7Days(item) {
  return isWithinLastDays(item.rawDate, 7)
}

/* =========================
  Computed: Filtered Rows
========================= */
const filteredRequests = computed(() => {
  const filterKey = currentFilter.value
  if (!filterKey) return repairRequests.value

  return repairRequests.value.filter((item) => {
    const status = item.meta?.rf_user_status

    switch (filterKey) {
      case 'today':
        return isToday(item)
      case 'in_progress':
        return status === STATUS.inProgress
      case 'completed_7days':
        return isCompletedStatus(status) && isWithin7Days(item)
      case 'cancelled_7days':
        return isCancelledStatus(status) && isWithin7Days(item)
      default:
        return true
    }
  })
})

/* Table rows for display */
const rowsForDisplay = computed(() => filteredRequests.value.map((item) => item.row))

/* =========================
  Computed: Stats
========================= */
const allTasks = computed(() => repairRequests.value.filter((r) => r.meta?.rf_user_status).length)

const todayTasks = computed(() => repairRequests.value.filter((r) => isToday(r)).length)

const progressTasks = computed(
  () => repairRequests.value.filter((r) => r.meta?.rf_user_status === STATUS.inProgress).length,
)

const completedTasks = computed(
  () =>
    repairRequests.value.filter(
      (r) => isCompletedStatus(r.meta?.rf_user_status) && isWithin7Days(r),
    ).length,
)

const statItems = computed(() => [
  {
    value: allTasks.value,
    label: 'รายการแจ้งซ่อมทั้งหมด',
    colorClass: 'text-red-500',
  },
  {
    value: todayTasks.value,
    label: 'งานทั้งหมดวันนี้',
    colorClass: 'text-amber-500',
    filterKey: 'today',
  },
  {
    value: progressTasks.value,
    label: 'กำลังดำเนินการ',
    colorClass: 'text-blue-500',
    filterKey: 'in_progress',
  },
  {
    value: completedTasks.value,
    label: 'เสร็จสิ้น (7 วัน)',
    colorClass: 'text-green-500',
    filterKey: 'completed_7days',
  },
])

/* =========================
  Actions (template ใช้งานชื่อเดิม)
========================= */
function handleCardClick(item) {
  currentFilter.value = item?.filterKey ?? null
}

function goToRepairDetail(ticketId) {
  router.push(`/main/repair-detail/${ticketId}`)
}

/* =========================
  Lifecycle
========================= */
onMounted(() => {
  fetchRepairRequests()
  fetchUserProfile()
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-8xl">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <p class="text-2xl font-extrabold text-gray-900">
          หน้าหลักผู้ดูแลระบบ สวัสดีคุณ {{ displayName }}
        </p>

        <p class="text-lg font-semibold text-gray-700">
          {{ displayDepartment }}
        </p>

        <p class="text-sm text-gray-500">ตรวจสอบสถานะและดำเนินการงานแจ้งซ่อม</p>
      </div>

      <div class="flex space-x-2">
        <repairButtonComponent />
      </div>
    </div>

    <!-- Stats Cards -->
    <CardHomeComponent :items="statItems" @click="handleCardClick" />

    <!-- Table -->
    <div class="p-3 mx-auto max-w-8xl mt-4">
      <TableComponent
        :columns="[
          'หมายเลขแจ้งซ่อม',
          'ประเภทงาน',
          'รายละเอียด',
          'ความเร่งด่วน',
          'สถานะงาน',
          'การดำเนินการ',
        ]"
        :rows="rowsForDisplay"
        :perPage="10"
        :urgencyColumn="3"
        :statusColumn="4"
        :columnAlign="['left', 'left', 'left', 'center', 'center', 'center']"
      >
        <template #cell-5="{ row }">
          <div class="flex justify-center">
            <button
              @click="goToRepairDetail(row[0])"
              class="flex items-center gap-2 px-2 py-2 rounded-md bg-[#1E48D1] hover:bg-[#163A9B] text-white"
            >
              <img src="/icon/info-icon.svg" class="h-4 w-4" />
            </button>
          </div>
        </template>
      </TableComponent>
    </div>
  </div>
</template>
