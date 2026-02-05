<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import TableComponent from '@/components/table-component.vue'
import InfoButtonComponent from '@/components/button/info-button-component.vue'

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE

// Columns ของตาราง
const tableColumns = ['หมายเลขแจ้งซ่อม', 'รายละเอียด', 'สถานะ', 'การดำเนินการ']

const tableRows = ref([])
const searchInput = ref('')

// โหลดข้อมูล
async function loadRepairHistory() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    const res = await fetch(`${API_BASE}/technician/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    tableRows.value = data.map((item) => {
      const fullName = `${item.us_first_name || ''} ${item.us_last_name || ''}`.trim()

      return [
        item.rf_code, // 1 หมายเลขแจ้งซ่อม
        'วันที่แจ้ง: ' +
          new Date(item.rf_create_at).toLocaleDateString('th-TH') +
          '<br />' +
          'ชื่อผู้แจ้ง: ' +
          fullName +
          '<br />' +
          'หน่วยงาน: ' +
          item.department_name +
          '<br />' +
          'เรื่องที่แจ้ง: ' +
          item.rf_problem +
          '<br />' +
          'สถานที่: ' +
          `${item.building_name} ${item.floor_name} ${item.room_name}`.trim(),
        item.rf_user_status,
        '', // 7 actions
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
    .filter((row) => row[2] === 'done') // ✔ แสดงเฉพาะงานที่เสร็จสิ้น
    .filter((row) => {
      const code = String(row[0]).toLowerCase()
      const text = String(row[1]).toLowerCase()

      return code.includes(search) || text.includes(search)
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
  <div class="p-8 mx-auto bg-white shadow-md rounded-xl max-w-7xl">
    <h1 class="mb-6 text-xl font-bold text-black">ประวัติการแจ้งซ่อมของช่าง</h1>

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
      :statusColumn="2"
      :columnAlign="['left', 'left', 'center', 'center']"
      :id-column-index="0"
      :id-column-as-link="true"
      @detail="goToDetail"
    >
      <!-- Actions -->
      <template #cell-3="{ row }">
        <InfoButtonComponent @click="goToDetail(row[0])" />
      </template>
    </TableComponent>
  </div>
</template>
