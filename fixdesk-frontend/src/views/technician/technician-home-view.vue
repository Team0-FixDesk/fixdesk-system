<script setup>
/**
 * =====================================================================
 * @file            technician-home.view.vue
 * @module          มอดูลช่างซ่อม - หน้าจอหลักของช่างซ่อม
 * @layer           View (Presentation Layer)
 * @version         1.0.3
 * @since           2025-10-21
 * @author          พชร ไพศรีสกุล
 * @contributors
 * - เศรษฐพงศ์ หอมชื่น
 * - พชร ไพศรีสกุล
 * - นราธิป แสนทวีสุข
 * - ปฏิพัทธ์ จงนันทพันธ์กุล
 * - พิมลพรรณ มามาก
 *
 * @lastModified    2026-03-05
 * @lastModifiedBy  เศรษฐพงศ์ หอมชื่น
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอหลักสำหรับช่างซ่อม
 *   - แสดงสถิติงานซ่อมของช่าง
 *   - แสดงรายการงานที่ได้รับมอบหมายล่าสุด
 *   - แสดงกราฟสัดส่วนสถานะงาน (เสร็จสิ้น / กำลังดำเนินการ / ยกเลิก / อื่นๆ)
 *   - แสดงรายการเบิกของล่าสุดของช่าง
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2025-10-21, พชร ไพศรีสกุล] V 1.0.0
 *   - สร้างไฟล์และโครงสร้างหลักของ View
 *  [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล] V 1.0.1
 *   - เพิ่มชื่อหน้าจอ
 *  [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล] V 1.0.2
 *   - แก้ไขข้อความคำอธิบายสถานะ
 *  [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล] V 1.0.3
 *   - แก้ไขข้อความหัวตาราง และการใช้สัญลักษณ์ : ในตาราง
 *  [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล] V 1.0.4
 *   - แก้ไขข้อความคำอธิบายสถานะ
 *  [2026-02-21, พิมลพรรณ มามาก] V 1.0.5
 *   - ดึงข้อมูลชื่อผู้ใช้
 *  [2026-03-05, เศรษฐพงศ์ หอมชื่น] V 1.0.6
 *   - เปลี่ยนกราฟโดนัทเป็น ApexCharts และเพิ่ม Tooltip
 *   - เปลี่ยนมาใช้ handleUnauthorized จาก auth.util แทน logout() จาก useAuthToken
 *     เพื่อให้ Alert token หมดอายุเหมือนกันทุกหน้า  [2026-06-26, พชร ไพศรีสกุล]
 * 
 * =====================================================================
 */

defineOptions({ name: 'TechnicianHomeView' })
import { computed, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import ApexChart from 'vue3-apexcharts'

import { useAuthToken } from '@/composables/useAuthToken'
import { useUserProfile } from '@/composables/useUserProfile'
import { handleUnauthorized } from '@/utils/auth.util'

import CardHomeComponent from '@/components/card-home-component.vue'
import TableComponent from '@/components/table-component.vue'
import InfoButtonComponent from '@/components/button/info-button-component.vue'

import { useTechnicianRepairs } from '@/composables/repair/useTechnicianRepairs'
import { useTechnicianStockForms } from '@/composables/stock/useTechnicianStockForms'
import { useTechnicianRepairTable } from '@/composables/repair/useTechnicianRepairTable'
import { useTechnicianStockTable } from '@/composables/stock/useTechnicianStockTable'
import { useTechnicianStats } from '@/composables/repair/useTechnicianStats'

const router = useRouter()

const { token, userId, isAuthenticated } = useAuthToken()
const onUnauthorized = () => handleUnauthorized(router)
const { repairRequests, fetchRepairRequests } = useTechnicianRepairs(token, isAuthenticated, onUnauthorized)
const { statItems } = useTechnicianStats(repairRequests)
const { repairTableRows, repairTableRaw, onRepairRowClick } = useTechnicianRepairTable(
  repairRequests,
  router,
)
const { stockForms, fetchStockForms } = useTechnicianStockForms(
  token,
  userId,
  isAuthenticated,
  onUnauthorized,
)
const { stockTableRows, truncateItem, extractQuantity, openDetail } = useTechnicianStockTable(
  stockForms,
  router,
)
const { userDisplayName, userDepartmentName, fetchUserProfileData } = useUserProfile()

// --- Tooltip Setup (จาก Manager) ---
const TOOLTIP_STYLE = {
  padding: '10px 12px',
  fontSize: '12px',
  minWidth: '190px',
  borderTop: '1px solid #eee',
  footerColor: '#6b7280',
  rowGap: '10px',
}

const escapeHtml = (s) =>
  String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

function buildTooltipHTML({ title = '', rows = [] }) {
  const safeTitle = escapeHtml(title)

  const rowsHtml = rows
    .filter(Boolean)
    .map((r) => {
      const label = escapeHtml(r.label ?? '')
      const value = escapeHtml(r.value ?? 0)
      const color = r.color || '#111827'

      return `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:${TOOLTIP_STYLE.rowGap};margin:4px 0;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:2px;"></span>
            <span>${label}</span>
          </div>
          <b>${value}</b>
        </div>
      `
    })
    .join('')

  return `
    <div style="padding:${TOOLTIP_STYLE.padding};font-size:${TOOLTIP_STYLE.fontSize};min-width:${TOOLTIP_STYLE.minWidth};">
      <div style="font-weight:700;margin-bottom:6px;">${safeTitle}</div>
      ${rowsHtml}
    </div>
  `
}

// --- Chart Data (ApexCharts) ---
const donutSeries = computed(() => {
  const done = repairRequests.value.filter((r) => r.rf_user_status === 'done').length
  const prog = repairRequests.value.filter((r) => r.rf_user_status === 'in_progress').length
  const cancel = repairRequests.value.filter((r) => r.rf_user_status === 'cancel').length

  const total = repairRequests.value.length
  const others = total - (done + prog + cancel)

  return [done, prog, cancel, others > 0 ? others : 0]
})

const donutOptions = shallowRef({
  chart: { type: 'donut', toolbar: { show: false } },
  labels: ['ดำเนินการเสร็จสิ้น', 'กำลังดำเนินการ', 'ยกเลิก', 'อื่นๆ'],
  colors: ['#16a34a', '#f97316', '#dc2626', '#1d4ed8'], // เขียว, ส้ม, แดง, น้ำเงิน
  legend: { show: false },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: {
      donut: {
        size: '75%',
        labels: {
          show: true,
          name: { show: true, fontSize: '12px', color: '#9ca3af', offsetY: -10 },
          value: { show: true, fontSize: '24px', fontWeight: 'bold', color: '#111827', offsetY: 5 },
          total: {
            show: true,
            showAlways: true,
            label: 'ภาพรวม',
            color: '#9ca3af',
            formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0),
          },
        },
      },
    },
  },
  tooltip: {
    enabled: true,
    custom: ({ series, seriesIndex, w }) => {
      const label = w.globals.labels?.[seriesIndex] ?? ''
      const value = series?.[seriesIndex] ?? 0
      const percent = w.globals.seriesPercent?.[seriesIndex] ?? 0
      const color = w.globals.colors?.[seriesIndex] ?? '#111827'

      return buildTooltipHTML({
        title: label,
        rows: [
          { label: 'จำนวนงานซ่อม', value: `${value} รายการ`, color },
          { label: 'สัดส่วน', value: `${Number(percent).toFixed(1)}%`, color },
        ],
      })
    },
  },
})

const onCardClick = (item) =>
  router.push({ path: '/main/technician-repair-list', query: { status: item.filterStatus } })

onMounted(() => {
  fetchRepairRequests()
  fetchUserProfileData()
  fetchStockForms()
})
</script>

<template>
  <div class="p-8 mx-auto bg-white shadow-md rounded-xl max-w-8xl">
    <div class="mb-6">
      <p class="text-2xl font-extrabold text-gray-900">
        หน้าจอหลักของช่างซ่อม - สวัสดีคุณ{{ userDisplayName }}
      </p>
      <p class="text-lg text-gray-700">{{ userDepartmentName }}</p>
      <p class="mt-1 text-sm text-gray-600">ตรวจสอบงานซ่อมที่ได้รับมอบหมาย และสถานะของรายการเบิก</p>
    </div>

    <div class="mt-4 mb-8">
      <CardHomeComponent :items="statItems" @click="onCardClick" />
    </div>

    <div class="grid grid-cols-1 gap-3 mb-8 lg:grid-cols-3">
      <div class="p-5 bg-white border border-gray-200 shadow-sm rounded-2xl lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-bold text-gray-900">งานซ่อมที่ได้รับมอบหมายล่าสุด</h2>
            <p class="text-sm text-gray-500">5 รายการล่าสุด</p>
          </div>
          <button
            @click="router.push('/main/technician-repair-list')"
            class="text-sm text-blue-600 hover:underline"
          >
            ดูทั้งหมด
          </button>
        </div>

        <TableComponent
          :columns="[
            'หมายเลขแจ้งซ่อม',
            'เรื่องที่แจ้ง',
            'หน่วยงาน',
            'สถานที่',
            'ความเร่งด่วน',
            'สถานะงาน',
          ]"
          :rows="repairTableRows"
          :rawRows="repairTableRaw"
          :perPage="5"
          mode="view-only"
          :idColumnIndex="0"
          :id-column-as-link="true"
          @detail="(id) => onRepairRowClick(id)"
          :columnAlign="['left', 'left', 'left', 'left', 'center', 'center']"
        />
      </div>

      <div
        class="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 shadow-sm rounded-2xl"
      >
        <h2 class="self-start mb-6 text-lg font-bold text-gray-800">สัดส่วนงานทั้งหมด</h2>

        <div class="relative flex justify-center w-48 h-48">
          <ApexChart
            type="donut"
            width="100%"
            height="100%"
            :options="donutOptions"
            :series="donutSeries"
          />
        </div>

        <div class="grid w-full grid-cols-2 mt-6 text-xs gap-x-4 gap-y-2">
          <div class="flex items-center">
            <span class="w-3 h-3 mr-2 bg-green-600 rounded"></span>ดำเนินการเสร็จสิ้น
          </div>
          <div class="flex items-center">
            <span class="w-3 h-3 mr-2 bg-orange-500 rounded"></span>กำลังดำเนินการ
          </div>
          <div class="flex items-center">
            <span class="w-3 h-3 mr-2 bg-red-600 rounded"></span>ยกเลิก
          </div>
          <div class="flex items-center">
            <span class="w-3 h-3 mr-2 bg-blue-700 rounded"></span>อื่นๆ
          </div>
        </div>
      </div>
    </div>

    <div class="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
      <div class="mb-4">
        <h2 class="text-xl font-bold text-gray-900">รายการเบิกของล่าสุด</h2>
        <p class="text-sm text-gray-500">5 รายการล่าสุด</p>
      </div>

      <TableComponent
        :columns="[
          'หมายเลขรายการเบิก',
          'รายละเอียดโดยย่อ',
          'รายการเบิก',
          'สถานะงาน',
          'ตัวดำเนินการ',
        ]"
        :rows="stockTableRows"
        :perPage="5"
        :statusStockColumn="3"
        :columnAlign="['left', 'left', 'left', 'center']"
        @detail="(row) => openDetail(row.rf_code)"
      >
        <template #cell-0="{ row }">
          <a
            href="#"
            @click.prevent="openDetail(row[1].rf_code)"
            class="text-blue-600 hover:text-blue-800 underline"
          >
            {{ row[0] }}
          </a>
        </template>

        <!-- รายการของ -->
        <template #cell-2="{ row }">
          <div class="space-y-1 text-sm">
            <div v-for="(item, i) in row[2]" :key="i" class="flex justify-between">
              <span class="truncate">{{ truncateItem(item) }}</span>
              <span class="text-gray-500">x{{ extractQuantity(item) }}</span>
            </div>
          </div>
        </template>

        <!-- รายละเอียด -->
        <template #cell-1="{ row }">
          <div class="space-y-1 text-sm">
            <div>วันที่เบิก : {{ row[1].date }}</div>
            <div>หมายเลขแจ้งซ่อม : {{ row[1].rf_code }}</div>
          </div>
        </template>

        <!-- ปุ่ม -->
        <template #cell-4="{ row }">
          <InfoButtonComponent @click="openDetail(row[1].rf_code)" />
        </template>
      </TableComponent>
    </div>
  </div>
</template>