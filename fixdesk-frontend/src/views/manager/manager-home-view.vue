<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-8xl">
    <div class="max-w-7xl mx-auto space-y-6">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard ผู้บริหาร</h1>
            <p class="text-gray-600 mt-2">ภาพรวมการดำเนินงานระบบแจ้งซ่อม</p>
          </div>

          <!-- Year Selector -->
          <div class="flex items-center gap-3">
            <label class="text-sm font-medium text-gray-700">เลือกปี:</label>
            <select
              v-model="selectedYear"
              @change="updateDashboard"
              class="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
            >
              <option v-for="year in availableYears" :key="year" :value="year">
                {{ formatYearDisplay(year) }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">กำลังโหลดข้อมูล...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div class="text-red-600 mb-2">เกิดข้อผิดพลาด</div>
        <p class="text-red-700 mb-4">{{ error }}</p>
        <button
          @click="fetchDashboardData"
          class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>

      <!-- Dashboard Content -->
      <template v-else>
        <!-- Summary Cards with Growth Indicators -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div v-for="(card, index) in summaryCards" :key="index" class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{{ card.label }}</p>
                <p :class="card.colorClass + ' text-2xl font-bold'">{{ card.value }} {{ card.unit }}</p>
              </div>
              <div class="text-right">
                <div v-if="card.growth !== undefined" :class="[
                  'text-sm font-medium flex items-center',
                  card.growth > 0 ? 'text-green-600' : card.growth < 0 ? 'text-red-600' : 'text-gray-500'
                ]">
                  <span v-if="card.growth > 0">↗</span>
                  <span v-else-if="card.growth < 0">↘</span>
                  <span v-else>→</span>
                  <span class="ml-1">{{ Math.abs(card.growth) }}%</span>
                </div>
                <div class="text-xs text-gray-500 mt-1">เทียบปีที่แล้ว</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Bar Chart: งานซ่อมแต่ละเดือน -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">งานซ่อมรายเดือน - {{ formatYearDisplay(selectedYear) }}</h3>
            <v-chart
              class="w-full h-80"
              :option="monthlyRepairOption"
              autoresize
            />
          </div>

          <!-- Pie Chart: สถานะงานซ่อม -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">สถานะงานซ่อม</h3>
            <v-chart class="w-full h-80" :option="statusPieOption" autoresize />
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Line Chart: แนวโน้มการแจ้งซ่อม -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              แนวโน้มการแจ้งซ่อม (7 วันที่ผ่านมา)
            </h3>
            <v-chart class="w-full h-80" :option="trendLineOption" autoresize />
          </div>

          <!-- Gauge Chart: ประสิทธิภาพการซ่อม -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">ประสิทธิภาพการซ่อม</h3>
            <v-chart class="w-full h-80" :option="efficiencyGaugeOption" autoresize />
          </div>
        </div>

        <!-- Department Performance -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">งานซ่อมแยกตามประเภท</h3>
          <v-chart class="w-full h-96" :option="departmentBarOption" autoresize />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import CardHomeComponent from '@/components/card-home-component.vue'

defineOptions({ name: 'ManagerHomeView' })

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// Loading and Error States
const isLoading = ref(true)
const error = ref(null)

// Year Selection & Data Management
const selectedYear = ref(new Date().getFullYear())
const allRepairs = ref([])
const allTechTypes = ref([])
const availableYears = ref([])

// Summary Cards Data with Growth Indicators
const summaryCards = ref([
  { value: 0, label: 'งานซ่อมทั้งหมด', colorClass: 'text-blue-600', unit: 'งาน', growth: 0 },
  { value: 0, label: 'รอดำเนินการ', colorClass: 'text-orange-500', unit: 'งาน', growth: 0 },
  { value: 0, label: 'กำลังดำเนินการ', colorClass: 'text-yellow-500', unit: 'งาน', growth: 0 },
  { value: 0, label: 'เสร็จสิ้น', colorClass: 'text-green-600', unit: 'งาน', growth: 0 }
])

// Monthly Repair Bar Chart
const monthlyRepairOption = ref({
  title: {
    text: 'งานซ่อมรายเดือน',
    left: 'center',
    textStyle: {
      color: '#374151',
      fontSize: 16,
    },
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
  },
  xAxis: {
    type: 'category',
    data: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.'],
    axisLabel: {
      color: '#6B7280',
    },
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      color: '#6B7280',
    },
  },
  series: [
    {
      data: [0, 0, 0, 0, 0, 0],
      type: 'bar',
      itemStyle: {
        color: '#1E48D1',
        borderRadius: [4, 4, 0, 0],
      },
      emphasis: {
        itemStyle: {
          color: '#163A9B',
        },
      },
    },
  ],
})

// Status Pie Chart
const statusPieOption = ref({
  // title: {
  //   text: 'สถานะงาน',
  //   left: 'center',
  //   top: 'top',
  //   textStyle: {
  //     color: '#374151',
  //     fontSize: 16
  //   }
  // },
  tooltip: {
    trigger: 'item',
  },
  legend: {
    orient: 'horizontal',
    bottom: '0%',
    textStyle: {
      color: '#6B7280',
    },
  },
  series: [
    {
      name: 'สถานะ',
      type: 'pie',
      radius: '70%',
      center: ['50%', '45%'],
      data: [
        { value: 0, name: 'รอดำเนินการ', itemStyle: { color: '#F59E0B' } },
        { value: 0, name: 'กำลังดำเนินการ', itemStyle: { color: '#EAB308' } },
        { value: 0, name: 'เสร็จสิ้น', itemStyle: { color: '#10B981' } },
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    },
  ],
})

// Trend Line Chart
const trendLineOption = ref({
  title: {
    text: 'แนวโน้มรายวัน',
    left: 'center',
    textStyle: {
      color: '#374151',
      fontSize: 16,
    },
  },
  tooltip: {
    trigger: 'axis',
  },
  xAxis: {
    type: 'category',
    // MOCKUP: ใช้ชื่อวันแบบคงที่ แทนที่จะเป็นวันที่จริง
    data: ['วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัส', 'วันศุกร์', 'วันเสาร์', 'วันอาทิตย์'],
    // TODO: ควรเป็นวันที่จริงย้อนหลัง 7 วัน เช่น ['1 ธ.ค.', '2 ธ.ค.', ...]
    axisLabel: {
      color: '#6B7280',
    },
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      color: '#6B7280',
    },
  },
  series: [
    {
      data: [0, 0, 0, 0, 0, 0, 0],
      type: 'line',
      smooth: true,
      itemStyle: {
        color: '#1E48D1',
      },
      lineStyle: {
        color: '#1E48D1',
        width: 3,
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            {
              offset: 0,
              color: 'rgba(30, 72, 209, 0.3)',
            },
            {
              offset: 1,
              color: 'rgba(30, 72, 209, 0.1)',
            },
          ],
        },
      },
    },
  ],
})

// Efficiency Gauge Chart
const efficiencyGaugeOption = ref({
  title: {
    text: 'อัตราการซ่อมสำเร็จ',
    left: 'center',
    textStyle: {
      color: '#374151',
      fontSize: 16,
    },
  },
  tooltip: {
    formatter: '{a} <br/>{b} : {c}%',
  },
  series: [
    {
      name: 'ประสิทธิภาพ',
      type: 'gauge',
      center: ['50%', '60%'],
      radius: '80%',
      progress: {
        show: true,
        width: 18,
      },
      axisLine: {
        lineStyle: {
          width: 18,
        },
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        length: 15,
        lineStyle: {
          width: 2,
          color: '#999',
        },
      },
      axisLabel: {
        distance: 25,
        color: '#6B7280',
        fontSize: 12,
      },
      anchor: {
        show: true,
        showAbove: true,
        size: 25,
        itemStyle: {
          borderWidth: 10,
        },
      },
      title: {
        show: false,
      },
      detail: {
        valueAnimation: true,
        formatter: '{value}%',
        color: '#1E48D1',
        fontSize: 24,
        fontWeight: 'bold',
        offsetCenter: [0, '70%'],
      },
      data: [{ value: 0 }],
      itemStyle: {
        color: '#10B981',
      },
    },
  ],
})

// Department Bar Chart
const departmentBarOption = ref({
  title: {
    text: 'งานซ่อมแยกตามประเภท',
    left: 'center',
    textStyle: {
      color: '#374151',
      fontSize: 16,
    },
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true,
  },
  xAxis: {
    type: 'value',
    axisLabel: {
      color: '#6B7280',
    },
  },
  yAxis: {
    type: 'category',
    // MOCKUP: แสดง 'ไม่มีข้อมูล' เมื่อไม่มี technician types
    data: ['ไม่มีข้อมูล'],
    // API READY: ข้อมูลจะมาจาก processTypeData() แล้ว
    axisLabel: {
      color: '#6B7280',
    },
  },
  series: [
    {
      name: 'จำนวนงาน',
      type: 'bar',
      // MOCKUP: ใช้ [0] เมื่อไม่มีข้อมูล
      data: [0],
      itemStyle: {
        color: function (params) {
          const colors = ['#1E48D1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']
          return colors[params.dataIndex % colors.length]
        },
        borderRadius: [0, 4, 4, 0],
      },
    },
  ],
})

// Year Management Functions
const formatYearDisplay = (year) => {
  const buddhistYear = year + 543
  return `ปี ${buddhistYear} (${year})`
}

const updateDashboard = () => {
  console.log('🔄 updateDashboard called, selectedYear:', selectedYear.value)
  if (allRepairs.value.length > 0) {
    // Filter repairs for selected year
    const currentYearRepairs = allRepairs.value.filter(repair => {
      return new Date(repair.rf_create_at).getFullYear() === selectedYear.value
    })
    console.log('📈 Current year repairs:', currentYearRepairs.length)

    // Calculate previous year data for growth indicators
    const previousYearRepairs = allRepairs.value.filter(repair => {
      return new Date(repair.rf_create_at).getFullYear() === selectedYear.value - 1
    })
    console.log('📉 Previous year repairs:', previousYearRepairs.length)

    processDashboardData(currentYearRepairs, allTechTypes.value, previousYearRepairs)
  }
}

const calculateGrowth = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

// Build authorization headers for API requests
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

// API Functions
async function fetchRepairData() {
  try {
    // API READY: /admin/repairs ใช้งานได้แล้ว
    // ENHANCEMENT: อาจเพิ่ม query params สำหรับ filter (date range, status, etc.)
    const response = await fetch(`${API_BASE}/admin/repairs`, {
      headers: getAuthHeaders(),
    })
    if (!response.ok) throw new Error('Failed to fetch repair data')
    const data = await response.json()
    return data
  } catch (err) {
    console.error('Error fetching repair data:', err)
    throw err
  }
}

async function fetchTechnicianTypes() {
  try {
    // API READY: /technician-types ใช้งานได้แล้ว (ไม่ต้อง auth)
    const response = await fetch(`${API_BASE}/technician-types`)
    if (!response.ok) throw new Error('Failed to fetch technician types')
    const data = await response.json()
    return data
  } catch (err) {
    console.error('Error fetching technician types:', err)
    throw err
  }
}

// Process and update dashboard data
function processDashboardData(repairs, techTypes, previousYearRepairs = []) {
  // Update summary cards with growth calculation
  const totalRepairs = repairs.length
  const pendingRepairs = repairs.filter(r => r.rf_user_status === 'pending').length
  const inProgressRepairs = repairs.filter(r => r.rf_user_status === 'in_progress').length
  const completedRepairs = repairs.filter(r => r.rf_user_status === 'done').length

  // Previous year data for growth calculation
  const prevTotalRepairs = previousYearRepairs.length
  const prevPendingRepairs = previousYearRepairs.filter(r => r.rf_user_status === 'pending').length
  const prevInProgressRepairs = previousYearRepairs.filter(r => r.rf_user_status === 'in_progress').length
  const prevCompletedRepairs = previousYearRepairs.filter(r => r.rf_user_status === 'done').length

  // Update summary cards with growth indicators
  summaryCards.value[0].value = totalRepairs
  summaryCards.value[0].growth = calculateGrowth(totalRepairs, prevTotalRepairs)

  summaryCards.value[1].value = pendingRepairs
  summaryCards.value[1].growth = calculateGrowth(pendingRepairs, prevPendingRepairs)

  summaryCards.value[2].value = inProgressRepairs
  summaryCards.value[2].growth = calculateGrowth(inProgressRepairs, prevInProgressRepairs)

  summaryCards.value[3].value = completedRepairs
  summaryCards.value[3].growth = calculateGrowth(completedRepairs, prevCompletedRepairs)

  // Update status pie chart
  statusPieOption.value.series[0].data = [
    { value: pendingRepairs, name: 'รอดำเนินการ', itemStyle: { color: '#F59E0B' } },
    { value: inProgressRepairs, name: 'กำลังดำเนินการ', itemStyle: { color: '#EAB308' } },
    { value: completedRepairs, name: 'เสร็จสิ้น', itemStyle: { color: '#10B981' } },
  ]

  // Process monthly data
  const monthlyData = processMonthlyData(repairs)
  console.log('Updating monthly chart with:', monthlyData)

  // Force update chart options
  monthlyRepairOption.value = {
    ...monthlyRepairOption.value,
    xAxis: {
      ...monthlyRepairOption.value.xAxis,
      data: monthlyData.labels
    },
    series: [{
      ...monthlyRepairOption.value.series[0],
      data: monthlyData.values
    }]
  }

  // Process daily trend (last 7 days)
  const dailyData = processDailyTrend(repairs)
  trendLineOption.value.series[0].data = dailyData

  // Process technician type data
  const typeData = processTypeData(repairs, techTypes)
  departmentBarOption.value.yAxis.data = typeData.labels
  departmentBarOption.value.series[0].data = typeData.values

  // Calculate efficiency
  const efficiency = totalRepairs > 0 ? ((completedRepairs / totalRepairs) * 100).toFixed(1) : 0
  efficiencyGaugeOption.value.series[0].data[0].value = parseFloat(efficiency)
}

function processMonthlyData(repairs) {
  // แสดงข้อมูลตามปีที่เลือก (ไม่ใช่ rolling 12 เดือน)
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                     'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

  const monthlyData = []
  const labels = []

  console.log('processMonthlyData - repairs for year', selectedYear.value, ':', repairs.length)

  // แสดงทุกเดือนของปีที่เลือก (ม.ค. - ธ.ค.)
  for (let month = 0; month < 12; month++) {
    // นับงานในเดือนนั้นๆ ของปีที่เลือก
    const count = repairs.filter(repair => {
      const repairDate = new Date(repair.rf_create_at)
      return repairDate.getFullYear() === selectedYear.value && repairDate.getMonth() === month
    }).length

    monthlyData.push(count)
    labels.push(monthNames[month])
  }

  console.log('Monthly data result:', { labels, values: monthlyData })
  return { labels, values: monthlyData }
}

function processDailyTrend(repairs) {
  // ENHANCEMENT NEEDED: ควรมี API แยกสำหรับ daily trend เพื่อ performance
  const days = 7
  const dailyCount = new Array(days).fill(0)
  // MOCKUP: ใช้ client-side processing แทน API ที่กรองแล้ว
  const today = new Date()

  repairs.forEach((repair) => {
    const repairDate = new Date(repair.rf_create_at)
    const daysDiff = Math.floor((today - repairDate) / (1000 * 60 * 60 * 24))
    if (daysDiff >= 0 && daysDiff < days) {
      dailyCount[days - 1 - daysDiff]++
    }
  })

  return dailyCount
}

function processTypeData(repairs, techTypes) {
  const typeCounts = {}

  // API READY: technician types มาจาก /technician-types แล้ว
  // Initialize counts
  techTypes.forEach((type) => {
    typeCounts[type.tt_name] = 0
  })

  // Count repairs by type
  repairs.forEach((repair) => {
    if (repair.tt_name && typeCounts.hasOwnProperty(repair.tt_name)) {
      typeCounts[repair.tt_name]++
    }
  })

  const sortedTypes = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6) // Top 6 types

  return {
    labels: sortedTypes.map(([name]) => name),
    values: sortedTypes.map(([, count]) => count),
  }
}

async function fetchDashboardData() {
  try {
    isLoading.value = true
    error.value = null

    const [repairs, techTypes] = await Promise.all([fetchRepairData(), fetchTechnicianTypes()])

    // เก็บข้อมูลทั้งหมดไว้สำหรับ filter และ growth calculation
    allRepairs.value = repairs
    allTechTypes.value = techTypes

    // สร้าง availableYears จากข้อมูลจริง
    const years = new Set()
    repairs.forEach(repair => {
      const year = new Date(repair.rf_create_at).getFullYear()
      years.add(year)
    })
    availableYears.value = Array.from(years).sort((a, b) => b - a) // เรียงใหม่ -> เก่า

    // ตั้งปีเริ่มต้นเป็นปีล่าสุดที่มีข้อมูล
    if (availableYears.value.length > 0) {
      selectedYear.value = availableYears.value[0]
    }

    updateDashboard()
  } catch (err) {
    console.error('Error fetching dashboard data:', err)
    error.value = 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>
