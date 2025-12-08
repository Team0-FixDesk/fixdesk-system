<script setup>
import { ref, reactive } from 'vue'
import TableComponent from '@/components/table-component.vue'
import { useRouter } from 'vue-router'
import Sweetalert from 'sweetalert2'
defineOptions({ name: 'StockWithdrawHistoryView' })

// --- Table Columns หัวตาราง ---
const columns = [
  'วันที่',
  'รหัสการเบิกของ',
  'ชื่อผู้ขอเบิก',
  'หน่วยงาน',
  'ความเร่งด่วน',
  'สถานะการเบิก',
  'ตัวดำเนินการ',
]

const router = useRouter()


// --- Filters ---
const searchQuery = ref('')
const showUrgencyFilter = ref(false)
const selectedUrgencies = ref([])


</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-8xl container px-5 py-6">

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">ประวัติการเบิกของ</h1>
    </div>

    <!-- Filter -->
    <div class="mb-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <!-- search Filter-->
          <input v-model="searchQuery" type="text" placeholder="ค้นหารายการของ"
            class="text-gray-700 w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />

          <!-- ความเร่งด่วน -->
          <div class="relative">
            <button @click.stop="showUrgencyFilter = !showUrgencyFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700">
              ความเร่งด่วน
              <img src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200"
                :class="{ 'rotate-180': showUrgencyFilter }" alt="toggle" />
            </button>
            <div v-if="showUrgencyFilter"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10">
              <label class="flex items-center py-1">
                <input type="checkbox" value="low" v-model="selectedUrgencies"
                  class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">ไม่เร่งด่วน</span>
              </label>
              <label class="flex items-center py-1">
                <input type="checkbox" value="medium" v-model="selectedUrgencies"
                  class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">เร่งด่วน</span>
              </label>
              <label class="flex items-center py-1">
                <input type="checkbox" value="high" v-model="selectedUrgencies"
                  class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">เร่งด่วนมาก</span>
              </label>
            </div>
          </div>

          <!-- สถานะ -->
          <div class="relative">
            <button @click.stop="showStatusFilter = !showStatusFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700">
              สถานะ
              <img src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200" :class="{ 'rotate-180': showStatusFilter }"
                alt="toggle" />
            </button>
            <div v-if="showStatusFilter"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10">
              <label class="flex items-center py-1">
                <input type="checkbox" value="pending" v-model="selectedStatuses"
                  class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">รอดำเนินการ</span>
              </label>
              <label class="flex items-center py-1">
                <input type="checkbox" value="in_progress" v-model="selectedStatuses"
                  class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">กำลังดำเนินการ</span>
              </label>
              <label class="flex items-center py-1">
                <input type="checkbox" value="done" v-model="selectedStatuses"
                  class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">ดำเนินการเสร็จสิ้น</span>
              </label>
            </div>
          </div>

          <!-- ประเภทงาน -->
          <div class="relative">
            <button @click.stop="showTypeFilter = !showTypeFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700">
              ประเภทงาน
              <img src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200" :class="{ 'rotate-180': showTypeFilter }"
                alt="toggle" />
            </button>
            <div v-if="showTypeFilter"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10">
              <label v-for="t in technicianTypes" :key="t" class="flex items-center py-1">
                <input type="checkbox" :value="t" v-model="selectedTypes"
                  class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">{{ t }}</span>
              </label>
            </div>
          </div>

          <!-- ปุ่มล้างตัวกรอง -->
          <transition name="fade">
            
          </transition>
        </div>
      </div>

      <!-- Table -->
      <div class="p-3 mx-auto max-w-8xl">
        <TableComponent :columns="columns" :rows="filteredRows" :perPage="10" mode="user" @delete="handleDelete"
          @detail="goToDetail" @edit="goToEdit" />
      </div>
    </div>
  </div>
</template>
