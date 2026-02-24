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
 * @lastModified    2026-02-20
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
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
 * =====================================================================
 */
 
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ApexChart from 'vue3-apexcharts'

import TableComponent from '@/components/table-component.vue'
import repairButton from '@/components/button/repair-button-component.vue'
import CardHomeComponent from '@/components/card-home-component.vue'
import { useUserProfile } from '@/composables/useUserProfile'

import InfoButtonComponent from '@/components/button/info-button-component.vue'

import { getAllProductList, getAllStockFormList } from '@/services/stock'
import { useAuthToken } from '@/composables/useAuthToken'

const { token, isAuthenticated, logout } = useAuthToken()

defineOptions({ name: 'StockHomeView' })

// ==================== Router / API ====================
const router = useRouter()

const { userDisplayName, userDepartmentName, fetchUserProfileData } = useUserProfile()



// ==================== State ====================
const products = ref([])
const stockForms = ref([])
const tableRowsList = ref([])
const loading = ref(false)

// 🔀 สวิตช์กราฟ
const chartMode = ref('request') // 'request' | 'stock'

// ==================== Navigation ====================
function openDetail(code) {
  router.push(`/main/stock-requisition/${code}`)
}

// ==================== Table ====================
const columns = ['หมายเลขรายการเบิก', 'รายละเอียดการเบิก', 'ตัวดำเนินการ']

// ==================== Load Dashboard ====================
async function fetchDashboard() {
  loading.value = true
  try {
    if (!isAuthenticated.value) {
      logout()
      return
    }

    const [p, forms] = await Promise.all([
      getAllProductList(token.value),
      getAllStockFormList(token.value),
    ])

    products.value = p
    stockForms.value = forms

    tableRowsList.value = stockForms.value
      .filter((i) => i.sf_status === 'waiting')
      .sort((a, b) => new Date(b.sf_create_at) - new Date(a.sf_create_at))
      .slice(0, 5)
      .map((item) => ({
        row: [
          item.sf_code,
          'วันที่: ' +
            new Date(item.sf_create_at).toLocaleDateString('th-TH') +
            '<br>ผู้ขอเบิก: ' +
            item.requester +
            '<br>หน่วยงาน: ' +
            item.us_department,
          '',
        ],
      }))
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

  return [
    { name: 'รออนุมัติ', data: waiting },
    { name: 'อนุมัติแล้ว', data: approved },
    { name: 'ไม่อนุมัติ', data: rejected },
  ]
})

// ==================== STOCK TREND ====================
const stockSeries = computed(() => {
  const inStock = []
  const outStock = []
  const lowStock = []

  const lowThreshold = 5

  last7Days.value.forEach((day) => {
    // รับเข้า (อัปเดตสินค้า)
    inStock.push(
      products.value.filter(
        (p) => p.pd_updated_at && new Date(p.pd_updated_at).toDateString() === day.toDateString(),
      ).length,
    )

    // เบิกออก (approved)
    outStock.push(
      stockForms.value.filter(
        (f) =>
          f.sf_status === 'approved' &&
          new Date(f.sf_create_at).toDateString() === day.toDateString(),
      ).length,
    )

    // ใกล้หมด (snapshot)
    lowStock.push(
      products.value.filter((p) => p.pd_quantity > 0 && p.pd_quantity <= lowThreshold).length,
    )
  })

  return [
    { name: 'รับเข้า', data: inStock },
    { name: 'เบิกออก', data: outStock },
    { name: 'ใกล้หมด', data: lowStock },
  ]
})

// ==================== CHART OPTIONS ====================
const chartOptions = computed(() => ({
  chart: {
    type: 'bar',
    stacked: true,
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif',
  },

  colors:
    chartMode.value === 'request'
      ? ['#F59E0B', '#2563EB', '#EF4444']
      : ['#22C55E', '#EF4444', '#F59E0B'],

  legend: {
    show: true,
    position: 'bottom',
    horizontalAlign: 'center',

    formatter: (seriesName) => {
      // ===== โหมดคำขอเบิก =====
      if (chartMode.value === 'request') {
        if (seriesName === 'รออนุมัติ') return '🟡 รอการพิจารณาอนุมัติ'
        if (seriesName === 'อนุมัติแล้ว') return '🔵 อนุมัติแล้ว'
        if (seriesName === 'ไม่อนุมัติ') return '🔴 ไม่อนุมัติ'
      }

      // ===== โหมดคลัง =====
      if (chartMode.value === 'stock') {
        if (seriesName === 'รับเข้า') return '🟢 รับเข้าสู่คลัง'
        if (seriesName === 'เบิกออก') return '🔴 เบิกออกจากคลัง'
        if (seriesName === 'ใกล้หมด') return '🟡 รายการใกล้หมด'
      }

      return seriesName
    },

    markers: {
      width: 10,
      height: 10,
      radius: 10,
    },

    itemMargin: {
      horizontal: 12,
      vertical: 6,
    },

    fontSize: '14px',
  },

  xaxis: {
    categories: last7Days.value.map((d) =>
      d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' }),
    ),
  },

  plotOptions: {
    bar: {
      borderRadius: 6,
      columnWidth: '50%',
    },
  },

  tooltip: {
    y: {
      formatter: (v) => `${v} รายการ`,
    },
  },
}))

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
          หน้าจอหลักของผู้ดูแลคลัง - สวัสดีคุณ {{ userDisplayName }}
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
                  ? 'แนวโน้มรายการเบิก'
                  : 'แนวโน้มการคลัง'
              }}
            </h1>
            <p class="text-gray-600 text-sm">
              {{
                chartMode === 'request'
                  ? 'จำนวนของรายการเบิกในระยะเวลา 7 วันที่ผ่านมา'
                  : 'ความเคลื่อนไหวของวัสดุ/อุปกรณ์ในคลัง'
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
              คลังสินค้า
            </button>
          </div>
        </div>

        <ApexChart
          height="320"
          :options="chartOptions"
          :series="chartMode === 'request' ? requestSeries : stockSeries"
        />
        <!-- Color Legend -->
        <div class="flex flex-wrap gap-6 mt-4 text-sm text-gray-600">
          <!-- ===== Request Mode ===== -->
          <template v-if="chartMode === 'request'">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-amber-500"></span>
              <span>รอการพิจารณาอนุมัติ</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-blue-600"></span>
              <span>อนุมัติแล้ว</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-red-500"></span>
              <span>ไม่อนุมัติ</span>
            </div>
          </template>

          <!-- ===== Stock Mode ===== -->
          <template v-else>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-green-500"></span>
              <span>รับเข้าสู่คลัง</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-red-500"></span>
              <span>เบิกออกจากคลัง</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-amber-500"></span>
              <span>รายการที่ใกล้หมด</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-lg border p-6 flex-[1]">
        <h1 class="text-xl font-bold text-gray-800">รายการคำขอเบิกที่รออนุมัติ</h1>
        <p class="text-gray-600 mb-4">5 รายการล่าสุด</p>

        <TableComponent
          :columns="columns"
          :rows="tableRowsList.map((i) => i.row)"
          :perPage="5"
          :columnAlign="['left', 'left', 'center']"
          :id-column-index="0"
          :id-column-as-link="true"
          @Detail="openDetail"
        >
          <template #cell-2="{ row }">
            <InfoButtonComponent @click="openDetail(row[0])" />
          </template>
        </TableComponent>
      </div>
    </div>
  </div>
</template>
