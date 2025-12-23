<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RepairStatusTimeline from '@/components/status-timeline-component.vue'
import assignJobModalComponent from '@/components/modal/assign-job-modal-component.vue'
import AcceptJobModalComponent from '@/components/modal/accept-job-madal-component.vue'
import Swal from 'sweetalert2'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const route = useRoute()
const router = useRouter()

const repair = ref(null)
const isLoading = ref(true)
const isError = ref(false)
const repairCode = route.params.code
const canAssign = ref(false)
const canAccept = ref(false) // เพิ่มตัวแปรเช็คสิทธิ์ช่าง

const showAssignPopup = ref(false)
const showAcceptPopup = ref(false)

function openActionPopup() {
  const status = repair.value?.rf_user_status

  if (status === 'pending') {
    // 1. ถ้ารอรับงาน -> เปิด Modal รับงาน
    showAcceptPopup.value = true
  } else if (status === 'in_progress') {
    // 2. ถ้ากำลังทำ -> เปิด Modal เปลี่ยนสถานะ (หรือ Action อื่น)
    handleChangeStatus()
  }
}

function handleChangeStatus() {
  Swal.fire({
    title: 'เปลี่ยนสถานะ',
    text: 'คุณต้องการเปลี่ยนสถานะเป็น "เสร็จสิ้น" หรือไม่?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ใช่, เสร็จสิ้น',
    cancelButtonText: 'ยกเลิก',
  }).then(async (result) => {
    if (result.isConfirmed) {
      // ยิง API เปลี่ยนสถานะเป็น done (ตัวอย่าง)
      try {
        const res = await fetch(`${API_BASE}/technician/jobs/${repairCode}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }, // + Token header
          body: JSON.stringify({ status: 'done' }),
        })
        if (res.ok) {
          Swal.fire('สำเร็จ', 'อัปเดตสถานะเรียบร้อย', 'success')
          fetchRepairDetail()
        }
      } catch (e) {
        console.error(e)
      }
    }
  })
}

function handleAcceptSuccess() {
  fetchRepairDetail() // โหลดข้อมูลใหม่ สถานะจะเปลี่ยนเป็น in_progress
  showAcceptPopup.value = false
}

const isAssigned = computed(() => {
  const r = repair.value
  if (!r) return false

  // 1. เช็คจาก ID ช่าง: ต้องมีค่า และ ต้องมากกว่า 0 (เผื่อ Database ส่งมาเป็น 0 หรือ "0")
  if (r.rf_assigned_tech_id && Number(r.rf_assigned_tech_id) > 0) return true

  // 2. เช็คจาก Flag assigned
  if (r.assigned === true || r.assigned === 1) return true

  // 3. เช็คจากชื่อช่าง: ต้องมีค่า และ ต้องไม่ใช่เครื่องหมายขีด "-"
  if (r.main_technician && r.main_technician !== '-') return true

  return false
})

function openAssignPopup() {
  showAssignPopup.value = true
}

function handleAssignSuccess() {
  fetchRepairDetail() // โหลดข้อมูลใหม่เพื่ออัปเดตสถานะ
}

function goBack() {
  if (window.history.length > 1) {
    router.go(-1) // หรือ router.back()
  } else {
    router.push('/main/my-list') // fallback ถ้าไม่มี history
  }
}

// จัดการไฟล์มีเดีย
const mediaFiles = ref([])

// ฟังก์ชันจัดการไฟล์มีเดีย
function processMediaFiles(rfImage) {
  if (!rfImage) {
    mediaFiles.value = []
    return
  }

  let files = []
  try {
    // ถ้าเป็น JSON string ให้ parse
    files = typeof rfImage === 'string' ? JSON.parse(rfImage) : rfImage
  } catch (err) {
    console.error('ไม่สามารถ parse rf_image ได้:', err)
    files = []
  }

  mediaFiles.value = files.map((filePath) => {
    const fileName = filePath.split('/').pop()
    const fileExt = fileName.split('.').pop().toLowerCase()

    return {
      path: filePath,
      fullUrl: `${API_BASE}${filePath}`,
      fileName: fileName,
      isImage: ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt),
      isVideo: ['mp4', 'avi', 'mov', 'wmv'].includes(fileExt),
    }
  })
}

// ดึงข้อมูลรายละเอียดใบแจ้งซ่อม
async function fetchRepairDetail() {
  try {
    const res = await fetch(`${API_BASE}/repair-requests/${repairCode}?_=${Date.now()}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')
    // สร้าง timeline จากเวลาใน DB
    const timeline = buildTimelineFromRepair(data)
    // รวมทั้งหมดเข้า object เดียว
    repair.value = {
      ...data,
      timeline,
    }
    processMediaFiles(data.rf_image)
    console.log('โหลดข้อมูลสำเร็จ:', repair.value)
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

// แปลงสถานะงานให้เป็น badge สีสวย
function getUserStatusBadge(status) {
  switch (status) {
    case 'pending':
      return `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-amber-50 text-amber-500 font-semibold text-xs sm:text-sm">รอดำเนินการ</span>`
    case 'in_progress':
      return `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-blue-100 text-blue-600 font-semibold text-xs sm:text-sm">กำลังดำเนินการ</span>`
    case 'done':
      return `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-green-100 text-green-600 font-semibold text-xs sm:text-sm">ดำเนินการเสร็จสิ้น</span>`
    default:
      return `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-gray-100 text-gray-500 font-semibold text-xs sm:text-sm">ยกเลิก</span>`
  }
}

// แปลงความเร่งด่วนให้เป็น badge สี
function getUrgencyBadge(urgency) {
  switch (urgency) {
    case 'high':
      return `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-red-100 text-red-600 font-semibold text-xs sm:text-sm">เร่งด่วนมาก</span>`
    case 'medium':
      return `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-amber-50 text-amber-500 font-semibold text-xs sm:text-sm">เร่งด่วน</span>`
    case 'low':
      return `<span class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full bg-green-100 text-green-600 font-semibold text-xs sm:text-sm">ไม่เร่งด่วน</span>`
    default:
      return `<span class="inline-flex justify-center items-center px-4 py-1.5 rounded-full bg-gray-100 text-gray-500 font-medium text-xs sm:text-sm">-</span>`
  }
}

// Media Modal (รองรับทั้งรูปภาพและวิดีโอ)
const showLightbox = ref(false)
const currentMediaIndex = ref(0)

function openMedia(index) {
  currentMediaIndex.value = index
  showLightbox.value = true
  // ไม่ต้องใช้ showVideoModal แยก ใช้ showLightbox เดียวกัน
}

function closeMedia() {
  showLightbox.value = false
  // รีเซ็ต video element เมื่อปิด
  const videos = document.querySelectorAll('video')
  videos.forEach((video) => {
    video.pause()
  })
}

function nextMedia() {
  if (currentMediaIndex.value < mediaFiles.value.length - 1) {
    currentMediaIndex.value++
  }
}

function prevMedia() {
  if (currentMediaIndex.value > 0) {
    currentMediaIndex.value--
  }
}

// แปลงวัน-เวลาเป็นรูปแบบไทย (วันที่ + เวลา)
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
    year: 'numeric', // พ.ศ.
    month: 'long', // กุมภาพันธ์
    day: 'numeric', // 10
  })
}

// สร้าง timeline จากข้อมูลเวลาในฟอร์ม
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

  // ในฟังก์ชัน buildTimelineFromRepair ของไฟล์แรก

  statusConfigs.forEach((status, index) => {
    const isReached = index <= lastReachedIndex
    const isCurrent = index === lastReachedIndex
    const isLastStep = index === statusConfigs.length - 1

    let stepState = 'upcoming' // ยังไม่ถึง

    if (isReached) {
      // ถ้าถึงขั้นสุดท้ายแล้ว → completed
      if (isLastStep) {
        stepState = 'completed'
      } else if (isCurrent) {
        stepState = 'current'
      } else {
        stepState = 'completed'
      }
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

// เรียกใช้งานเมื่อโหลดหน้า
onMounted(() => {
  const state = history.state
  if (state) {
    if (state.fromAdmin) canAssign.value = true
    if (state.fromTechnician) canAccept.value = true // เพิ่มเงื่อนไขนี้ (ต้องส่งจากหน้า List มาด้วย)
  }
  // เช็คว่ามีตั๋ว "fromAdmin" แนบมาใน history state หรือไม่
  if (history.state && history.state.fromAdmin) {
    canAssign.value = true
  }

  fetchRepairDetail()
})

// ปุ่มยืนยันการเบิก + ฟอร์มใน modal
const showWithdrawModal = ref(false)
// ==== JWT Decode (เพิ่มส่วนนี้เข้าไปในไฟล์) ====
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
  } catch (err) {
    console.error('ไม่สามารถ decode token ได้:', err)
    return {}
  }
}

const withdrawForm = ref({
  requester_name: '',
  unit: '',
  date: '',
  repair_type_id: '',
  repair_type_name: '',
  location: '',
  urgency: '',
  reason: '',
  repair_code: '',
})

// ดึงข้อมูล user ที่ล็อกอินจาก token
function getCurrentUser() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) return {}

  const payload = parseJwt(token) || {}

  // ถ้า backend ใส่ข้อมูลไว้ใน payload.user ให้ดึงออกมาด้วย
  const user = payload.user || payload

  return user
}

// เปิด modal และเติมค่าเริ่มต้นจาก user ที่ล็อกอิน + ใบแจ้งซ่อม
function openWithdrawModal() {
  const user = getCurrentUser()

  const nameTh =
    user.us_first_name_th && user.us_last_name_th
      ? `${user.us_first_name_th} ${user.us_last_name_th}`
      : user.fullname || user.name || user.us_user_name || ''

  const department = user.us_department || user.department || user.dep_name || ''

  withdrawForm.value = {
    requester_name: nameTh,
    unit: department,
    date: new Date().toISOString().slice(0, 10),

    repair_type_id: '', // <-- ตั้งว่างก่อน
    location: `${repair.value?.building_name || ''} / ${repair.value?.floor_name || ''} / ${repair.value?.room_name || ''}`,
    urgency: repair.value?.rf_urgency || 'medium',
    reason: '',
    repair_code: repair.value?.rf_code || repairCode || '',
  }

  // -------- AUTO SELECT ----------
  // 1) ถ้ามี rf_tt_id (กรณีเก็บเป็น ID)
  if (repair.value?.rf_tt_id) {
    withdrawForm.value.repair_type_id = repair.value.rf_tt_id
  } else {
    // 2) ถ้าเก็บเป็นชื่อ
    const match = technicianTypes.value.find((t) => t.tt_name === repair.value?.repair_type_name)
    withdrawForm.value.repair_type_id = match ? match.tt_id : ''
  }

  showWithdrawModal.value = true
}

function closeWithdrawModal() {
  showWithdrawModal.value = false
}

async function submitWithdrawForm() {
  try {
    // TODO: ยิง API ถ้ามี
    // await fetch(...)

    showWithdrawModal.value = false

    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
      },
    })

    Toast.fire({
      icon: 'success',
      title: 'ยืนยันการเบิกเรียบร้อย',
    })
  } catch (err) {
    console.error(err)
    Swal.fire('ผิดพลาด', 'ไม่สามารถยืนยันการเบิกได้', 'error')
  }
}

const technicianTypes = ref([])

async function fetchTechnicianTypes() {
  try {
    const res = await fetch(`${API_BASE}/technician-types`) // <-- ชื่อ endpoint ตามที่คุณตั้ง
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'โหลดประเภทงานซ่อมไม่สำเร็จ')

    // คาดว่า data = [{ tt_id, tt_name }, ...]
    technicianTypes.value = data
  } catch (err) {
    console.error('โหลดประเภทงานซ่อมไม่สำเร็จ:', err)
  }
}

function handleRepairFrom(code) {
  // เก็บรหัสใบแจ้งซ่อมไว้ใน sessionStorage แล้วไปหน้า technician-stock-list
  try {
    sessionStorage.setItem('selected_rf_code', String(code))
  } catch (e) {
    console.warn('Cannot store selected_rf_code', e)
  }
  router.push('/main/technician-stock-list')
}

onMounted(() => {
  const state = history.state
  if (state) {
    if (state.fromAdmin) canAssign.value = true
    if (state.fromTechnician) canAccept.value = true
  }
  if (history.state && history.state.fromAdmin) {
    canAssign.value = true
  }

  fetchRepairDetail()
  fetchTechnicianTypes() // 👈 เพิ่มบรรทัดนี้
})
</script>

<template>
  <div class="bg-gray-50 min-h-screen py-6 sm:py-10 space-y-6 sm:space-y-8 px-3 sm:px-6 lg:px-8">
    <!-- Loading -->
    <div v-if="isLoading" class="text-center text-gray-500 py-16 text-base sm:text-lg">
      กำลังโหลดข้อมูล...
    </div>

    <!-- Error -->
    <div
      v-else-if="isError"
      class="text-center text-red-500 py-16 text-base sm:text-lg font-medium"
    >
      ไม่พบข้อมูลใบแจ้งซ่อม {{ repairCode }}
    </div>

    <div v-else-if="repair" class="space-y-8">
      <!-- ส่วนหัวเรื่อง -->
      <div
        class="bg-white rounded-xl shadow-sm p-4 sm:p-6 lg:p-8 mx-auto max-w-7xl border border-gray-100"
      >
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <!-- ซ้าย -->
          <div>
            <div class="flex items-center gap-4 mb-6">
              <!-- ปุ่มย้อนกลับ -->
              <div
                class="w-11 h-11 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition"
                @click="goBack"
              >
                <img src="/icon/back-icon.svg" class="w-6 h-6 sm:w-5 sm:h-5" />
              </div>

              <!-- หัวข้อ + Code -->
              <div class="flex flex-col leading-tight">
                <h1 class="text-lg sm:text-xl font-bold text-gray-600">รายละเอียดงานซ่อม</h1>

                <p class="text-gray-800 font-semibold text-sm sm:text-base">
                  {{ repair?.rf_code }}
                </p>
              </div>
            </div>
          </div>

          <!-- ขวา (Badge สถานะ / ความเร่งด่วน / ประเภท) -->
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
        <!-- กล่องข้อมูล 3 ช่อง -->
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

      <!-- สองคอลัมน์หลัก -->
      <div class="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div class="lg:col-span-2 space-y-6">
          <!-- กล่องสถานที่และอุปกรณ์ -->
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
                  <div>
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

              <!-- แสดงไฟล์มีเดีย -->
              <div class="border border-dashed border-gray-300 rounded-lg p-2 sm:p-3">
                <template v-if="mediaFiles.length > 0">
                  <!-- หากมีไฟล์เดียว แสดงไฟล์แรก -->
                  <template v-if="mediaFiles.length === 1">
                    <img
                      v-if="mediaFiles[0].isImage"
                      :src="mediaFiles[0].fullUrl"
                      :alt="mediaFiles[0].fileName"
                      class="max-h-40 sm:max-h-56 rounded-lg object-contain w-full cursor-pointer hover:opacity-90 transition"
                      @click="openMedia(0)"
                    />
                    <video
                      v-else-if="mediaFiles[0].isVideo"
                      :src="mediaFiles[0].fullUrl"
                      controls
                      class="max-h-40 sm:max-h-56 rounded-lg w-full cursor-pointer"
                      @click="openMedia(0)"
                    >
                      เบราว์เซอร์ของคุณไม่สามารถเล่นวิดีโอได้
                    </video>
                  </template>

                  <!-- หากมีหลายไฟล์ แสดงเป็น grid -->
                  <template v-else>
                    <div class="grid grid-cols-2 gap-2">
                      <template v-for="(file, index) in mediaFiles.slice(0, 3)" :key="index">
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

                          <!-- ไอคอนวิดีโอ -->
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

                      <!-- ถ้ามีมากกว่า 3 ไฟล์ -->
                      <div
                        v-if="mediaFiles.length > 3"
                        class="h-20 sm:h-24 rounded-lg bg-gray-100 flex items-center justify-center cursor-pointer"
                        @click="openMedia(3)"
                      >
                        <span class="text-gray-500 font-medium">+{{ mediaFiles.length - 3 }}</span>
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

          <!-- กล่องรายการเบิก -->
          <div class="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-800">รายการเบิก</h2>

              <!-- ปุ่มยืนยันการเบิก มุมขวาบน -->
              <button
                v-if="repair?.rf_user_status !== 'done'"
                type="button"
                class="px-4 py-2 text-sm sm:text-base font-semibold rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-2"
                @click="handleRepairFrom(repair?.rf_code)"
              >
                เบิกวัสดุ/อุปกรณ์
              </button>
            </div>

            <div v-if="repair?.stock_items?.length" class="space-y-2">
              <div
                v-for="(item, i) in repair.stock_items"
                :key="i"
                class="flex justify-between border-b pb-1 text-gray-700"
              >
                <span>{{ item.name }}</span>
                <span>{{ item.quantity }} ชิ้น</span>
              </div>
            </div>

            <div v-else class="text-center text-gray-400 text-sm sm:text-base py-8">
              - ไม่มีรายการเบิก -
            </div>
          </div>
        </div>

        <!-- ขวา -->
        <div class="space-y-6">
          <!-- ข้อมูลผู้แจ้ง -->
          <div class="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <div class="border-b border-gray-300 pb-2 mb-4 flex items-center gap-2">
              <img src="/icon/user-icon2.svg" class="w-10 h-10" />
              <h2 class="text-base sm:text-lg font-semibold text-gray-800">ข้อมูลผู้แจ้ง</h2>
            </div>

            <div class="space-y-2 text-gray-700 text-sm sm:text-base">
              <p><span class="text-gray-500">ชื่อ:</span> {{ repair?.reporter?.name || '-' }}</p>
              <p>
                <span class="text-gray-500">เบอร์โทร:</span> {{ repair?.reporter?.phone || '-' }}
              </p>
              <p>
                <span class="text-gray-500">หน่วยงาน:</span>
                {{ repair?.reporter?.department || '-' }}
              </p>
            </div>
          </div>

          <!-- สถานะการดำเนินงาน -->
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
              <button
                v-if="canAccept && repair?.rf_user_status !== 'done'"
                @click="openActionPopup"
                :class="[
                  'px-3 py-2 text-sm font-medium rounded-lg shadow-sm transition flex items-center gap-2 ml-auto text-white',
                  repair?.rf_user_status === 'pending'
                    ? 'bg-teal-700 hover:bg-teal-900 px-7' /* สีฟ้ารับงาน */
                    : 'bg-amber-500 hover:bg-amber-600' /* สีเหลืองเปลี่ยนสถานะ */,
                ]"
              >
                {{ repair?.rf_user_status === 'pending' ? 'รับงาน' : 'เปลี่ยนสถานะ' }}
              </button>
            </div>

            <RepairStatusTimeline :timeline-steps="repair?.timeline || []" />
          </div>
        </div>
      </div>
    </div>

    <!-- เผื่อไว้กรณีไม่มีข้อมูลเลย -->
    <div v-else class="text-center text-gray-400 py-16 text-sm sm:text-base">
      ไม่มีข้อมูลที่จะแสดง
    </div>
  </div>

  <!-- Media Modal สำหรับทั้งรูปภาพและวิดีโอ -->
  <div
    v-if="showLightbox"
    class="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
    @click="closeMedia"
  >
    <div class="relative max-w-4xl max-h-full p-4" @click.stop>
      <!-- ปุ่มปิด -->
      <button
        @click="closeMedia"
        class="absolute -top-4 -right-4 w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white text-2xl hover:text-gray-300 hover:bg-opacity-70 z-10"
      >
        ×
      </button>

      <!-- รูปภาพ -->
      <img
        v-if="mediaFiles[currentMediaIndex]?.isImage"
        :src="mediaFiles[currentMediaIndex]?.fullUrl"
        :alt="mediaFiles[currentMediaIndex]?.fileName"
        class="max-w-full max-h-full object-contain"
      />

      <!-- วิดีโอ -->
      <video
        v-else-if="mediaFiles[currentMediaIndex]?.isVideo"
        :src="mediaFiles[currentMediaIndex]?.fullUrl"
        controls
        autoplay
        class="max-w-full max-h-full"
        :key="currentMediaIndex"
      >
        เบราว์เซอร์ของคุณไม่สามารถเล่นวิดีโอได้
      </video>

      <!-- ปุ่มนำทาง -->
      <button
        v-if="mediaFiles.length > 1 && currentMediaIndex > 0"
        @click="prevMedia"
        class="absolute -left-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white text-2xl hover:text-gray-300 hover:bg-opacity-70"
      >
        ‹
      </button>
      <button
        v-if="mediaFiles.length > 1 && currentMediaIndex < mediaFiles.length - 1"
        @click="nextMedia"
        class="absolute -right-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white text-2xl hover:text-gray-300 hover:bg-opacity-70"
      >
        ›
      </button>

      <!-- ตัวนับและประเภทไฟล์ -->
      <div
        v-if="mediaFiles.length > 1"
        class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded"
      >
        {{ currentMediaIndex + 1 }} / {{ mediaFiles.length }}
      </div>
    </div>
  </div>
  <!-- Modal ฟอร์มยืนยันการเบิก -->
  <div
    v-if="showWithdrawModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3 sm:px-4 overflow-y-auto"
    @click.self="closeWithdrawModal"
  >
    <div
      class="bg-white rounded-2xl shadow-xl w-full max-w-5xl mx-auto my-6 sm:my-10 p-5 sm:p-8 relative max-h-[90vh] overflow-y-auto"
    >
      <!-- หัวข้อ -->
      <div class="mb-4 sm:mb-6">
        <h2 class="text-xl sm:text-2xl font-bold text-gray-800">ฟอร์มขอเบิกวัสดุ / อุปกรณ์</h2>
        <p class="text-gray-500 text-xs sm:text-sm mt-1">กรอกข้อมูลส่วนตัวของผู้ขอเบิกให้ครบถ้วน</p>
      </div>

      <form @submit.prevent="submitWithdrawForm" class="space-y-4 sm:space-y-5">
        <!-- หมายเลขใบแจ้งซ่อม -->
        <div class="flex flex-col gap-1">
          <label class="text-sm text-gray-700 font-medium"> หมายเลขใบแจ้งซ่อม </label>
          <input
            v-model="withdrawForm.repair_code"
            type="text"
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-100 cursor-not-allowed text-gray-700"
            disabled
          />
        </div>

        <!-- แถว 1 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm text-gray-700 font-medium"> ชื่อผู้ทำรายการเบิก </label>
            <input
              v-model="withdrawForm.requester_name"
              type="text"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-100 cursor-not-allowed text-gray-700"
              placeholder="กรอกชื่อ-นามสกุล"
              required
              disabled
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm text-gray-700 font-medium"> หน่วยงาน / สังกัด </label>
            <input
              v-model="withdrawForm.unit"
              type="text"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-100 cursor-not-allowed text-gray-700"
              placeholder="เช่น งานคอมพิวเตอร์"
              required
              disabled
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm text-gray-700 font-medium">
              วันที่ทำการเบิก <span class="text-red-600">*</span>
            </label>
            <input
              v-model="withdrawForm.date"
              type="date"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <!-- แถว 2 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm text-gray-700 font-medium">
              ประเภทงานซ่อม <span class="text-red-600">*</span>
            </label>
            <select
              v-model="withdrawForm.repair_type_id"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
            >
              <option disabled value="">กรุณาเลือกประเภทงานซ่อม</option>
              <option v-for="type in technicianTypes" :key="type.tt_id" :value="type.tt_id">
                {{ type.tt_name }}
              </option>
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm text-gray-700 font-medium"> สถานที่ </label>
            <input
              v-model="withdrawForm.location"
              type="text"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-100 cursor-not-allowed text-gray-700"
              placeholder="อาคาร / ชั้น / ห้อง"
              disabled
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-sm text-gray-700 font-medium">
              ความเร่งด่วน <span class="text-red-600">*</span>
            </label>
            <select
              v-model="withdrawForm.urgency"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option disabled value="">เลือกระดับความเร่งด่วน</option>
              <option value="high">เร่งด่วนมาก</option>
              <option value="medium">เร่งด่วน</option>
              <option value="low">ไม่เร่งด่วน</option>
            </select>
          </div>
        </div>

        <!-- แถว 3: หมายเหตุ -->
        <div class="flex flex-col gap-1">
          <label class="text-sm text-gray-900 font-semibold"> หมายเหตุ </label>
          <p class="text-neutral-400 text-xs mb-2">กรอกรายละเอียดเพิ่มเติม (ถ้ามี)</p>
          <textarea
            v-model="withdrawForm.reason"
            rows="3"
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
            placeholder="กรุณาใส่หมายเหตุ"
          ></textarea>
        </div>

        <!-- ปุ่ม -->
        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-4">
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-100 w-full sm:w-auto"
            @click="closeWithdrawModal"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            class="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm w-full sm:w-auto"
          >
            ยืนยันการเบิก
          </button>
        </div>
      </form>
    </div>
  </div>

  <assignJobModalComponent
    v-if="showAssignPopup"
    :repairId="repairCode"
    @close="showAssignPopup = false"
    @success="handleAssignSuccess"
  />
  <AcceptJobModalComponent
    v-if="showAcceptPopup"
    :repairCode="repairCode"
    :currentUserId="null"
    @close="showAcceptPopup = false"
    @success="handleAcceptSuccess"
  />
</template>
