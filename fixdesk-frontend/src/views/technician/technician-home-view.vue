<template>

  <body>
    <div class="w-full bg-[#f8fafc] py-2">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          สวัสดีคุณ ช่างธนภัทร
          <span class="text-2xl">👋</span>
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          วันนี้มีงานใหม่เข้ามา ดูภาพรวมและเริ่มงานได้จากที่นี่
        </p>
      </div>

      <!-- Cards -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4 py-3">
        <!-- การ์ด: จำนวนงานใหม่ -->
        <div class="rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
          <p class="text-sm text-gray-500">จำนวนงานใหม่</p>
          <h2 class="text-2xl font-bold text-blue-600">{{ todayTasksCount }} งาน</h2>
          <div class="mt-4 h-px w-full bg-gray-100"></div>
          <p class="mt-3 text-xs text-[#0077FF] cursor-pointer hover:underline">
            +1 ตั้งแต่เมื่อวาน
          </p>
        </div>

        <!-- การ์ด: กำลังดำเนินการ -->
        <div class="rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
          <p class="text-sm text-gray-500">กำลังดำเนินการ</p>
          <h2 class="text-2xl font-bold text-orange-500">{{ inProgressTasksCount }} งาน</h2>
          <div class="mt-4 h-px w-full bg-gray-100"></div>
          <p class="mt-3 text-xs text-orange-500 cursor-pointer hover:underline">
            2 งานใกล้กำหนด
          </p>
        </div>

        <!-- การ์ด: เสร็จสิ้น (วันนี้) -->
        <div class="rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
          <p class="text-sm text-gray-500">เสร็จสิ้น (วันนี้)</p>
          <h2 class="text-2xl font-bold text-green-600">{{ completedTasksCount }} งาน</h2>
          <div class="mt-4 h-px w-full bg-gray-100"></div>
          <p class="mt-3 text-xs text-green-500 cursor-pointer hover:underline">
            ดีมาก! ทำต่อเนื่อง
          </p>
        </div>

        <!-- การ์ด: ยกเลิก (วันนี้) -->
        <div class="rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
          <p class="text-sm text-gray-500">ยกเลิก (วันนี้)</p>
          <h2 class="text-2xl font-bold text-red-600">{{ cancelledTasksCount }} งาน</h2>
          <div class="mt-4 h-px w-full bg-gray-100"></div>
          <p class="mt-3 text-xs text-red-500 cursor-pointer hover:underline">
            เนื่องจากซ่อมไม่ได้
          </p>
        </div>
      </div>

      <!-- ตารางงาน -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 py-3">
        <!-- การ์ดซ้าย: ตาราง -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 lg:col-span-2">
          <h2 class="text-2xl font-bold text-gray-900">งานที่ได้รับมอบหมายใหม่</h2>
          <p class="text-gray-500 -mt-1 mb-4">ระบบแสดงข้อมูล 5 รายการล่าสุด</p>
          <table class="min-w-full border-separate border-spacing-y-2 ">
            <thead>
              <tr class="text-left text-sm font-semibold text-gray-600">
                <th class="py-3 px-4">หมายเลขแจ้งซ่อม</th>
                <th class="py-3 px-4">หัวข้อแจ้งซ่อม</th>
                <th class="py-3 px-4">หน่วยงาน</th>
                <th class="py-3 px-4">สถานที่</th>
                <th class="py-3 px-4">ความเร่งด่วน</th>
                <th class="py-3 px-4">สถานะงาน</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <!-- แสดงข้อมูลในหน้าปัจจุบัน -->
              <tr v-for="request in paginatedRequests" :key="request.ticketId" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ request.ticketId }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ request.problemTopic }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ request.department }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ request.location }}</td>
                <!-- ส่วนแสดงความเร่งด่วน -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getUrgencyClass(request.urgencyRaw)"
                    class="inline-flex w-28 justify-center items-center px-3 py-1 text-xs font-medium rounded-full">
                    {{ request.urgency }}
                  </span>
                </td>
                <!-- ส่วนแสดงสถานะ -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getStatusClass(request.statusRaw)"
                    class="inline-flex w-28 justify-center items-center px-3 py-1 text-xs font-medium rounded-full">
                    {{ request.status }}
                  </span>
                </td>
              </tr>
              <!-- แสดงข้อความเมื่อไม่มีข้อมูล -->
              <tr v-if="paginatedRequests.length === 0" key="no-data">
                <td colspan="9" class="px-6 py-8 text-center text-gray-500">ไม่พบข้อมูลรายการแจ้งซ่อม</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- การ์ดขวา: โดนัท -->
        <div class="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <h2 class="text-xl font-bold text-gray-800 mb-4">
            สัดส่วนสถานะปัจจุบัน
          </h2>

          <div class="grid grid-cols-2 gap-x-4 gap-y-2 mb-6">
            <div class="flex items-center">
              <span class="w-4 h-4 rounded mr-2" style="background-color: #1d4ed8;"></span>
              <span class="text-sm text-gray-700">งานทั้งหมดในวันนี้</span>
            </div>

            <div class="flex items-center">
              <span class="w-4 h-4 rounded mr-2" style="background-color: #f97316;"></span>
              <span class="text-sm text-gray-700">กำลังดำเนินการ</span>
            </div>

            <div class="flex items-center">
              <span class="w-4 h-4 rounded mr-2" style="background-color: #16a34a;"></span>
              <span class="text-sm text-gray-700">เสร็จสิ้น (7 วัน)</span>
            </div>

            <div class="flex items-center">
              <span class="w-4 h-4 rounded mr-2" style="background-color: #dc2626;"></span>
              <span class="text-sm text-gray-700">ยกเลิก (7 วัน)</span>
            </div>
          </div>

          <div class="relative w-48 h-48 mx-auto">
            <div class="w-full h-full rounded-full" :style="donutChart"></div>

            <div class="absolute top-1/2 left-1/2 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          </div>

        </div>
      </div>
      <!-- ตารางรายการของที่เบิก -->
      <div class="bg-white shadow-lg rounded-xl p-6">

        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-900">รายการของที่เบิก</h2>
          <p class="text-sm text-gray-500">ระบบแสดงข้อมูล 5 รายการล่าสุด</p>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">

            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  หมายเลขแจ้งซ่อม
                </th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  รหัสการเบิกของ
                </th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  หน่วยงาน
                </th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สถานที่
                </th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ความเร่งด่วน
                </th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สถานะงาน
                </th>
                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  รายละเอียด
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="item in paginatedStockForms" :key="item.withdrawCode" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ item.relatedRfCode }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.withdrawCode }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.department }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.location }}</td>
                <!-- ส่วนแสดงความเร่งด่วน -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getUrgencyClass(item.urgencyRaw)"
                    class="inline-flex w-28 justify-center items-center px-3 py-1 text-xs font-medium rounded-full">
                    {{ item.urgency }}
                  </span>
                </td>
                <!-- ส่วนแสดงสถานะ -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getStockStatusClass(item.statusRaw)"
                    class="inline-flex w-28 justify-center items-center px-3 py-1 text-xs font-medium rounded-full">
                    {{ item.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    class="px-4 py-1 text-sm text-blue-600 font-medium border border-blue-600 rounded-full hover:bg-blue-50 transition-colors">
                    รายละเอียด
                  </button>
                </td>
              </tr>
              <tr v-if="paginatedStockForms.length === 0" key="no-data-stock">
                <td colspan="9" class="px-6 py-8 text-center text-gray-500">ไม่พบข้อมูลใบขอเบิก</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </body>
</template>

<script setup>
defineOptions({ name: 'TechnicianHomeView' })
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import TableComponent from '@/components/table-component.vue'
const router = useRouter()


const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// ตัวแปรสำหรับเก็บข้อมูลจาก API
const repairRequests = ref([])
const loading = ref(false)
const error = ref(null)

// แสดง 5 รายการล่าสุด
const itemsPerPage = 5

// คืนค่ารายการล่าสุด (เรียงลดหลั่นตามวันที่) และ slice ให้เหลือแค่ 5 รายการ
const paginatedRequests = computed(() => {
  // ถ้าไม่มีข้อมูล ให้คืน array ว่าง
  if (!repairRequests.value || !repairRequests.value.length) return []
  // คัดลอกและเรียงลดหลั่นตาม rawDate (ISO) จากมากไปน้อย แล้วตัดแค่ itemsPerPage แรก
  return [...repairRequests.value]
    .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate))
    .slice(0, itemsPerPage)
})

// ฟังก์ชันสำหรับดึงใบงานแจ้งซ่อมจาก API
const fetchRepairRequests = async () => {
  loading.value = true
  error.value = null

  try {
    const token = localStorage.getItem('token')
    console.debug('TechnicianHome: API_BASE=', API_BASE)
    console.debug('TechnicianHome: token present=', !!token, token ? `${token.slice(0, 10)}... len=${token.length}` : '')
    if (!token) {
      throw new Error('ไม่พบ token การเข้าสู่ระบบ')
    }

    const response = await fetch(`${API_BASE}/technician/repairs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      let bodyText = ''
      try { bodyText = await response.text() } catch (e) { bodyText = '<unable to read body>' }
      console.error('Fetch /technician/repairs failed', response.status, bodyText)
      throw new Error(`เกิดข้อผิดพลาดในการดึงข้อมูล (${response.status})`)
    }

    const data = await response.json()
    console.debug('Fetched technician repairs count:', Array.isArray(data) ? data.length : typeof data)

    // แปลงข้อมูลจาก API ให้ตรงกับรูปแบบที่ template ต้องการ
    repairRequests.value = data.map(item => ({
      // เก็บ rawDate เพื่อใช้เรียงลำดับได้อย่างถูกต้อง
      ticketId: item.rf_code,
      problemTopic: item.rf_problem || '-',
      department: item.department_name || '-',
      rawDate: item.rf_created_at,
      location: `${item.building_name || ''} ${item.floor_name || ''} ${item.room_name || ''}`.trim(),
      // เก็บทั้งค่าดิบและข้อความแปลแล้ว
      urgencyRaw: item.rf_urgency,
      urgency: mapUrgency(item.rf_urgency),
      statusRaw: item.rf_user_status,
      status: mapStatus(item.rf_user_status),
      technicianName: item.tech_first_name && item.tech_last_name
        ? `${item.tech_first_name} ${item.tech_last_name}`
        : 'ยังไม่มอบหมาย'
    }))

  } catch (err) {
    console.error('Error fetching repair requests:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}
// ฟังก์ชันสำหรับดึงข้อมูลใบขอเบิก (stock forms) จาก API
const stockForms = ref([])
const loadingStock = ref(false)
const errorStock = ref(null)

const paginatedStockForms = computed(() => {
  if (!stockForms.value || !stockForms.value.length) return []
  return [...stockForms.value]
    .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate))
    .slice(0, itemsPerPage)
})

const mapStockStatus = (status) => {
  const map = {
    'waiting': 'รอดำเนินการ',
    'approved': 'อนุมัติ',
    'rejected': 'ปฏิเสธ',
    'completed': 'เสร็จสิ้น'
  }
  return map[status] || status || '-'
}

const getStockStatusClass = (statusRaw) => {
  switch (statusRaw) {
    case 'waiting':
      return 'bg-amber-50 text-amber-600'
    case 'approved':
      return 'bg-green-100 text-green-600'
    case 'rejected':
      return 'bg-red-100 text-red-700'
    case 'completed':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

const fetchStockForms = async () => {
  loadingStock.value = true
  errorStock.value = null

  try {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('ไม่พบ token การเข้าสู่ระบบ')

    let res = await fetch(`${API_BASE}/my-stock-forms`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    })

    // ถ้า route สำหรับผู้ใช้งานไม่มี ให้ลอง /stock-forms (admin)
    if (!res.ok && res.status === 404) {
      res = await fetch(`${API_BASE}/stock-forms`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
    }

    if (!res.ok) {
      let bodyText = ''
      try { bodyText = await res.text() } catch (e) { bodyText = '<unable to read body>' }
      console.error('Fetch stock forms failed', res.status, bodyText)
      throw new Error(`เกิดข้อผิดพลาดในการดึงข้อมูลใบขอเบิก (${res.status})`)
    }

    const data = await res.json()
    // แปลงข้อมูลเป็นรูปแบบที่ใช้ใน template
    stockForms.value = data.map(item => ({
      withdrawCode: item.sf_code,
      relatedRfCode: item.related_rf_code || '-',
      department: item.requester_department || item.requester_department || '-',
      rawDate: item.sf_create_at,
      location: `${item.building_name || ''} ${item.floor_name || ''} ${item.room_name || ''}`.trim(),
      urgencyRaw: item.sf_urgency,
      urgency: mapUrgency(item.sf_urgency),
      statusRaw: item.sf_status,
      status: mapStockStatus(item.sf_status)
    }))

    console.debug('Fetched stock forms count:', Array.isArray(stockForms.value) ? stockForms.value.length : typeof stockForms.value)
  } catch (err) {
    console.error('Error fetching stock forms:', err)
    errorStock.value = err.message
  } finally {
    loadingStock.value = false
  }
}
// ฟังก์ชันสำหรับแปลงค่าความเร่งด่วน
const mapUrgency = (urgency) => {
  const urgencyMap = {
    'high': 'เร่งด่วนมาก',
    'medium': 'เร่งด่วน',
    'low': 'ไม่เร่งด่วน'
  }
  return urgencyMap[urgency] || 'เร่งด่วน'
}

// ฟังก์ชันสำหรับแปลงสถานะ
const mapStatus = (status) => {
  const statusMap = {
    'pending': 'รอดำเนินการ',
    'in_progress': 'กำลังดำเนินการ',
    'completed': 'เสร็จสิ้น',
    'cancelled': 'ยกเลิก'
  }
  return statusMap[status] || 'รอดำเนินการ'
}

// ฟังก์ชันช่วยแปลงเป็น classes สำหรับ badge
const getUrgencyClass = (urgencyRaw) => {
  switch (urgencyRaw) {
    case 'high':
      return 'bg-red-100 text-red-700'
    case 'medium':
      return 'bg-amber-50 text-amber-600'
    case 'low':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

const getStatusClass = (statusRaw) => {
  switch (statusRaw) {
    case 'pending':
      return 'bg-amber-50 text-amber-600'
    case 'in_progress':
      return 'bg-blue-100 text-blue-600'
    case 'done':
    case 'completed':
      return 'bg-green-100 text-green-600'
    case 'cancelled':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

// ฟังก์ชันช่วยเหลือสำหรับการเปรียบเทียบวันที่
const isToday = (dateString) => {
  const today = new Date()
  const date = new Date(dateString)
  return date.toDateString() === today.toDateString()
}

const isWithinLastSevenDays = (dateString) => {
  const today = new Date()
  const date = new Date(dateString)
  const diffTime = Math.abs(today - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 7
}

// คำนวณจำนวนงานตามเงื่อนไขต่างๆ
const todayTasksCount = computed(() => {
  return repairRequests.value.filter(request => isToday(request.date)).length
})

const inProgressTasksCount = computed(() => {
  return repairRequests.value.filter(request => request.status === 'กำลังดำเนินการ').length
})

const completedTasksCount = computed(() => {
  return repairRequests.value.filter(request =>
    request.status === 'เสร็จสิ้น' && isWithinLastSevenDays(request.date)
  ).length
})

const cancelledTasksCount = computed(() => {
  return repairRequests.value.filter(request =>
    request.status === 'ยกเลิก' && isWithinLastSevenDays(request.date)
  ).length
})

// สร้างสไตล์สำหรับโดนัทแบบไดนามิก ตามสัดส่วนของแต่ละสถานะ (สีกำหนดลำดับ: เขียว, ส้ม, แดง, น้ำเงิน)
const donutChart = computed(() => {
  const total = Math.max(1, todayTasksCount.value) // ป้องกันหารด้วย 0

  const greenPct = Math.round((completedTasksCount.value / total) * 100)
  const orangePct = Math.round((inProgressTasksCount.value / total) * 100)
  const redPct = Math.round((cancelledTasksCount.value / total) * 100)

  // ให้ส่วนที่เหลือเป็นสีน้ำเงิน (งานทั้งหมด - (เสร็จสิ้น + กำลังดำเนินการ + ยกเลิก))
  const used = greenPct + orangePct + redPct
  const bluePct = Math.max(0, 100 - used)

  // คำนวณตำแหน่งสิ้นสุดของแต่ละส่วนแบบสะสม
  const greenEnd = greenPct
  const orangeEnd = greenEnd + orangePct
  const redEnd = orangeEnd + redPct

  const gradient = `conic-gradient(#16a34a 0% ${greenEnd}%, #f97316 ${greenEnd}% ${orangeEnd}%, #dc2626 ${orangeEnd}% ${redEnd}%, #1d4ed8 ${redEnd}% 100%)`

  return {
    backgroundImage: gradient
  }
})

// ดึงข้อมูลเมื่อคอมโพเนนท์ mount
onMounted(() => {
  fetchRepairRequests()
  fetchStockForms()
})
</script>
