<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const route = useRoute()

const repair = ref(null)
const isLoading = ref(true)
const isError = ref(false)
const repairCode = route.params.code

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

// แปลงวัน-เวลาเป็นรูปแบบไทย (วันที่ + เวลา)
function formatDateTimeTH(value) {
  if (!value) return null
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// สร้าง timeline จากข้อมูลเวลาในฟอร์ม
function buildTimelineFromRepair(data) {
  const timeline = []

  // Step 1: รอดำเนินการ (ใช้เวลา create_at)
  if (data.rf_create_at) {
    timeline.push({
      date: formatDateTimeTH(data.rf_create_at),
      title: 'รอดำเนินการ',
      detail: 'ระบบได้รับใบแจ้งซ่อมของคุณแล้ว',
    })
  }

  // Step 2: กำลังดำเนินการ (ถ้ามี in_process_at)
  if (data.rf_in_process_at) {
    timeline.push({
      date: formatDateTimeTH(data.rf_in_process_at),
      title: 'กำลังดำเนินการ',
      detail: 'เจ้าหน้าที่ช่างกำลังดำเนินการซ่อมแซม',
    })
  }

  // Step 3: ดำเนินการเสร็จสิ้น (ถ้ามี done_at)
  if (data.rf_done_at) {
    timeline.push({
      date: formatDateTimeTH(data.rf_done_at),
      title: 'ดำเนินการเสร็จสิ้น',
      detail: 'งานซ่อมเสร็จสิ้นแล้ว',
    })
  }

  return timeline
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
            <h1 class="text-lg sm:text-xl font-bold text-gray-900 mb-1">รายละเอียดงานซ่อม</h1>
            <p class="text-gray-700 font-semibold text-sm sm:text-base">{{ repair?.rf_code }}</p>
            <p class="text-gray-500 mt-2 text-sm sm:text-base">
              รายละเอียด : {{ repair?.rf_detail || '-' }}
            </p>
          </div>

          <!-- ขวา (Badge สถานะ / ความเร่งด่วน / ประเภท) -->
          <div
            class="flex flex-wrap gap-2 sm:gap-3 justify-start md:justify-end text-xs sm:text-sm"
          >
            <span v-html="getUserStatusBadge(repair?.rf_user_status)"></span>
            <span v-html="getUrgencyBadge(repair?.rf_urgency)"></span>
            <span
              class="inline-flex justify-center items-center px-4 py-1.5 rounded-full bg-gray-100 text-gray-600 font-medium"
            >
              ประเภท : {{ repair?.repair_type_name || '-' }}
            </span>
          </div>
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
              ตำแหน่ง :
              <span class="font-medium text-gray-800 text-sm sm:text-base">
                {{ repair?.tech_position || '-' }}
              </span>
            </p>
          </div>

          <div class="border border-gray-200 rounded-lg p-3 sm:p-4">
            <p class="text-xs sm:text-sm text-gray-500">แจ้งซ่อมเมื่อ</p>
            <p class="font-medium text-gray-800 text-sm sm:text-base">
              {{
                repair?.rf_create_at
                  ? new Date(repair.rf_create_at).toLocaleDateString('th-TH')
                  : '-'
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- สองคอลัมน์หลัก -->
      <div class="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div class="lg:col-span-2 space-y-6">
          <!-- กล่องสถานที่และอุปกรณ์ -->
          <div class="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">สถานที่และอุปกรณ์</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
              <div class="space-y-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-blue-500"
                  >
                    <img src="/icon/building-icon.svg" class="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>

                  <p class="text-sm sm:text-base">
                    <span class="text-gray-500">อาคาร/ชั้น/ห้อง:</span>
                    {{ repair?.building_name || '-' }} / {{ repair?.floor_name || '-' }} /
                    {{ repair?.room_name || '-' }}
                  </p>
                </div>

                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-green-500"
                  >
                    <img src="/icon/prop-icon.svg" class="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <p class="text-sm sm:text-base">
                    <span class="text-gray-500">หมายเลขครุภัณฑ์:</span>
                    {{ repair?.rf_prop_number || '-' }}
                  </p>
                </div>

                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-amber-500"
                  >
                    <img src="/icon/item-icon.svg" class="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <p class="text-sm sm:text-base">
                    <span class="text-gray-500">อุปกรณ์ที่ชำรุด:</span>
                    {{ repair?.rf_problem || '-' }}
                  </p>
                </div>
              </div>

              <div
                class="border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xs sm:text-sm p-2 sm:p-3"
              >
                <template v-if="repair?.rf_image">
                  <img
                    :src="`${API_BASE}/uploads/${repair.rf_image}`"
                    alt="รูปที่แนบ"
                    class="max-h-40 sm:max-h-56 rounded-lg object-contain w-full"
                  />
                </template>
                <template v-else>ไม่มีการแนบรูปภาพ</template>
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
            <div class="flex items-center gap-2 mb-3">
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
            <div class="flex items-center gap-2 mb-3">
              <img src="/icon/time-icon.svg" class="w-8 h-8" />
              <h2 class="text-base sm:text-lg font-semibold text-gray-800">สถานะการดำเนินงาน</h2>
            </div>

            <!-- timeline -->
            <div class="mt-2 flex flex-col w-full items-start">
              <div v-for="(step, i) in repair?.timeline || []" :key="i" class="group flex w-full">
                <!-- คอลัมน์แกน + วงกลม (กว้างเท่าไอคอนเวลา) -->
                <div class="relative w-8 flex justify-center">
                  <!-- เส้นแนวตั้ง -->
                  <div
                    v-if="i !== (repair?.timeline?.length || 0) - 1"
                    class="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-gray-200"
                  ></div>

                  <!-- วงกลม -->
                  <span
                    class="relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-white shrink-0"
                    :class="{
                      'bg-yellow-400': i === 0,
                      'bg-amber-500': i === 1,
                      'bg-green-500': i > 1,
                    }"
                  >
                    <img src="/icon/circle-check-icon.svg" class="w-4 h-4 object-contain" />
                  </span>
                </div>

                <!-- เนื้อหา -->
                <div class="flex-1 -translate-y-1 pl-3 pb-6 text-gray-600">
                  <div class="flex flex-col space-y-0.5">
                    <p class="text-sm text-gray-500  ">
                      {{ step.date }}
                    </p>
                    <p class="font-bold text-gray-600 text-sm sm:text-base">
                      {{ step.title }}
                    </p>
                    <p class="text-sm text-gray-500 ">
                      {{ step.detail }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="!repair?.timeline || !repair.timeline.length"
              class="text-gray-400 text-xs sm:text-sm text-center"
            >
              - ยังไม่มีประวัติการดำเนินการ -
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- เผื่อไว้กรณีไม่มีข้อมูลเลย -->
    <div v-else class="text-center text-gray-400 py-16 text-sm sm:text-base">
      ไม่มีข้อมูลที่จะแสดง
    </div>
  </div>
</template>
