/**
 * =====================================================================
 * @file            manager-home.view.vue
 * @module          หน้าหลักผู้บริหาร (Manager Dashboard)
 * @layer           View (Presentation Layer)
 * @version         1.0.0
 * @since           2025-10-21
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *   - เศรษฐพงศ์ หอมชื่น    
 *                       
 * @lastModified    2026-02-17
 * @lastModifiedBy  เศรษฐพงศ์ หอมชื่น
 * ---------------------------------------------------------------------
 * @description
 * หน้าจอแดชบอร์ดสำหรับผู้บริหาร เพื่อแสดงภาพรวมการดำเนินงานของระบบแจ้งซ่อม
 * ประกอบด้วยการ์ดสรุปสถิติ และกราฟแสดงผลข้อมูลต่างๆ (ApexCharts) ได้แก่:
 * - ปริมาณงานแจ้งซ่อมรายเดือน (Stacked Bar Chart)
 * - สัดส่วนสถานะงานแจ้งซ่อมแบบรายสัปดาห์/รายเดือน (Pie Chart)
 * - แนวโน้มปริมาณงานแจ้งซ่อมรายวันในสัปดาห์ปัจจุบัน (Line Chart)
 * - อัตราความสำเร็จการปฏิบัติงานของช่างแต่ละแผนก (Horizontal Bar Chart)
 * - ปริมาณงานแจ้งซ่อมจำแนกตามประเภท (Horizontal Bar Chart)
 * - ปริมาณการแจ้งซ่อมจำแนกตามหน่วยงาน (Horizontal Bar Chart)
 *
 * @requires
 * - vue
 * - vue3-apexcharts
 * - @/composables/useUserProfile
 * - @/composables/useManagerDashboard
 *
 * ---------------------------------------------------------------------
 * @changelog
 * - จัดทำ Dashboard ของ Manager                                                                          [2026-01-13, เศรษฐพงศ์ หอมชื่น]
 * - เพิ่มการตั้งค่าชื่อแกน (Title) แกน X และ Y ในทุกกราฟ                                                        [2026-02-17, เศรษฐพงศ์ หอมชื่น]
 * - ปรับปรุงการแสดงผลเส้นแกน (Axis Border)                                                                  [2026-02-17, เศรษฐพงศ์ หอมชื่น]
 * - ปรับแก้ Padding และ Responsive เพื่อป้องกันชื่อแกนตกขอบ                                                     [2026-02-17, เศรษฐพงศ์ หอมชื่น]
 * - ปรับแก้ กราฟสัดส่วนสถานะงานแจ้งซ่อม และอัตราความสำเร็จการปฏิบัติงานของช่างแต่ละแผนก ให้แสดงรายสัปดาห์ (จันทร์-อาทิตย์)  [2026-01-13, เศรษฐพงศ์ หอมชื่น]
 * =====================================================================
 */

<script setup>
import { ref, computed, shallowRef, onMounted } from 'vue'
import ApexChart from 'vue3-apexcharts'
import { useUserProfile } from '@/composables/useUserProfile'
import { useManagerDashboard } from '@/composables/useManagerDashboard'

defineOptions({ name: 'ManagerHomeView' })

const API_BASE = import.meta.env.VITE_API_BASE

const { displayName, displayDepartment, fetchUserProfile } = useUserProfile(API_BASE)
const { fetchDashboardData: fetchManagerDashboard } = useManagerDashboard()

const monthLabels = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

const GRID_STYLE = {
  show: true,
  borderColor: '#E5E7EB',
  strokeDashArray: 4,
  xaxis: { lines: { show: true } },
  yaxis: { lines: { show: true } },
  padding: { left: 30, right: 20, bottom: 10, top: 0 },
}

const STATUS_COLORS = {
  pending: '#F59E0B',
  in_progress: '#3B82F6',
  done: '#10B981',
}

const MONTHLY_COLORS = {
  total: '#1D4ED8', // งานทั้งหมด (น้ำเงิน)
  done: '#10B981', // เสร็จสิ้น (เขียว)
  outsource: '#A78BFA', // จ้างช่างภายนอก (ม่วงอ่อน)
}

const TREND_COLORS = {
  total: '#1D4ED8',
  pending: '#F59E0B',
  in_progress: '#3B82F6',
  done: '#10B981',
}

const EFFICIENCY_COLORS = { rate: '#1D4ED8' }
const TYPE_COLORS = { total: '#1D4ED8' }
const DEPT_COLORS = { total: '#1D4ED8' }

const isLoading = ref(true)
const error = ref(null)

const selectedYear = ref(new Date().getFullYear())
const availableYears = ref([])

const selectedMonthIndex = ref(new Date().getMonth())

const allRepairs = ref([])
const allTechTypes = ref([])

const statusMode = ref('month')
const efficiencyMode = ref('month')

const formatYearDisplay = (year) => {
  const buddhistYear = year + 543
  return `ปี ${buddhistYear} (${year})`
}

/* -----------------------------
   Tooltip (Unified Style)
----------------------------- */
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

function buildTooltipHTML({ title = '', rows = [], unitLabel = 'หน่วย: รายการ' }) {
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

/* -----------------------------
   Helpers (English names)
----------------------------- */
const calcPercentChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

const filterRepairsByMonth = (repairs, year, month) =>
  repairs.filter((r) => {
    const d = new Date(r.rf_create_at)
    return d.getFullYear() === year && d.getMonth() === month
  })

const filterLast7Days = (repairs) => {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 6)
  start.setHours(0, 0, 0, 0)

  return repairs.filter((r) => {
    const d = new Date(r.rf_create_at)
    return d >= start && d <= today
  })
}

const filterCurrentWeek = (repairs) => {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = (day + 6) % 7

  const monday = new Date(now)
  monday.setDate(now.getDate() - diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const getYear = (dateStr) => new Date(dateStr).getFullYear()
  const getMonth = (dateStr) => new Date(dateStr).getMonth()

  const filterByYear = (items, year) =>
    items.filter((i) => getYear(i.rf_create_at) === year)

  const countByStatus = (items, status) =>
    items.filter((i) => i.rf_user_status === status).length


  return repairs.filter((r) => {
    const d = new Date(r.rf_create_at)
    return d >= monday && d <= sunday
  })
}

/* -----------------------------
   Summary Cards
----------------------------- */
const summaryStats = ref({ total: 0, pending: 0, in_progress: 0, done: 0 })
const summaryGrowth = ref({ total: 0, pending: 0, in_progress: 0, done: 0 })

const summaryCards = computed(() => [
  {
    value: summaryStats.value.total,
    label: 'งานซ่อมทั้งหมด',
    unit: 'รายการ',
    colorClass: 'text-blue-600',
    filterStatus: 'all',
    growth: summaryGrowth.value.total,
  },
  {
    value: summaryStats.value.pending,
    label: 'รอดำเนินการทั้งหมด',
    unit: 'รายการ',
    colorClass: 'text-orange-500',
    filterStatus: 'pending',
    growth: summaryGrowth.value.pending,
  },
  {
    value: summaryStats.value.in_progress,
    label: 'กำลังดำเนินการทั้งหมด',
    unit: 'รายการ',
    colorClass: 'text-sky-600',
    filterStatus: 'in_progress',
    growth: summaryGrowth.value.in_progress,
  },
  {
    value: summaryStats.value.done,
    label: 'เสร็จสิ้นทั้งหมด',
    unit: 'รายการ',
    colorClass: 'text-green-600',
    filterStatus: 'done',
    growth: summaryGrowth.value.done,
  },
])

function updateSummaryCards() {
  const currentMonth = filterRepairsByMonth(
    allRepairs.value,
    selectedYear.value,
    selectedMonthIndex.value,
  )

  const prevDate = new Date(selectedYear.value, selectedMonthIndex.value, 1)
  prevDate.setMonth(prevDate.getMonth() - 1)
  const prevMonth = filterRepairsByMonth(
    allRepairs.value,
    prevDate.getFullYear(),
    prevDate.getMonth(),
  )

  const countByStatus = (arr, status) => arr.filter((r) => r.rf_user_status === status).length

  const curPending = countByStatus(currentMonth, 'pending')
  const curInProgress = countByStatus(currentMonth, 'in_progress')
  const curDone = countByStatus(currentMonth, 'done')
  const curTotal = currentMonth.length

  const prevPending = countByStatus(prevMonth, 'pending')
  const prevInProgress = countByStatus(prevMonth, 'in_progress')
  const prevDone = countByStatus(prevMonth, 'done')
  const prevTotal = prevMonth.length

  summaryStats.value = {
    total: curTotal,
    pending: curPending,
    in_progress: curInProgress,
    done: curDone,
  }
  summaryGrowth.value = {
    total: calcPercentChange(curTotal, prevTotal),
    pending: calcPercentChange(curPending, prevPending),
    in_progress: calcPercentChange(curInProgress, prevInProgress),
    done: calcPercentChange(curDone, prevDone),
  }
}

/* -----------------------------
   งานซ่อมรายเดือน (Stacked)
----------------------------- */
const monthlyStackedOptions = shallowRef({
  chart: { type: 'bar', stacked: true, toolbar: { show: false } },
  grid: GRID_STYLE,
  plotOptions: { bar: { columnWidth: '55%', borderRadius: 6 } },

  // สีตามลำดับ series (เขียว, ม่วง, น้ำเงินบนสุด)
  colors: [MONTHLY_COLORS.done, MONTHLY_COLORS.outsource, MONTHLY_COLORS.total],

  xaxis: { categories: monthLabels },
  legend: { show: false },

  dataLabels: {
    enabled: false,
    enabledOnSeries: [2],
    formatter: (_val, opts) => {
      const i = opts.dataPointIndex
      const s = opts.w.config.series || []
      const done = s[0]?.data?.[i] ?? 0
      const outsource = s[1]?.data?.[i] ?? 0
      const otherOrTotalLayer = s[2]?.data?.[i] ?? 0
      const total = done + outsource + otherOrTotalLayer
      return total > 0 ? `รวม ${total}` : ''
    },
    style: { fontSize: '11px', fontWeight: 700, colors: ['#111827'] },
    offsetY: -6,
    background: { enabled: true, borderRadius: 6, padding: 4, opacity: 0.85 },
  },

  tooltip: {
    enabled: true,
    shared: true,
    intersect: false,
    followCursor: true,
    y: { title: { formatter: () => '' } }, // ให้ทุกกราฟ “ไม่มีหัวเลขซ้ำๆ”
    custom: ({ dataPointIndex, w }) => {
      const label = w.globals.labels?.[dataPointIndex] ?? ''
      const done = w.config.series?.[0]?.data?.[dataPointIndex] ?? 0
      const outsource = w.config.series?.[1]?.data?.[dataPointIndex] ?? 0
      const blueTop = w.config.series?.[2]?.data?.[dataPointIndex] ?? 0
      const total = done + outsource + blueTop

      return buildTooltipHTML({
        title: label,
        rows: [
          { label: 'งานซ่อมทั้งหมด', value: `${total} รายการ`, color: MONTHLY_COLORS.total },
          { label: 'งานซ่อมที่เสร็จสิ้นแล้ว', value: `${done} รายการ`, color: MONTHLY_COLORS.done },
          {
            label: 'งานซ่อมที่จ้างช่างภายนอก',
            value: `${outsource} รายการ`,
            color: MONTHLY_COLORS.outsource,
          },
        ],
        unitLabel: 'หน่วย: รายการ',
      })
    },
  },

  yaxis: { 
    title: { 
      text: 'จำนวน (รายการ)', 
      offsetX: 6,
      style: { fontSize: '13px', fontWeight: 600, color: '#4B5563' } 
    },
    axisBorder: { show: true, color: '#9CA3AF' },
    labels: { formatter: (v) => `${Math.round(v)}` } 
  },
})

const monthlyStackedSeries = ref([
  { name: 'งานที่เสร็จสิ้น', data: new Array(12).fill(0) },
  { name: 'งานที่จ้างช่างภายนอก', data: new Array(12).fill(0) },
  { name: 'งานซ่อมทั้งหมด', data: new Array(12).fill(0) },
])

function updateMonthlyStackedChart(repairsInYear) {
  const total = new Array(12).fill(0)
  const done = new Array(12).fill(0)
  const outsource = new Array(12).fill(0)

  repairsInYear.forEach((r) => {
    const m = new Date(r.rf_create_at).getMonth()
    total[m] += 1
    if (r.rf_user_status === 'done') done[m] += 1
    else if (r.rf_user_status === 'outsource') outsource[m] += 1
  })

  // น้ำเงินเป็น “ที่เหลือ” เพื่อให้ (เขียว + ม่วง + น้ำเงิน) = งานทั้งหมด
  const blueTop = total.map((t, i) => Math.max(0, t - (done[i] + outsource[i])))

  monthlyStackedSeries.value = [
    { name: 'งานที่เสร็จสิ้น', data: done },
    { name: 'งานที่จ้างช่างภายนอก', data: outsource },
    { name: 'งานซ่อมทั้งหมด', data: blueTop },
  ]
}

/* -----------------------------
   สถานะงานซ่อม (Pie)
----------------------------- */
const statusPieOptions = shallowRef({
  chart: { toolbar: { show: false } },
  labels: ['รอดำเนินการ', 'กำลังดำเนินการ', 'เสร็จสิ้น'],
  colors: [STATUS_COLORS.pending, STATUS_COLORS.in_progress, STATUS_COLORS.done],
  legend: { show: false },
  dataLabels: { enabled: true },
  tooltip: {
    enabled: true,
    followCursor: true,
    y: { title: { formatter: () => '' } },
    custom: ({ series, seriesIndex, w }) => {
      const label = w.globals.labels?.[seriesIndex] ?? ''
      const value = series?.[seriesIndex] ?? 0
      const percent = w.globals.seriesPercent?.[seriesIndex] ?? 0
      const color = w.globals.colors?.[seriesIndex] ?? '#111827'

      return buildTooltipHTML({
        title: label,
        rows: [
          { label: 'จำนวนงานซ่อม', value: `${value} รายการ`, color },
          { label: 'เปอร์เซ็นต์', value: `${Number(percent).toFixed(1)}%`, color },
        ],
        unitLabel: 'หน่วย: รายการ / %',
      })
    },
  },
})

const statusPieSeries = ref([0, 0, 0])

function updateStatusPieChart(repairsInYear) {
  const base =
    statusMode.value === 'week'
      ? filterCurrentWeek(repairsInYear)
      : filterRepairsByMonth(allRepairs.value, selectedYear.value, selectedMonthIndex.value)

  const pending = base.filter((r) => r.rf_user_status === 'pending').length
  const inProgress = base.filter((r) => r.rf_user_status === 'in_progress').length
  const done = base.filter((r) => r.rf_user_status === 'done').length

  statusPieSeries.value = [pending, inProgress, done]
}

/* -----------------------------
   แนวโน้มการแจ้งซ่อม (สัปดาห์ปัจจุบัน)
----------------------------- */
const weeklyTrendOptions = shallowRef({
  chart: {
    toolbar: { show: false },
    zoom: { enabled: false },
  },
  grid: GRID_STYLE,
  colors: [TREND_COLORS.total, TREND_COLORS.pending, TREND_COLORS.in_progress, TREND_COLORS.done],
  stroke: { curve: 'smooth', width: 3 },
  dataLabels: { enabled: false },

  xaxis: {
    categories: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์', 'อาทิตย์'],
    tooltip: { enabled: false },
    title: { 
      text: 'วันในสัปดาห์', 
      style: { fontSize: '13px', fontWeight: 600, color: '#4B5563' } 
    },
    axisBorder: { show: true, color: '#9CA3AF' }
  },

  markers: { size: 5, hover: { size: 7 } },

  tooltip: {
    enabled: true,
    shared: true,
    intersect: false,
    followCursor: true,
    x: { show: false },
    y: { title: { formatter: () => '' } },

    custom: ({ series, dataPointIndex, w }) => {
      // แก้ไขตรงนี้: ดึงชื่อวันจาก categories แทน globals.labels
      const dayLabel = w.config.xaxis.categories[dataPointIndex] || ''

      const names = w.globals.seriesNames ?? []
      const hidden = new Set(w.globals.collapsedSeriesIndices ?? [])

      const rows = names
        .map((name, i) => {
          if (hidden.has(i)) return null
          const value = series[i][dataPointIndex] ?? 0
          const color = w.globals.colors[i] ?? '#111827'
          return { label: name, value: `${value} รายการ`, color }
        })
        .filter(Boolean)

      return buildTooltipHTML({
        title: dayLabel,
        rows,
        unitLabel: 'หน่วย: รายการ',
      })
    },
  },

  yaxis: { 
    title: { 
      text: 'จำนวน (รายการ)', 
      offsetX: 6,
      style: { fontSize: '13px', fontWeight: 600, color: '#4B5563' } 
    },
    axisBorder: { show: true, color: '#9CA3AF' },
    labels: { formatter: (v) => `${Math.round(v)}` } 
  },
})

const weeklyTrendSeries = ref([
  { name: 'งานซ่อมทั้งหมด', data: new Array(7).fill(0) },
  { name: 'รอดำเนินการ', data: new Array(7).fill(0) },
  { name: 'กำลังดำเนินการ', data: new Array(7).fill(0) },
  { name: 'เสร็จสิ้น', data: new Array(7).fill(0) },
])

function updateWeeklyTrendChart(repairsInYear) {
  const base = filterCurrentWeek(repairsInYear)

  const buckets = new Array(7)
    .fill(0)
    .map(() => ({ total: 0, pending: 0, in_progress: 0, done: 0 }))
  const idxOf = (date) => {
    const d = date.getDay()
    return d === 0 ? 6 : d - 1
  }

  base.forEach((r) => {
    const idx = idxOf(new Date(r.rf_create_at))
    buckets[idx].total += 1
    if (r.rf_user_status === 'pending') buckets[idx].pending += 1
    else if (r.rf_user_status === 'in_progress') buckets[idx].in_progress += 1
    else if (r.rf_user_status === 'done') buckets[idx].done += 1
  })

  weeklyTrendSeries.value = [
    { name: 'งานซ่อมทั้งหมด', data: buckets.map((b) => b.total) },
    { name: 'รอดำเนินการ', data: buckets.map((b) => b.pending) },
    { name: 'กำลังดำเนินการ', data: buckets.map((b) => b.in_progress) },
    { name: 'เสร็จสิ้น', data: buckets.map((b) => b.done) },
  ]
}

/* -----------------------------
   ประสิทธิภาพการซ่อม
----------------------------- */
const efficiencyChartOptions = shallowRef({
  chart: { toolbar: { show: false } },
  grid: GRID_STYLE,
  colors: ['#f97316'],
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 6,
      barHeight: '55%',
    },
  },
  dataLabels: {
    enabled: true,
    formatter: (v) => `${Number(v).toFixed(1)}%`,
    style: { fontSize: '11px' },
  },
  xaxis: {
    categories: [],
    min: 0,
    max: 100,
    labels: { formatter: (v) => `${Math.round(v)}%` },
    title: { 
      text: 'อัตราสำเร็จ (%)', 
      style: { fontSize: '13px', fontWeight: 600, color: '#4B5563' } 
    },
    axisBorder: { show: true, color: '#9CA3AF' }
  },
  yaxis: {
    title: { 
      text: 'รายชื่อช่าง', 
      offsetX: 6,
      style: { fontSize: '13px', fontWeight: 600, color: '#4B5563' } 
    },
    axisBorder: { show: true, color: '#9CA3AF' }
  },
  tooltip: {
    enabled: true,
    shared: false,
    intersect: true,
    followCursor: true,
    y: { title: { formatter: () => '' } },
    custom: ({ series, seriesIndex, dataPointIndex, w }) => {
      const tech = w.globals.labels?.[dataPointIndex] || 'ไม่ระบุ'
      const rate = series?.[seriesIndex]?.[dataPointIndex] ?? 0
      const meta = efficiencyMeta.value?.[dataPointIndex] || { total: 0, done: 0 }

      return buildTooltipHTML({
        title: `ช่าง: ${tech}`,
        rows: [
          { label: 'งานซ่อมที่ได้รับมอบหมาย', value: `${meta.total} รายการ`, color: EFFICIENCY_COLORS.rate },
          { label: 'งานซ่อมที่ดำเนินการเสร็จสิ้น', value: `${meta.done} รายการ`, color: EFFICIENCY_COLORS.rate },
          {
            label: 'อัตราซ่อมสำเร็จ',
            value: `${Number(rate).toFixed(1)}%`,
            color: "#f97316",
          },
        ],
        unitLabel: 'หน่วย: รายการ / %',
      })
    },
  },
})

const efficiencyChartSeries = ref([{ name: 'อัตราซ่อมสำเร็จ', data: [] }])
const efficiencyMeta = ref([])

function buildTechnicianEfficiency(repairs) {
  const map = {}

  repairs.forEach((r) => {
    const techName =
      r.technician_name || r.tech_name || r.rf_technician_name || r.tt_name || 'ไม่ระบุ'
    if (!map[techName]) map[techName] = { total: 0, done: 0 }
    map[techName].total += 1
    if (r.rf_user_status === 'done') map[techName].done += 1
  })

  return Object.entries(map)
    .map(([name, v]) => ({
      name,
      total: v.total,
      done: v.done,
      rate: v.total > 0 ? (v.done / v.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
}

function updateEfficiencyChart(repairsInYear) {
  const base =
    efficiencyMode.value === 'week'
      ? filterCurrentWeek(repairsInYear)
      : filterRepairsByMonth(allRepairs.value, selectedYear.value, selectedMonthIndex.value)

  const rows = buildTechnicianEfficiency(base)

  efficiencyMeta.value = rows.map((r) => ({ total: r.total, done: r.done }))
  efficiencyChartOptions.value.xaxis.categories = rows.map((r) => r.name)
  efficiencyChartSeries.value = [
    { name: 'อัตราสำเร็จ', data: rows.map((r) => Number(r.rate.toFixed(1))) },
  ]
}

/* -----------------------------
   งานซ่อมแยกตามประเภท
----------------------------- */
const typeOptions = shallowRef({
  chart: { toolbar: { show: false }, zoom: { enabled: false } },
  grid: GRID_STYLE,
  colors: ['#7c3aed'],
  plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
  dataLabels: { enabled: false },
  xaxis: { 
    categories: ['ไม่มีข้อมูล'],
    title: { 
      text: 'จำนวนงาน (รายการ)', 
      style: { fontSize: '13px', fontWeight: 600, color: '#4B5563' } 
    },
    axisBorder: { show: true, color: '#9CA3AF' },
    labels: { formatter: (v) => `${Math.round(v)}` }
  },
  yaxis: {
    title: { 
      text: 'ประเภทงานซ่อม', 
      offsetX: 6,
      style: { fontSize: '13px', fontWeight: 600, color: '#4B5563' } 
    },
    axisBorder: { show: true, color: '#9CA3AF' }
  },
  tooltip: {
    enabled: true,
    shared: false,
    intersect: true,
    followCursor: true,
    y: { title: { formatter: () => '' } },
    custom: ({ series, seriesIndex, dataPointIndex, w }) => {
      const label = w.globals.labels?.[dataPointIndex] ?? ''
      const val = series?.[seriesIndex]?.[dataPointIndex] ?? 0
      const color = w.globals.colors?.[seriesIndex] ?? TYPE_COLORS.total

      return buildTooltipHTML({
        title: label,
        rows: [{ label: 'จำนวนงาน', value: `${val} รายการ`, color }],
        unitLabel: 'หน่วย: รายการ',
      })
    },
  },

  tooltip: {
    enabled: true,
    shared: false,
    intersect: true,
    followCursor: true,
    y: { title: { formatter: () => '' } },
    custom: ({ series, seriesIndex, dataPointIndex, w }) => {
      const label = w.globals.labels?.[dataPointIndex] ?? ''
      const val = series?.[seriesIndex]?.[dataPointIndex] ?? 0
      const color = w.globals.colors?.[seriesIndex] ?? TYPE_COLORS.total

      return buildTooltipHTML({
        title: label,
        rows: [{ label: 'จำนวนงานซ่อม', value: `${val} รายการ`, color }],
        unitLabel: 'หน่วย: รายการ',
      })
    },
  },
})

const typeSeries = ref([{ name: 'จำนวนงาน', data: [0] }])

function updateTypeChart(repairsInYear) {
  const typeCounts = {}
  allTechTypes.value.forEach((t) => {
    typeCounts[t.tt_name] = 0
  })

  repairsInYear.forEach((r) => {
    if (r.tt_name && Object.prototype.hasOwnProperty.call(typeCounts, r.tt_name))
      typeCounts[r.tt_name]++
  })

  const sorted = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
  const labels = sorted.map(([name]) => name)
  const values = sorted.map(([, count]) => count)

  typeOptions.value.xaxis.categories = labels.length ? labels : ['ไม่มีข้อมูล']
  typeSeries.value = [{ name: 'จำนวนงาน', data: values.length ? values : [0] }]
}

/* -----------------------------
   รายการแจ้งซ่อมแต่ละหน่วยงาน
----------------------------- */
const deptOptions = shallowRef({
  chart: { toolbar: { show: false }, zoom: { enabled: false } },
  grid: GRID_STYLE,
  colors: ['#166534'],
  plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
  dataLabels: { enabled: false },
  xaxis: { 
    categories: ['ไม่มีข้อมูล'],
    title: { 
      text: 'จำนวนแจ้งซ่อม (รายการ)', 
      style: { fontSize: '13px', fontWeight: 600, color: '#4B5563' } 
    },
    axisBorder: { show: true, color: '#9CA3AF' },
    labels: { formatter: (v) => `${Math.round(v)}` }
  },
  yaxis: {
    title: { 
      text: 'หน่วยงาน', 
      offsetX: 6,
      style: { fontSize: '13px', fontWeight: 600, color: '#4B5563' } 
    },
    axisBorder: { show: true, color: '#9CA3AF' }
  },

  tooltip: {
    enabled: true,
    shared: false,
    intersect: true,
    followCursor: true,
    y: { title: { formatter: () => '' } },
    custom: ({ series, seriesIndex, dataPointIndex, w }) => {
      const label = w.globals.labels?.[dataPointIndex] ?? ''
      const val = series?.[seriesIndex]?.[dataPointIndex] ?? 0
      const color = w.globals.colors?.[seriesIndex] ?? DEPT_COLORS.total

      return buildTooltipHTML({
        title: label,
        rows: [{ label: 'จำนวนงานซ่อม', value: `${val} รายการ`, color }],
        unitLabel: 'หน่วย: รายการ',
      })
    },
  },
})

const deptSeries = ref([{ name: 'งานซ่อมทั้งหมด', data: [0] }])

function updateDepartmentChart(repairsInYear) {
  const deptCounts = {}

  repairsInYear.forEach((r) => {
    const name =
      r.department_name ||
      r.dp_name ||
      r.rf_department_name ||
      r.org_name ||
      r.unit_name ||
      'ไม่ระบุ'
    deptCounts[name] = (deptCounts[name] || 0) + 1
  })

  const sorted = Object.entries(deptCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
  const labels = sorted.map(([name]) => name)
  const values = sorted.map(([, count]) => count)

  deptOptions.value.xaxis.categories = labels.length ? labels : ['ไม่มีข้อมูล']
  deptSeries.value = [{ name: 'งานซ่อมทั้งหมด', data: values.length ? values : [0] }]
}

/* -----------------------------
   Toggle handlers
----------------------------- */
function setStatusMode(mode) {
  if (statusMode.value === mode) return
  statusMode.value = mode
  const repairsInYear = allRepairs.value.filter(
    (r) => new Date(r.rf_create_at).getFullYear() === selectedYear.value,
  )
  updateStatusPieChart(repairsInYear)
}

function setEfficiencyMode(mode) {
  if (efficiencyMode.value === mode) return
  efficiencyMode.value = mode
  const repairsInYear = allRepairs.value.filter(
    (r) => new Date(r.rf_create_at).getFullYear() === selectedYear.value,
  )
  updateEfficiencyChart(repairsInYear)
}

/* -----------------------------
   Dashboard update
----------------------------- */
function refreshDashboard() {
  if (!allRepairs.value.length) return
  const repairsInYear = allRepairs.value.filter(
    (r) => new Date(r.rf_create_at).getFullYear() === selectedYear.value,
  )
  const repairsInMonth = filterRepairsByMonth(
    allRepairs.value,
    selectedYear.value,
    selectedMonthIndex.value
  )

  updateSummaryCards()
  updateMonthlyStackedChart(repairsInYear)
  updateStatusPieChart(repairsInYear)
  updateWeeklyTrendChart(repairsInYear)
  updateEfficiencyChart(repairsInYear)
  updateTypeChart(repairsInMonth)
  updateDepartmentChart(repairsInMonth)
  updateCompareBarChart(repairsInYear)
}

/* -----------------------------
   เปรียบเทียบช่างดำเนินการเอง vs จ้างช่างภายนอก (แท่งคู่)
----------------------------- */
const compareBarOptions = shallowRef({
  chart: { type: 'bar', toolbar: { show: false } },
  grid: GRID_STYLE,
  colors: [MONTHLY_COLORS.done, MONTHLY_COLORS.outsource],
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '55%',
      borderRadius: 4,
      dataLabels: { position: 'top' } // แสดงตัวเลขบนแท่ง
    }
  },
  dataLabels: {
    enabled: false,
    formatter: (val) => val > 0 ? val : '',
    offsetY: -20,
    style: { fontSize: '11px', colors: ['#4B5563'] }
  },
  stroke: { show: true, width: 2, colors: ['transparent'] },
  xaxis: {
    categories: monthLabels,
    title: { 
      text: 'เดือน', 
      style: { fontSize: '13px', fontWeight: 600, color: '#4B5563' } 
    },
    axisBorder: { show: true, color: '#9CA3AF' }
  },
  yaxis: {
    title: { 
      text: 'จำนวนงาน (รายการ)', 
      offsetX: 6,
      style: { fontSize: '13px', fontWeight: 600, color: '#4B5563' } 
    },
    axisBorder: { show: true, color: '#9CA3AF' },
    labels: { formatter: (v) => `${Math.round(v)}` }
  },
  legend: { show: false }, // ซ่อน Legend เริ่มต้น (เราจะสร้างเองข้างนอกให้ตรงกับกราฟอื่น)
  tooltip: {
    enabled: true,
    shared: true,
    intersect: false,
    followCursor: true,
    y: { title: { formatter: () => '' } },
    custom: ({ dataPointIndex, w }) => {
      const label = w.globals.labels?.[dataPointIndex] ?? ''
      const done = w.config.series?.[0]?.data?.[dataPointIndex] ?? 0
      const outsource = w.config.series?.[1]?.data?.[dataPointIndex] ?? 0

      return buildTooltipHTML({
        title: `เดือน: ${label}`,
        rows: [
          { label: 'ช่างดำเนินการเอง (เสร็จสิ้น)', value: `${done} รายการ`, color: MONTHLY_COLORS.done },
          { label: 'จ้างช่างภายนอก', value: `${outsource} รายการ`, color: MONTHLY_COLORS.outsource },
        ],
        unitLabel: 'หน่วย: รายการ',
      })
    },
  }
})

const compareBarSeries = ref([
  { name: 'ช่างดำเนินการเอง', data: new Array(12).fill(0) },
  { name: 'จ้างช่างภายนอก', data: new Array(12).fill(0) }
])

function updateCompareBarChart(repairsInYear) {
  const doneData = new Array(12).fill(0)
  const outsourceData = new Array(12).fill(0)

  repairsInYear.forEach((r) => {
    const m = new Date(r.rf_create_at).getMonth()
    if (r.rf_user_status === 'done') doneData[m] += 1
    else if (r.rf_user_status === 'outsource') outsourceData[m] += 1
  })

  compareBarSeries.value = [
    { name: 'ช่างดำเนินการเอง', data: doneData },
    { name: 'จ้างช่างภายนอก', data: outsourceData }
  ]
}

/* -----------------------------
  Use composable to fetch dashboard data
----------------------------- */

/* -----------------------------
   Fetch
----------------------------- */
async function fetchDashboardData() {
  try {
    isLoading.value = true
    error.value = null

  const { repairs, techTypes } = await fetchManagerDashboard(API_BASE)
  allRepairs.value = repairs
  allTechTypes.value = techTypes

    const years = new Set()
    repairs.forEach((r) => years.add(new Date(r.rf_create_at).getFullYear()))
    availableYears.value = Array.from(years).sort((a, b) => b - a)

    if (availableYears.value.length > 0) selectedYear.value = availableYears.value[0]

    const repairsInYear = allRepairs.value.filter(
      (r) => new Date(r.rf_create_at).getFullYear() === selectedYear.value,
    )
    let latestMonth = -1
    repairsInYear.forEach((r) => {
      latestMonth = Math.max(latestMonth, new Date(r.rf_create_at).getMonth())
    })
    selectedMonthIndex.value = latestMonth >= 0 ? latestMonth : new Date().getMonth()

    refreshDashboard()
  } catch (err) {
    error.value = 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง'
  } finally {
    isLoading.value = false
  }
}
onMounted(() => {
  fetchDashboardData()
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-8xl">
    <div class="max-w-7xl mx-auto space-y-6">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-800">
              หน้าจอหลักของผู้บริหาร - สวัสดีคุณ {{ displayName }}
            </h1>
            <p class="text-lg font-semibold text-gray-700">
              {{ displayDepartment }}
            </p>
            <p class="text-gray-600 mt-2">ภาพรวมของการแจ้งซ่อม และสถิติงานซ่อม</p>
          </div>

          <div class="flex items-center gap-3">
            <label class="text-sm font-medium text-gray-700">เลือกปี:</label>
            <select
              v-model.number="selectedYear"
              @change="refreshDashboard"
              class="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
            >
              <option v-for="year in availableYears" :key="year" :value="year">
                {{ formatYearDisplay(year) }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">กำลังโหลดข้อมูล...</span>
      </div>

      <!-- Error -->
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

      <!-- Content -->
      <template v-else>
        <!-- Controls for Summary Cards -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="text-sm text-gray-600">
            ข้อมูล ณ เดือน
            <span class="font-semibold text-gray-900">{{ monthLabels[selectedMonthIndex] }}</span>
            <span class="text-gray-400 ml-2">เมื่อเทียบกับเดือนก่อนหน้า</span>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700">เลือกเดือน:</label>
            <select
              v-model.number="selectedMonthIndex"
              @change="refreshDashboard"
              class="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm text-sm"
            >
              <option v-for="(m, idx) in monthLabels" :key="m" :value="idx">
                {{ m }}
              </option>
            </select>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div
            v-for="(card, index) in summaryCards"
            :key="index"
            class="bg-white rounded-lg shadow p-6"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">{{ card.label }}</p>
                <p :class="card.colorClass + ' text-2xl font-bold'">
                  {{ card.value }} {{ card.unit }}
                </p>
              </div>

              <div class="text-right">
                <div
                  v-if="card.growth !== undefined"
                  :class="[
                    'text-sm font-medium flex items-center justify-end',
                    card.growth > 0
                      ? 'text-green-600'
                      : card.growth < 0
                        ? 'text-red-600'
                        : 'text-gray-500',
                  ]"
                >
                  <span v-if="card.growth > 0">↗</span>
                  <span v-else-if="card.growth < 0">↘</span>
                  <span v-else>→</span>
                  <span class="ml-1">{{ Math.abs(card.growth) }}%</span>
                </div>
                <div class="text-xs text-gray-500 mt-1">เทียบกับเดือนก่อนหน้า</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Row 1 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- งานซ่อมรายเดือน (Stacked) -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              ปริมาณงานแจ้งซ่อมรายเดือน - {{ formatYearDisplay(selectedYear) }}
            </h3>

            <ApexChart
              type="bar"
              height="320"
              :options="monthlyStackedOptions"
              :series="monthlyStackedSeries"
            />

            <!-- Legend -->
            <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-block w-3.5 h-3.5 rounded-sm"
                  :style="{ backgroundColor: MONTHLY_COLORS.total }"
                ></span>
                งานซ่อมทั้งหมด
              </span>
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-block w-3.5 h-3.5 rounded-sm"
                  :style="{ backgroundColor: MONTHLY_COLORS.done }"
                ></span>
                งานที่เสร็จสิ้น
              </span>
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-block w-3.5 h-3.5 rounded-sm"
                  :style="{ backgroundColor: MONTHLY_COLORS.outsource }"
                ></span>
                งานที่จ้างช่างภายนอก
              </span>
            </div>

            <div class="mt-2 text-xs text-gray-500">
              <span class="text-red-400">*</span> วางเมาส์บนแท่งกราฟเพื่อดูข้อมูลรายเดือน (แสดงจำนวนงานซ่อมในแต่ละเดือน)
            </div>
          </div>

          <!-- สถานะงานซ่อม (Pie) -->
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">สัดส่วนสถานะงานแจ้งซ่อม</h3>

              <div class="flex p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  class="px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200"
                  :class="
                    statusMode === 'week'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  "
                  @click="setStatusMode('week')"
                >
                  สัปดาห์
                </button>
                <button
                  type="button"
                  class="px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200"
                  :class="
                    statusMode === 'month'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  "
                  @click="setStatusMode('month')"
                >
                  เดือน
                </button>
              </div>
            </div>

            <ApexChart
              type="pie"
              height="280"
              :options="statusPieOptions"
              :series="statusPieSeries"
            />

            <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-block w-3.5 h-3.5 rounded-sm"
                  :style="{ backgroundColor: STATUS_COLORS.pending }"
                ></span>
                รอดำเนินการ
              </span>
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-block w-3.5 h-3.5 rounded-sm"
                  :style="{ backgroundColor: STATUS_COLORS.in_progress }"
                ></span>
                กำลังดำเนินการ
              </span>
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-block w-3.5 h-3.5 rounded-sm"
                  :style="{ backgroundColor: STATUS_COLORS.done }"
                ></span>
                เสร็จสิ้น
              </span>
            </div>

            <div class="mt-2 text-xs text-gray-500">
              <span class="text-red-400">*</span> วางเมาส์บนกราฟเพื่อดูข้อมูล (แสดงสัดส่วนของงานซ่อมเป็นเปอร์เซ็นต์)
            </div>
          </div>
        </div>

        <!-- Row 2 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- แนวโน้มปริมาณงานแจ้งซ่อมรายวัน (สัปดาห์ปัจจุบัน) -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              แนวโน้มปริมาณงานแจ้งซ่อมรายวัน (สัปดาห์ปัจจุบัน)
            </h3>

            <ApexChart
              type="line"
              height="320"
              :options="weeklyTrendOptions"
              :series="weeklyTrendSeries"
            />

            <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-block w-3.5 h-3.5 rounded-sm"
                  :style="{ backgroundColor: TREND_COLORS.total }"
                ></span>
                งานซ่อมทั้งหมด
              </span>
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-block w-3.5 h-3.5 rounded-sm"
                  :style="{ backgroundColor: TREND_COLORS.pending }"
                ></span>
                รอดำเนินการ
              </span>
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-block w-3.5 h-3.5 rounded-sm"
                  :style="{ backgroundColor: TREND_COLORS.in_progress }"
                ></span>
                กำลังดำเนินการ
              </span>
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-block w-3.5 h-3.5 rounded-sm"
                  :style="{ backgroundColor: TREND_COLORS.done }"
                ></span>
                เสร็จสิ้น
              </span>
            </div>

            <div class="mt-2 text-xs text-gray-500">
              <span class="text-red-400">*</span> วางเมาส์บนเส้นกราฟเพื่อดูข้อมูลรายสัปดาห์ (แสดงจำนวนงานซ่อมในแต่ละวัน)
            </div>
          </div>

          <!-- ประสิทธิภาพการซ่อม -->
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">อัตราความสำเร็จการปฏิบัติงานของช่างแต่ละแผนก</h3>

              <div class="flex p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  class="px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200"
                  :class="
                    efficiencyMode === 'week'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  "
                  @click="setEfficiencyMode('week')"
                >
                  สัปดาห์
                </button>
                <button
                  type="button"
                  class="px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200"
                  :class="
                    efficiencyMode === 'month'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  "
                  @click="setEfficiencyMode('month')"
                >
                  เดือน
                </button>
              </div>
            </div>

            <ApexChart
              type="bar"
              height="320"
              :options="efficiencyChartOptions"
              :series="efficiencyChartSeries"
            />

            <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-block w-3.5 h-3.5 rounded-sm"
                  :style="{ backgroundColor: '#fb923c' }"
                ></span>
                อัตราสำเร็จ
              </span>
            </div>

            <div class="mt-2 text-xs text-gray-500">
              <span class="text-red-400">*</span> วางเมาส์บนแท่งกราฟเพื่อดูข้อมูล (แสดงอัตราความสำเร็จในการซ่อม)
            </div>
          </div>
        </div>

        <!-- Bottom Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- ปริมาณงานแจ้งซ่อมจำแนกตามประเภท -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">ปริมาณงานแจ้งซ่อมจำแนกตามประเภท</h3>

            <ApexChart type="bar" height="380" :options="typeOptions" :series="typeSeries" />

            <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-block w-3.5 h-3.5 rounded-sm"
                  :style="{ backgroundColor: '#7c3aed' }"
                ></span>
                งานซ่อมทั้งหมด
              </span>
            </div>

            <div class="mt-2 text-xs text-gray-500">
              <span class="text-red-400">*</span> วางเมาส์บนแท่งกราฟเพื่อดูข้อมูล (แสดงจำนวนงานซ่อมในแต่ละประเภท)
            </div>
          </div>

          <!-- ปริมาณการแจ้งซ่อมจำแนกตามหน่วยงาน -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">ปริมาณการแจ้งซ่อมจำแนกตามหน่วยงาน</h3>

            <ApexChart type="bar" height="380" :options="deptOptions" :series="deptSeries" />

            <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span class="inline-flex items-center gap-2">
                <span
                  class="inline-block w-3.5 h-3.5 rounded-sm"
                  :style="{ backgroundColor: '#166534' }"
                ></span>
                งานซ่อมทั้งหมด
              </span>
            </div>

            <div class="mt-2 text-xs text-gray-500">
              <span class="text-red-400">*</span> วางเมาส์บนแท่งกราฟเพื่อดูข้อมูล (แสดงจำนวนงานซ่อมในแต่ละหน่วยงาน)
            </div>
          </div>

          <!-- กราฟเปรียบเทียบช่างภายในองค์กรกับช่างภายนอก -->
           <div class="mt-6 bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              เปรียบเทียบศักยภาพการปิดงานของช่างภายในและช่างภายนอกตลอด{{ formatYearDisplay(selectedYear) }}
            </h3>
          
            <ApexChart 
              type="bar" 
              height="350" 
              :options="compareBarOptions" 
              :series="compareBarSeries" 
            />
          
            <div class="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
              <span class="inline-flex items-center gap-2">
                <span class="inline-block w-3.5 h-3.5 rounded-sm" :style="{ backgroundColor: MONTHLY_COLORS.done }"></span>
                ช่างดำเนินการเอง (เสร็จสิ้น)
              </span>
              <span class="inline-flex items-center gap-2">
                <span class="inline-block w-3.5 h-3.5 rounded-sm" :style="{ backgroundColor: MONTHLY_COLORS.outsource }"></span>
                จ้างช่างภายนอก
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
