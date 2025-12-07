<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RepairStatusTimeline from '@/components/status-timeline-component.vue'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const route = useRoute()
const router = useRouter()

const repair = ref(null)
const isLoading = ref(true)
const isError = ref(false)
const repairCode = route.params.code

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
      description: status.description,
      stepState,
    })
  })

  return timelineSteps
}

// เรียกใช้งานเมื่อโหลดหน้า
onMounted(fetchRepairDetail)
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
          <div
            class="flex flex-nowrap gap-2 sm:gap-3 justify-start md:justify-end items-center text-xs sm:text-sm"
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
            <h2 class="text-lg font-semibold text-gray-800 mb-4">รายการเบิก</h2>
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
</template>
