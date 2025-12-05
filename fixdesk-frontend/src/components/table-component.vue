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


const isPendingStatus = (row) => typeof row[5] === 'string' && row[5].includes('รอดำเนินการ')
const currentPage = ref(1)
const totalEntries = computed(() => props.rows.length)
const totalPages = computed(() => Math.ceil(totalEntries.value / props.perPage))

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
    <table class="min-w-[640px] w-full text-xs sm:text-sm text-left text-black border-collapse">
      <thead
        class="text-l border-b border-[#E9E9E9] text-gray-700 uppercase bg-white text-[#444D5C]"
      >
        <tr>
          <th
            v-for="(col, i) in props.columns"
            :key="i"
            v-show="i !== 1"
            class="px-3 py-2 sm:px-6 sm:py-3 text-center"
          >
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
            <td v-else-if="ci !== 1" class="px-3 py-2 sm:px-6 sm:py-4 text-center">
              <div v-if="cell === 'actions'" class="flex justify-center gap-2">
                <!-- ปุ่มดูรายละเอียด (ใช้เหมือนกันทุกโหมด) -->
                <div
                  class="w-8 h-8 sm:w-9 sm:h-8 flex items-center justify-center bg-[#1E48D1] hover:bg-[#163A9B] text-white rounded-md transition cursor-pointer"
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

                <!-- โหมด user (หน้า MyList: ล็อกจากสถานะ) -->
                <template v-if="props.mode === 'user'">
                  <!-- ปุ่มแก้ไข -->
                  <div
                    :class="[
                      'w-8 h-8 sm:w-9 sm:h-8 flex items-center justify-center rounded-md transition',
                      isPendingStatus(row)
                        ? 'bg-yellow-400 hover:bg-yellow-500 text-white cursor-pointer'
                        : 'bg-gray-300 text-gray-400 cursor-not-allowed',
                    ]"
                    :title="
                      isPendingStatus(row) ? 'แก้ไข' : 'ไม่สามารถแก้ไขได้ (สถานะไม่ใช่รอดำเนินการ)'
                    "
                    @click="isPendingStatus(row) && $emit('edit', row[1])"
                  >
                    <img src="/icon/edit-icon.svg" alt="edit" class="w-5 h-5 opacity-90" />
                  </div>

                  <!-- ปุ่มลบ -->
                  <div
                    :class="[
                      'w-8 h-8 sm:w-9 sm:h-8 flex items-center justify-center rounded-md transition',
                      isPendingStatus(row)
                        ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
                        : 'bg-gray-300 text-gray-400 cursor-not-allowed',
                    ]"
                    :title="isPendingStatus(row) ? 'ลบ' : 'ไม่สามารถลบได้ (สถานะไม่ใช่รอดำเนินการ)'"
                    @click="isPendingStatus(row) && $emit('delete', row[1])"
                  >
                    <img src="/icon/bin-icon.svg" alt="delete" class="w-5 h-5 opacity-90" />
                  </div>
                </template>

                <!-- โหมด full (หน้าอื่น ๆ ใช้ — ไม่ล็อกสถานะ) -->
                <template v-else-if="props.mode === 'full'">
                  <div
                    class="w-8 h-8 sm:w-9 sm:h-8 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-white rounded-md transition cursor-pointer"
                    title="แก้ไข"
                    @click="$emit('edit', row[1])"
                  >
                    <img src="/icon/edit-icon.svg" alt="edit" class="w-5 h-5" />
                  </div>

                  <div
                    class="w-8 h-8 sm:w-9 sm:h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-md transition cursor-pointer"
                    title="ลบ"
                    @click="$emit('delete', row[1])"
                  >
                    <img src="/icon/bin-icon.svg" alt="delete" class="w-5 h-5" />
                  </div>
                </template>

                <!-- โหมด assign -->
                <template v-else-if="props.mode === 'assign'">
                  <div
                    class="w-8 h-8 sm:w-9 sm:h-8 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white rounded-md transition cursor-pointer"
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
                <span class="break-words" v-html="cell"></span>
              </slot>
            </td>
          </template>
        </tr>
      </tbody>
    </table>

    <!-- Pagination -->
    <div class="flex justify-center sm:justify-end mt-4">
      <div class="inline-flex rounded-md shadow-sm border border-gray-300">
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
}

tbody tr:hover {
  background-color: #f9fafb;
}
</style>
