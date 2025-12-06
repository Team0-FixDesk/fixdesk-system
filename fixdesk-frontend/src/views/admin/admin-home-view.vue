<template>
  <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-8xl container mx-auto px-5 py-6">
    <!-- Header section -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">หน้าแรก</h1>
        <p class="text-gray-600">ภาพรวมงานแจ้งเรียนแจ้งซ่อม</p>
      </div>
      <div class="flex space-x-2">
        <button
          @click="fetchRepairRequests"
          :disabled="loading"
          class="bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded-md flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          รีเฟรช
        </button>

        <button class="bg-[#1E48D1] hover:bg-[#163A9B] text-white px-4 py-2 rounded-md flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          แจ้งซ่อม
        </button>
      </div>
    </div>

    <!-- Stats cards -->
    <CardHomeComponent :items="statItems" />
    <!-- Recent requests table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="p-6 border-b">
        <h2 class="text-lg font-semibold text-gray-800">รายการแจ้งซ่อมล่าสุด</h2>
      </div>
      <div class="overflow-x-auto">
        <!-- Loading state -->
        <div v-if="loading" class="min-h-[372px] flex items-center justify-center">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p class="text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="min-h-[372px] flex items-center justify-center">
          <div class="text-center">
            <div class="text-red-500 text-6xl mb-4">⚠️</div>
            <p class="text-red-600 mb-4">{{ error }}</p>
            <button
              @click="fetchRepairRequests"
              class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              ลองใหม่
            </button>
          </div>
        </div>

        <!-- Data table -->
        <div v-else class="min-h-[372px]"> <!-- กำหนดความสูงขั้นต่ำคงที่ -->
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  วันที่
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  ใบแจ้งซ่อม
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  ชื่อผู้แจ้ง
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  ประเภท
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  หมายเลขครุภัณฑ์
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  หน่วยงาน
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  ความเร่งด่วน
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  สถานะงาน
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  รายละเอียด
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <!-- แสดงข้อมูลในหน้าปัจจุบัน -->
              <tr
                v-for="(request, index) in paginatedRequests"
                :key="request.ticketId"
                class="hover:bg-gray-50"
              >
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ request.date }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ request.ticketId }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ request.requesterName }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ request.type }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ request.assetId }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ request.department }}
                </td>
                <!-- ส่วนแสดงความเร่งด่วน -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="getUrgencyClass(request.urgency)"
                    class="inline-flex w-28 justify-center items-center px-3 py-1 text-xs font-medium rounded-full"
                  >
                    {{ request.urgency }}
                  </span>
                </td>
                <!-- ส่วนแสดงสถานะ -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="getStatusClass(request.status)"
                    class="inline-flex w-28 justify-center items-center px-3 py-1 text-xs font-medium rounded-full"
                  >
                    {{ request.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    @click="goToRepairDetail(request.ticketId)"
                    class="w-9 h-8 flex items-center justify-center bg-[#1E48D1] hover:bg-[#163A9B] text-white rounded-md transition cursor-pointer"
                    title="ดูรายละเอียด"
                  >
                    <img src="/icon/info-icon.svg" alt="ดูรายละเอียด" class="h-5 w-5" />
                  </button>
                </td>
              </tr>
              <!-- เพิ่มแถวว่างเพื่อให้ตารางมีความสูงคงที่เสมอ -->
              <tr
                v-for="i in Math.max(0, itemsPerPage - paginatedRequests.length)"
                :key="`empty-${i}`"
                class="h-[53px] empty-row"
              >
                <td
                  v-for="j in 9"
                  :key="`empty-cell-${j}`"
                  class="px-6 py-4 whitespace-nowrap"
                ></td>
              </tr>
              <!-- แสดงข้อความเมื่อไม่มีข้อมูล -->
              <tr v-if="paginatedRequests.length === 0" key="no-data">
                <td colspan="9" class="px-6 py-8 text-center text-gray-500">
                  ไม่พบข้อมูลรายการแจ้งซ่อม
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Pagination -->
      <div
        class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6"
      >
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              แสดง
              <span class="font-medium">{{ startItem }}</span>
              ถึง
              <span class="font-medium">{{ endItem }}</span>
              จากทั้งหมด
              <span class="font-medium">{{ repairRequests.length }}</span>
              รายการ
            </p>
          </div>
          <div>
            <nav class="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <!-- ปุ่มก่อนหน้า -->
              <button
                @click="prevPage"
                :disabled="currentPage === 1"
                :class="[
                  'relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium',
                  currentPage === 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-50 cursor-pointer',
                ]"
              >
                <span class="sr-only">Previous</span>
                <svg
                  class="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <!-- หมายเลขหน้า -->
              <button
                v-for="page in displayedPageNumbers"
                :key="page"
                @click="page === '...' ? null : goToPage(page)"
                :class="[
                  'relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium',
                  page === '...'
                    ? 'bg-white text-gray-700 cursor-default'
                    : page === currentPage
                      ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      : 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer',
                ]"
              >
                {{ page }}
              </button>
              <!-- ปุ่มถัดไป -->
              <button
                @click="nextPage"
                :disabled="currentPage === totalPages"
                :class="[
                  'relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium',
                  currentPage === totalPages
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-50 cursor-pointer',
                ]"
              >
                <span class="sr-only">Next</span>
                <svg
                  class="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import CardHomeComponent from '@/components/card-home-component.vue'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// ตัวแปรสำหรับเก็บข้อมูลจาก API
const repairRequests = ref([])
const loading = ref(false)
const error = ref(null)

// ฟังก์ชันสำหรับดึงข้อมูลจาก API
const fetchRepairRequests = async () => {
  loading.value = true
  error.value = null
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      throw new Error('ไม่พบ token การเข้าสู่ระบบ')
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE}/admin/repairs`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      throw new Error('เกิดข้อผิดพลาดในการดึงข้อมูล')
    }

    const data = await response.json()
    // แปลงข้อมูลจาก API ให้ตรงกับรูปแบบที่ template ต้องการ
    repairRequests.value = data.map((item) => ({
      date: new Date(item.rf_create_at).toLocaleDateString('th-TH'),
      rawDate: new Date(item.rf_create_at),
      ticketId: item.rf_code,
      requesterName: `${item.us_first_name || ''} ${item.us_last_name || ''}`.trim(),
      type: item.tt_name || '-',
      assetId: item.rf_prop_number || '-',
      department: item.department_name || '-',
      urgency: mapUrgency(item.rf_urgency),
      status: mapStatus(item.rf_user_status),
      technicianName:
        item.tech_first_name && item.tech_last_name
          ? `${item.tech_first_name} ${item.tech_last_name}`
          : 'ยังไม่มอบหมาย',
    }))
  } catch (err) {
    console.error('Error fetching repair requests:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// ฟังก์ชันสำหรับแปลงค่าความเร่งด่วน
const mapUrgency = (urgency) => {
  const urgencyMap = {
    high: 'เร่งด่วนมาก',
    medium: 'เร่งด่วน',
    low: 'ไม่เร่งด่วน',
  }
  return urgencyMap[urgency] || 'เร่งด่วน'
}

// ฟังก์ชันสำหรับแปลงสถานะ
const mapStatus = (status) => {
  const statusMap = {
    pending: 'รอดำเนินการ',
    in_progress: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก',
  }
  return statusMap[status] || 'รอดำเนินการ'
}

// ฟังก์ชันช่วยเหลือสำหรับการเปรียบเทียบวันที่
const isToday = (request) => {
  const today = new Date()
  const date = request.rawDate || new Date(request.date)
  return date.toDateString() === today.toDateString()
}

const isWithinLastSevenDays = (request) => {
  const today = new Date()
  const date = request.rawDate || new Date(request.date)
  const diffTime = Math.abs(today - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 7
}

// คำนวณจำนวนงานตามเงื่อนไขต่างๆ
const todayTasksCount = computed(() => {
  return repairRequests.value.filter((request) => isToday(request)).length
})

const inProgressTasksCount = computed(() => {
  return repairRequests.value.filter((request) => request.status === 'กำลังดำเนินการ').length
})

const completedTasksCount = computed(() => {
  return repairRequests.value.filter(
    (request) => request.status === 'เสร็จสิ้น' && isWithinLastSevenDays(request.date),
  ).length
})

const cancelledTasksCount = computed(() => {
  return repairRequests.value.filter(
    (request) => request.status === 'ยกเลิก' && isWithinLastSevenDays(request.date),
  ).length
})

// *** รวมข้อมูลเพื่อส่งให้ Card ***
const statItems = computed(() => [
  {
    value: todayTasksCount.value, // ค่าตัวเลข
    label: 'งานทั้งหมดในวันนี้', // ข้อความ
    colorClass: 'text-blue-600', // สี (กำหนดจากตรงนี้ได้เลย)
  },
  {
    value: inProgressTasksCount.value,
    label: 'กำลังดำเนินการ',
    colorClass: 'text-orange-500',
  },
  {
    value: completedTasksCount.value,
    label: 'เสร็จสิ้น (7 วัน)',
    colorClass: 'text-green-600',
  },
  {
    value: cancelledTasksCount.value,
    label: 'ยกเลิก (7 วัน)',
    colorClass: 'text-red-600',
  },
])

// ฟังก์ชันสำหรับการกำหนดคลาสของสถานะ
const getStatusClass = (status) => {
  switch (status) {
    case 'รอดำเนินการ':
      return 'bg-[#FEF6E2] text-[#FF6600]'
    case 'กำลังดำเนินการ':
      return 'bg-[#CFEBFF] text-[#005D9F]'
    case 'เสร็จสิ้น':
      return 'bg-[#D1FAE5] text-[#059669]'
    case 'ยกเลิก':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// ฟังก์ชันสำหรับการกำหนดคลาสของความเร่งด่วน
const getUrgencyClass = (urgency) => {
  switch (urgency) {
    case 'เร่งด่วนมาก':
      return 'bg-[#FEE2E2] text-[#FF0000]'
    case 'เร่งด่วน':
      return 'bg-[#FEF6E2] text-[#FF6600]'
    case 'ไม่เร่งด่วน':
      return 'bg-[#D1FAE5] text-[#059669]'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// ตัวแปรสำหรับ Pagination
const currentPage = ref(1)
const itemsPerPage = 5

// ข้อมูลที่แสดงในหน้าปัจจุบัน
const paginatedRequests = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  return repairRequests.value.slice(startIndex, endIndex)
})

// คำนวณจำนวนหน้าทั้งหมด
const totalPages = computed(() => {
  return Math.ceil(repairRequests.value.length / itemsPerPage)
})

// แสดงเลขหน้าแบบฉลาด (เช่น 1, 2, 3, ..., 10)
const displayedPageNumbers = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const delta = 1 // จำนวนหน้าที่แสดงก่อนและหลังหน้าปัจจุบัน

  let pages = []
  // แสดงหน้าแรกเสมอ
  pages.push(1)

  // คำนวณช่วงรอบหน้าปัจจุบัน
  const rangeStart = Math.max(2, current - delta)
  const rangeEnd = Math.min(total - 1, current + delta)

  // เพิ่ม ... หลังหน้าแรก (ถ้าจำเป็น)
  if (rangeStart > 2) {
    pages.push('...')
  }
  // เพิ่มหน้าในช่วงกลาง
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i)
  }
  // เพิ่ม ... ก่อนหน้าสุดท้าย (ถ้าจำเป็น)
  if (rangeEnd < total - 1 && total > 1) {
    pages.push('...')
  }
  // แสดงหน้าสุดท้ายเสมอ (ถ้ามีมากกว่า 1 หน้า)
  if (total > 1) {
    pages.push(total)
  }
  return pages
})

// คำนวณตำแหน่งรายการแรกและสุดท้ายในหน้าปัจจุบัน
const startItem = computed(() => {
  return repairRequests.value.length === 0 ? 0 : (currentPage.value - 1) * itemsPerPage + 1
})

const endItem = computed(() => {
  return Math.min(currentPage.value * itemsPerPage, repairRequests.value.length)
})

// ฟังก์ชันสำหรับการนำทางไปยังหน้าต่างๆ
const goToPage = (page) => {
  currentPage.value = Number(page)
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

// ฟังก์ชันไปหน้า repair detail
const goToRepairDetail = (ticketId) => {
  router.push(`/main/repair-detail/${ticketId}`)
}

// เรียกใช้ API เมื่อ component mount
onMounted(() => {
  fetchRepairRequests()
})

defineOptions({ name: 'AdminHomeView' })
</script>

<style>
/* แก้ไข border ของ cell ที่ว่างเปล่า - ส่วนนี้ยังคงไว้ */
.empty-row td {
  border-bottom: 1px solid #e5e7eb;
}
</style>
