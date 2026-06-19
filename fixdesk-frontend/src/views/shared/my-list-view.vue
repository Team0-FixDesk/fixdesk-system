/**
 * =====================================================================
 * @file              my-repair-list.view.vue
 * @module            มอดูลแจ้งซ่อม - การติดตามสถานะ และดูรายละเอียดคำร้องแจ้งซ่อม
 * @layer             View (Presentation Layer)
 * @version           1.0.1
 * @since             2026-02-04
 * @author            พชร ไพศรีสกุล
 * @lastModified      2026-03-03
 * @lastModifiedBy    พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 * หน้าจอสำหรับแสดงรายการแจ้งซ่อมของผู้ใช้งานปัจจุบัน
 * ผู้ใช้งานสามารถ:
 * - ดูรายการแจ้งซ่อมทั้งหมดของตนเอง
 * - ค้นหา และกรองข้อมูลตามสถานะ ความเร่งด่วน และวันที่
 * - ดูรายละเอียดงานซ่อม
 * - แก้ไขรายละเอียดงานซ่อม
 * - ลบรายการแจ้งซ่อม
 *
 * @requires
 * - vue
 * - vue-router
 * - sweetalert2
 * - @/composables/useMyRepairs
 * - @/components/table-component.vue
 * - @/components/table-actions-component.vue
 * - @/components/button/repair-button-component.vue
 * - @/components/filters/repair-filter-bar-component.vue
 *
 * ---------------------------------------------------------------------
 * @changelog
 * - แก้ไขข้อความหัวตาราง
 *   [2026-02-18, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * - แก้ไขข้อความแจ้งเตือน
 *   [2026-02-20, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * - ปรับปรุงข้อความ Confirm และ Toast ในการลบรายการ
 *   พร้อมกำหนดสีปุ่มยืนยัน/ยกเลิกให้ชัดเจนขึ้น
 *   [2026-02-21, ธนภัทร จันทร์งาม]
 *   แก้ไขการ filter Date
 *   [2026-03-03, พชร ไพศรีสกุล]
 * =====================================================================
 */
<script setup>

defineOptions({ name: 'MyListView' })
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Sweetalert from 'sweetalert2'
import { useMyRepairs } from '@/composables/useMyRepairs'

import TableComponent from '@/components/table-component.vue'
import TableActions from '@/components/table-actions-component.vue'
import RepairButton from '@/components/button/repair-button-component.vue'
import RepairFilterBar from '@/components/filters/repair-filter-bar-component.vue'

const router = useRouter()
const route = useRoute()

const tableColumnList = [
  'หมายเลขแจ้งซ่อม',
  'ประเภทงาน',
  'รายละเอียดโดยย่อ',
  'ความเร่งด่วน',
  'สถานะงาน',
  'ตัวดำเนินการ',
]

const openMenuId = ref(null)

const {
  search,
  selectedStatuses,
  selectedUrgencies,
  selectedDate,
  loadMyRepairs,
  deleteRepair,
  resetFilters,
  filteredRows,
} = useMyRepairs()

const searchInput = search
const selectedStatuseList = selectedStatuses
const selectedUrgencieLsit = selectedUrgencies

// --- Responsive ---
const screenSize = ref('lg')

function handleResize() {
  screenSize.value = window.innerWidth < 768 ? 'sm' : 'lg'
}

const openDetail = (code) => router.push(`/main/repair-detail/${code}`)
const openEdit = (code) => router.push(`/main/repair-edit/${code}`)

async function handleDeleteRepair(repairCode) {
  const confirm = await Sweetalert.fire({
    title: 'ยืนยันลบรายการนี้?',
    text: `คุณต้องการลบรายการแจ้งซ่อมหมายเลข ${repairCode} หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ยืนยันการลบ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#DC2626',
    cancelButtonColor: '#a3a3a3',
  })

  if (!confirm.isConfirmed) return

  const result = await deleteRepair(repairCode)

  if (result.ok) {
    Sweetalert.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `ลบรายการแจ้งซ่อม ${repairCode} เรียบร้อยแล้ว`,
      timer: 2500,
      showConfirmButton: false,
    })
  } else {
    Sweetalert.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: result.message || 'DELETE_FAILED',
      timer: 2500,
      showConfirmButton: false,
    })
  }
}

onMounted(() => {
  loadMyRepairs()
  if (route.query.status && ['pending', 'in_progress', 'done'].includes(route.query.status)) {
    selectedStatuseList.value = [route.query.status]
  }
  window.addEventListener('resize', handleResize)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-black mb-6">รายการแจ้งซ่อมของฉัน</h1>

    <!-- Filter Bar -->
    <RepairFilterBar
      mode="repair"
      v-model:search="searchInput"
      v-model:statuses="selectedStatuseList"
      v-model:urgencies="selectedUrgencieLsit"
      v-model:date="selectedDate"
      @reset="resetFilters"
    >
      <template #right>
        <RepairButton />
      </template>
    </RepairFilterBar>

    <div class="p-3 mx-auto max-w-8xl">
      <TableComponent
        :columns="tableColumnList"
        :rows="filteredRows"
        :perPage="10"
        :urgencyColumn="3"
        :statusColumn="4"
        :columnAlign="['left', 'left', 'left', 'center', 'center', 'center']"
        :id-column-index="0"
        :id-column-as-link="true"
        :action-column-index="5"
        @detail="openDetail"
      >
        <template #cell-5="{ row }">
          <TableActions
            :row-id="row[0]"
            :open-menu-id="openMenuId"
            @toggle-menu="openMenuId = $event"
            role="user"
            :row="row"
            :status="row[4]"
            @detail="openDetail(row[0])"
            @edit="openEdit(row[0])"
            @delete="handleDeleteRepair(row[0])"
          />
        </template>
      </TableComponent>
    </div>
  </div>
</template>
