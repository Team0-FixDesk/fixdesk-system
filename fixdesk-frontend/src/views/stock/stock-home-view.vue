/**
 * =====================================================================
 * @file            stock-home-view.vue
 * @module          มอดูลการจัดการของผู้ดูแลคลัง - การตรวจสอบ และอนุมัติรายการเบิก
 * @layer           View (Presentation Layer)
 * @version         1.0.0
 * @since           2025-10-21
 * @author          พชร ไพศรีสกุล
 * @contributors
     - เศรษฐพงศ์ หอมชื่น
     - พชร ไพศรีสกุล
     - นราธิป แสนทวีสุข
     - ปฏิพัทธ์ จงนันทพันธ์กุล
     - พิมลพรรณ มามาก
 *
 * @lastModified    2026-02-27
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอ Dashboard สำหรับผู้ดูแลคลัง ใช้แสดงภาพรวมของระบบเบิกวัสดุและสถานะคลังสินค้า
 *  ความสามารถหลัก:
 *   - แสดงสถิติคำขอเบิก (รายเดือน / วันนี้ / รออนุมัติ / ไม่อนุมัติ)
 *   - แสดงกราฟแนวโน้มย้อนหลัง 7 วัน
 *       • โหมดคำขอเบิก (รออนุมัติ / อนุมัติแล้ว / ไม่อนุมัติ)
 *       • โหมดคลังสินค้า (รับเข้า / เบิกออก / ใกล้หมด)
 *   - แสดงรายการคำขอเบิกล่าสุดที่รออนุมัติ (5 รายการ)
 *   - สามารถเข้าสู่หน้ารายละเอียดใบเบิกได้
 *
 * @requires
 *   - vue
 *   - vue-router
 *   - vue3-apexcharts
 *   - TableComponent
 *   - CardHomeComponent
 *   - repair-button-component
 *   - info-button-component
 *   - useUserProfile
 *   - useAuthToken
 *   - stock service (getAllProductList, getAllStockFormList)
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - แก้ไขข้อความหัวตาราง      [2026-02-18, ปฏิพัทธ์ จงนันทพันธ์กุล] V 1.0.1
 *   - แก้ไขข้อความคำอธิบายสถานะ [2026-02-18, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - เพิ่มคำอธิบายหน้าจอ        [2026-02-20, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - แก้ไขข้อความคำอธิบายสถานะ [2026-02-20, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - ดึงข้อมูลชื่อผู้ใช้            [2026-02-21, พิมลพรรณ มามาก] V 1.0.2
 *   - เพิ่มกราฟ 3 โหมด: คำขอเบิก/เข้า-ออก/สถานะคลัง [2026-02-27, นราธิป แสนทวีสุข] V 1.1.0
 *   - เพิ่มตารางแบบไดนามิกตามโหมดกราฟที่เลือก      [2026-02-27, นราธิป แสนทวีสุข]
 *   - เพิ่มการคำนวณยอดคงคลังย้อนหลัง 7 วัน        [2026-02-27, นราธิป แสนทวีสุข]
 *   - ใช้ badge system มาตรฐานจาก TableComponent  [2026-02-27, นราธิป แสนทวีสุข]
 * =====================================================================
 */

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import ApexChart from 'vue3-apexcharts'

import TableComponent from '@/components/table-component.vue'
import repairButton from '@/components/button/repair-button-component.vue'
import CardHomeComponent from '@/components/card-home-component.vue'
import { useUserProfile } from '@/composables/useUserProfile'

import InfoButtonComponent from '@/components/button/info-button-component.vue'

import { getAllProductList, getAllStockFormList, getAllTransactions } from '@/services/stock'
import { useAuthToken } from '@/composables/useAuthToken'

const { token, isAuthenticated, logout } = useAuthToken()

defineOptions({ name: 'StockHomeView' })

// ==================== Router / API ====================
const router = useRouter()

const { userDisplayName, userDepartmentName, fetchUserProfileData } = useUserProfile()

// ==================== State ====================
const products = ref([])
const stockForms = ref([])
const transactions = ref([])
const tableRowsList = ref([])
const loading = ref(false)

// 🔀 สวิตช์กราฟ
const chartMode = ref('request') // 'request' | 'stock' | 'inventory'

// ==================== Navigation ====================
function openDetail(code) {
  router.push(`/main/stock-requisition/${code}`)
}

// ==================== Dynamic Table Data ====================
const dynamicTableData = computed(() => {
  if (chartMode.value === 'stock') {
    // แสดงรายการเข้า-ออก 7 วันล่าสุด
    const recentTransactions = transactions.value
      .filter((t) => {
        const transDate = new Date(t.stt_created_at)
        const today = new Date()
        const diffDays = Math.floor((today - transDate) / (1000 * 60 * 60 * 24))
        return diffDays <= 6
      })
      .sort((a, b) => new Date(b.stt_created_at) - new Date(a.stt_created_at))
      .slice(0, 10)

    return {
      title: 'รายการรับ-จ่ายวัสดุ (7 วันล่าสุด)',
      subtitle: '5 รายการล่าสุด',
      columns: ['รายการ', 'ประเภท', 'จำนวน'],
      rows: recentTransactions.map((t) => {
        const productName =
          products.value.find((p) => p.pd_id === t.stt_product_id)?.pd_name || 'ไม่ระบุ'

        return [
          truncate(productName),
          t.stt_type, // 'IN' or 'OUT'
          `${t.stt_quantity} ชิ้น`
        ]
      }),
      columnAlign: ['left', 'center', 'right'],
      transactionTypeColumn: 1
    }
  } else if (chartMode.value === 'inventory') {
    // แสดงรายการหมดและใกล้หมด
    const lowThreshold = 9
    const criticalProducts = products.value
      .filter((p) => p.pd_quantity <= lowThreshold)
      .sort((a, b) => a.pd_quantity - b.pd_quantity)
      .slice(0, 10)

    return {
      title: 'รายการวัสดุหมดและใกล้หมด',
      subtitle: `${criticalProducts.length} รายการ`,
      columns: ['ชื่อวัสดุ', 'สถานะ', 'คงเหลือ'],
      rows: criticalProducts.map((p) => {
        let status = 'in_stock'
        if (p.pd_quantity === 0) status = 'out_of_stock'
        else if (p.pd_quantity <= lowThreshold) status = 'low_stock'

        return [
          truncate(p.pd_name || 'ไม่ระบุ'),
          status,
          `${p.pd_quantity} ชิ้น`
        ]
      }),
      columnAlign: ['left', 'center', 'right'],
      statusStockinventoryColumn: 1
    }
  } else {
    // โหมดคำขอเบิก (เดิม)
    return {
      title: 'รายการคำขอเบิกที่รออนุมัติ',
      subtitle: '5 รายการล่าสุด',
      columns: ['รหัสใบเบิก', 'รายละเอียด', 'ตัวจัดการ'],
      rows: tableRowsList.value.map((i) => i.row),
      columnAlign: ['left', 'left', 'center'],
      hasAction: true
    }
  }
})

// ==================== Load Dashboard ====================
async function fetchDashboard() {
  loading.value = true
  try {
    if (!isAuthenticated.value) {
      logout()
      return
    }

    const [p, forms, trans] = await Promise.all([
      getAllProductList(token.value),
      getAllStockFormList(token.value),
      getAllTransactions(token.value),
    ])

    products.value = p
    stockForms.value = forms
    transactions.value = trans

    tableRowsList.value = stockForms.value
      .filter((i) => i.sf_status === 'waiting')
      .sort((a, b) => new Date(b.sf_create_at) - new Date(a.sf_create_at))
      .slice(0, 5)
      .map((item) => {
        const details =
          'วันที่: ' +
          new Date(item.sf_create_at).toLocaleDateString('th-TH') +
          '<br>ผู้ขอเบิก: ' +
          item.requester +
          '<br>หน่วยงาน: ' +
          item.us_department

        return {
          row: [item.sf_code, truncateHtml(details), ''],
        }
      })
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

// ==================== Cards ====================
const today = new Date()

const statItems = computed(() => [
  {
    value: stockForms.value.filter((f) => {
      const createDate = new Date(f.sf_create_at)
      const currentDate = new Date()
      return (
        createDate.getMonth() === currentDate.getMonth() &&
        createDate.getFullYear() === currentDate.getFullYear()
      )
    }).length,
    label: 'จำนวนรายการเบิกในเดือนนี้',
    colorClass: 'text-blue-600',
  },
  {
    value: stockForms.value.filter(
      (f) => f.sf_status === 'approved' && isSameDay(f.sf_create_at, today),
    ).length,
    label: 'จำนวนรายการเบิกในวันนี้',
    colorClass: 'text-green-600',
  },
  {
    value: stockForms.value.filter((f) => f.sf_status === 'waiting').length,
    label: 'จำนวนรายการเบิกที่รออนุมัติ',
    colorClass: 'text-amber-500',
  },
  {
    value: stockForms.value.filter((f) => f.sf_status === 'rejected').length,
    label: 'จำนวนรายการเบิกที่ไม่อนุมัติใน 7 วันที่ผ่านมา',
    colorClass: 'text-red-600',
  },
])

// ==================== Helpers ====================
function isSameDay(dateString, dateObj) {
  return new Date(dateString).toDateString() === dateObj.toDateString()
}

// ตัดความยาวของสตริงปกติ
function truncate(str, max = 26) {
  if (str == null) return ''
  const s = str.toString()
  return s.length > max ? s.slice(0, max) + '...' : s
}

// ตัดความยาวของสตริงที่มี HTML (เก็บ tag ไว้)
function truncateHtml(str, max = 36) {
  if (!str) return ''
  const textOnly = str.replace(/<[^>]*>/g, '')
  if (textOnly.length <= max) return str

  let count = 0
  let result = ''
  let inTag = false

  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (ch === '<') inTag = true
    if (!inTag) count++
    result += ch
    if (ch === '>') inTag = false
    if (count >= max) {
      result += '...'
      break
    }
  }
  return result
}

function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(new Date(d))
  }
  return days
}

const last7Days = computed(() => getLast7Days())

// ==================== Custom Tooltip Builder ====================
function buildCustomTooltip({ xLabel, series, seriesNames, colors }) {
  let html = `
    <div style="padding: 10px 12px; font-size: 12px; min-width: 180px;">
      <div style="font-weight: 700; margin-bottom: 8px;">${xLabel}</div>
  `

  series.forEach((value, idx) => {
    const name = seriesNames[idx]
    const color = colors[idx]
    html += `
      <div style="display: flex; align-items: center; justify-content: space-between; margin: 4px 0;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 2px;"></span>
          <span>${name}</span>
        </div>
        <b>${value}</b>
      </div>
    `
  })

  html += `</div>`
  return html
}

// ==================== REQUEST TREND ====================
const requestSeries = computed(() => {
  const waiting = []
  const approved = []
  const rejected = []

  last7Days.value.forEach((day) => {
    const items = stockForms.value.filter(
      (f) => new Date(f.sf_create_at).toDateString() === day.toDateString(),
    )
    waiting.push(items.filter((i) => i.sf_status === 'waiting').length)
    approved.push(items.filter((i) => i.sf_status === 'approved').length)
    rejected.push(items.filter((i) => i.sf_status === 'rejected').length)
  })

  const result = [
    { name: 'รออนุมัติ', data: waiting },
    { name: 'อนุมัติแล้ว', data: approved },
    { name: 'ไม่อนุมัติ', data: rejected },
  ]
  return result
})

// ==================== STOCK TREND (เข้า-ออก) ====================
const stockSeries = computed(() => {
  const inData = []
  const outData = []

  // รวมปริมาณเข้า-ออกทั้งหมดในแต่ละวัน
  last7Days.value.forEach((day) => {
    // เข้า (IN)
    const inQty = transactions.value
      .filter(
        (t) =>
          t.stt_type === 'IN' &&
          new Date(t.stt_created_at).toDateString() === day.toDateString(),
      )
      .reduce((sum, t) => sum + (Number(t.stt_quantity) || 0), 0)
    inData.push(inQty)

    // ออก (OUT)
    const outQty = transactions.value
      .filter(
        (t) =>
          t.stt_type === 'OUT' &&
          new Date(t.stt_created_at).toDateString() === day.toDateString(),
      )
      .reduce((sum, t) => sum + (Number(t.stt_quantity) || 0), 0)
    outData.push(outQty)
  })

  const result = [
    { name: 'รับเข้า', data: inData },
    { name: 'เบิกออก', data: outData },
  ]

  console.log('📊 STOCK IN-OUT SERIES:', result)
  return result
})

// ==================== INVENTORY STATUS TREND (พร้อมใช้/ใกล้หมด/หมด) ====================
const inventorySeries = computed(() => {
  const lowThreshold = 9
  const ready = []
  const lowStock = []
  const outOfStock = []

  // คำนวณยอดคงเหลือของแต่ละวันย้อนหลัง
  last7Days.value.forEach((targetDay) => {
    // สร้าง map เก็บยอดคงเหลือของแต่ละสินค้า ณ วันนั้น
    const inventoryOnDay = new Map()

    // เริ่มจากยอดปัจจุบันของแต่ละสินค้า
    products.value.forEach((p) => {
      inventoryOnDay.set(p.pd_id, p.pd_quantity)
    })

    // หา transactions ที่เกิดขึ้นหลังวันนั้น แล้ว reverse คำนวณย้อนกลับ
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const targetDate = new Date(targetDay)
    targetDate.setHours(23, 59, 59, 999)

    transactions.value.forEach((t) => {
      const transDate = new Date(t.stt_created_at)

      // ถ้า transaction เกิดหลังวันที่ต้องการ ให้ reverse คำนวณ
      if (transDate > targetDate) {
        const currentQty = inventoryOnDay.get(t.stt_product_id) || 0
        const qty = Number(t.stt_quantity) || 0

        // Reverse: ถ้าเป็น IN ให้ลบออก, ถ้าเป็น OUT ให้บวกกลับ
        if (t.stt_type === 'IN') {
          inventoryOnDay.set(t.stt_product_id, currentQty - qty)
        } else if (t.stt_type === 'OUT') {
          inventoryOnDay.set(t.stt_product_id, currentQty + qty)
        }
      }
    })

    // นับจำนวนสินค้าในแต่ละสถานะ ณ วันนั้น
    let readyCount = 0
    let lowCount = 0
    let outCount = 0

    inventoryOnDay.forEach((qty) => {
      if (qty > lowThreshold) {
        readyCount++
      } else if (qty > 0 && qty <= lowThreshold) {
        lowCount++
      } else {
        outCount++
      }
    })

    ready.push(readyCount)
    lowStock.push(lowCount)
    outOfStock.push(outCount)
  })

  const result = [
    { name: 'พร้อมใช้ (>9)', data: ready },
    { name: 'ใกล้หมด (1-9)', data: lowStock },
    { name: 'หมด (0)', data: outOfStock },
  ]

  console.log('📊 INVENTORY STATUS SERIES:', result)
  return result
})

// ==================== Stock xAxis Categories (เข้า-ออก) ====================
const stockCategories = computed(() => {
  return last7Days.value.map((d) => d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' }))
})

// ==================== CHART OPTIONS ====================
const chartOptions = computed(() => ({
  chart: {
    type: chartMode.value === 'request' ? 'line' : 'bar',
    stacked: chartMode.value === 'inventory' ? false : true,
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif',
  },

  colors: chartMode.value === 'request'
    ? ['#F59E0B', '#2563EB', '#EF4444']
    : chartMode.value === 'inventory'
    ? ['#10B981', '#F59E0B', '#EF4444']
    : ['#10B981', '#EF4444'],

  stroke: {
    width: chartMode.value === 'request' ? 2 : 1,
    curve: chartMode.value === 'request' ? 'smooth' : 'straight',
    colors: chartMode.value === 'request' ? undefined : ['#fff'],
  },

  yaxis: {
    title: {
      text: chartMode.value === 'stock' ? 'ปริมาณ (ชิ้น)' : chartMode.value === 'inventory' ? 'จำนวนรายการ' : 'จำนวนรายการ',
      style: { fontSize: '12px', color: '#6B7280' }
    },
    labels: {
      formatter: (val) => Math.round(val),
    },
  },

  legend: {
    show: false,
  },

  xaxis: {
    categories: chartMode.value === 'stock'
      ? stockCategories.value
      : chartMode.value === 'inventory'
      ? last7Days.value.map((d) => d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' }))
      : last7Days.value.map((d) => d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' })),
    labels: {
      style: {
        fontSize: '11px',
      },
      rotate: 0,
      hideOverlappingLabels: false,
    },
  },

  plotOptions: {
    bar: {
      borderRadius: 4,
      columnWidth: chartMode.value === 'stock' ? '60%' : chartMode.value === 'inventory' ? '50%' : '50%',
    },
  },

  tooltip: {
    enabled: true,
    shared: true,
    intersect: false,
    followCursor: true,
    custom: ({ series, seriesIndex, dataPointIndex, w }) => {
      // ดึง label จาก xaxis categories หรือ globals
      let xLabel = ''
      if (w.config?.xaxis?.categories && w.config.xaxis.categories[dataPointIndex]) {
        xLabel = w.config.xaxis.categories[dataPointIndex]
      } else if (w.globals?.categoryLabels && w.globals.categoryLabels[dataPointIndex]) {
        xLabel = w.globals.categoryLabels[dataPointIndex]
      } else if (w.globals?.labels && w.globals.labels[dataPointIndex]) {
        xLabel = w.globals.labels[dataPointIndex]
      }

      const seriesNames = w.globals.seriesNames || []
      const colors = w.globals.colors || []

      let unit = 'คำขอ'
      if (chartMode.value === 'inventory') {
        unit = 'รายการ'
      } else if (chartMode.value === 'stock') {
        unit = 'ชิ้น'
      }

      const seriesData = series.map((s, idx) => {
        const value = s[dataPointIndex]
        return `${value} ${unit}`
      })

      return buildCustomTooltip({
        xLabel,
        series: seriesData,
        seriesNames,
        colors,
      })
    },
  },

  dataLabels: {
    enabled: false,
  },
}))

// ==================== Logging & Debugging ====================
watch(
  [products, stockForms, transactions, last7Days, chartMode],
  () => {

    // แสดงยอดรวม quantity
    const totalInQty = transactions.value
      .filter((t) => t.stt_type === 'IN')
      .reduce((sum, t) => sum + (Number(t.stt_quantity) || 0), 0)
    const totalOutQty = transactions.value
      .filter((t) => t.stt_type === 'OUT')
      .reduce((sum, t) => sum + (Number(t.stt_quantity) || 0), 0)
  },
  { deep: true }
)

// ==================== Lifecycle ====================
onMounted(() => {
  fetchDashboard()
  fetchUserProfileData()

})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-8xl">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">
          หน้าจอหลักของผู้ดูแลคลัง - สวัสดีคุณ{{ userDisplayName }}
        </h1>
        <p class="text-lg text-gray-700">
          {{ userDepartmentName }}
        </p>

        <p class="text-sm text-gray-500">ตรวจสอบสถานะของรายการเบิก และสถิติของการเบิก</p>
      </div>
      <repairButton />
    </div>

    <!-- Cards -->
    <div class="mb-8">
      <CardHomeComponent :items="statItems" :item-unit="'รายการ'" />
    </div>

    <div class="flex gap-4">
      <!-- Chart -->
      <div class="bg-white rounded-lg border p-6 flex-[1.4]">
        <!-- Toggle -->
        <div class="flex justify-between items-center mb-4">
          <div>
            <h1 class="text-xl font-bold text-gray-800">
              {{
                chartMode === 'request'
                  ? 'แนวโน้มคำขอเบิก (7 วันล่าสุด)'
                  : chartMode === 'stock'
                  ? 'สถิติการรับ-จ่ายวัสดุ (7 วันล่าสุด)'
                  : 'สรุปยอดคงคลังรายวัน (7 วันล่าสุด)'
              }}
            </h1>
            <p class="text-gray-600 text-sm">
              {{
                chartMode === 'request'
                  ? 'แสดงจำนวนคำขอเบิกแยกตามสถานะ'
                  : chartMode === 'stock'
                  ? 'แสดงปริมาณสินค้ารับเข้า/เบิกออก (ชิ้น)'
                  : 'แสดงจำนวนรายการแยกตามสถานะ'
              }}
            </p>
          </div>

          <!-- Segmented Switch -->
          <div class="flex bg-gray-100 rounded-lg p-1">
            <button
              class="px-4 py-1 text-sm rounded-md transition"
              :class="chartMode === 'request' ? 'bg-white shadow text-blue-600' : 'text-gray-500'"
              @click="chartMode = 'request'"
            >
              คำขอเบิก
            </button>
            <button
              class="px-4 py-1 text-sm rounded-md transition"
              :class="chartMode === 'stock' ? 'bg-white shadow text-blue-600' : 'text-gray-500'"
              @click="chartMode = 'stock'"
            >
              เข้า-ออก
            </button>
            <button
              class="px-4 py-1 text-sm rounded-md transition"
              :class="chartMode === 'inventory' ? 'bg-white shadow text-blue-600' : 'text-gray-500'"
              @click="chartMode = 'inventory'"
            >
              สถานะคลัง
            </button>
          </div>
        </div>

        <ApexChart
          height="320"
          :options="chartOptions"
          :series="chartMode === 'request' ? requestSeries : chartMode === 'stock' ? stockSeries : inventorySeries"
        />

        <!-- Custom Legend -->
        <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <template v-if="chartMode === 'request'">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-[#F59E0B]"></span>
              <span>รออนุมัติ</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-[#2563EB]"></span>
              <span>อนุมัติแล้ว</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-[#EF4444]"></span>
              <span>ไม่อนุมัติ</span>
            </div>
          </template>

          <template v-else-if="chartMode === 'stock'">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-[#10B981]"></span>
              <span>รับเข้า</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-[#EF4444]"></span>
              <span>เบิกออก</span>
            </div>
          </template>

          <template v-else>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-[#10B981]"></span>
              <span>พร้อมใช้ (&gt;9 ชิ้น)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-[#F59E0B]"></span>
              <span>ใกล้หมด (1-9 ชิ้น)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-[#EF4444]"></span>
              <span>หมด (0 ชิ้น)</span>
            </div>
          </template>
        </div>

        <div class="mt-2 text-xs text-gray-500">
          * ชี้เมาส์ที่กราฟเพื่อดูรายละเอียด
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-lg border p-6 flex-[1]">
        <h1 class="text-xl font-bold text-gray-800">{{ dynamicTableData.title }}</h1>
        <p class="text-gray-600 mb-4">{{ dynamicTableData.subtitle }}</p>

        <TableComponent
          v-if="chartMode === 'request'"
          :columns="dynamicTableData.columns"
          :rows="dynamicTableData.rows"
          :perPage="5"
          :columnAlign="dynamicTableData.columnAlign"
          :id-column-index="0"
          :id-column-as-link="true"
          @Detail="openDetail"
        >
          <template #cell-2="{ row }">
            <InfoButtonComponent @click="openDetail(row[0])" />
          </template>
        </TableComponent>

        <TableComponent
          v-else
          :columns="dynamicTableData.columns"
          :rows="dynamicTableData.rows"
          :perPage="5"
          :columnAlign="dynamicTableData.columnAlign"
          :transactionTypeColumn="dynamicTableData.transactionTypeColumn"
          :statusStockinventoryColumn="dynamicTableData.statusStockinventoryColumn"
        />
      </div>
    </div>
  </div>
</template>
