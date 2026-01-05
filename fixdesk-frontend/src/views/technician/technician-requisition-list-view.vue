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
  'รหัสรายการเบิกของ', //0
  'รายละเอียด',       //1
  'รายการของเบิก',    //2
  'สถานะงาน',       //3
  'ตัวดำเนินการ',     //4
]

const tableRows = ref([])

// Filters & Search
const searchInput = ref('')
const selectedStatuses = ref([])
const selectedDate = ref('')

const isStatusFilterOpen = ref(false)

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
      const location = form.building_name ? `${form.building_name}` : '-'

      // return [
      //   form.sf_code || '-',                                     // 0 รหัสการเบิกของ
      //   (`<div style="text-align: left;">
      //       วันที่ : ${new Date(form.sf_create_at).toLocaleDateString('th-TH')} </br>
      //       สถานที่ : ${location} </div>`),                        // 1 วันที่ + สถานที่
      //   // form.sf_urgency,                                      // ความเร่งด่วน (key)
      //   form.sf_status,                                          // 2 สถานะงาน (key)
      //   '',                                                      // 3 actions column
      // ]

      return [
        form.sf_code || '-',
        {
          date: new Date(form.sf_create_at).toLocaleDateString('th-TH'),
          location,
        },
        form.items ? form.items.split('\n') : [],
        form.sf_status,
        '',
      ]
    })
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
  }
}

/* ฟังก์ชันตัดคำ */
function truncateItem(text, maxWords = 5) {
  if (!text) return ''
  const [name] = text.split(' x')
  const words = name.split(' ')
  return words.length > maxWords
    ? words.slice(0, maxWords).join(' ') + '...'
    : name
}

// Computed: Filtered Rows
const filteredRows = computed(() => {
  const search = searchInput.value.toLowerCase()
  const dateFilter = selectedDate.value

  return tableRows.value.filter((row) => {
    const code = String(row[0]).toLowerCase()
    const dateText = String(row[1].date)
    const location = String(row[1].location).toLowerCase()
    const status = row[3]

    // ค้นหา
    const matchesSearch = code.includes(search) || location.includes(search)

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

function toggleStatusFilter() {
  isStatusFilterOpen.value = !isStatusFilterOpen.value
}

function resetFilters() {
  selectedStatuses.value = []
  searchInput.value = ''
  selectedDate.value = ''
}

// Handle click outside dropdown
function handleOutsideClick(event) {
  if (!event.target.closest('.relative')) {
    isStatusFilterOpen.value = false
  }
}

// Navigation handlers
const openDetail = (code) => router.push(`/main/technician-requisition-detail/${code[0]}`)

// Lifecycle
onMounted(() => {
  loadMyRepairs()
  document.addEventListener('click', handleOutsideClick)

  // Pre-filter จาก query status เช่น ?status=pending
  if (route.query.status && ['waiting', 'approved', 'rejected'].includes(route.query.status)) {
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
          <input v-model="searchInput" type="text" placeholder="ค้นหาจากรหัสรายการเบิก/สถานที่ "
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
      <TableComponent
      :columns="tableColumns"
      :rows="filteredRows"
      :perPage="10"
      :statusStockColumn="2">

        <!-- รหัสรายการเบิกของ -->
        <template #cell-0="{ row }">
          <div class="cursor-pointer hover:text-blue-600 hover:underline" @click="openDetail(row[0])">
            {{ row[0] }}
          </div>
        </template>

        <!-- วันที่ + สถานที่ -->
        <template #cell-1="{ row }">
          <div class="space-y-0.5 text-left cursor-pointer" @click="openDetail(row[0])">
            <div class="font-semibold text-gray-900">
              วันที่ : {{ row[1].date }}
            </div>

            <div class="text-xs text-gray-500">
              สถานที่ : {{ row[1].location }}
            </div>
          </div>
        </template>

        <!-- รายการของเบิก -->
        <template #cell-2="{ row }">
          <div class="space-y-1 text-sm cursor-pointer" @click="openDetail(row[0])">
            <div v-for="(item, i) in row[2]" :key="i" class="flex justify-between gap-2 max-w-[260px]" :title="item">
              <span class="truncate max-w-[180px]">
                {{ truncateItem(item) }}
              </span>
              <span class="text-gray-500">
                x{{ item.split(' x')[1] }}
              </span>
            </div>
          </div>
        </template>


        <!-- ตัวดำเนินการ -->
        <template #cell-4="{ row }">
          <div class="flex justify-center">
            <button @click="openDetail(row[0])" title="รายละเอียด"
              class="w-9 h-9 flex items-center justify-center rounded-md bg-blue-500 text-white duration-200 hover:bg-blue-600 hover:scale-105">
              <img src="/icon/info-icon.svg" class="w-4 h-4" />
            </button>
          </div>
        </template>

      </TableComponent>
    </div>
  </div>
</template>

<style scoped>
/* header: รายละเอียด */
:deep(th:nth-child(2)) {
  text-align: left !important;
}

/* header: รายการของเบิก */
:deep(th:nth-child(3)) {
  text-align: left !important;
}
</style>
