<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TableComponent from '@/components/table-component.vue'
import RepairFilterBar from '@/components/filters/repair-filter-bar-component.vue'
import Sweetalert from 'sweetalert2'

defineOptions({ name: 'StockWithdrawHistoryView' })

// ==================== Router / API ====================
const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE

// ==================== Table ====================
const columns = ['รหัสใบเบิกของ', 'หน่วยงาน', 'รายละเอียด', 'สถานะการเบิก', 'ตัวดำเนินการ']
const tableRows = ref([])

// ==================== Filters (ใช้กับ RepairFilterBar) ====================
const searchInput = ref('')
const selectedStatuses = ref([])
const selectedDate = ref('')

// ==================== Helpers ====================
function toLocalYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function resetFilters() {
  searchInput.value = ''
  selectedStatuses.value = []
  selectedDate.value = ''
}

// ==================== Load Data ====================
async function loadStockForms() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) return

    const res = await fetch(`${API_BASE}/stock-forms`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.status === 401) {
      throw new Error('TOKEN_EXPIRED')
    }

    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    tableRows.value = data
      .filter(item =>
        ['approved', 'rejected', 'completed'].includes(item.sf_status),
      )
      .map(item => ({
        row: [
          item.sf_code, // 0
          item.us_department || '-', // 1
          'วันที่: ' +
            new Date(item.sf_create_at).toLocaleDateString('th-TH') +
            '<br>' +
            'ผู้ขอเบิก: ' +
            item.requester +
            '<br>' +
            'สถานที่: ' +
            item.bd_name +
            ' ' +
            item.fl_name +
            ' ' +
            item.room_name, // 2
          item.sf_status, // 3
          '', // 4 action
        ],
        meta: {
          createdDate: new Date(item.sf_create_at),
        },
      }))
  } catch (err) {
    if (err.message === 'TOKEN_EXPIRED') {
      Sweetalert.fire({
        title: 'Session หมดอายุ',
        text: 'กรุณาเข้าสู่ระบบใหม่',
        icon: 'warning',
      })
      router.push('/login')
    } else {
      console.error(err)
    }
  }
}

// ==================== Filtered Rows ====================
const filteredRows = computed(() => {
  const q = searchInput.value.toLowerCase()

  return tableRows.value.filter(item => {
    const row = item.row
    const status = row[3]

    const matchesSearch =
      row[0].toLowerCase().includes(q) ||
      row[1].toLowerCase().includes(q) ||
      row[2].toLowerCase().includes(q)

    const matchesStatus =
      selectedStatuses.value.length === 0 ||
      selectedStatuses.value.includes(status)

    const matchesDate =
      !selectedDate.value ||
      toLocalYMD(item.meta.createdDate) === selectedDate.value

    return matchesSearch && matchesStatus && matchesDate
  })
})

// ==================== Actions ====================
function openDetail(code) {
  router.push(`/main/stock-requisition/${code}`)
}

// ==================== Lifecycle ====================
onMounted(() => {
  loadStockForms()
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold mb-6">ประวัติการเบิกของ</h1>

    <!-- Filters -->
    <RepairFilterBar
      mode="stock"
      v-model:search="searchInput"
      v-model:statuses="selectedStatuses"
      v-model:date="selectedDate"
      @reset="resetFilters"
    />

    <!-- Table -->
    <TableComponent
      :columns="columns"
      :rows="filteredRows.map(i => i.row)"
      :perPage="10"
      :statusStockColumn="3"
      :columnAlign="['left', 'left', 'left', 'center', 'center']"
      :id-column-index="0"
      :id-column-as-link="true"
      @detail="openDetail"
    >
      <template #cell-4="{ row }">
        <div class="flex justify-center">
          <button
            @click="openDetail(row[0])"
            class="flex items-center gap-2 px-2 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600"
          >
            <img src="/icon/info-icon.svg" class="h-4 w-4" />
          </button>
        </div>
      </template>
    </TableComponent>
  </div>
</template>
