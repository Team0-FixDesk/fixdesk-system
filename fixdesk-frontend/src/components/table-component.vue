<script setup>
/**
 * =====================================================================
 * @file            table-component.vue
 * @layer           Component (Presentation Layer)
 * @version         1.1.0
 * @since
 * @author
 * @contributors
 *
 * @lastModified
 * @lastModifiedBy
 * @description
 *  คอมโพเนนต์ตารางทั่วไป ใช้แสดงข้อมูลแบบแถว-คอลัมน์ พร้อมรองรับ
 *  การแบ่งหน้า การจัดแนวคอลัมน์ และการแสดงสถานะภายในเซลล์
 *  บนหน้าจอมือถือ (ต่ำกว่า sm) จะแสดงผลเป็นรูปแบบการ์ดแทนตาราง
 * @features
 *
 * @usedBy
 *
 * @changelog
 *  - 1.1.0: เพิ่มมุมมองการ์ดสำหรับมือถือ + prop hiddenColumnsMobile
 *           + ย่อ pagination บนมือถือ
 *
 * =====================================================================
 */
import { ref, computed, watch } from 'vue'

const props = defineProps({
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  perPage: { type: Number, default: 5 },

  idColumnIndex: { type: Number, default: 1 },
  activeId: { type: [String, Number], default: null },

  // index ของคอลัมน์เร่งด่วนและสถานะ
  urgencyColumn: { type: Number, default: null },
  statusColumn: { type: Number, default: null },
  statusStockColumn: { type: Number, default: null },
  statusStockinventoryColumn: { type: Number, default: null },
  transactionTypeColumn: { type: Number, default: null },

  columnAlign: { type: Array, default: () => [] },
  hiddenColumns: { type: Array, default: () => [] },
  // คอลัมน์ที่ต้องการซ่อนเฉพาะบนมุมมองการ์ด (มือถือ) เท่านั้น
  // (ไม่กระทบมุมมองตารางบน desktop/tablet)
  hiddenColumnsMobile: { type: Array, default: () => [] },

  idColumnAsLink: { type: Boolean, default: false },
  rowHeightClass: { type: String, default: 'h-14' },

  actionColumnIndex: {
    type: Number,
    default: null,
  },
})

const emit = defineEmits(['detail'])

const openMenuId = ref(null)
const currentPage = ref(1)

function getRowId(row) {
  return row[props.idColumnIndex] ?? null
}

const totalPages = computed(() => {
  const totalRows = props.rows.length
  return Math.max(1, Math.ceil(totalRows / props.perPage))
})

// Auto-reset currentPage เมื่อข้อมูลลดลงจนหน้าปัจจุบันไม่มีอยู่จริง
watch(totalPages, (newTotalPages) => {
  if (currentPage.value > newTotalPages) {
    currentPage.value = Math.max(1, newTotalPages)
  }
})

// Reset pagination เมื่อข้อมูลเปลี่ยนแปลง (เช่น filter, search)
watch(() => props.rows.length, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = 1
  }
})

const paginatedRows = computed(() => {
  // 1. แปลงเป็นตัวเลขให้ชัวร์ก่อนคำนวณ
  const limit = parseInt(props.perPage) || 5

  const startIndex = (currentPage.value - 1) * limit
  const endIndex = startIndex + limit

  // 2. ดึงข้อมูลชุดปัจจุบัน
  const pageRows = props.rows.slice(startIndex, endIndex).map((row) => ({ row, isDummy: false }))

  // 3. คำนวณจำนวนแถวที่ขาด (Diff) แล้วเติมให้ครบ
  // วิธีนี้ชัวร์กว่าการใช้ while loop เช็ค length
  const needed = limit - pageRows.length

  if (needed > 0) {
    const emptyRow = Array(props.columns.length).fill('')
    for (let i = 0; i < needed; i++) {
      pageRows.push({ row: [...emptyRow], isDummy: true })
    }
  }

  return pageRows
})

// คอลัมน์อื่น ๆ (ไม่ใช่คอลัมน์หัวการ์ด/ID) ที่ต้องแสดงในมุมมองการ์ด
// คือคอลัมน์ที่ไม่ถูกซ่อนทั้งจาก hiddenColumns และ hiddenColumnsMobile
// และไม่ใช่ตัว idColumnIndex เอง (เพราะเอาไปใช้เป็นหัวการ์ดแล้ว)
const mobileDetailColumnIndexes = computed(() => {
  return props.columns
    .map((_, index) => index)
    .filter((index) => {
      if (index === props.idColumnIndex) return false
      if (props.hiddenColumns.includes(index)) return false
      if (props.hiddenColumnsMobile.includes(index)) return false
      return true
    })
})

function getAlignClass(columnIndex) {
  const align = props.columnAlign[columnIndex] || 'center'
  return align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center'
}

// ... (Functions renderBadge ต่างๆ เหมือนเดิม) ...
function renderUrgencyBadge(type) {
  switch (type) {
    case 'high':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-red-100 text-red-600 font-semibold">เร่งด่วนมาก</span>`
    case 'medium':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-amber-50 text-amber-500 font-semibold">เร่งด่วน</span>`
    case 'low':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-green-100 text-green-600 font-semibold">ไม่เร่งด่วน</span>`
    default:
      return type
  }
}

function renderStatusBadge(type) {
  switch (type) {
    case 'pending':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-amber-50 text-amber-500 font-semibold">รอดำเนินการ</span>`
    case 'in_progress':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">กำลังดำเนินการ</span>`
    case 'outsource':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-purple-100 text-purple-600 font-semibold">จ้างช่างภายนอก</span>`
    case 'done':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-green-100 text-green-600 font-semibold">ดำเนินการเสร็จสิ้น</span>`
    case 'cancel':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-gray-100 text-gray-500 font-semibold">ยกเลิก</span>`
    default:
      return type
  }
}

function renderStatusStockBadge(type) {
  switch (type) {
    case 'waiting':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-amber-50 text-amber-500 font-semibold">รออนุมัติ</span>`
    case 'approved':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-green-100 text-green-600 font-semibold">อนุมัติแล้ว</span>`
    case 'rejected':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-red-100 text-red-500 font-semibold">ไม่อนุมัติ</span>`
    default:
      return type
  }
}
function renderStatusStockInventoryBadge(type) {
  switch (type) {
    case 'in_stock':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-green-100 text-green-600 font-semibold">พร้อมใช้งาน</span>`
    case 'low_stock':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-amber-100 text-amber-600 font-semibold">ใกล้หมด</span>`
    case 'out_of_stock':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-red-100 text-red-600 font-semibold">สินค้าหมด</span>`
    default:
      return type
  }
}
function renderTransactionTypeBadge(type) {
  switch (type) {
    case 'IN':
      return `<span class="inline-flex justify-center items-center w-24 h-8 rounded-full bg-green-100 text-green-600 font-semibold">รับเข้า</span>`
    case 'OUT':
      return `<span class="inline-flex justify-center items-center w-24 h-8 rounded-full bg-red-100 text-red-600 font-semibold">เบิกออก</span>`
    default:
      return type
  }
}

// ฟังก์ชันกลาง: เลือก renderer ของ badge ตาม columnIndex (ใช้ร่วมกันทั้งตารางและการ์ด)
function getBadgeHtml(columnIndex, cell) {
  if (columnIndex === props.urgencyColumn) return renderUrgencyBadge(cell)
  if (columnIndex === props.statusColumn) return renderStatusBadge(cell)
  if (columnIndex === props.statusStockColumn) return renderStatusStockBadge(cell)
  if (columnIndex === props.statusStockinventoryColumn) return renderStatusStockInventoryBadge(cell)
  if (columnIndex === props.transactionTypeColumn) return renderTransactionTypeBadge(cell)
  return null
}

function isBadgeColumn(columnIndex) {
  return (
    columnIndex === props.urgencyColumn ||
    columnIndex === props.statusColumn ||
    columnIndex === props.statusStockColumn ||
    columnIndex === props.statusStockinventoryColumn ||
    columnIndex === props.transactionTypeColumn
  )
}

function getColumnWidth(columnIndex) {
  if (isBadgeColumn(columnIndex)) {
    return 'w-40 min-w-[160px] max-w-[160px]'
  }
  return ''
}
// Mobile badge (w-auto) — ใช้เฉพาะใน card view
function getBadgeHtmlMobile(columnIndex, cell) {
  const html = getBadgeHtml(columnIndex, cell)
  if (!html) return null
  return html
    .replace(/w-36|w-24/g, 'w-auto')
    .replace(/h-8/g, 'h-7')
    .replace('inline-flex', 'inline-flex px-3 text-xs')
}
</script>

<template>
  <div class="">
    <!-- ===================== Desktop / Tablet: Table view ===================== -->
    <div class="relative overflow-x-auto min-h-[200px] max-h-[600px] hidden sm:block">
      <table class="min-w-[640px] w-full text-xs sm:text-sm border-collapse">
        <thead class="bg-gray-100 border-b border-gray-300">
          <tr>
            <th
              v-for="(column, columnIndex) in columns"
              :key="columnIndex"
              v-show="!hiddenColumns.includes(columnIndex)"
              class="px-3 py-3 font-semibold text-gray-700 sticky top-0 z-[5] bg-gray-100"
              :class="[getAlignClass(columnIndex), getColumnWidth(columnIndex)]"
            >
              {{ column }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(item, rowIndex) in paginatedRows"
            :key="rowIndex"
            :class="[
              'bg-white border-b hover:bg-gray-100 cursor-pointer',
              { '!bg-blue-50': item.row[props.idColumnIndex] == activeId },
              { 'border-white hover:bg-white cursor-default': item.isDummy },
              props.rowHeightClass,
            ]"
            @click="!item.isDummy && emit('detail', getRowId(item.row))"
          >
            <td
              v-for="(cell, cellIndex) in item.row"
              :key="cellIndex"
              v-show="!hiddenColumns.includes(cellIndex)"
              class="px-3 py-2 align-middle "
              :class="[
                getAlignClass(cellIndex),
                cellIndex === 0 ? 'whitespace-nowrap overflow-hidden' : 'whitespace-nowrap',
                getColumnWidth(cellIndex),
              ]"
            >
              <template v-if="!item.isDummy">
                <span
                  v-if="cellIndex === props.idColumnIndex && props.idColumnAsLink"
                  class="text-blue-600 underline cursor-pointer hover:text-blue-800"
                  @click.stop="emit('detail', getRowId(item.row))"
                  v-html="cell"
                ></span>

                <span
                  v-else-if="isBadgeColumn(cellIndex)"
                  v-html="getBadgeHtml(cellIndex, cell)"
                ></span>

                <slot
                  v-else-if="$slots[`cell-${cellIndex}`]"
                  :name="`cell-${cellIndex}`"
                  :row="item.row"
                  :cell="cell"
                  :rowIndex="rowIndex"
                  :columnIndex="cellIndex"
                  :openMenuId="openMenuId"
                  @toggle-menu="(id) => (openMenuId = id)"
                ></slot>

                <span
                  v-else
                  v-html="cell"
                  :class="cellIndex === 0 ? 'block line-clamp-2 break-words' : 'block truncate'"
                >
                </span>
              </template>

              <template v-else>
                <span
                  v-if="isBadgeColumn(cellIndex)"
                  class="inline-flex justify-center items-center w-36 h-8 rounded-full invisible"
                >
                  Badge
                </span>

                <div
                  v-else-if="$slots[`cell-${cellIndex}`]"
                  class="invisible inline-flex items-center"
                >
                  <div class="w-8 h-8"></div>
                </div>

                <span v-else class="invisible">&nbsp;</span>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===================== Mobile: Card view ===================== -->
    <div class="sm:hidden min-h-[200px] max-h-[600px] overflow-y-auto space-y-3 pr-1">
      <div
        v-for="(item, rowIndex) in paginatedRows"
        :key="rowIndex"
        v-show="!item.isDummy"
        class="rounded-lg border bg-white shadow-sm overflow-hidden cursor-pointer active:bg-gray-50"
        :class="{ '!bg-blue-50 !border-blue-200': item.row[props.idColumnIndex] == activeId }"
        @click="emit('detail', getRowId(item.row))"
      >
        <!-- หัวการ์ด: คอลัมน์แรก/ID เด่น -->
        <div class="flex items-start justify-between gap-3 px-4 py-3 bg-gray-50 border-b">
          <div class="min-w-0 flex-1">
            <div class="text-[11px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">
              {{ columns[props.idColumnIndex] }}
            </div>
            <span
              v-if="props.idColumnAsLink"
              class="text-blue-600 underline font-semibold text-sm break-words"
              @click.stop="emit('detail', getRowId(item.row))"
              v-html="item.row[props.idColumnIndex]"
            ></span>
            <span
              v-else
              class="text-gray-900 font-semibold text-sm break-words"
              v-html="item.row[props.idColumnIndex]"
            ></span>
          </div>

          <!-- มุมขวาบน: badge (ถ้ามี) + ปุ่มเมนู action (ถ้ามี) -->
          <div class="flex items-center gap-2 shrink-0">
            <span
              v-if="isBadgeColumn(0)"
              v-html="getBadgeHtmlMobile(0, item.row[0])"
            ></span>

            <span
              v-if="props.actionColumnIndex !== null && $slots[`cell-${props.actionColumnIndex}`]"
              @click.stop
            >
              <slot
                :name="`cell-${props.actionColumnIndex}`"
                :row="item.row"
                :cell="item.row[props.actionColumnIndex]"
                :rowIndex="rowIndex"
                :columnIndex="props.actionColumnIndex"
                :openMenuId="openMenuId"
                @toggle-menu="(id) => (openMenuId = id)"
              ></slot>
            </span>
          </div>
        </div>

        <!-- รายละเอียด: คอลัมน์ที่เหลือแสดงเป็น label: value -->
        <div class="px-4 py-3 space-y-2">
          <template v-for="cellIndex in mobileDetailColumnIndexes" :key="cellIndex">
            <div
            v-if="(cellIndex !== 0 || !isBadgeColumn(0)) && cellIndex !== props.actionColumnIndex"
            class="flex items-start gap-2 text-sm">
              <span class="text-gray-500 shrink-0 min-w-[110px]">{{ columns[cellIndex] }}</span>
                <span class="text-gray-800 min-w-0 flex-1">
                <span
                  v-if="isBadgeColumn(cellIndex)"
                  v-html="getBadgeHtmlMobile(cellIndex, item.row[cellIndex])"
                ></span>

                <slot
                  v-else-if="$slots[`cell-${cellIndex}`]"
                  :name="`cell-${cellIndex}`"
                  :row="item.row"
                  :cell="item.row[cellIndex]"
                  :rowIndex="rowIndex"
                  :columnIndex="cellIndex"
                  :openMenuId="openMenuId"
                  @toggle-menu="(id) => (openMenuId = id)"
                ></slot>

                <span v-else class="text-gray-800 break-words" v-html="item.row[cellIndex]"></span>
              </span>
            </div>
          </template>
        </div>
      </div>

      <!-- ไม่มีข้อมูลในหน้านี้ -->
      <div
        v-if="paginatedRows.every((item) => item.isDummy)"
        class="flex items-center justify-center py-10 text-gray-400 text-sm"
      >
        ไม่มีข้อมูล
      </div>
    </div>

    <!-- ===================== Pagination ===================== -->
    <div class="flex justify-center sm:justify-end mt-4">
      <!-- Desktop/Tablet: เลขหน้าแบบเต็ม -->
      <div class="hidden sm:inline-flex border rounded-md">
        <button @click="currentPage = 1" :disabled="currentPage === 1" class="px-3 py-2">«</button>
        <button @click="currentPage--" :disabled="currentPage === 1" class="px-3 py-2">‹</button>
        <template v-for="page in totalPages" :key="page">
          <button
            v-if="page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)"
            @click="currentPage = page"
            class="px-3 py-2"
            :class="{
              'bg-blue-100 text-blue-600': currentPage === page,
              'bg-white text-gray-700': currentPage !== page,
            }"
          >
            {{ page }}
          </button>
          <span
            v-else-if="page === currentPage - 2 || page === currentPage + 2"
            class="px-2 py-2 text-gray-400 select-none"
          >
            …
          </span>
        </template>
        <button @click="currentPage++" :disabled="currentPage === totalPages" class="px-3 py-2">
          ›
        </button>
        <button
          @click="currentPage = totalPages"
          :disabled="currentPage === totalPages"
          class="px-3 py-2"
        >
          »
        </button>
      </div>

      <!-- Mobile: ย่อให้เหลือ « ‹ หน้า/ทั้งหมด › » -->
      <div class="sm:hidden inline-flex items-center border rounded-md">
        <button @click="currentPage = 1" :disabled="currentPage === 1" class="px-3 py-2">«</button>
        <button @click="currentPage--" :disabled="currentPage === 1" class="px-3 py-2">‹</button>
        <span class="px-3 py-2 text-sm text-gray-700 select-none whitespace-nowrap">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <button @click="currentPage++" :disabled="currentPage === totalPages" class="px-3 py-2">
          ›
        </button>
        <button
          @click="currentPage = totalPages"
          :disabled="currentPage === totalPages"
          class="px-3 py-2"
        >
          »
        </button>
      </div>
    </div>
  </div>
</template>
