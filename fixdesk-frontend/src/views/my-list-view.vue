<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TableComponent from '@/components/table-component.vue'
import TableActions from '@/components/table-actions-component.vue'
import RepairButton from '@/components/repair-button-component.vue'
import Sweetalert from 'sweetalert2'

defineOptions({ name: 'MyListView' })

// Router & Config
const router = useRouter()
const route = useRoute()
const API_BASE = import.meta.env.VITE_API_BASE

// Table Structure
const tableColumns = [
  'วันที่',
  'หมายเลขแจ้งซ่อม',
  'ประเภทงาน',
  'สถานที่',
  'ความเร่งด่วน',
  'สถานะงาน',
  'ตัวดำเนินการ',
]

const tableRows = ref([])
const openMenuId = ref(null)

// Filters & Search
const searchInput = ref('')
const selectedStatuses = ref([])
const selectedUrgencies = ref([])
const selectedDate = ref('')

const isStatusFilterOpen = ref(false)
const isUrgencyFilterOpen = ref(false)

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
    const response = await fetch(`${API_BASE}/my-repairs/${userId}`)
    const data = await response.json()

    if (!response.ok) throw new Error(data.message || 'โหลดข้อมูลล้มเหลว')

    // Map to table rows
    tableRows.value = data.map((repair) => {
      const location = repair.building_name ? `อาคาร ${repair.building_name}` : '-'

      return [
        new Date(repair.rf_create_at).toLocaleDateString('th-TH'),  // 0 วันที่
        repair.rf_code || '-',                                      // 1 หมายเลข
        repair.tt_name || '-',                                      // 2 ประเภทงาน
        location,                                                   // 3 สถานที่
        repair.rf_urgency,                                          // 4 ความเร่งด่วน (key)
        repair.rf_user_status,                                      // 5 สถานะงาน (key)
        '',                                                         // 6 actions column
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
    const type = String(row[2]).toLowerCase()
    const location = String(row[3]).toLowerCase()
    const urgency = row[4]
    const status = row[5]

    // ค้นหา
    const matchesSearch = code.includes(search) || type.includes(search) || location.includes(search)

    // Filter urgencies
    const matchesUrgency =
      selectedUrgencies.value.length === 0 || selectedUrgencies.value.includes(urgency)

    // Filter status
    const matchesStatus =
      selectedStatuses.value.length === 0 || selectedStatuses.value.includes(status)

    // Filter by date
    const matchesDate =
      !dateFilter ||
      new Date(dateText).toLocaleDateString('th-TH') ===
        new Date(dateFilter).toLocaleDateString('th-TH')

    return matchesSearch && matchesUrgency && matchesStatus && matchesDate
  })
})

// Dropdown Controls
function toggleUrgencyFilter() {
  isUrgencyFilterOpen.value = !isUrgencyFilterOpen.value
  if (isUrgencyFilterOpen.value) isStatusFilterOpen.value = false
}

function toggleStatusFilter() {
  isStatusFilterOpen.value = !isStatusFilterOpen.value
  if (isStatusFilterOpen.value) isUrgencyFilterOpen.value = false
}

function resetFilters() {
  selectedUrgencies.value = []
  selectedStatuses.value = []
  searchInput.value = ''
  selectedDate.value = ''
}

// Handle click outside dropdown
function handleOutsideClick(event) {
  if (!event.target.closest('.relative')) {
    isStatusFilterOpen.value = false
    isUrgencyFilterOpen.value = false
  }
}

// Navigation handlers
const openDetail = (code) => router.push(`/main/repair-detail/${code}`)
const openEdit = (code) => router.push(`/main/repair-edit/${code}`)

// Delete Repair
async function deleteRepair(repairCode) {
  const confirm = await Sweetalert.fire({
    title: 'ลบรายการนี้?',
    text: `คุณต้องการลบใบแจ้งซ่อมหมายเลข ${repairCode} หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ลบเลย',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#e53e3e',
  })

  if (!confirm.isConfirmed) return

  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const response = await fetch(`${API_BASE}/my-repairs/${repairCode}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.message)

    tableRows.value = tableRows.value.filter((row) => row[1] !== repairCode)

    Sweetalert.fire({
      toast: true,
      position: 'top-end',
      title: 'ลบสำเร็จ',
      text: `ลบใบแจ้งซ่อมหมายเลข ${repairCode} แล้ว`,
      icon: 'success',
      timer: 2500,
      showConfirmButton: false,
    })
  } catch (err) {
    Sweetalert.fire({
      toast: true,
      position: 'top-end',
      title: 'เกิดข้อผิดพลาด',
      text: err.message,
      icon: 'error',
      timer: 2500,
      showConfirmButton: false,
    })
  }
}

// Lifecycle
onMounted(() => {
  loadMyRepairs()
  document.addEventListener('click', handleOutsideClick)

  // Pre-filter จาก query status เช่น ?status=pending
  if (route.query.status && ['pending', 'in_progress', 'done'].includes(route.query.status)) {
    selectedStatuses.value = [route.query.status]
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-black mb-6">รายการของฉัน</h1>

    <!-- ------------------ Filters ------------------ -->
    <div class="mb-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <!-- ค้นหา -->
          <input
            v-model="searchInput"
            type="text"
            placeholder="ค้นหาใบแจ้งซ่อม / หน่วยงาน / ครุภัณฑ์"
            class="w-[260px] h-10 px-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
          />

          <!-- วันที่ -->
          <input
            v-model="selectedDate"
            type="date"
            class="h-10 px-3 rounded-lg border border-gray-300 text-gray-700"
          />

          <!-- ความเร่งด่วน -->
          <div class="relative">
            <button
              @click.stop="toggleUrgencyFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white"
            >
              ความเร่งด่วน
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70"
                :class="{ 'rotate-180': isUrgencyFilterOpen }"
              />
            </button>

            <div
              v-if="isUrgencyFilterOpen"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-10 text-sm"
            >
              <label class="flex items-center py-1">
                <input type="checkbox" value="low" v-model="selectedUrgencies" />
                <span class="ml-2">ไม่เร่งด่วน</span>
              </label>

              <label class="flex items-center py-1">
                <input type="checkbox" value="medium" v-model="selectedUrgencies" />
                <span class="ml-2">เร่งด่วน</span>
              </label>

              <label class="flex items-center py-1">
                <input type="checkbox" value="high" v-model="selectedUrgencies" />
                <span class="ml-2">เร่งด่วนมาก</span>
              </label>
            </div>
          </div>

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
                <input type="checkbox" value="pending" v-model="selectedStatuses" />
                <span class="ml-2">รอดำเนินการ</span>
              </label>

              <label class="flex items-center py-1">
                <input type="checkbox" value="in_progress" v-model="selectedStatuses" />
                <span class="ml-2">กำลังดำเนินการ</span>
              </label>

              <label class="flex items-center py-1">
                <input type="checkbox" value="done" v-model="selectedStatuses" />
                <span class="ml-2">ดำเนินการเสร็จสิ้น</span>
              </label>
            </div>
          </div>

          <!-- ล้างตัวกรอง -->
          <button
            v-if="selectedStatuses.length || selectedUrgencies.length || searchInput"
            @click="resetFilters"
            class="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ล้างตัวกรอง
          </button>
        </div>

        <!-- ปุ่มแจ้งซ่อม -->
        <RepairButton />
      </div>
    </div>

    <!-- ------------------ Table ------------------ -->
    <div class="p-3 mx-auto max-w-8xl">
      <TableComponent
        :columns="tableColumns"
        :rows="filteredRows"
        :perPage="10"
        :urgencyColumn="4"
        :statusColumn="5"
      >
        <!-- คอลัมน์ Action (index 6) -->
        <template #cell-6="{ row }">
          <TableActions
            :row-id="row[1]"
            :open-menu-id="openMenuId"
            @toggle-menu="openMenuId = $event"
            role="user"
            :row="row"
            :status="row[5]"
            @detail="openDetail(row[1])"
            @edit="openEdit(row[1])"
            @delete="deleteRepair(row[1])"
          />
        </template>
      </TableComponent>
    </div>
  </div>
</template>
