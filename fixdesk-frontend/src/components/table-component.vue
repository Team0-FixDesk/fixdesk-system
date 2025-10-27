<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  columns: Array,
  rows: Array,
  perPage: {
    type: Number,
    default: 3,
  },
})

const currentPage = ref(1)

const totalEntries = computed(() => props.rows.length)
const totalPages = computed(() => Math.ceil(totalEntries.value / props.perPage))

// คำนวณข้อมูลที่จะโชว์เฉพาะหน้านี้
const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * props.perPage
  const end = start + props.perPage
  return props.rows.slice(start, end)
})

// ฟังก์ชันเปลี่ยนหน้า
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
        <tr v-for="(row, ri) in paginatedRows" :key="ri" class="bg-white border-b border-[#E9E9E9]">
          <template v-for="(cell, ci) in row" :key="ci">
            <th
              v-if="ci === 0"
              class="px-6 py-4 font-normal text-sm text-black text-center"
              v-html="cell"
            />
            <td v-else class="px-6 py-2 font-normal text-sm text-black text-center">
              <!-- ✅ ถ้า cell เป็น actions -->
              <div v-if="cell === 'actions'" class="flex justify-center gap-2">
                <!-- รายละเอียด -->
                <div
                  class="w-12 h-8 flex items-center justify-center bg-[#60A5FA] rounded-md hover:opacity-90 transition cursor-pointer"
                  title="รายละเอียด"
                >
                  <img src="/icon/info-icon.svg" alt="info" class="w-5 h-5" />
                </div>

                <!-- แก้ไข -->
                <div
                  class="w-12 h-8 flex items-center justify-center bg-[#FCD34D] rounded-md hover:opacity-90 transition cursor-pointer"
                  title="แก้ไข"
                >
                  <img src="/icon/edit-icon.svg" alt="edit" class="w-5 h-5" />
                </div>

                <!-- ลบ -->
                <!-- ปุ่มลบ -->
                <div
                  class="w-12 h-8 flex items-center justify-center bg-[#F87171] rounded-md hover:opacity-90 transition cursor-pointer"
                  title="ลบ"
                >
                  <img src="/icon/bin-icon.svg" alt="delete" class="w-5 h-5" />
                </div>
              </div>

              <!-- ถ้าไม่ใช่ actions -->
              <span v-else v-html="cell"></span>
            </td>
          </template>
        </tr>
      </tbody>
    </table>

    <!-- Pagination ชิดขวา -->
    <div class="flex justify-end mt-4">
      <div class="inline-flex rounded-md shadow-sm border border-gray-300">
        <button
          @click="goToPage(1)"
          :disabled="currentPage === 1"
          class="px-3 py-2 border-r border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
        >
          «
        </button>
        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          class="px-3 py-2 border-r border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
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
          class="px-3 py-2 border-r border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
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

<!-- วิธีใช้งาน -->
<!-- <template>
  <div>
    <TableComponent
      :columns="columns"
      :rows="rows"
      :perPage="2"
      v-model:currentPage="currentPage"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TableComponent from '@/components/table-component.vue'

const columns = ['Row 1', 'Row 2', 'Row 3', 'Row 4']
const rows = [
  ['Column1', 'colum1', 'colum1', 'colum1'],
  ['Column2', 'colum2', 'colum2', 'colum2'],
  ['Column3', 'colum3', 'colum3', 'colum3'],
  ['Column4', 'colum4', 'colum4', 'colum4'],
  ['Column5', 'colum5', 'colum5', 'colum5'],
  ['Column6', 'colum6', 'colum6', 'colum6'],
]

const currentPage = ref(1)

</script> -->
