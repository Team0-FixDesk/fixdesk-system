<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TableComponent from '@/components/table-component.vue';

defineOptions({ name: 'TechnicianRequisitionListView' })

// Router & Config
const router = useRouter()
const route = useRoute()
const API_BASE = import.meta.env.VITE_API_BASE

// Table Structure
const tableColumns = [
  'วันที่',
  'รหัสการเบิกของ',
  'สถานที่',
  'สถานะงาน',
  'ตัวดำเนินการ',
]

const tableRows = ref([])

// Filters & Search
const searchInput = ref('')
const selectedStatuses = ref([])
// const selectedUrgencies = ref([])
const selectedDate = ref('')

const isStatusFilterOpen = ref(false)
// const isUrgencyFilterOpen = ref(false)

// Utils: Decode JWT for userId
function parseJwt(token) {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decodeURIComponent(escape(json)))
  } catch {
    return {}
  }
}

// Load My Repairs
async function loadMyRepairs() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) return

    const userId = parseJwt(token).us_id

    // // เรียก API พร้อมแนบ token
    const response = await fetch(`${API_BASE}/stock-forms/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) throw new Error(data.message || 'โหลดข้อมูลล้มเหลว')

    // Map to table rows
    tableRows.value = data.map((form) => {
      const location = form.building_name ? `อาคาร ${form.building_name}` : '-'

      return [
        new Date(form.sf_create_at).toLocaleDateString('th-TH'), // 0 วันที่
        form.sf_code || '-',                                     // 1 รหัสการเบิกของ
        location,                                                // 2 สถานที่
        // requisition.sf_urgency,                               // ความเร่งด่วน (key)
        form.sf_status,                                          // 3 สถานะงาน (key)
        '',                                                      // 4 actions column
      ]
    })
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
  }
}

// Computed: Filtered Rows
const filteredRows = computed(() => {
  const search = searchInput.value.toLowerCase()
  const dateFilter = selectedDate.value

  return tableRows.value.filter((row) => {
    const dateText = String(row[0])
    const code = String(row[1]).toLowerCase()
    const location = String(row[2]).toLowerCase()
    // const urgency = row[4]
    const status = row[3]

    // ค้นหา
    const matchesSearch = code.includes(search) || location.includes(search)

    // // Filter urgencies
    // const matchesUrgency =
    //   selectedUrgencies.value.length === 0 || selectedUrgencies.value.includes(urgency)

    // Filter status
    const matchesStatus =
      selectedStatuses.value.length === 0 || selectedStatuses.value.includes(status)

    // Filter by date
    const matchesDate =
      !dateFilter ||
      new Date(dateText).toLocaleDateString('th-TH') ===
      new Date(dateFilter).toLocaleDateString('th-TH')

    return matchesSearch && matchesStatus && matchesDate
  })
})

// Dropdown Controls
// function toggleUrgencyFilter() {
//   isUrgencyFilterOpen.value = !isUrgencyFilterOpen.value
//   if (isUrgencyFilterOpen.value) isStatusFilterOpen.value = false
// }

function toggleStatusFilter() {
  isStatusFilterOpen.value = !isStatusFilterOpen.value
  if (isStatusFilterOpen.value) isUrgencyFilterOpen.value = false
}

function resetFilters() {
  // selectedUrgencies.value = []
  selectedStatuses.value = []
  searchInput.value = ''
  selectedDate.value = ''
}

// Handle click outside dropdown
function handleOutsideClick(event) {
  if (!event.target.closest('.relative')) {
    isStatusFilterOpen.value = false
    // isUrgencyFilterOpen.value = false
  }
}

// Navigation handlers
const openDetail = (code) => router.push(`/main/repair-detail/${code}`)

// Lifecycle
onMounted(() => {
  loadMyRepairs()
  document.addEventListener('click', handleOutsideClick)

  // Pre-filter จาก query status เช่น ?status=pending
  if (route.query.status && ['waiting', 'approved', 'rejected', 'completed'].includes(route.query.status)) {
    selectedStatuses.value = [route.query.status]
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})

</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-black mb-6">รายการเบิกของฉัน</h1>

    <!-- ------------------ Filters ------------------ -->
    <div class="mb-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <!-- ค้นหา -->
          <input v-model="searchInput" type="text" placeholder="ค้นหารายการเบิกของ"
            class="w-[260px] h-10 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500" />

          <!-- วันที่ -->
          <input v-model="selectedDate" type="date" class="h-10 px-3 rounded-lg border border-gray-300 text-gray-700" />

          <!-- สถานะ -->
          <div class="relative">
            <button @click.stop="toggleStatusFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white">
              สถานะ
              <img src="/icon/sidebar/chevron-down-icon.svg" class="w-4 h-4 opacity-70"
                :class="{ 'rotate-180': isStatusFilterOpen }" />
            </button>

            <div v-if="isStatusFilterOpen"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-10 text-sm">
              <label class="flex items-center py-1">
                <input type="checkbox" value="waiting" v-model="selectedStatuses" />
                <span class="ml-2">รออนุมัติ</span>
              </label>

              <label class="flex items-center py-1">
                <input type="checkbox" value="rejected" v-model="selectedStatuses" />
                <span class="ml-2">ไม่อนุมัติ</span>
              </label>

              <label class="flex items-center py-1">
                <input type="checkbox" value="approved" v-model="selectedStatuses" />
                <span class="ml-2">อนุมัติแล้ว</span>
              </label>

              <label class="flex items-center py-1">
                <input type="checkbox" value="completed" v-model="selectedStatuses" />
                <span class="ml-2">เสร็จสิ้นแล้ว</span>
              </label>
            </div>
          </div>

          <!-- ล้างตัวกรอง -->
          <button v-if="selectedStatuses.length || searchInput" @click="resetFilters"
            class="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ล้างตัวกรอง
          </button>
        </div>

      </div>
    </div>

    <!-- ------------------ Table ------------------ -->
    <div class="p-3 mx-auto max-w-8xl">
      <TableComponent :columns="tableColumns" :rows="filteredRows" :perPage="10" :statusStockColumn="3">
        <!-- คอลัมน์ Action (index 6) -->
        <template #cell-4="{ row }">
  <div class="flex justify-center items-center h-full">
    <button
      @click="openDetail(row[1])"
      title="รายละเอียด"
      class="
        w-9 h-9
        flex items-center justify-center
        rounded-md
        bg-blue-500 text-white
        transition-all duration-200
        hover:bg-blue-600
        hover:scale-105
        hover:shadow-md
        active:scale-95
      "
    >
      <img src="/icon/info-icon.svg" class="w-4 h-4" />
    </button>
  </div>
</template>


      </TableComponent>
    </div>
  </div>
</template>
