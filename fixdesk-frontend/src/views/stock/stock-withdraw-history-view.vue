<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import TableComponent from '@/components/table-component.vue'
import Sweetalert from 'sweetalert2'

defineOptions({ name: 'StockWithdrawHistoryView' })

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE

// columns
const columns = ['รหัสใบเบิกของ', 'หน่วยงาน', 'รายละเอียด', 'สถานะการเบิก', 'ตัวดำเนินการ']

const tableRows = ref([])

const searchQuery = ref('')
const selectedStatuses = ref([])
const selectedDate = ref('')

const showUrgency = ref(false)
const showStatus = ref(false)

// ==================== ดึงทั้งหมด ====================
async function loadStockForms() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    if (!token) {
      console.error('No token found')
      return
    }

    const res = await fetch(`${API_BASE}/stock-forms`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.status === 401) {
      throw new Error('โทเคนหมดอายุหรือไม่ถูกต้อง')
    }

    const data = await res.json()

    if (!res.ok) throw new Error(data.message)

    tableRows.value = data
      .filter((item) => item.sf_status === 'approved' || item.sf_status === 'rejected')
      .map((item) => [
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
        '', // 4
      ])
  } catch (err) {
    console.error('Error:', err.message)

    if (err.message.includes('โทเคน')) {
      Sweetalert.fire({
        title: 'Session หมดอายุ',
        text: 'กรุณาเข้าสู่ระบบใหม่',
        icon: 'warning',
      })
      router.push('/login')
    }
  }
}

// ==================== Filters ====================
const filteredRows = computed(() => {
  const q = searchQuery.value.toLowerCase()

  return tableRows.value.filter((row) => {
    const code = row[0].toLowerCase()
    console.log('openDetail value:', row[0])

    const dept = row[1]?.toLowerCase() || ''
    const detail = row[2]?.toLowerCase() || ''
    const status = row[3]

    const matchSearch = code.includes(q) || dept.includes(q) || detail.includes(q)

    const matchStatus =
      selectedStatuses.value.length === 0 || selectedStatuses.value.includes(status)

    return matchSearch && matchStatus
  })
})

function closeDropdown(e) {
  if (!e.target.closest('.relative')) {
    showUrgency.value = false
    showStatus.value = false
  }
}

// ==================== ACTION ====================
const openDetail = (sfCode) => {
  router.push(`/main/stock-requisition/${sfCode}`)
}

onMounted(() => {
  loadStockForms()
  document.addEventListener('click', closeDropdown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold mb-6">ประวัติการเบิกของ</h1>

    <!-- FILTERS -->
    <div class="flex gap-3 mb-6 flex-wrap relative z-40">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="ค้นหา"
        class="w-[240px] h-10 px-4 rounded-lg border border-gray-300"
      />

      <input
        v-model="selectedDate"
        type="date"
        class="h-10 px-3 rounded-lg border border-gray-300"
      />

      <!-- status -->
      <div class="relative">
        <button
          @click.stop="showStatus = !showStatus"
          class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white"
        >
          สถานะ
        </button>

        <div
          v-if="showStatus"
          class="absolute mt-2 w-48 bg-white border rounded-md shadow-lg p-3 text-sm z-10"
        >
          <label
            ><input type="checkbox" value="waiting" v-model="selectedStatuses" /> รออนุมัติ</label
          >
          <label
            ><input type="checkbox" value="approved" v-model="selectedStatuses" />
            อนุมัติแล้ว</label
          >
          <label
            ><input type="checkbox" value="rejected" v-model="selectedStatuses" /> ไม่อนุมัติ</label
          >
          <label
            ><input type="checkbox" value="completed" v-model="selectedStatuses" /> เสร็จสิ้น</label
          >
        </div>
      </div>
    </div>

    <!-- TABLE -->
    <TableComponent
      :columns="columns"
      :rows="filteredRows"
      :perPage="10"
      :statusStockColumn="3"
      :columnAlign="['left', 'left', 'left', 'center', 'center']"
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
