<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TableComponent from '@/components/table-component.vue'

defineOptions({ name: 'TechnicianRequisitionListView' })

// Router & Config
const router = useRouter()
const route = useRoute()
const API_BASE = import.meta.env.VITE_API_BASE

// Table Structure
const tableColumns = [
  'รหัสรายการเบิกของ', //0
  'รายละเอียด', //1
  'รายการของเบิก', //2
  'สถานะงาน', //3
  'ตัวดำเนินการ', //4
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
      const location = form.building_name || '-'
      const items = form.items ? form.items.split('\n') : []

      return [
        form.sf_code, // 0
        {
          date: new Date(form.sf_create_at).toLocaleString('th-TH', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          location,
          rf_code: form.rf_code,
        },
        items,
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
  return words.length > maxWords ? words.slice(0, maxWords).join(' ') + '...' : name
}

const openDetail = (rfCode) => {
  router.push(`/main/repair-detail/${rfCode}`)
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

// Lifecycle
onMounted(() => {
  loadMyRepairs()
  document.addEventListener('click', handleOutsideClick)

  // Pre-filter จาก query status เช่น ?status=pending
  if (route.query.status && ['waiting', 'approved', 'rejected'].includes(route.query.status)) {
    selectedStatuses.value = [route.query.status]
  }
})
function extractQuantity(item) {
  if (!item) return 1
  const match = item.match(/x\s*(\d+)/i)
  return match ? Number(match[1]) : 1
}

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-black mb-6">รายการเบิกของฉัน</h1>

    <!-- ------------------ Filters ------------------ -->
    <div class="relative z-50 mb-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <!-- ค้นหา -->
          <input
            v-model="searchInput"
            type="text"
            placeholder="ค้นหาจากรหัสรายการเบิก/สถานที่ "
            class="w-[260px] h-10 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
          />

          <!-- วันที่ -->
          <input
            v-model="selectedDate"
            type="date"
            class="h-10 px-3 rounded-lg border border-gray-300 text-gray-700"
          />

          <!-- สถานะ -->
          <div class="relative">
            <button
              @click.stop="toggleStatusFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white"
            >
              สถานะ
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70"
                :class="{ 'rotate-180': isStatusFilterOpen }"
              />
            </button>

            <div
              v-if="isStatusFilterOpen"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-10 text-sm"
            >
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
          <button
            v-if="selectedStatuses.length || searchInput"
            @click="resetFilters"
            class="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
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
        :statusStockColumn="3"
        :columnAlign="['left', 'left', 'left', 'center']"
      >
        <template #cell-2="{ row }">
          <div class="space-y-1 text-sm">
            <div v-for="(item, i) in row[2]" :key="i" class="flex items-center" :title="item">
              <!-- ชื่อรายการ (ชิดซ้าย) -->
              <span class="flex-1 truncate">
                {{ truncateItem(item) }}
              </span>

              <!-- จำนวน (ชิดขวา) -->
              <span class="shrink-0 text-gray-500 text-right w-8">
                x{{ extractQuantity(item) }}
              </span>
            </div>
          </div>
        </template>
        <template #cell-1="{ row }">
          <div class="text-sm space-y-1">
            <div>วันที่เบิก: {{ row[1].date }}</div>
            <div>รหัสใบแจ้งซ่อม: {{ row[1].rf_code }}</div>
            <div>สถานที่: {{ row[1].location }}</div>
          </div>
        </template>
        <template #cell-4="{ row }">
          <div class="flex justify-center">
            <button
              @click="openDetail(row[1].rf_code)"
              class="flex items-center gap-2 px-2 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600"
            >
              <img src="/icon/info-icon.svg" class="h-4 w-4" />
            </button>
          </div>
        </template>
      </TableComponent>
    </div>
  </div>
</template>
