<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import TableComponent from '@/components/table-component.vue'
import TableActionsComponent from '@/components/table-actions-component.vue'

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE

// Columns ของตาราง
const tableColumns = [
  'วันที่',
  'หมายเลขแจ้งซ่อม',
  'ผู้แจ้ง',
  'หน่วยงาน',
  'อาการเสีย',
  'สถานที่',
  'สถานะ',
  'การดำเนินการ'
]

const tableRows = ref([])
const openMenuId = ref(null)

const searchInput = ref('')

// โหลดข้อมูล
async function loadRepairHistory() {
  try {
    const token =
      localStorage.getItem('token') ||
      sessionStorage.getItem('token')

    const res = await fetch(`${API_BASE}/technician/history`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    tableRows.value = data.map((item) => {
      const fullName = `${item.us_first_name || ''} ${item.us_last_name || ''}`.trim()

      return [
        new Date(item.rf_create_at).toLocaleDateString('th-TH'), // 0 วันที่
        item.rf_code,                                            // 1 หมายเลขแจ้งซ่อม
        fullName,                                                // 2 ผู้แจ้ง
        item.department_name || '-',                             // 3 หน่วยงาน
        item.rf_problem || '-',                                  // 4 อาการเสีย
        `${item.building_name || ''} ${item.floor_name || ''} ${item.room_name || ''}`.trim(), // 5 สถานที่
        item.rf_user_status,                                     // 6 สถานะ key
        ''                                                       // 7 actions
      ]
    })
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
  }
}

// Filter เฉพาะ status = done + search
const filteredRows = computed(() => {
  const search = searchInput.value.toLowerCase()

  return tableRows.value
    .filter((row) => row[6] === 'done') // ✔ แสดงเฉพาะงานที่เสร็จสิ้น
    .filter((row) => {
      const code = String(row[1]).toLowerCase()
      const requester = String(row[2]).toLowerCase()
      const dept = String(row[3]).toLowerCase()
      const problem = String(row[4]).toLowerCase()

      return (
        code.includes(search) ||
        requester.includes(search) ||
        dept.includes(search) ||
        problem.includes(search)
      )
    })
})

// ไปหน้า detail
function goToDetail(code) {
  router.push(`/main/repair-detail/${code}`)
}

onMounted(() => {
  loadRepairHistory()
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">

    <h1 class="text-xl font-bold text-black mb-6">ประวัติการแจ้งซ่อมของช่าง</h1>

    <!-- Search -->
    <div class="flex flex-wrap gap-3 mb-6">
      <input
        v-model="searchInput"
        type="text"
        placeholder="ค้นหา: หมายเลข / ผู้แจ้ง / หน่วยงาน / อาการเสีย"
        class="w-[260px] h-10 px-4 rounded-lg border border-gray-300 focus:ring-blue-500"
      />
    </div>

    <!-- Table -->
    <TableComponent
      :columns="tableColumns"
      :rows="filteredRows"
      :perPage="10"
      :statusColumn="6"
    >
      <!-- Actions -->
      <template #cell-7="{ row }">
        <TableActionsComponent
          role="technician"
          :row-id="row[1]"
          :open-menu-id="openMenuId"
          @toggle-menu="openMenuId = $event"
          :row="row"
          :status="row[6]"
          @detail="goToDetail(row[1])"
        />
      </template>
    </TableComponent>
  </div>
</template>
