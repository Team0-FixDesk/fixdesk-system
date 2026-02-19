/**
 * =====================================================================
 * @file            my-repair-list.view.vue
 * @module          มอดูลแจ้งซ่อม - การติดตามสถานะ และดูรายละเอียดคำร้องแจ้งซ่อม
 * @layer           View (Presentation Layer)
 * @version         1.0.0
 * @since           2026-02-04
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-02-18
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอสำหรับแสดงรายการแจ้งซ่อมของผู้ใช้งานปัจจุบัน
 *  ผู้ใช้งานสามารถ:
 *   - ดูรายการแจ้งซ่อมทั้งหมดของตนเอง
 *   - ค้นหา และกรองข้อมูลตามสถานะ ความเร่งด่วน และวันที่
 *   - ดูรายละเอียดงานซ่อม
 *   - แก้ไขรายละเอียดงานซ่อม
 *   - ลบรายการแจ้งซ่อม
 *
 * @requires
 *   - vue
 *   - vue-router
 *   - sweetalert2
 *   - @/composables/useMyRepairs
 *   - @/components/table-component.vue
 *   - @/components/table-actions-component.vue
 *   - @/components/button/repair-button-component.vue
 *   - @/components/filters/repair-filter-bar-component.vue
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - ปรับปรุงข้อความที่ใช้ให้เหมาะสม   [2026-02-18, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * =====================================================================
 */

<script setup>
defineOptions({ name: 'MyListView' })  // กำหนดชื่อของ component สำหรับการ debug
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Sweetalert from 'sweetalert2'
import { useMyRepairs } from '@/composables/useMyRepairs'

// utils and HTML generation moved into composable; no local import needed

import TableComponent from '@/components/table-component.vue'  // คอมโพเนนต์ตาราง
import TableActions from '@/components/table-actions-component.vue'  // คอมโพเนนต์ปุ่มการกระทำของแถว
import RepairButton from '@/components/button/repair-button-component.vue'  // ปุ่มสำหรับเพิ่มการซ่อมใหม่
import RepairFilterBar from '@/components/filters/repair-filter-bar-component.vue'  // แถบกรองสำหรับการซ่อม

// auth handled inside composable

const router = useRouter()
const route = useRoute()

// โครงสร้างตาราง - ชื่อแต่ละคอลัมน์
const tableColumnList = [
  'หมายเลขแจ้งซ่อม',
  'ประเภทงาน',
  'รายละเอียดโดยย่อ',
  'ความเร่งด่วน',
  'สถานะงาน',
  'ตัวดำเนินการ',
]

// ข้อมูลตาราง และสถานะ UI
const openMenuId = ref(null)

// use composable to centralize data and actions
const {
  tableRows,
  isLoading,
  errorMessage,
  search,
  selectedStatuses,
  selectedUrgencies,
  selectedDate,
  loadMyRepairs,
  deleteRepair,
  resetFilters,
  filteredRows,
} = useMyRepairs()

// สถานะตัวกรอง (Filter)
// local refs that bind to composable
const searchInput = search
const selectedStatuseList = selectedStatuses
const selectedUrgencieLsit = selectedUrgencies
const selectedDateLocal = selectedDate

// ฟังก์ชันโหลดข้อมูล
/**
 * โหลดรายการการซ่อมของผู้ใช้ปัจจุบัน
 * ตรวจสอบการยืนยันตัวตน จากนั้นดึงข้อมูลจาก API
 * แปลงข้อมูลให้เป็นรูปแบบตาราง
 */
// load data via composable
// loadMyRepairs is provided by useMyRepairs

/**
 * กรองแถวตาราง ตามเงื่อนไข:
 * 1. ค้นหาตามชื่อ ประเภท หรือสถานที่
 * 2. กรองตามความเร่งด่วน
 * 3. กรองตามสถานะ
 * 4. กรองตามวันที่
 */
// filteredRows provided by composable

// รีเซ็ตตัวกรองทั้งหมด
// reset is provided by composable resetFilters

// นำทางไปยังหน้ารายละเอียดการซ่อม
const openDetail = (code) => router.push(`/main/repair-detail/${code}`)
// นำทางไปยังหน้าแก้ไขการซ่อม
const openEdit = (code) => router.push(`/main/repair-edit/${code}`)

// show confirm dialog and call composable delete
async function handleDeleteRepair(repairCode) {
  const confirm = await Sweetalert.fire({
    title: 'ลบรายการนี้?',
    text: `คุณต้องการลบรายการแจ้งซ่อมหมายเลข ${repairCode} หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    reverseButtons: true,
    cancelButtonText: 'ยกเลิก',
    confirmButtonText: 'ยืนยัน',
    confirmButtonColor: '#e53e3e',
  })
  if (!confirm.isConfirmed) return

  const result = await deleteRepair(repairCode)
  if (result.ok) {
    Sweetalert.fire({ toast: true, position: 'top-end', title: 'ลบรายการแจ้งซ่อมสำเร็จ', text: `ลบ ${repairCode}`, icon: 'success', timer: 2000, showConfirmButton: false })
  } else {
    Sweetalert.fire({ toast: true, position: 'top-end', title: 'เกิดข้อผิดพลาด', text: result.message || 'DELETE_FAILED', icon: 'error', timer: 2500, showConfirmButton: false })
  }
}

// ลักษณะ Lifecycle
onMounted(() => {
  loadMyRepairs()
  if (route.query.status && ['pending', 'in_progress', 'done'].includes(route.query.status)) {
    selectedStatuseList.value = [route.query.status]
  }
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-black mb-6">รายการแจ้งซ่อมของฉัน</h1>

    <!-- แถบตัวกรอง - ค้นหา, กรองสถานะ, ความเร่งด่วน, วันที่ -->
    <RepairFilterBar
      mode="repair"
      v-model:search="searchInput"
      v-model:statuses="selectedStatuseList"
      v-model:urgencies="selectedUrgencieLsit"
      v-model:date="selectedDate"
      @reset="resetFilters"
    >
      <!-- ส่วนขวา: ปุ่มเพิ่มการซ่อมใหม่ -->
      <template #right>
        <RepairButton />
      </template>
    </RepairFilterBar>

    <!-- ตาราง - แสดงรายการการซ่อมของผู้ใช้ -->
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
        @detail="openDetail"
      >
        <!-- เทมเพลต: คอลัมน์การกระทำ (ปุ่มแก้ไข/ลบ) -->
        <!-- คอลัมน์ Action (ดัชนี 5) -->
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
