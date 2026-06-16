<script setup>
/**
 * =====================================================================
 * @file            table-component.vue
 * @layer           Component (Presentation Layer)
 * @version         1.0.0
 * @since
 * @author
 * @contributors
 *
 * @lastModified
 * @lastModifiedBy
 * @description
 *  คอมโพเนนต์ตารางทั่วไป ใช้แสดงข้อมูลแบบแถว-คอลัมน์ พร้อมรองรับ
 *  การแบ่งหน้า การจัดแนวคอลัมน์ และการแสดงสถานะภายในเซลล์
 * @features
 *
 * @usedBy
 *
 * @changelog
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

  idColumnAsLink: { type: Boolean, default: false },
  rowHeightClass: { type: String, default: 'h-14' },
})
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

function getColumnWidth(columnIndex) {
  if (
    columnIndex === props.urgencyColumn ||
    columnIndex === props.statusColumn ||
    columnIndex === props.statusStockColumn ||
    columnIndex === props.statusStockinventoryColumn ||
    columnIndex === props.transactionTypeColumn
  ) {
    return 'w-40 min-w-[160px] max-w-[160px]'
  }
  return ''
}
</script>

<template>
  <div class="relative overflow-x-auto">
    <div class="relative overflow-x-auto min-h-[200px] max-h-[600px]">
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
            @click="!item.isDummy && $emit('detail', getRowId(item.row))"
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
                  @click.stop="$emit('detail', getRowId(item.row))"
                  v-html="cell"
                ></span>

                <span
                  v-else-if="cellIndex === props.urgencyColumn"
                  v-html="renderUrgencyBadge(cell)"
                ></span>
                <span
                  v-else-if="cellIndex === props.statusColumn"
                  v-html="renderStatusBadge(cell)"
                ></span>
                <span
                  v-else-if="cellIndex === props.statusStockColumn"
                  v-html="renderStatusStockBadge(cell)"
                ></span>
                <span
                  v-else-if="cellIndex === props.statusStockinventoryColumn"
                  v-html="renderStatusStockInventoryBadge(cell)"
                ></span>
                <span
                  v-else-if="cellIndex === props.transactionTypeColumn"
                  v-html="renderTransactionTypeBadge(cell)"
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
                  v-if="
                    cellIndex === props.urgencyColumn ||
                    cellIndex === props.statusColumn ||
                    cellIndex === props.statusStockColumn ||
                    cellIndex === props.statusStockinventoryColumn ||
                    cellIndex === props.transactionTypeColumn
                  "
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
    <div class="flex justify-center sm:justify-end mt-4">
      <div class="inline-flex border rounded-md">
        <button @click="currentPage = 1" :disabled="currentPage === 1" class="px-3 py-2">«</button>
        <button @click="currentPage--" :disabled="currentPage === 1" class="px-3 py-2">‹</button>
        <button
          v-for="page in totalPages"
          :key="page"
          @click="currentPage = page"
          class="px-3 py-2"
          :class="{
            'bg-blue-100 text-blue-600': currentPage === page,
            'bg-white text-gray-700': currentPage !== page,
          }"
        >
          {{ page }}
        </button>
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
