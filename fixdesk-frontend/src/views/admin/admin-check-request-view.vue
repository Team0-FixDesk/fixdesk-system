<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import TableComponent from '@/components/table-component.vue'
import TableActions from '@/components/table-actions-component.vue'
import AssignJobModalComponent from '@/components/modal/assign-job-modal-component.vue'
import RepairFilterBar from '@/components/filters/repair-filter-bar-component.vue'

// Filters (ใช้กับ RepairFilterBar)
const searchInput = ref('')
const selectedUrgencies = ref([])
const selectedStatuses = ref([])
const selectedDate = ref('')

// Router
const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE

const showAssignModal = ref(false)
const assignRepairId = ref(null)

const tableColumns = ['หมายเลขแจ้งซ่อม', 'รายละเอียด', 'ความเร่งด่วน', 'สถานะงาน', 'การดำเนินการ']

const tableRows = ref([])
const openMenuId = ref(null)

function toLocalYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}


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
    tableRows.value = data.map((repair) => ({
      row: [
        repair.rf_code,
        'วันที่แจ้ง: ' +
          new Date(repair.rf_create_at).toLocaleDateString('th-TH') +
          '</br>' +
          'ชื่อผู้แจ้ง: ' +
          `${repair.us_first_name} ${repair.us_last_name}` +
          '</br>' +
          'หน่วยงาน: ' +
          repair.department_name +
          '</br>' +
          'ประเภทแจ้งซ่อม : ' +
          repair.tt_name,
        repair.rf_urgency,
        repair.rf_user_status,
        '',
      ],
      meta: {
        ...repair,
        createdDate: new Date(repair.rf_create_at),
      },
    }))
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
  }
}

// Computed: Filtered Rows
const filteredRows = computed(() => {
  const search = searchInput.value.toLowerCase()

  return tableRows.value.filter((item) => {
    const row = item.row
    const urgency = row[2]
    const status = row[3]

    const matchesSearch = row.join(' ').toLowerCase().includes(search)

    const matchesUrgency =
      selectedUrgencies.value.length === 0 ||
      selectedUrgencies.value.includes(urgency)

    const matchesStatus =
      selectedStatuses.value.length === 0 ||
      selectedStatuses.value.includes(status)

    const matchesDate =
      !selectedDate.value ||
      toLocalYMD(item.meta.createdDate) === selectedDate.value

    return matchesSearch && matchesUrgency && matchesStatus && matchesDate
  })
})



function resetFilters() {
  searchInput.value = ''
  selectedUrgencies.value = []
  selectedStatuses.value = []
  selectedDate.value = ''
}

// Actions
function openDetail(code) {
  router.push(`/main/repair-detail/${code}`)
}

function openAssignModal(row) {
  assignRepairId.value = row[0]
  showAssignModal.value = true
}

// Lifecycle
onMounted(() => {
  loadAdminRepairs()
})

onBeforeUnmount(() => {})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-black mb-6">รายการแจ้งซ่อมทั้งหมด</h1>

    <!-- ---------------- Filters ---------------- -->
    <RepairFilterBar
      v-model:search="searchInput"
      v-model:urgencies="selectedUrgencies"
      v-model:statuses="selectedStatuses"
      v-model:date="selectedDate"
      @reset="resetFilters"
    />

    <!-- ---------------- Table ---------------- -->
    <TableComponent
      :columns="tableColumns"
      :rows="filteredRows.map((item) => item.row)"
      :perPage="10"
      :urgencyColumn="2"
      :statusColumn="3"
      :columnAlign="['left', 'left', 'center', 'center', 'center']"
    >
      <!-- คอลัมน์ Action (index 7) -->
      <template #cell-4="{ row, rowIndex }">
        <TableActions
          :row-id="row[0]"
          :open-menu-id="openMenuId"
          @toggle-menu="openMenuId = $event"
          role="assign"
          :row="row"
          :status="row[3]"
          :assigned-tech="filteredRows[rowIndex].meta.rf_assigned_tech_id"
          @assign="openAssignModal(row)"
          @detail="openDetail(row[0])"
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
