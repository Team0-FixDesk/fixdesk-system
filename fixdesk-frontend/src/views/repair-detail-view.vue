<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RepairStatusTimeline from '@/components/status-timeline-component.vue'
import assignJobModalComponent from '@/components/modal/assign-job-modal-component.vue'
import AcceptJobModalComponent from '@/components/modal/accept-job-modal-component.vue'
import Swal from 'sweetalert2'
import { usePhoneFormat } from '@/composables/usePhoneFormat'
import { useAuthToken } from '@/composables/useAuthToken'
import { jwtDecode } from 'jwt-decode'

// --- Constants ---
const API_BASE_URL = import.meta.env.VITE_API_BASE

// --- Composables ---
const { toDisplay } = usePhoneFormat()
const { token, isAuthenticated, logout } = useAuthToken()
const route = useRoute()
const router = useRouter()

// --- State Management ---
const repair = ref(null)
const isLoading = ref(true)
const isError = ref(false)
const repairCode = route.params.code
const canAssign = ref(false)
const canAccept = ref(false)

const showAssignPopup = ref(false)
const showAcceptPopup = ref(false)
const showStatusPopup = ref(false)

// Array naming convention
const mediaFileList = ref([])
const technicianTypeList = ref([])

/**
 * ตรวจสอบสิทธิ์การเข้าใช้งาน
 * เพิ่มบรรทัดว่างก่อน return
 */
function requireAuth() {
  if (!isAuthenticated.value || !token.value) {
    Swal.fire('หมดอายุการใช้งาน', 'กรุณาเข้าสู่ระบบใหม่', 'warning')
    logout()

    return false
  }

  return true
}

const currentUserId = computed(() => {
  try {
    return token?.value ? jwtDecode(token.value)?.us_id : null
  } catch {
    return null
  }
})

// --- Logic Functions ---

function openActionPopup() {
  const status = repair.value?.rf_user_status

  if (status === 'pending') {
    showAcceptPopup.value = true
  } else if (status === 'in_progress') {
    showStatusPopup.value = true
  }
}

function closeStatusPopup() {
  showStatusPopup.value = false
}

function handleSelectStatus(statusType) {
  if (statusType === 'done') {
    showStatusPopup.value = false
    confirmCloseJob()
  } else if (statusType === 'outsource') {
    showStatusPopup.value = false
    confirmOutsource()
  }
}

async function confirmCloseJob() {
  const result = await Swal.fire({
    title: 'เปลี่ยนสถานะ',
    text: 'คุณต้องการเปลี่ยนสถานะเป็น "เสร็จสิ้น" หรือไม่?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ใช่, เสร็จสิ้น',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#10b981',
  })

  if (!result.isConfirmed) return
  if (!requireAuth()) return

  try {
    const res = await fetch(`${API_BASE_URL}/technician/close-job/${repairCode}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ status: 'done' }),
    })

    if (!res.ok) throw new Error('UPDATE_FAILED')

    Swal.fire('สำเร็จ', 'อัปเดตสถานะเรียบร้อย', 'success')
    fetchRepairDetail()
  } catch (e) {
    console.error(e)
    Swal.fire('ผิดพลาด', 'ไม่สามารถปิดงานได้', 'error')
  }
}

async function confirmOutsource() {
  const result = await Swal.fire({
    title: 'จ้างช่างภายนอก',
    text: 'คุณต้องการส่งงานให้ช่างภายนอกหรือไม่?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ใช่, ส่งงาน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#f59e0b',
  })

  if (!result.isConfirmed) return
  if (!requireAuth()) return

  try {
    const res = await fetch(`${API_BASE_URL}/technician/close-job/${repairCode}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ status: 'outsource' }),
    })

    if (!res.ok) throw new Error('OUTSOURCE_FAILED')

    Swal.fire('สำเร็จ', 'ส่งงานให้ช่างภายนอกเรียบร้อย', 'success')
    fetchRepairDetail()
  } catch (e) {
    console.error(e)
    Swal.fire('ผิดพลาด', 'ไม่สามารถส่งงานได้', 'error')
  }
}

function handleAcceptSuccess() {
  fetchRepairDetail()
  showAcceptPopup.value = false
}

const isAssigned = computed(() => {
  const r = repair.value
  if (!r) return false

  const hasTechId = r.rf_assigned_tech_id && Number(r.rf_assigned_tech_id) > 0
  const hasAssignFlag = r.assigned === true || r.assigned === 1
  const hasTechName = r.main_technician && r.main_technician !== '-'

  return hasTechId || hasAssignFlag || hasTechName
})

function openAssignPopup() {
  showAssignPopup.value = true
}

function handleAssignSuccess() {
  fetchRepairDetail()
}

function goBack() {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/main/my-list')
  }
}

/**
 * จัดการไฟล์มีเดียและเปลี่ยนชื่อตัวแปรให้ตรงตาม Standard
 */
function processMediaFileList(rfImage) {
  if (!rfImage) {
    mediaFileList.value = []
    return
  }

  let rawFileList = []
  try {
    rawFileList = typeof rfImage === 'string' ? JSON.parse(rfImage) : rfImage
  } catch (err) {
    console.error('ไม่สามารถ parse rf_image ได้:', err)
    rawFileList = []
  }

  mediaFileList.value = rawFileList.map((filePath) => {
    const fileName = filePath.split('/').pop()
    const fileExt = fileName.split('.').pop().toLowerCase()

    return {
      path: filePath,
      fullUrl: `${API_BASE_URL}${filePath}`,
      fileName: fileName,
      isImage: ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt),
      isVideo: ['mp4', 'avi', 'mov', 'wmv'].includes(fileExt),
    }
  })
}

async function fetchRepairDetail() {
  try {
    const res = await fetch(`${API_BASE_URL}/repair-requests/${repairCode}?_=${Date.now()}`)
    const data = await res.json()

    if (!res.ok) throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')

    const timeline = buildTimelineFromRepair(data)
    repair.value = {
      ...data,
      timeline,
    }
    processMediaFileList(data.rf_image)
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

// --- Formatting Helpers ---

function getUserStatusBadge(status) {
  let badgeHtml = ''
  switch (status) {
    case 'pending':
      badgeHtml = `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-amber-50 text-amber-500 font-semibold text-xs sm:text-sm">รอดำเนินการ</span>`
      break
    case 'in_progress':
      badgeHtml = `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-blue-100 text-blue-600 font-semibold text-xs sm:text-sm">กำลังดำเนินการ</span>`
      break
    case 'outsource':
      badgeHtml = `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-purple-100 text-purple-600 font-semibold text-xs sm:text-sm">จ้างช่างภายนอก</span>`
      break
    case 'done':
      badgeHtml = `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-green-100 text-green-600 font-semibold text-xs sm:text-sm">ดำเนินการเสร็จสิ้น</span>`
      break
    default:
      badgeHtml = `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-gray-100 text-gray-500 font-semibold text-xs sm:text-sm">ยกเลิก</span>`
  }

  return badgeHtml
}

function getUrgencyBadge(urgency) {
  let badgeHtml = ''
  switch (urgency) {
    case 'high':
      badgeHtml = `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-red-100 text-red-600 font-semibold text-xs sm:text-sm">เร่งด่วนมาก</span>`
      break
    case 'medium':
      badgeHtml = `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-amber-50 text-amber-500 font-semibold text-xs sm:text-sm">เร่งด่วน</span>`
      break
    case 'low':
      badgeHtml = `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-green-100 text-green-600 font-semibold text-xs sm:text-sm">ไม่เร่งด่วน</span>`
      break
    default:
      badgeHtml = `<span class="inline-flex justify-center items-center px-4 py-1.5 rounded-full bg-gray-100 text-gray-500 font-medium text-xs sm:text-sm">-</span>`
  }

  return badgeHtml
}

// Media Modal Logic
const showLightbox = ref(false)
const currentMediaIndex = ref(0)

function openMedia(index) {
  currentMediaIndex.value = index
  showLightbox.value = true
}

function closeMedia() {
  showLightbox.value = false
  const videoElements = document.querySelectorAll('video')
  videoElements.forEach((video) => {
    video.pause()
  })
}

function nextMedia() {
  if (currentMediaIndex.value < mediaFileList.value.length - 1) {
    currentMediaIndex.value++
  }
}

function prevMedia() {
  if (currentMediaIndex.value > 0) {
    currentMediaIndex.value--
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

function formatFullThaiDate(dateValue) {
  if (!dateValue) return '-'

  const date = new Date(dateValue)

  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function buildTimelineFromRepair(repairData) {
  const timelineStepList = []
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
      if (isLastStep || !isCurrent) {
        stepState = 'completed'
      } else {
        stepState = 'current'
      }
    }

    timelineStepList.push({
      displayTime: repairData[status.key] ? formatDateTimeTH(repairData[status.key]) : null,
      title: status.title,
      description: isReached ? status.description : null,
      stepState,
    })
  })

  return timelineStepList
}

// --- Withdrawal Logic ---
const showWithdrawButton = computed(() => {
  if (!repair.value) return false

  const status = repair.value.rf_user_status
  if (status === 'pending' || status === 'done') return false
  if (!history.state?.fromTechnician) return false

  return true
})

async function fetchTechnicianTypeList() {
  try {
    const res = await fetch(`${API_BASE_URL}/technician-types`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'โหลดประเภทงานซ่อมไม่สำเร็จ')

    technicianTypeList.value = data
  } catch (err) {
    console.error('โหลดประเภทงานซ่อมไม่สำเร็จ:', err)
  }
}

function handleRepairFrom(code) {
  try {
    sessionStorage.setItem('selected_rf_code', String(code))
  } catch (e) {
    console.warn('Cannot store selected_rf_code', e)
  }
  router.push('/main/technician-stock-list')
}

onMounted(() => {
  const state = history.state || {}
  canAssign.value = !!state.fromAdmin
  canAccept.value = !!state.fromTechnician

  fetchRepairDetail()
  fetchTechnicianTypeList()
})
</script>

<template>
  <div class="bg-gray-50 min-h-screen px-3 sm:px-6 lg:px-8">
    <div v-if="isLoading" class="text-center text-gray-500 py-16 text-base sm:text-lg">
      กำลังโหลดข้อมูล...
    </div>

    <div
      v-else-if="isError"
      class="text-center text-red-500 py-16 text-base sm:text-lg font-medium"
    >
      ไม่พบข้อมูลใบแจ้งซ่อม {{ repairCode }}
    </div>

    <div v-else-if="repair" class="space-y-8">
      <div
        class="bg-white rounded-xl shadow-sm p-4 sm:p-6 lg:p-8 mx-auto max-w-7xl border border-gray-100"
      >
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div class="flex items-center gap-4 mb-6">
              <div
                class="w-11 h-11 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition"
                @click="goBack"
              >
                <img src="/icon/back-icon.svg" class="w-6 h-6 sm:w-5 sm:h-5" />
              </div>

              <div class="flex flex-col leading-tight">
                <h1 class="text-lg sm:text-xl font-bold text-gray-600">รายละเอียดงานซ่อม</h1>

                <p class="text-gray-800 font-semibold text-sm sm:text-base">
                  {{ repair?.rf_code }}
                </p>
              </div>
            </div>
          </div>

          <div class="flex flex-col items-start md:items-end gap-3">
            <div
              class="flex flex-wrap gap-2 sm:gap-3 justify-start md:justify-end items-center text-xs sm:text-sm"
            >
              <span v-html="getUserStatusBadge(repair?.rf_user_status)"></span>
              <span v-html="getUrgencyBadge(repair?.rf_urgency)"></span>
              <span
                class="inline-flex justify-center items-center px-4 py-1.5 rounded-full bg-gray-100 text-gray-600 font-medium whitespace-nowrap"
              >
                ประเภท: {{ repair?.repair_type_name || '-' }}
              </span>
            </div>
          </div>
        </div>
        <div>
          <p class="text-gray-700 text-sm sm:text-base">
            รายละเอียด:
            <span class="break-word">
              {{ repair?.rf_problem || '-' }}
            </span>
          </p>
          <p class="text-gray-500 mt-2 text-sm sm:text-base">
            สาเหตุ/อาการ:
            <span class="break-word">
              {{ repair?.rf_detail || '-' }}
            </span>
          </p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div class="border border-gray-200 rounded-lg p-3 sm:p-4">
            <p class="text-xs sm:text-sm text-gray-500">ผู้แจ้ง</p>
            <p class="font-medium text-gray-800 text-sm sm:text-base">
              {{ repair?.reporter?.name || '-' }}
            </p>
          </div>

          <div class="border border-gray-200 rounded-lg p-3 sm:p-4">
            <p class="text-xs sm:text-sm text-gray-500">ผู้รับผิดชอบงานหลัก</p>
            <p class="font-medium text-gray-800 text-sm sm:text-base">
              {{ repair?.main_technician || '-' }}
            </p>
            <p class="text-sm text-gray-500 mt-1">
              ตำแหน่ง:
              <span class="font-medium text-gray-800 text-sm sm:text-base">
                {{ repair?.tech_position || '-' }}
              </span>
            </p>
          </div>

          <div class="border border-gray-200 rounded-lg p-3 sm:p-4">
            <p class="text-xs sm:text-sm text-gray-500">แจ้งซ่อมเมื่อ</p>
            <p class="font-medium text-gray-800 text-sm sm:text-base">
              {{ formatFullThaiDate(repair?.rf_create_at) }}
            </p>
          </div>
        </div>
      </div>

      <div class="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <div class="border-b border-gray-300 pb-2 mb-4">
              <h2 class="text-lg font-semibold text-gray-800">สถานที่และอุปกรณ์</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
              <div class="space-y-4">
                <div class="flex items-start gap-3">
                  <div
                    class="min-w-[42px] min-h-[42px] sm:min-w-[46px] sm:min-h-[46px] flex items-center justify-center rounded-lg bg-blue-500"
                  >
                    <img src="/icon/building-icon.svg" class="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <span class="text-sm sm:text-base leading-tight text-gray-500 block">
                      อาคาร/ชั้น/ห้อง:
                    </span>
                    <span
                      class="text-sm sm:text-base leading-tight text-gray-700 block tracking-wide break-all"
                    >
                      {{ repair?.building_name || '-' }}/{{ repair?.floor_name || '-' }}/{{
                        repair?.room_name || '-'
                      }}
                    </span>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <div
                    class="min-w-[42px] min-h-[42px] sm:min-w-[46px] sm:min-h-[46px] flex items-center justify-center rounded-lg bg-green-500"
                  >
                    <img src="/icon/prop-icon.svg" class="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div class="break-word">
                    <span class="text-sm sm:text-base leading-tight text-gray-500 block"
                      >หมายเลขครุภัณฑ์:</span
                    >
                    <span
                      class="text-sm sm:text-base leading-tight text-gray-700 block tracking-wide"
                    >
                      {{ repair?.rf_prop_number || '-' }}
                    </span>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <div
                    class="min-w-[42px] min-h-[42px] sm:min-w-[46px] sm:min-h-[46px] flex items-center justify-center rounded-lg bg-amber-500"
                  >
                    <img src="/icon/item-icon.svg" class="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>

                  <div>
                    <span class="text-sm sm:text-base leading-tight text-gray-500 block"
                      >อุปกรณ์ที่ชำรุด:</span
                    >
                    <span
                      class="text-sm sm:text-base leading-tight text-gray-700 block tracking-wide"
                    >
                      {{ repair?.rf_problem || '-' }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="border border-dashed border-gray-300 rounded-lg p-2 sm:p-3">
                <template v-if="mediaFileList.length > 0">
                  <template v-if="mediaFileList.length === 1">
                    <img
                      v-if="mediaFileList[0].isImage"
                      :src="mediaFileList[0].fullUrl"
                      :alt="mediaFileList[0].fileName"
                      class="max-h-40 sm:max-h-56 rounded-lg object-contain w-full cursor-pointer hover:opacity-90 transition"
                      @click="openMedia(0)"
                    />
                    <video
                      v-else-if="mediaFileList[0].isVideo"
                      :src="mediaFileList[0].fullUrl"
                      controls
                      class="max-h-40 sm:max-h-56 rounded-lg w-full cursor-pointer"
                      @click="openMedia(0)"
                    >
                      เบราว์เซอร์ของคุณไม่สามารถเล่นวิดีโอได้
                    </video>
                  </template>

                  <template v-else>
                    <div class="grid grid-cols-2 gap-2">
                      <template v-for="(file, index) in mediaFileList.slice(0, 3)" :key="index">
                        <div class="relative">
                          <img
                            v-if="file.isImage"
                            :src="file.fullUrl"
                            :alt="file.fileName"
                            class="h-20 sm:h-24 w-full rounded-lg object-cover cursor-pointer hover:opacity-90 transition"
                            @click="openMedia(index)"
                          />
                          <video
                            v-else-if="file.isVideo"
                            :src="file.fullUrl"
                            class="h-20 sm:h-24 w-full rounded-lg object-cover"
                            muted
                            @click="openMedia(index)"
                          ></video>

                          <div
                            v-if="file.isVideo"
                            class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg cursor-pointer"
                            @click="openMedia(index)"
                          >
                            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                d="M6.3 2.84A1 1 0 004 3.75v12.5a1 1 0 001.65.76L17.3 10.76a1 1 0 000-1.52L5.65 3.08z"
                              />
                            </svg>
                          </div>
                        </div>
                      </template>

                      <div
                        v-if="mediaFileList.length > 3"
                        class="h-20 sm:h-24 rounded-lg bg-gray-100 flex items-center justify-center cursor-pointer"
                        @click="openMedia(3)"
                      >
                        <span class="text-gray-500 font-medium"
                          >+{{ mediaFileList.length - 3 }}</span
                        >
                      </div>
                    </div>
                  </template>
                </template>

                <template v-else>
                  <div
                    class="flex items-center justify-center text-gray-400 text-xs sm:text-sm min-h-[80px]"
                  >
                    ไม่มีการแนบไฟล์
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4 border-b border-gray-300 pb-2 mb-4">
              <h2 class="text-lg font-semibold text-gray-800">รายการเบิก</h2>
            </div>

            <div v-if="repair?.stock_items?.length" class="space-y-3 h-[280px] overflow-y-auto">
              <div
                v-for="(item, i) in repair.stock_items"
                :key="i"
                class="flex p-1 items-center"
                :class="{
                  'border-b border-gray-200': i < repair.stock_items.length - 1,
                }"
              >
                <div class="flex-1 leading-tight">
                  <p class="text-gray-800 font-semibold text-sm">
                    {{ item.name }}
                  </p>
                  <p class="text-xs text-gray-500">
                    หมายเลขวัสดุ/ครุภัณฑ์:
                    <span class="text-gray-700 font-medium">
                      {{ item.assetCode || '-' }}
                    </span>
                  </p>
                </div>

                <div class="text-right">
                  <p class="text-xs text-gray-500">จำนวนที่เบิก</p>
                  <p class="text-sm text-gray-400">
                    {{ item.qty }}
                    <span class="text-sm text-gray-500">ชิ้น</span>
                  </p>
                </div>
              </div>
            </div>

            <div v-else class="text-center text-gray-400 text-sm sm:text-base py-8 h-[250px]">
              - ไม่มีรายการเบิก -
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <div class="border-b border-gray-300 pb-2 mb-4 flex items-center gap-2">
              <img src="/icon/user-icon2.svg" class="w-10 h-10" />
              <h2 class="text-base sm:text-lg font-semibold text-gray-800">ข้อมูลผู้แจ้ง</h2>
            </div>

            <div class="space-y-2 text-gray-700 text-sm sm:text-base">
              <p><span class="text-gray-500">ชื่อ:</span> {{ repair?.reporter?.name || '-' }}</p>
              <p>
                <span class="text-gray-500">เบอร์โทร:</span>
                {{ repair?.reporter?.phone ? toDisplay(repair.reporter.phone) : '-' }}
              </p>
              <p>
                <span class="text-gray-500">หน่วยงาน:</span>
                {{ repair?.reporter?.department || '-' }}
              </p>
            </div>
          </div>

          <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div class="border-b border-gray-300 pb-2 mb-4 flex items-center gap-2">
              <img src="/icon/time-icon.svg" class="w-8 h-8" />
              <h2 class="text-base sm:text-lg font-semibold text-gray-800">สถานะการดำเนินงาน</h2>

              <button
                v-if="canAssign && repair?.rf_user_status !== 'done'"
                :disabled="isAssigned"
                @click="openAssignPopup"
                :class="[
                  'px-3 py-2 text-sm font-medium rounded-lg shadow-sm transition flex items-center gap-2 ml-auto',
                  isAssigned
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white',
                ]"
              >
                {{ isAssigned ? 'มอบหมายแล้ว' : 'มอบหมายงาน' }}
              </button>
            </div>

            <RepairStatusTimeline :timeline-steps="repair?.timeline || []" />
          </div>

          <div v-if="showWithdrawButton || (canAccept && repair?.rf_user_status !== 'done')">
            <div :class="['grid gap-4', showWithdrawButton ? 'grid-cols-2' : 'grid-cols-1']">
              <button
                v-if="showWithdrawButton"
                type="button"
                class="w-full px-6 py-3.5 text-sm sm:text-base font-semibold rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-3 hover:shadow-lg hover:-translate-y-0.5 bg-blue-600 hover:bg-blue-700 text-white"
                @click="handleRepairFrom(repair?.rf_code)"
              >
                <img
                  src="/icon/item-icon.svg"
                  class="w-5 h-5"
                />
                เบิกวัสดุ/อุปกรณ์
              </button>

              <div v-if="canAccept && repair?.rf_user_status !== 'done'" class="relative">
                <button
                  @click="
                    repair?.rf_user_status === 'pending'
                      ? openActionPopup()
                      : repair?.rf_user_status === 'outsource'
                        ? confirmCloseJob()
                        : openActionPopup()
                  "
                  :class="[
                    'w-full px-6 py-3.5 text-sm sm:text-base font-semibold rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-3 text-white hover:shadow-lg hover:-translate-y-0.5',
                    repair?.rf_user_status === 'pending'
                      ? 'bg-teal-500 hover:bg-teal-600'
                      : repair?.rf_user_status === 'outsource'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-amber-500 hover:bg-amber-600',
                  ]"
                >
                  <img
                  src="/icon/rotate-icon.svg"
                  class="w-5 h-5"
                />
                  <span>
                    {{
                      repair?.rf_user_status === 'pending'
                        ? 'รับงาน'
                        : repair?.rf_user_status === 'outsource'
                          ? 'เสร็จสิ้น'
                          : 'เปลี่ยนสถานะ'
                    }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <assignJobModalComponent
      v-if="showAssignPopup"
      :repairCode="repair?.rf_code"
      :isOpen="showAssignPopup"
      @close="showAssignPopup = false"
      @success="handleAssignSuccess"
    />

    <AcceptJobModalComponent
      v-if="showAcceptPopup"
      :repairCode="repair?.rf_code"
      :isOpen="showAcceptPopup"
      :currentUserId="currentUserId"
      @close="showAcceptPopup = false"
      @success="handleAcceptSuccess"
    />

    <div
      v-if="showStatusPopup"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm"
      @click.self="closeStatusPopup"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200"
      >
        <div class="p-6 text-center border-b border-gray-100">
          <h3 class="text-xl font-bold text-gray-800">เลือกสถานะงาน</h3>
          <p class="text-gray-500 text-sm mt-1">กรุณาเลือกสถานะที่ต้องการเปลี่ยน</p>
        </div>
        <div class="p-4 space-y-3">
          <button
            @click="handleSelectStatus('done')"
            class="w-full py-4 px-6 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl font-bold transition-all flex items-center justify-between group"
          >
            <span>ดำเนินการเสร็จสิ้น</span>
            <svg
              class="w-5 h-5 transform group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
          <button
            @click="handleSelectStatus('outsource')"
            class="w-full py-4 px-6 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-bold transition-all flex items-center justify-between group"
          >
            <span>จ้างช่างภายนอก</span>
            <svg
              class="w-5 h-5 transform group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
          <button
            @click="closeStatusPopup"
            class="w-full py-3 px-6 text-gray-400 hover:text-gray-600 font-medium transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showLightbox"
      class="fixed inset-0 z-[100] bg-black bg-opacity-95 flex flex-col items-center justify-center p-4 backdrop-blur-md"
      @click.self="closeMedia"
    >
      <button
        @click="closeMedia"
        class="absolute top-6 right-6 text-white hover:text-gray-300 transition p-2 bg-white/10 rounded-full"
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div class="relative w-full max-w-5xl h-[70vh] flex items-center justify-center">
        <button
          v-if="currentMediaIndex > 0"
          @click="prevMedia"
          class="absolute left-0 z-10 p-4 text-white hover:bg-white/10 rounded-full transition"
        >
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div class="w-full h-full flex items-center justify-center">
          <img
            v-if="mediaFileList[currentMediaIndex].isImage"
            :src="mediaFileList[currentMediaIndex].fullUrl"
            class="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
          <video
            v-else-if="mediaFileList[currentMediaIndex].isVideo"
            :src="mediaFileList[currentMediaIndex].fullUrl"
            controls
            autoplay
            class="max-w-full max-h-full rounded-lg shadow-2xl"
          ></video>
        </div>

        <button
          v-if="currentMediaIndex < mediaFileList.length - 1"
          @click="nextMedia"
          class="absolute right-0 z-10 p-4 text-white hover:bg-white/10 rounded-full transition"
        >
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      <div class="mt-8 text-white text-center">
        <p class="text-lg font-medium">{{ mediaFileList[currentMediaIndex].fileName }}</p>
        <p class="text-sm text-gray-400 mt-1">
          ไฟล์ที่ {{ currentMediaIndex + 1 }} จาก {{ mediaFileList.length }}
        </p>
      </div>
    </div>
  </div>
</template>
