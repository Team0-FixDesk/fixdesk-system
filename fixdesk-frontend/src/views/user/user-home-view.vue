<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import TableComponent from '@/components/table-component.vue'
import repairButton from '@/components/repair-button-component.vue'
import RepairStatusTimeline from '@/components/status-timeline-component.vue'
// นำเข้า Component Card
import cardHomeComponent from '@/components/card-home-component.vue'

// ค่าพื้นฐานของ API
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// ตัวแปรข้อมูลผู้ใช้
const realUserName = ref('ผู้ใช้งาน')
const userDepartment = ref('กำลังโหลดข้อมูล...')

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

// ฟังก์ชันถอดรหัส JWT
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return {}
  }
}

// -------------------------------------------------------------
// [แก้ไข] เพิ่มการหา userId จาก Token ในฟังก์ชันนี้
// -------------------------------------------------------------
async function fetchRepairStats() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) return

  // ต้องแกะ userId ออกมาก่อนครับ ไม่งั้น API จะ error
  const payload = parseJwt(token)
  const userId = payload.us_id

  try {
    const res = await fetch(`${API_BASE}/repair-stats/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) throw new Error('Load stats failed')

    const data = await res.json()

    // อัปเดตข้อมูลเข้า Card
    statsItems.value[0].value = data.total || 0
    statsItems.value[1].value = data.pending || 0
    statsItems.value[2].value = data.in_progress || 0
    statsItems.value[3].value = data.completed || 0
  } catch (err) {
    console.error('Error fetching stats:', err)
  }
}

// ฟังก์ชันอื่นๆ (คงเดิม)
function formatDateTH(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH')
}

async function fetchUserProfile() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) return

  const payload = parseJwt(token)
  const userId = payload.us_id

  try {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) throw new Error('Failed to fetch user profile')

    const userData = await res.json()

    if (userData.us_first_name_th) {
      realUserName.value = `${userData.us_first_name_th} ${userData.us_last_name_th || ''}`.trim()
    }

    if (userData.us_department) {
      userDepartment.value = userData.us_department
    } else {
      userDepartment.value = 'ไม่ระบุหน่วยงาน'
    }
  } catch (err) {
    console.error('โหลดข้อมูลผู้ใช้ไม่สำเร็จ:', err)
    userDepartment.value = 'ระบบแจ้งเสียแจ้งซ่อมยินดีตอนรับ'
  }
}

async function fetchRecentRepairs() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) return

  const payload = parseJwt(token)
  const userId = payload.us_id

  try {
    const res = await fetch(`${API_BASE}/my-repairs/${userId}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')

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

async function handleSelectRepair(e) {
  const code = e.target.value
  selectedTrackingCode.value = code
  await loadTimelineForCode(code)
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

const getBadgeHtml = (text, type) => {
  let colorClass = 'bg-gray-100 text-gray-600'

  if (type === 'urgency') {
    if (text === 'high') {
      text = 'เร่งด่วนมาก'
      colorClass = 'bg-red-100 text-red-600'
    } else if (text === 'medium') {
      text = 'เร่งด่วน'
      colorClass = 'bg-amber-50 text-amber-500'
    } else if (text === 'low') {
      text = 'ไม่เร่งด่วน'
      colorClass = 'bg-green-100 text-green-600'
    }
  } else if (type === 'status') {
    if (text === 'pending') {
      text = 'รอดำเนินการ'
      colorClass = 'bg-amber-50 text-amber-500'
    } else if (text === 'in_progress') {
      text = 'กำลังดำเนินการ'
      colorClass = 'bg-blue-100 text-blue-600'
    } else if (text === 'done') {
      text = 'ดำเนินการเสร็จสิ้น'
      colorClass = 'bg-green-100 text-green-600'
    } else {
      text = 'ยกเลิก'
      colorClass = 'bg-gray-100 text-gray-500'
    }
  }

  return `<span class="inline-flex min-w-[80px] justify-center items-center w-[120px] px-3 py-1 rounded-lg font-semibold ${colorClass}">${text}</span>`
}

// 2. Computed สำหรับ Rows ที่จะแสดง (แปลง recentRepairs ให้เป็น Array ของ Array)
const tableRows = computed(() => {
  return recentRepairs.value.map((item) => [
    formatDateTH(item.rf_create_at),
    item.rf_code,
    item.tt_name || '-',
    getBadgeHtml(item.rf_urgency, 'urgency'),
    getBadgeHtml(item.rf_user_status, 'status'),
  ])
})

// 3. Computed สำหรับ Raw Rows (เพื่อให้ TableComponent รู้ ID เวลากด)
const tableRawRows = computed(() => {
  return recentRepairs.value.map((item) => ({
    rf_code: item.rf_code,
  }))
})

/* --- [เพิ่มใหม่] Event Handler เมื่อกด Row --- */
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
        <h1 class="text-2xl font-bold text-gray-800">สวัสดีคุณ{{ realUserName }}</h1>
        <p class="text-md text-gray-600 mt-1">{{ userDepartment }}</p>
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
          <p class="text-xs text-gray-500">รายการแจ้งซ่อม 5 รายการล่าสุด</p>
        </div>

        <TableComponent
          class="text-lg"
          :columns="['วันที่', 'หมายเลขแจ้งซ่อม', 'ประเภทงาน', 'ความเร่งด่วน', 'สถานะ']"
          :rows="tableRows"
          :rawRows="tableRawRows"
          :perPage="7"
          mode="user"
          :idColumnIndex="1"
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
<style scoped>
/* เจาะจงเข้าไปแก้ขนาดตัวอักษรใน TableComponent */
:deep(td),
:deep(th) {
  font-size: 0.875rem !important; /* เท่ากับ text-xs */
  line-height: 1rem !important;
  padding-top: 0.5rem; /* ปรับระยะห่างแนวตั้งให้แคบลงด้วย (ถ้าต้องการ) */
  padding-bottom: 0.5rem;
}

</style>
