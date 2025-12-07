<script setup>
import { ref, computed } from 'vue'
import Holidays from 'date-holidays'

const today = new Date()
const currentMonth = ref(today.getMonth())
const currentYear = ref(today.getFullYear())
const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const weekdaysShort = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const buddhistYear = computed(() => currentYear.value + 543)

//ตั้งค่า date-holidays (TH)
const hd = new Holidays('TH')
const HOLIDAY_NAME_TH = {
  "New Year's Day": 'วันขึ้นปีใหม่',
  NewYear: 'วันขึ้นปีใหม่',
  'New Year': 'วันขึ้นปีใหม่',
  'Makha Bucha': 'วันมาฆบูชา',
  'Makha Bucha Day': 'วันมาฆบูชา',
  'Māgha Pūjā': 'วันมาฆบูชา',
  'Chakri Memorial Day': 'วันจักรี',
  'Songkran Festival': 'เทศกาลสงกรานต์',
  Songkran: 'เทศกาลสงกรานต์',
  'Labour Day': 'วันแรงงานแห่งชาติ',
  'Labor Day': 'วันแรงงานแห่งชาติ',
  'Visakha Bucha Day': 'วันวิสาขบูชา',
  Vesak: 'วันวิสาขบูชา',
  "H.M. the King's Birthday": 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
  "King's Birthday": 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
  "H.M. The Queen's Birthday": 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี',
  "Queen's Birthday": 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี',
  'Asarnha Bucha Day': 'วันอาสาฬหบูชา',
  'Asalha Puja': 'วันอาสาฬหบูชา',
  'Buddhist Lent Day': 'วันเข้าพรรษา',
  'Buddhist Lent': 'วันเข้าพรรษา',
  'King Chulalongkorn Memorial Day': 'วันปิยมหาราช',
  'King Bhumibol Memorial Day': 'วันคล้ายวันสวรรคต รัชกาลที่ 9',
  "Father's Day": 'วันพ่อแห่งชาติ',
  "Mother's Day": 'วันแม่แห่งชาติ',
  'Constitution Day': 'วันรัฐธรรมนูญ',
  "New Year's Eve": 'วันสิ้นปี',
}

// แปลงปี/เดือน/วัน -> key รูปแบบ YYYY-MM-DD
function toDateKey(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

// ตรวจว่าเป็นวันที่เดียวกันกับ today หรือไม่ */
function isSameDate(y, m, d) {
  return (
    y === today.getFullYear() &&
    m === today.getMonth() &&
    d === today.getDate()
  )
}

// สร้าง Map วันหยุด: dateKey -> ชื่อวันหยุดไทย
const holidayMap = computed(() => {
  const map = {}
  // เผื่อปีถัดไป/ปีก่อนหน้า เวลาเลื่อนไปดูเดือนอื่น
  for (let y = currentYear.value - 1; y <= currentYear.value + 1; y++) {
    const list = hd.getHolidays(y) || []
    for (const h of list) {
      const dateStr = String(h.date).slice(0, 10)
      const thaiName = HOLIDAY_NAME_TH[h.name] || 'วันหยุดราชการ'
      map[dateStr] = thaiName
    }
  }
  return map
})

// คำนวณ grid ปฏิทิน (6 แถวคงที่)
const daysInMonth = computed(
  () => new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
)
const firstDayOfWeek = computed(
  () => new Date(currentYear.value, currentMonth.value, 1).getDay()
)
/** ช่วยสร้าง cell แต่ละช่องให้อ่านง่ายขึ้น */
function createCell(year, monthIndex, day, isCurrentMonth) {
  const key = toDateKey(year, monthIndex, day)
  const holidayName = holidayMap.value[key]
  const isHoliday = !!holidayName
  const todayFlag = isSameDate(year, monthIndex, day)
  return {
    day,
    isToday: todayFlag,
    isHoliday,
    holidayName: holidayName || null,
    isCurrentMonth,
  }
}

const calendarCells = computed(() => {
  const cells = []
  const prevMonthIndex = (currentMonth.value + 11) % 12
  const nextMonthIndex = (currentMonth.value + 1) % 12
  const prevYear =
    currentMonth.value === 0 ? currentYear.value - 1 : currentYear.value
  const nextYear =
    currentMonth.value === 11 ? currentYear.value + 1 : currentYear.value
  const prevMonthDays = new Date(prevYear, prevMonthIndex + 1, 0).getDate()

  // เติมวันของ "เดือนก่อน" ที่ลากมาขึ้นต้น
  for (let i = firstDayOfWeek.value - 1; i >= 0; i--) {
    const day = prevMonthDays - i
    cells.push(createCell(prevYear, prevMonthIndex, day, false))
  }

  // เติมวันของ "เดือนนี้"
  for (let d = 1; d <= daysInMonth.value; d++) {
    cells.push(createCell(currentYear.value, currentMonth.value, d, true))
  }

  // เติมวันของ "เดือนถัดไป" ให้ครบ 42 ช่อง (6 แถว x 7 คอลัมน์)
  let nextDay = 1
  while (cells.length < 42) {
    cells.push(createCell(nextYear, nextMonthIndex, nextDay, false))
    nextDay++
  }

  return cells
})

// เปลี่ยนเดือน
function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}
</script>

<template>
  <div class="w-full mx-auto rounded-lg border border-slate-200 bg-white shadow-sm">
    <!-- Header -->
    <div class="flex items-center justify-between bg-[#1E48D1] text-white px-4 py-2 rounded-t-lg">
      <button
        type="button"
        class="text-sm font-medium px-3 py-0.5 hover:bg-slate-800 rounded-lg"
        @click="prevMonth"
      >
        ‹
      </button>

      <div class="text-center">
        <div class="text-xs font-semibold">
          {{ thaiMonths[currentMonth] }} {{ buddhistYear }}
        </div>
      </div>

      <button
        type="button"
        class="text-sm font-medium px-3 py-0.5 hover:bg-slate-800 rounded-lg"
        @click="nextMonth"
      >
        ›
      </button>
    </div>

    <!-- Grid -->
    <div class="px-3 pb-2 pt-2">
      <!-- weekday header -->
      <div class="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 mb-1">
        <div v-for="w in weekdaysShort" :key="w">
          {{ w }}
        </div>
      </div>

      <!-- days -->
      <div class="grid grid-cols-7 gap-[1px] text-xs">
        <div
          v-for="(cell, idx) in calendarCells"
          :key="idx"
          class="h-11 flex"
        >
          <div
            :title="cell.holidayName || ''"
            :class="[
              'flex-1 flex flex-col items-center justify-center border text-[10px] px-1',
              cell.isCurrentMonth
                ? 'border-slate-200 text-slate-800'
                : 'border-slate-100 text-slate-300',
              cell.isToday && cell.isCurrentMonth && !cell.isHoliday
                ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-sm'
                : '',
              cell.isHoliday && !cell.isToday && cell.isCurrentMonth
                ? 'bg-red-50 border-red-200 text-red-600 font-semibold'
                : '',
              cell.isHoliday && cell.isToday
                ? 'bg-red-500 border-red-600 text-white font-semibold shadow-sm'
                : '',
              !cell.isCurrentMonth && cell.isHoliday
                ? 'bg-red-50 border-red-100 text-red-400'
                : '',
            ]"
          >
            <div class="text-xs leading-none">
              {{ cell.day }}
            </div>

            <div
              v-if="cell.holidayName && cell.isCurrentMonth"
              class="mt-[2px] text-[9px] leading-tight text-center line-clamp-2"
            >
              {{ cell.holidayName }}
            </div>
          </div>
        </div>
      </div>

      <!-- legend -->
      <div class="mt-2 flex items-center justify-between text-[10px] text-slate-500">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1">
            <span class="inline-block w-3 h-3 rounded-sm bg-blue-600"></span>
            <span>วันนี้</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="inline-block w-3 h-3 rounded-sm bg-red-400"></span>
            <span>วันหยุด / วันสำคัญ</span>
          </div>
        </div>

        <div class="italic text-slate-400">
          * วางเมาส์บนวันที่เพื่อดูชื่อวันหยุดเต็ม
        </div>
      </div>
    </div>
  </div>
</template>
