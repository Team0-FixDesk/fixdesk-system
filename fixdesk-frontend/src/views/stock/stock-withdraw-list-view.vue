<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import TableComponent from '@/components/table-component.vue'
import { useRouter } from 'vue-router'
import Sweetalert from 'sweetalert2'
defineOptions({ name: 'StockWithdrawListView' })

// Table Columns
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

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

// Filters + Status
const searchQuery = ref('')
const showUrgencyFilter = ref(false)
const showStatusFilter = ref(false)
const selectedUrgencies = ref([])
const selectedStatuses = ref([])
const selectedDate = ref('')

//
const rows = ref([])
const rawRows = ref([])

// utils: map urgency + status + text + classes
const mapUrgency = (u) => ({ low: 'ไม่เร่งด่วน', medium: 'เร่งด่วน', high: 'เร่งด่วนมาก' }[u] || 'เร่งด่วน')
const mapStockStatus = (s) => ({ waiting: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ', completed: 'เสร็จสิ้น' }[s] || s)

const getUrgencyClass = (u) => {
  switch (u) {
    case 'high':
      return 'bg-red-100 text-red-700'
    case 'medium':
      return 'bg-amber-50 text-amber-600'
    case 'low':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

const getStatusClass = (s) => {
  switch (s) {
    case 'waiting':
      return 'bg-amber-50 text-amber-600'
    case 'approved':
      return 'bg-green-100 text-green-600'
    case 'rejected':
      return 'bg-red-100 text-red-700'
    case 'completed':
      return 'bg-gray-100 text-gray-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

// Fetch Stock Forms (placeholder)
async function fetchStockForms() {
  try {
    // (placeholder)

    rawRows.value = []
    rows.value = []
    return []
  } catch (err) {
    console.error('fetchStockForms placeholder error:', err)
    return []
  }
}

onMounted(async () => {
  await fetchStockForms()
})

// Filter + Cells
const filteredRows = computed(() => {
  const q = searchQuery.value.toLowerCase()
  const selectedDateObj = selectedDate.value ? new Date(selectedDate.value) : null

  const filtered = rows.value.filter((r) => {
    const matchSearch =
      r.code.toLowerCase().includes(q) ||
      r.requester.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q)

    const matchUrgency = selectedUrgencies.value.length === 0 || selectedUrgencies.value.includes(r.urgencyKey)
    const matchStatus = selectedStatuses.value.length === 0 || selectedStatuses.value.includes(r.statusKey)
    const matchDate = !selectedDateObj || new Date(r.dateDisplay).toDateString() === selectedDateObj.toDateString()

    return matchSearch && matchUrgency && matchStatus && matchDate
  })

  return filtered.map((r) => [r.dateDisplay, r.code, r.requester, r.department, r.urgencyBadge, r.statusBadge, 'actions'])
})

function goToDetail(code) {
  // Route -> Not Empty?
  if (!code) return
  try {
    router.push(`/main/stock-withdraw-detail/${code}`)
  } catch (e) {
    console.debug('goToDetail:', code)
  }
}

</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-8xl container mx-auto px-5 py-6">

    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">รายการเบิกของ</h1>
      </div>
    </div>
    <!-- Search Bar -->
    <div class="flex gap-2">
      <div class="flex">
        <!-- Textbox -->
        <input v-model="searchQuery" type="text" placeholder="ค้นหา" class="flex-1 placeholder:text-[#ADADAD] border border-gray-300 rounded-l-lg focus:outline-none"/>

        <!-- Search Button -->
        <button class="px-4 bg-[#1E48D1] border border-blue-600 rounded-r-lg flex items-center justify-center">

          <!-- Get Icon -->
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35m1.85-5.65a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
          </svg>
        </button>
      </div>

      <!-- Filter Day-->
      <div>
        <input v-model="selectedDate" type="date" placeholder="วันที่" class="flex-1 placeholder:text-[#ADADAD] border border-gray-300 rounded-lg"/>
      </div>

      <!-- Filter Urgency + Checkbox -->
      <div class="relative">
        <button @click.stop="showUrgencyFilter = !showUrgencyFilter" class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700">
          ความเร่งด่วน
          <img src="/icon/sidebar/chevron-down-icon.svg" class="w-4 h-4 opacity-70 transition-transform duration-200" :class="{ 'rotate-180': showUrgencyFilter }" alt="toggle" />
        </button>
        <div v-if="showUrgencyFilter" class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10">
          <label class="flex items-center py-1">
            <input type="checkbox" value="low" v-model="selectedUrgencies" class="w-4 h-4 text-blue-600 border-gray-300" />
            <span class="ml-2">ไม่เร่งด่วน</span>
          </label>
          <label class="flex items-center py-1">
            <input type="checkbox" value="medium" v-model="selectedUrgencies" class="w-4 h-4 text-blue-600 border-gray-300" />
            <span class="ml-2">เร่งด่วน</span>
          </label>
          <label class="flex items-center py-1">
            <input type="checkbox" value="high" v-model="selectedUrgencies" class="w-4 h-4 text-blue-600 border-gray-300" />
            <span class="ml-2">เร่งด่วนมาก</span>
          </label>
        </div>
      </div>

      <!-- Filter Status + Checkbox -->
      <div class="relative">
        <button @click.stop="showStatusFilter = !showStatusFilter" class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700">
          สถานะ
          <img src="/icon/sidebar/chevron-down-icon.svg" class="w-4 h-4 opacity-70 transition-transform duration-200" :class="{ 'rotate-180': showStatusFilter }" alt="toggle" />
        </button>
        <div v-if="showStatusFilter" class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10">
          <label class="flex items-center py-1">
            <input type="checkbox" value="waiting" v-model="selectedStatuses" class="w-4 h-4 text-blue-600 border-gray-300" />
            <span class="ml-2">รออนุมัติ</span>
          </label>
          <label class="flex items-center py-1">
            <input type="checkbox" value="approved" v-model="selectedStatuses" class="w-4 h-4 text-blue-600 border-gray-300" />
            <span class="ml-2">อนุมัติแล้ว</span>
          </label>
          <label class="flex items-center py-1">
            <input type="checkbox" value="rejected" v-model="selectedStatuses" class="w-4 h-4 text-blue-600 border-gray-300" />
            <span class="ml-2">ไม่อนุมัติ</span>
          </label>
          <label class="flex items-center py-1">
            <input type="checkbox" value="completed" v-model="selectedStatuses" class="w-4 h-4 text-blue-600 border-gray-300" />
            <span class="ml-2">เสร็จสิ้น</span>
          </label>
        </div>
      </div>
    </div>
    <!-- Table -->
    <div class="p-3 mx-auto max-w-8xl">
      <TableComponent :columns="columns" :rows="filteredRows" :perPage="10" mode="user" :rawRows="rawRows" @detail="goToDetail" />
    </div>

    <span class="text-[14px] text-[#444D5C]">แสดงรายการ 1-10 จาก {{problemCount || "ทั้งหมด"}}</span>
  </div>
</template>
