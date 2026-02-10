<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { getAdminRepairList } from '@/services/repair'

import CardHomeComponent from '@/components/card-home-component.vue'
import RepairButtonComponent from '@/components/button/repair-button-component.vue'
import TableComponent from '@/components/table-component.vue'
import InfoButtonComponent from '@/components/button/info-button-component.vue'

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

const { token, isAuthenticated, logout } = useAuthToken()
const { displayName, displayDepartment, fetchUserProfile } = useUserProfile()

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
    (r.department_name || '-') +
    '</br>' +
    'รายละเอียด: ' +
    truncateSentences(r.rf_problem, 1) +
    '</br>' +
    'สถานที่: ' +
    (r.bd_name ?? '-') + ' ' +
    (r.fl_name ?? '-') + ' ' +
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
  Filter helpers (ใช้ใน computed)
========================= */
function isToday(item) {
  return isSameDay(item.rawDate, new Date())
}

function isWithin7Days(item) {
  return isWithinLastDays(item.rawDate, 7)
}

function isCurrentMonth(item) {
  const now = new Date()
  const d = item.rawDate
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
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
const allTasks = computed(
  () => repairRequests.value.filter((r) => isCurrentMonth(r) && r.meta?.rf_user_status).length,
)

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
    label: 'รายการแจ้งซ่อมทั้งหมดในเดือนนี้',
    colorClass: 'text-red-500',
  },
  {
    value: todayTasks.value,
    label: 'รายการแจ้งซ่อมทั้งหมดภายในวันนี้',
    colorClass: 'text-amber-500',
    filterKey: 'today',
  },
  {
    value: progressTasks.value,
    label: 'รายการแจ้งซ่อมที่กำลังดำเนินการ',
    colorClass: 'text-blue-500',
    filterKey: 'in_progress',
  },
  {
    value: completedTasks.value,
    label: 'รายการแจ้งซ่อมที่เสร็จสิ้นในระยะเวลา 7 วัน',
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
        <RepairButtonComponent />
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
        :id-column-index="0"
        :id-column-as-link="true"
        @detail="goToRepairDetail"
      >
        <template #cell-5="{ row }">
          <InfoButtonComponent @click="goToRepairDetail(row[0])" />
        </template>
      </TableComponent>
    </div>
  </div>
</template>
