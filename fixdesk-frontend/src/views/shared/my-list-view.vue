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

// --- Badge Helpers ---
function urgencyClass(urgency) {
  switch (urgency) {
    case 'urgent': return 'bg-red-100 text-red-700'
    case 'normal': return 'bg-blue-100 text-blue-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function urgencyLabel(urgency) {
  switch (urgency) {
    case 'urgent': return 'ด่วน'
    case 'normal': return 'ปกติ'
    default: return urgency || '-'
  }
}

function statusClass(status) {
  switch (status) {
    case 'done':
    case 'completed': return 'bg-green-100 text-green-700'
    case 'in_progress': return 'bg-yellow-100 text-yellow-700'
    case 'cancel':
    case 'cancelled': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function statusLabel(status) {
  switch (status) {
    case 'done':
    case 'completed': return 'เสร็จสิ้น'
    case 'in_progress': return 'กำลังดำเนินการ'
    case 'cancel':
    case 'cancelled': return 'ยกเลิก'
    default: return status || '-'
  }
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

    <!-- Desktop Table View -->
    <div v-if="screenSize === 'lg'" class="p-3 mx-auto max-w-8xl">
      <TableComponent
        :columns="tableColumnList"
        :rows="filteredRows"
        :perPage="10"
        :urgencyColumn="3"
        :statusColumn="4"
        :columnAlign="['left', 'left', 'left', 'center', 'center', 'center']"
        :id-column-index="0"
        :id-column-as-link="true"
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

    <!-- Mobile Card View -->
    <div v-else class="space-y-3 px-2 mt-3">
      <div
        v-for="row in filteredRows"
        :key="row[0]"
        class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden"
      >
        <!-- Card Header -->
        <div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-gray-900 text-base leading-tight">
              {{ row[0] }}
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">{{ row[1] }}</p>
          </div>
          <div class="flex-shrink-0 ml-3">
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
          </div>
        </div>

        <!-- Card Body -->
        <div class="px-4 py-3 space-y-1.5 text-sm">
          <!-- Detail HTML จาก composable -->
          <div class="text-gray-700 leading-relaxed" v-html="row[2]" />

          <!-- Badges -->
          <div class="flex flex-wrap gap-2 pt-2">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              :class="urgencyClass(row[3])"
            >
              ความเร่งด่วน: {{ urgencyLabel(row[3]) }}
            </span>
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              :class="statusClass(row[4])"
            >
              {{ statusLabel(row[4]) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredRows.length === 0" class="text-center py-12">
        <p class="text-gray-500 text-sm">ไม่พบข้อมูลรายการแจ้งซ่อม</p>
      </div>
    </div>
  </div>
</template>