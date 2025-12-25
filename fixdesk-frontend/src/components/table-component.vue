<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  perPage: { type: Number, default: 5 },

  idColumnIndex: { type: Number, default: 1 },
  activeId: { type: [String, Number], default: null },

  // index ของคอลัมน์เร่งด่วนและสถานะ
  urgencyColumn: { type: Number, default: null }, // เช่น 4
  statusColumn: { type: Number, default: null }, // เช่น 5
  statusStockColumn: { type: Number, default: null },
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

const paginatedRows = computed(() => {
  const startIndex = (currentPage.value - 1) * props.perPage
  const endIndex = startIndex + props.perPage
  return props.rows.slice(startIndex, endIndex)
})

function renderUrgencyBadge(type) {
  switch (type) {
    case 'high':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-lg bg-red-100 text-red-600 font-semibold">เร่งด่วนมาก</span>`
    case 'medium':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-lg bg-amber-50 text-amber-500 font-semibold">เร่งด่วน</span>`
    case 'low':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-lg bg-green-100 text-green-600 font-semibold">ไม่เร่งด่วน</span>`
    default:
      return type
  }
}

function renderStatusBadge(type) {
  switch (type) {
    case 'pending':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-lg bg-amber-50 text-amber-500 font-semibold">รอดำเนินการ</span>`
    case 'in_progress':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-lg bg-blue-100 text-blue-600 font-semibold">กำลังดำเนินการ</span>`
    case 'done':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-lg bg-green-100 text-green-600 font-semibold">ดำเนินการเสร็จสิ้น</span>`
    case 'cancel':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-lg bg-gray-100 text-gray-500 font-semibold">ยกเลิก</span>`
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
</script>

<template>
  <div class="relative overflow-x-auto">
    <!-- Table -->
    <table class="min-w-[640px] w-full text-xs sm:text-sm border-collapse">
      <thead class="border-b bg-white">
        <tr>
          <th
            v-for="(column, columnIndex) in columns"
            :key="columnIndex"
            class="px-3 py-3 text-center"
          >
            {{ column }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="(row, rowIndex) in paginatedRows"
          :key="rowIndex"
          class="bg-white border-b hover:bg-gray-50 cursor-pointer"
          :class="{ '!bg-gray-50': row[idColumnIndex] == activeId }"
          @click="$emit('detail', getRowId(row))"
        >
          <td v-for="(cell, cellIndex) in row" :key="cellIndex" class="px-3 py-2 text-center">
            <!-- URGENCY BADGE -->
            <span v-if="cellIndex === props.urgencyColumn" v-html="renderUrgencyBadge(cell)"></span>

            <!-- STATUS BADGE -->
            <span
              v-else-if="cellIndex === props.statusColumn"
              v-html="renderStatusBadge(cell)"
            ></span>

            <!-- STATUS STOCK BADGE -->
            <span
              v-else-if="cellIndex === props.statusStockColumn"
              v-html="renderStatusStockBadge(cell)"
            ></span>

            <!-- SLOT (ใช้สำหรับ Actions) -->
            <slot
              v-else-if="$slots[`cell-${cellIndex}`]"
              :name="`cell-${cellIndex}`"
              :row="row"
              :cell="cell"
              :rowIndex="rowIndex"
              :columnIndex="cellIndex"
              :openMenuId="openMenuId"
              @toggle-menu="(id) => (openMenuId = id)"
            ></slot>

            <!-- DEFAULT CELL -->
            <span v-else v-html="cell"></span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Pagination -->
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
