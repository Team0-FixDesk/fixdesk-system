<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  columns: {
    type: Array,
    default: () => [],
  },
  rows: {
    type: Array,
    default: () => [],
  },
  perPage: {
    type: Number,
    default: 3,
  },
  // mode:
  //  - "full"       : edit/delete
  //  - "assign"     : มอบหมายงาน
  //  - "technician" : 3 ปุ่ม รับงาน / เปลี่ยนสถานะ / เสร็จสิ้น
  mode: {
    type: String,
    default: 'full',
  },
})

const currentPage = ref(1)

const totalEntries = computed(() => props.rows.length || 0)
const totalPages = computed(() => {
  if (totalEntries.value === 0) return 1
  return Math.ceil(totalEntries.value / props.perPage)
})

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * props.perPage
  const end = start + props.perPage
  return (props.rows || []).slice(start, end)
})

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}
function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}
function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}
</script>

<template>
  <div class="relative overflow-x-auto">
    <!-- ตาราง -->
    <table class="w-full text-sm text-left text-black border-collapse">
      <thead
        class="text-l border-b border-[#E9E9E9] text-gray-700 uppercase bg-white text-[#444D5C]"
      >
        <tr>
          <th v-for="(col, i) in props.columns" :key="i" class="px-6 py-3">
            {{ col }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="(row, ri) in paginatedRows"
          :key="ri"
          class="bg-white border-b border-[#E9E9E9] hover:bg-gray-50"
        >
          <template v-for="(cell, ci) in row" :key="ci">
            <!-- คอลัมน์แรก -->
            <th
              v-if="ci === 0"
              class="px-6 py-4 font-medium text-center text-black whitespace-nowrap"
            >
              {{ cell }}
            </th>

            <!-- คอลัมน์อื่น -->
            <td v-else class="px-6 py-4 text-center">
              <!-- 🔵 คอลัมน์ "รายละเอียด" -->
              <div v-if="cell === 'detail'" class="flex items-center justify-center">
                <button
                  class="flex items-center justify-center h-8 text-white transition bg-[#0072C3] rounded-md w-9 shadow-md hover:bg-[#005a9a]"
                  title="ดูรายละเอียด"
                  @click="$emit('detail', row[1])"
                >
                  <img src="/icon/info-icon.svg" alt="info" class="w-5 h-5" />
                </button>
              </div>

              <!-- 🟩 คอลัมน์ "การจัดการ" เงื่อนไขแสดงปุ่ม -->
              <div v-else-if="cell === 'actions'" class="flex justify-center">
                <template v-if="props.mode === 'technician'">
                  <!-- 1) สถานะ = pending → แสดงปุ่ม "รับงาน" -->
                  <button
                    v-if="row[7] === 'pending'"
                    class="px-4 py-2 text-xs font-medium text-white bg-[#005a9a] rounded-[8px] shadow-md hover:shadow-lg hover:bg-[#005a9a] transition"
                    @click="$emit('accept', row[1])"
                  >
                    รับงาน
                  </button>

                  <!-- 2) สถานะ ≠ pending และ ≠ done → แสดงปุ่ม "เปลี่ยนสถานะ" -->
                  <button
                    v-else-if="row[7] !== 'done'"
                    class="px-4 py-2 text-xs font-medium text-white bg-[#FBC02D] rounded-[8px] shadow-md hover:shadow-lg hover:bg-[#F9A825] transition"
                    @click="$emit('change-status', row[1])"
                  >
                    เปลี่ยนสถานะ
                  </button>

                  <!-- 3) สถานะ = done → แสดง "เสร็จสิ้น" เทา ๆ ไม่สามารถกดได้ -->
                  <span
                    v-else
                    class="px-4 py-2 text-xs font-medium text-gray-400 bg-gray-100 rounded-full cursor-default"
                  >
                    เสร็จสิ้น
                  </span>
                </template>

                <!-- ✏️ โหมด full (เดิม) -->
                <template v-else-if="props.mode === 'full'">
                  <!-- ปุ่มแก้ไข -->
                  <div
                    class="flex items-center justify-center h-8 text-white transition bg-yellow-400 rounded-md cursor-pointer w-9 hover:bg-yellow-500"
                    title="แก้ไข"
                    @click="$emit('edit', row[1])"
                  >
                    <img src="/icon/edit-icon.svg" alt="edit" class="w-5 h-5" />
                  </div>

                  <!-- ปุ่มลบ -->
                  <div
                    class="flex items-center justify-center h-8 text-white transition bg-red-500 rounded-md cursor-pointer w-9 hover:bg-red-600"
                    title="ลบ"
                    @click="$emit('delete', row[1])"
                  >
                    <img src="/icon/bin-icon.svg" alt="delete" class="w-5 h-5" />
                  </div>
                </template>

                <!-- 🧑‍🔧 โหมด assign (เดิม) -->
                <template v-else-if="props.mode === 'assign'">
                  <div
                    class="flex items-center justify-center h-8 text-white transition bg-green-600 rounded-md cursor-pointer w-9 hover:bg-green-700"
                    title="มอบหมายงาน"
                    @click="$emit('assign', row[1])"
                  >
                    <img src="/icon/arrow-right.svg" alt="assign" class="w-5 h-5" />
                  </div>
                </template>
              </div>

              <!-- ถ้าไม่ใช่ detail / actions -->
              <slot
                v-else
                :name="`cell-${ci}`"
                :row="row"
                :cell="cell"
                :rowIndex="ri"
                :columnIndex="ci"
              >
                <span v-html="cell"></span>
              </slot>
            </td>
          </template>
        </tr>
      </tbody>
    </table>

    <!-- Pagination -->
    <div class="flex justify-end mt-4">
      <div class="inline-flex border border-gray-300 rounded-md shadow-sm">
        <button
          @click="goToPage(1)"
          :disabled="currentPage === 1"
          class="px-3 py-2 text-gray-500 border-r border-gray-300 hover:bg-gray-100 disabled:opacity-40"
        >
          «
        </button>
        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          class="px-3 py-2 text-gray-500 border-r border-gray-300 hover:bg-gray-100 disabled:opacity-40"
        >
          ‹
        </button>

        <button
          v-for="page in totalPages"
          :key="page"
          @click="goToPage(page)"
          :class="[
            'px-3 py-2 border-r border-gray-300 hover:bg-gray-100 transition-colors',
            currentPage === page
              ? 'bg-blue-100 text-blue-600 border-blue-300'
              : 'bg-white text-gray-700',
          ]"
        >
          {{ page }}
        </button>

        <button
          @click="nextPage"
          :disabled="currentPage === totalPages"
          class="px-3 py-2 text-gray-500 border-r border-gray-300 hover:bg-gray-100 disabled:opacity-40"
        >
          ›
        </button>
        <button
          @click="goToPage(totalPages)"
          :disabled="currentPage === totalPages"
          class="px-3 py-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
        >
          »
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
table {
  table-layout: fixed;
  width: 100%;
}
td,
th {
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
}
tbody tr:hover {
  background-color: #f9fafb;
}
</style>
