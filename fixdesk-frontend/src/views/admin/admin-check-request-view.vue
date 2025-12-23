<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import TableComponent from '@/components/table-component.vue'
import TableActions from '@/components/table-actions-component.vue'
import AssignJobModalComponent from '@/components/modal/assign-job-modal-component.vue'

// Router
const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE

const showAssignModal = ref(false)
const assignRepairId = ref(null)

const tableColumns = [
  'วันที่',
  'หมายเลขแจ้งซ่อม',
  'ชื่อผู้แจ้ง',
  'หน่วยงาน',
  'ประเภท',
  'ความเร่งด่วน',
  'สถานะงาน',
  'การดำเนินการ',
]

const tableRows = ref([])
const openMenuId = ref(null)

// Filters & Search
const searchInput = ref('')
const selectedUrgencies = ref([])
const selectedStatuses = ref([])
const selectedDate = ref('')

const isUrgencyFilterOpen = ref(false)
const isStatusFilterOpen = ref(false)

// Load Data
async function loadAdminRepairs() {
  try {
    // // ดึง token
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    if (!token) {
      console.error('ไม่พบโทเคน — ผู้ใช้ยังไม่ได้ล็อกอิน')
      return
    }

    // // เรียก API พร้อมแนบ token
    const response = await fetch(`${API_BASE}/admin/repairs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    // // ตรวจสอบสถานะ
    if (!response.ok) {
      throw new Error(data.message || 'โหลดข้อมูลล้มเหลว')
    }

    // // แปลงข้อมูลเป็น row
    tableRows.value = data.map((repair) => {
      const fullName = `${repair.us_first_name || ''} ${repair.us_last_name || ''}`.trim()

      return [
        new Date(repair.rf_create_at).toLocaleDateString('th-TH'), // 0
        repair.rf_code, // 1
        fullName || '-', // 2
        repair.department_name || '-', // 3
        repair.tt_name || '-', // 4
        repair.rf_urgency, // 5
        repair.rf_user_status, // 6
        '', // 7 action
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
    const dateText = row[0]
    const code = String(row[1]).toLowerCase()
    const name = String(row[2]).toLowerCase()
    const department = String(row[3]).toLowerCase()
    const type = String(row[4]).toLowerCase()
    const urgency = row[5]
    const status = row[6]

    // ค้นหา
    const matchesSearch =
      code.includes(search) ||
      name.includes(search) ||
      department.includes(search) ||
      type.includes(search)

    // ความเร่งด่วน
    const matchesUrgency =
      selectedUrgencies.value.length === 0 || selectedUrgencies.value.includes(urgency)

    // สถานะงาน
    const matchesStatus =
      selectedStatuses.value.length === 0 || selectedStatuses.value.includes(status)

    // วันที่
    const matchesDate =
      !dateFilter ||
      new Date(dateText).toLocaleDateString('th-TH') ===
        new Date(dateFilter).toLocaleDateString('th-TH')

    return matchesSearch && matchesUrgency && matchesStatus && matchesDate
  })
})

// Filters & Controls
function toggleUrgencyFilter() {
  isUrgencyFilterOpen.value = !isUrgencyFilterOpen.value
  if (isUrgencyFilterOpen.value) isStatusFilterOpen.value = false
}

function toggleStatusFilter() {
  isStatusFilterOpen.value = !isStatusFilterOpen.value
  if (isStatusFilterOpen.value) isUrgencyFilterOpen.value = false
}

function resetFilters() {
  searchInput.value = ''
  selectedUrgencies.value = []
  selectedStatuses.value = []
  selectedDate.value = ''
}

function handleOutsideClick(event) {
  if (!event.target.closest('.relative')) {
    isUrgencyFilterOpen.value = false
    isStatusFilterOpen.value = false
  }
}

// Actions
function openDetail(code) {
  router.push(`/main/repair-detail/${code}`)
}

function openAssignModal(row) {
  assignRepairId.value = row[1]
  showAssignModal.value = true
}

// Lifecycle
onMounted(() => {
  loadAdminRepairs()
  document.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-black mb-6">รายการแจ้งซ่อมทั้งหมด (Admin)</h1>

    <!-- ---------------- Filters ---------------- -->
    <div class="mb-6">
      <div class="flex flex-wrap items-center gap-3">
        <!-- ค้นหา -->
        <input
          v-model="searchInput"
          type="text"
          placeholder="ค้นหา: หมายเลข / ผู้แจ้ง / หน่วยงาน / ประเภท"
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

        <!-- สถานะงาน -->
        <div class="relative">
          <button
            @click.stop="toggleStatusFilter"
            class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white"
          >
            สถานะงาน
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
          v-if="selectedUrgencies.length || selectedStatuses.length || searchInput || selectedDate"
          @click="resetFilters"
          class="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          ล้างตัวกรอง
        </button>
      </div>
    </div>

    <!-- ---------------- Table ---------------- -->
    <TableComponent
      :columns="tableColumns"
      :rows="filteredRows"
      :perPage="10"
      :urgencyColumn="5"
      :statusColumn="6"
    >
      <!-- คอลัมน์ Action (index 7) -->
      <template #cell-7="{ row }">
        <TableActions
          :row-id="row[1]"
          :open-menu-id="openMenuId"
          @toggle-menu="openMenuId = $event"
          role="assign"
          :row="row"
          :status="row[6]"
          @assign="openAssignModal(row)"
          @detail="openDetail(row[1])"
        />
      </template>
    </TableComponent>
  </div>
  <AssignJobModalComponent
    v-if="showAssignModal"
    :repair-id="assignRepairId"
    @close="showAssignModal = false"
    @completed="loadAdminRepairs"
  />
</template>
