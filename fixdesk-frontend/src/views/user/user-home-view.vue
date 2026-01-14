<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import TableComponent from '@/components/table-component.vue'
import repairButton from '@/components/repair-button-component.vue'
import RepairStatusTimeline from '@/components/status-timeline-component.vue'
import { useAuthToken } from '@/composables/useAuthToken'
import { useUserProfile } from '@/composables/useUserProfile'

// นำเข้า Component Card
import cardHomeComponent from '@/components/card-home-component.vue'

// ค่าพื้นฐานของ API
const API_BASE = import.meta.env.VITE_API_BASE

const { token, userId, isAuthenticated, logout } = useAuthToken()
const { displayName, displayDepartment, fetchUserProfile } = useUserProfile(API_BASE)


// ตัวแปรสำหรับ Card สถิติ
const statsItems = ref([
  {
    value: 0,
    label: 'แจ้งซ่อมทั้งหมด',
    unit: 'รายการ',
    colorClass: 'text-violet-500',
    filterStatus: '',
  },
  {
    value: 0,
    label: 'รอดำเนินการทั้งหมด',
    unit: 'รายการ',
    colorClass: 'text-amber-500',
    filterStatus: 'pending',
  },
  {
    value: 0,
    label: 'กำลังดำเนินการทั้งหมด',
    unit: 'รายการ',
    colorClass: 'text-blue-600',
    filterStatus: 'in_progress',
  },
  {
    value: 0,
    label: 'ดำเนินการเสร็จสิ้นทั้งหมด',
    unit: 'รายการ',
    colorClass: 'text-green-600',
    filterStatus: 'done',
  },
])

// แก้ไขฟังก์ชันตอนคลิก Card
const onCardClick = (item) => {
  router.push({
    path: '/main/my-list',
    query: { status: item.filterStatus },
  })
}
const selectedRepairDetail = ref(null)

// ตัวแปรสถานะหลักของหน้า
const router = useRouter()
const allMyRepairs = ref([])
const recentRepairs = ref([])
const selectedTrackingCode = ref('')
const selectedTimelineSteps = ref([])
const isTimelineLoading = ref(false)

async function fetchRepairStats() {
  if (!isAuthenticated.value) {
    logout()
    return
  }

  try {
    const res = await fetch(`${API_BASE}/repair-stats/${userId.value}`, {
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    })

    if (!res.ok) throw new Error('Load stats failed')

    const data = await res.json()

    statsItems.value[0].value = data.total || 0
    statsItems.value[1].value = data.pending || 0
    statsItems.value[2].value = data.in_progress || 0
    statsItems.value[3].value = data.completed || 0
  } catch (err) {
    console.error(err)
  }
}

// ฟังก์ชันอื่นๆ (คงเดิม)
function formatDateTH(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH')
}

async function fetchRecentRepairs() {
  if (!isAuthenticated.value) {
    logout()
    return
  }

  try {
    const res = await fetch(`${API_BASE}/my-repairs/${userId.value}`, {
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    const sorted = data.sort((a, b) => new Date(b.rf_create_at) - new Date(a.rf_create_at))

    allMyRepairs.value = sorted
    recentRepairs.value = sorted.slice(0, 5)

    const defaultRepair = sorted.find((r) => r.rf_user_status === 'in_progress') || sorted[0]

    if (defaultRepair) {
      selectedTrackingCode.value = defaultRepair.rf_code
      await loadTimelineForCode(defaultRepair.rf_code)
    }
  } catch (err) {
    console.error('โหลดรายการล่าสุดไม่สำเร็จ:', err)
  }
}

async function loadTimelineForCode(code) {
  if (!code) {
    selectedTimelineSteps.value = []
    return
  }

  isTimelineLoading.value = true
  try {
    const res = await fetch(`${API_BASE}/repair-requests/${code}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')
    selectedRepairDetail.value = data
    selectedTimelineSteps.value = buildTimelineFromRepair(data)
  } catch (err) {
    console.error('โหลด timeline ไม่สำเร็จ:', err)
    selectedTimelineSteps.value = []
  } finally {
    isTimelineLoading.value = false
  }
}

function formatDateTimeTH(value) {
  if (!value) return null
  const date = new Date(value).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const time = new Date(value).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${date} เวลา ${time}`
}

function buildTimelineFromRepair(repairData) {
  const timelineSteps = []
  const statusConfigs = [
    { key: 'rf_create_at', title: 'รอดำเนินการ', description: 'ระบบได้รับใบแจ้งซ่อมของคุณแล้ว' },
    {
      key: 'rf_in_process_at',
      title: 'กำลังดำเนินการ',
      description: 'เจ้าหน้าที่กำลังดำเนินการซ่อมแซม',
    },
    { key: 'rf_done_at', title: 'ดำเนินการเสร็จสิ้น', description: 'งานซ่อมเสร็จเรียบร้อยแล้ว' },
  ]

  let lastReachedIndex = -1
  statusConfigs.forEach((status, index) => {
    if (repairData[status.key]) lastReachedIndex = index
  })

  statusConfigs.forEach((status, index) => {
    const isReached = index <= lastReachedIndex
    const isCurrent = index === lastReachedIndex
    const isLastStep = index === statusConfigs.length - 1

    let stepState = 'upcoming'
    if (isReached) {
      if (isLastStep) stepState = 'completed'
      else if (isCurrent) stepState = 'current'
      else stepState = 'completed'
    }

    timelineSteps.push({
      displayTime: repairData[status.key] ? formatDateTimeTH(repairData[status.key]) : null,
      title: status.title,
      description: isReached ? status.description : null,
      stepState,
    })
  })
  return timelineSteps
}

// 2. Computed สำหรับ Rows ที่จะแสดง (แปลง recentRepairs ให้เป็น Array ของ Array)
const tableRows = computed(() => {
  return allMyRepairs.value.map((item) => [
    formatDateTH(item.rf_create_at),
    item.rf_code,
    item.tt_name || '-',
    item.rf_urgency,
    item.rf_user_status,
  ])
})

// 3. Computed สำหรับ Raw Rows (เพื่อให้ TableComponent รู้ ID เวลากด)
const tableRawRows = computed(() => {
  return allMyRepairs.value.map((item) => ({
    rf_code: item.rf_code,
  }))
})

/* --- Event Handler เมื่อกด Row --- */
const onRowClick = (idOrItem) => {
  const code = typeof idOrItem === 'object' && idOrItem !== null ? idOrItem.rf_code : idOrItem
  if (code) {
    selectedTrackingCode.value = code // อัปเดต Dropdown
    loadTimelineForCode(code) // โหลดข้อมูลทันที
  }
}

onMounted(() => {
  fetchRepairStats()
  fetchUserProfile()
  fetchRecentRepairs()
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-8xl">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">สวัสดีคุณ{{ displayName }}</h1>
        <p class="text-md text-gray-600 mt-1">{{ displayDepartment }}</p>
      </div>
      <repairButton />
    </div>

    <div class="mt-8 mb-8">
      <cardHomeComponent :items="statsItems" @click="onCardClick" />
    </div>

    <div class="grid grid-cols-12 gap-6">
      <div class="col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div class="border-b border-slate-200 pb-2 mb-4">
          <h2 class="text-xl font-bold mb-1">รายการที่ฉันแจ้งซ่อม</h2>
          <p class="text-xs text-gray-500">7 รายการแจ้งซ่อมล่าสุด (เรียงจากวันที่แจ้ง)</p>
        </div>

        <TableComponent
          :columns="['วันที่', 'หมายเลขแจ้งซ่อม', 'ประเภทงาน', 'ความเร่งด่วน', 'สถานะ']"
          :rows="tableRows"
          :rawRows="tableRawRows"
          :perPage="7"
          mode="user"
          :idColumnIndex="1"
          :urgencyColumn="3"
          :statusColumn="4"
          :activeId="selectedTrackingCode"
          @detail="onRowClick"
        />
      </div>

      <div class="col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div class="border-b border-slate-200 pb-3 mb-4">
          <div class="flex justify-between items-center mb-1">
            <h2 class="text-xl font-bold">ตรวจสอบสถานะ</h2>
          </div>
          <div>
            <p class="text-sm text-gray-500 mt-1">
              หมายเลขแจ้งซ่อม:
              <span v-if="selectedTrackingCode" class="font-semibold text-indigo-600">
                #{{ selectedTrackingCode }}
              </span>
              <span v-else>-</span>
            </p>
            <p class="text-sm text-gray-500">
              <span class="font-medium">ประเภท: </span>
              <span
                v-if="selectedRepairDetail"
                class="text-sm font-semibold text-gray-600 break-words"
                >{{ selectedRepairDetail.repair_type_name }}</span
              >
              <span v-else>-</span>
            </p>

            <p class="text-sm text-gray-500">
              <span class="font-medium">สถานที่: </span>
              <span
                v-if="selectedRepairDetail"
                class="text-sm font-semibold text-gray-600 break-words"
              >
                อาคาร {{ selectedRepairDetail.building_name }} ห้อง
                {{ selectedRepairDetail.room_name }}
              </span>
              <span v-else>-</span>
            </p>
            <p class="text-sm text-gray-500 mt-1">
              หัวข้อปัญหา:
              <span
                v-if="selectedRepairDetail"
                class="text-sm font-semibold text-gray-600 break-words"
              >
                {{ selectedRepairDetail.rf_problem }}
              </span>
              <span v-else class="text-sm font-semibold text-gray-800">-</span>
            </p>

            <p class="text-sm text-gray-500 mt-1">
              รายละเอียด/อาการ:
              <span
                v-if="selectedRepairDetail"
                class="text-sm font-semibold text-gray-600 break-words"
              >
                {{ selectedRepairDetail.rf_detail }}
              </span>
              <span v-else class="text-sm font-semibold text-gray-800">-</span>
            </p>
          </div>
        </div>

        <div>
          <p v-if="isTimelineLoading" class="text-sm text-gray-400 text-center py-4">
            กำลังโหลดสถานะการดำเนินงาน...
          </p>
          <RepairStatusTimeline v-else :timeline-steps="selectedTimelineSteps" />
        </div>
      </div>
    </div>
  </div>
</template>
