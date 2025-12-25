<script setup>
import CardHomeComponent from '@/components/card-home-component.vue'
import repairButtonComponent from '@/components/repair-button-component.vue'
import TableComponent from '@/components/table-component.vue'
import TableActions from '@/components/table-actions-component.vue'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Sweetalert from 'sweetalert2'

const openMenuId = ref(null)

const router = useRouter()

/* --- API state --- */
const repairRequests = ref([])
const loading = ref(false)
const error = ref(null)

/* --- Filter state --- */
const currentFilter = ref(null) // today / in_progress / completed_7days / cancelled_7days

/* --- Fetch API --- */
const fetchRepairRequests = async () => {
  loading.value = true
  error.value = null
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) throw new Error('ไม่พบ token')

    const response = await fetch(`${import.meta.env.VITE_API_BASE}/admin/repairs`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) throw new Error('โหลดข้อมูลล้มเหลว')

    const data = await response.json()

    repairRequests.value = data.map((r) => ({
      row: [
        new Date(r.rf_create_at).toLocaleDateString('th-TH'),
        r.rf_code,
        `${r.us_first_name || ''} ${r.us_last_name || ''}`.trim(),
        r.department_name || '-',
        r.tt_name || '-',
        r.rf_urgency,
        r.rf_user_status,
        '', // action
      ],
      meta: r,
      rawDate: new Date(r.rf_create_at),
    }))
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

/* --- Helper --- */
const isToday = (req) => {
  const today = new Date()
  return req.rawDate.toDateString() === today.toDateString()
}

const isWithin7Days = (req) => {
  const today = new Date()
  const diff = Math.abs(today - req.rawDate)
  return diff / (1000 * 60 * 60 * 24) <= 7
}

/* --- Filtered Rows --- */
const filteredRequests = computed(() => {
  if (!currentFilter.value) return repairRequests.value

  return repairRequests.value.filter((item) => {
    const status = item.meta.rf_user_status

    switch (currentFilter.value) {
      case 'today':
        return isToday(item)
      case 'in_progress':
        return status === 'in_progress'
      case 'completed_7days':
        return (status === 'done' || status === 'completed') && isWithin7Days(item)
      case 'cancelled_7days':
        return (status === 'cancel' || status === 'cancelled') && isWithin7Days(item)
      default:
        return true
    }
  })
})

/* --- Table component rows --- */
const rowsForDisplay = computed(() => filteredRequests.value.map((item) => item.row))

/* --- Stats --- */
const todayTasks = computed(() => repairRequests.value.filter((r) => isToday(r)).length)
const progressTasks = computed(
  () => repairRequests.value.filter((r) => r.meta.rf_user_status === 'in_progress').length,
)
const completedTasks = computed(
  () =>
    repairRequests.value.filter(
      (r) =>
        (r.meta.rf_user_status === 'done' || r.meta.rf_user_status === 'completed') &&
        isWithin7Days(r),
    ).length,
)
const cancelledTasks = computed(
  () =>
    repairRequests.value.filter(
      (r) =>
        (r.meta.rf_user_status === 'cancel' || r.meta.rf_user_status === 'cancelled') &&
        isWithin7Days(r),
    ).length,
)

const statItems = computed(() => [
  {
    value: todayTasks.value,
    label: 'งานทั้งหมดวันนี้',
    colorClass: 'text-amber-500',
    filterKey: 'today',
  },
  {
    value: progressTasks.value,
    label: 'กำลังดำเนินการ',
    colorClass: 'text-blue-600',
    filterKey: 'in_progress',
  },
  {
    value: completedTasks.value,
    label: 'เสร็จสิ้น (7 วัน)',
    colorClass: 'text-green-600',
    filterKey: 'completed_7days',
  },
  {
    value: cancelledTasks.value,
    label: 'ยกเลิก (7 วัน)',
    colorClass: 'text-red-600',
    filterKey: 'cancelled_7days',
  },
])

const handleCardClick = (item) => {
  currentFilter.value = item.filterKey
}

/* --- Actions --- */
const goToRepairDetail = (ticketId) => {
  router.push(`/main/repair-detail/${ticketId}`)
}

async function deleteRepair(ticketId) {
  const result = await Sweetalert.fire({
    title: 'ลบรายการ?',
    text: `ต้องการลบหมายเลข ${ticketId}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ลบ',
    cancelButtonText: 'ยกเลิก',
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
    if (!res.ok) throw new Error(body.message)

    repairRequests.value = repairRequests.value.filter((r) => r.meta.rf_code !== ticketId)
    Sweetalert.fire('สำเร็จ', 'ลบเรียบร้อย', 'success')
  } catch (err) {
    Sweetalert.fire('ผิดพลาด', err.message, 'error')
  }
}

onMounted(fetchRepairRequests)
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-8xl">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">หน้าแรก (Admin)</h1>
        <p class="text-sm text-gray-600 mt-1">ภาพรวมงานแจ้งซ่อม</p>
      </div>

      <div class="flex space-x-2">
        <button
          @click="fetchRepairRequests"
          :disabled="loading"
          class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md flex items-center"
        >
          รีเฟรช
        </button>
        <repairButtonComponent />
      </div>
    </div>

    <!-- Stats Cards -->
    <CardHomeComponent :items="statItems" @click="handleCardClick" />

    <!-- Table -->
    <div class="p-3 mx-auto max-w-8xl mt-4">
      <TableComponent
        :columns="[
          'วันที่',
          'หมายเลขแจ้งซ่อม',
          'ชื่อผู้แจ้ง',
          'หน่วยงาน',
          'ประเภท',
          'ความเร่งด่วน',
          'สถานะงาน',
          'การดำเนินการ',
        ]"
        :rows="rowsForDisplay"
        :perPage="10"
        :urgencyColumn="5"
        :statusColumn="6"
      >
        <template #cell-7="{ row, rowIndex }">
          <TableActions
            :open-menu-id="openMenuId"
            @toggle-menu="openMenuId = $event"
            :row-id="row[1]"
            :row="row"
            :status="row[6]"
            :assigned-tech="filteredRequests[rowIndex].meta.rf_assigned_tech_id"
            @detail="goToRepairDetail(row[1])"
            @delete="deleteRepair(row[1])"
          />
        </template>
      </TableComponent>
    </div>
  </div>
</template>
