<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ThaiCalendar from '@/components/thai-calendar-component.vue'
import repairButton from '@/components/repair-button-component.vue'
import RepairStatusTimeline from '@/components/status-timeline-component.vue'

// ค่าพื้นฐานของ API
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// ข้อมูลผู้ใช้ที่ล็อกอิน
const loggedInUser = JSON.parse(localStorage.getItem('session_user'))
const loggedInUserName = loggedInUser?.name || 'ผู้ใช้งาน'

// ตัวแปรสถานะหลักของหน้า
const router = useRouter()
const allMyRepairs = ref([]) // งานของฉันทั้งหมด
const recentRepairs = ref([]) // 5 รายการล่าสุด
const selectedTrackingCode = ref('') // ใบแจ้งซ่อมที่เลือกเพื่อแสดง timeline
const selectedTimelineSteps = ref([]) // ข้อมูล timeline ของงานที่เลือก
const isTimelineLoading = ref(false) // สถานะโหลด timeline อยู่หรือไม่

// ฟังก์ชันถอดรหัส JWT แบบง่าย
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

// แปลงวันที่เป็นรูปแบบไทย
function formatDateTH(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('th-TH')
}

// แปลงค่าความเร่งด่วนเป็นข้อความภาษาไทย
function getUrgencyLabel(u) {
  switch (u) {
    case 'high':
      return 'เร่งด่วนมาก'
    case 'medium':
      return 'เร่งด่วน'
    case 'low':
      return 'ไม่เร่งด่วน'
    default:
      return '-'
  }
}

// กำหนดคลาสสีของ badge ความเร่งด่วน
function getUrgencyClass(u) {
  switch (u) {
    case 'high':
      return 'bg-red-100 text-red-600'
    case 'medium':
      return 'bg-amber-50 text-amber-500'
    case 'low':
      return 'bg-green-100 text-green-600'
    default:
      return 'bg-gray-100 text-gray-500'
  }
}

// แปลงสถานะเป็นข้อความภาษาไทย
function getStatusLabel(s) {
  switch (s) {
    case 'pending':
      return 'รอดำเนินการ'
    case 'in_progress':
      return 'กำลังดำเนินการ'
    case 'done':
      return 'ดำเนินการเสร็จสิ้น'
    default:
      return 'ยกเลิก'
  }
}

// กำหนดคลาสสีของ badge สถานะงาน
function getStatusClass(s) {
  switch (s) {
    case 'pending':
      return 'bg-amber-50 text-amber-500'
    case 'in_progress':
      return 'bg-blue-100 text-blue-600'
    case 'done':
      return 'bg-green-100 text-green-600'
    default:
      return 'bg-gray-100 text-gray-500'
  }
}

// ดึงรายการแจ้งซ่อมของฉัน และเตรียมข้อมูลสำหรับตารางและกล่องติดตามงาน
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

// โหลด timeline ของใบแจ้งซ่อมที่เลือก
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

    selectedTimelineSteps.value = buildTimelineFromRepair(data)
  } catch (err) {
    console.error('โหลด timeline ไม่สำเร็จ:', err)
    selectedTimelineSteps.value = []
  } finally {
    isTimelineLoading.value = false
  }
}

// เรียกเมื่อเปลี่ยนงานใน dropdown
async function handleSelectRepair(e) {
  const code = e.target.value
  selectedTrackingCode.value = code
  await loadTimelineForCode(code)
}

// แปลงวันเวลาเป็นรูปแบบไทย (วันที่ + เวลา)
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

// สร้างข้อมูล timeline จากเวลาในฐานข้อมูล (แก้: ซ่อนไว้ไม่ให้ส่ง description ถ้าเป็น upcoming)
function buildTimelineFromRepair(repairData) {
  const timelineSteps = []

  const statusConfigs = [
    {
      key: 'rf_create_at',
      title: 'รอดำเนินการ',
      description: 'ระบบได้รับใบแจ้งซ่อมของคุณแล้ว',
    },
    {
      key: 'rf_in_process_at',
      title: 'กำลังดำเนินการ',
      description: 'เจ้าหน้าที่กำลังดำเนินการซ่อมแซม',
    },
    {
      key: 'rf_done_at',
      title: 'ดำเนินการเสร็จสิ้น',
      description: 'งานซ่อมเสร็จเรียบร้อยแล้ว',
    },
  ]

  let lastReachedIndex = -1

  statusConfigs.forEach((status, index) => {
    if (repairData[status.key]) {
      lastReachedIndex = index
    }
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
      // <-- เปลี่ยนตรงนี้: ส่ง description เฉพาะเมื่อถึงสถานะ (isReached) เท่านั้น
      description: isReached ? status.description : null,
      stepState,
    })
  })

  return timelineSteps
}

// โหลดข้อมูลเมื่อเปิดหน้า
onMounted(() => {
  fetchRecentRepairs()
})

// ไปหน้ารายละเอียดใบแจ้งซ่อม
const goToDetail = (code) => router.push(`/main/repair-detail/${code}`)
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-8xl">
    <!-- ส่วนหัวทักทายและปุ่มแจ้งซ่อม -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">สวัสดีคุณ {{ loggedInUserName }}</h1>
        <p class="text-sm text-gray-600 mt-1">ระบบแจ้งเสียแจ้งซ่อมยินดีตอนรับ</p>
      </div>
      <repairButton />
    </div>

    <!-- ปฏิทินด้านบน -->
    <div class="mt-6">
      <div class="mt-6">
        <div class="rounded-b-xl">
          <ThaiCalendar />
        </div>
      </div>
    </div>

    <!-- ส่วนล่าง แบ่งสองคอลัมน์ -->
    <div class="mt-10 grid grid-cols-12 gap-6">
      <!-- คอลัมน์ซ้าย: ตาราง 5 รายการล่าสุด -->
      <div class="col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div class="border-b border-slate-200 pb-2 mb-4">
          <h2 class="text-xl font-bold mb-1">รายการที่ฉันแจ้งซ่อม</h2>
          <p class="text-xs text-gray-500">ระบบแสดงข้อมูล 5 รายการล่าสุด</p>
        </div>

        <table class="w-full text-xs">
          <thead>
            <tr class="border-b text-gray-600">
              <th class="py-2 px-3 text-left">วันที่</th>
              <th class="px-3 text-left">หมายเลขแจ้งซ่อม</th>
              <th class="px-3 text-left">หมายเลขครุภัณฑ์</th>
              <th class="px-3 text-left">หน่วยงาน</th>
              <th class="px-3 text-center w-32">ความเร่งด่วน</th>
              <th class="px-3 text-center w-32">สถานะงาน</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="!recentRepairs.length" class="text-center text-gray-400">
              <td colspan="6" class="py-6">ยังไม่มีรายการแจ้งซ่อม</td>
            </tr>

            <tr
              v-for="item in recentRepairs"
              :key="item.rf_code"
              class="border-b hover:bg-gray-50 cursor-pointer"
              @click="goToDetail(item.rf_code)"
            >
              <td class="py-3 px-3">
                {{ formatDateTH(item.rf_create_at) }}
              </td>
              <td class="px-3">{{ item.rf_code }}</td>
              <td class="px-3">{{ item.rf_prop_number || '-' }}</td>
              <td class="px-3">{{ item.department_name || '-' }}</td>

              <td class="px-3 text-center">
                <span
                  class="inline-flex min-w-[80px] justify-center items-center px-3 py-1 rounded-full font-semibold"
                  :class="getUrgencyClass(item.rf_urgency)"
                >
                  {{ getUrgencyLabel(item.rf_urgency) }}
                </span>
              </td>

              <td class="px-3 text-center">
                <span
                  class="inline-flex min-w-[95px] justify-center items-center px-3 py-1 rounded-full font-semibold"
                  :class="getStatusClass(item.rf_user_status)"
                >
                  {{ getStatusLabel(item.rf_user_status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- คอลัมน์ขวา: กล่องติดตามสถานะงาน -->
      <div class="col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div class="border-b border-slate-200 pb-3 mb-4">
          <div class="flex justify-between items-center mb-1">
            <h2 class="text-xl font-bold">กำลังดำเนินการ</h2>

            <select
              class="rounded-sm px-2 py-1 text-xs bg-white text-gray-700"
              :value="selectedTrackingCode"
              @change="handleSelectRepair"
            >
              <option value="" disabled>เลือกงาน</option>
              <option v-for="r in allMyRepairs" :key="r.rf_code" :value="r.rf_code">
                {{ r.rf_code }}
              </option>
            </select>
          </div>

          <p class="text-xs text-gray-500 mt-1">
            กำลังติดตามงานของ
            <span v-if="selectedTrackingCode" class="font-semibold">
              #{{ selectedTrackingCode }}
            </span>
            <span v-else>-</span>
          </p>
        </div>

        <div>
          <p v-if="isTimelineLoading" class="text-xs text-gray-400 text-center py-4">
            กำลังโหลดสถานะการดำเนินงาน...
          </p>

          <RepairStatusTimeline v-else :timeline-steps="selectedTimelineSteps" />
        </div>
      </div>
    </div>
  </div>
</template>
