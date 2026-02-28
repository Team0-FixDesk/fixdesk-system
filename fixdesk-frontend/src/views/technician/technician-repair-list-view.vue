/**
 * =====================================================================
 * @file            technician-repair-list.view.vue
 * @module          มอดูลการจัดการงานของช่าง - การรับงาน และเปลี่ยนแปลงสถานะงานซ่อม
 * @layer           View (Presentation Layer)
 * @version         1.0.1
 * @since           2025-10-21
 * @author          เศรษฐพงศ์ หอมชื่น
 * @lastModified    2026-02-27
 * @lastModifiedBy  เศรษฐพงศ์ หอมชื่น
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอรายการงานซ่อมของช่างซ่อม
 *   - แสดงรายการงานซ่อมที่ได้รับมอบหมาย
 *   - ค้นหางานซ่อมตามหมายเลขแจ้งซ่อม หรือรายละเอียดโดยย่อ
 *   - กรองงานตามสถานะ (ทุกสถานะ / รอดำเนินการ / กำลังดำเนินการ / จ้างช่างภายนอก)
 *   - เปิดดูรายละเอียดใบแจ้งซ่อม
 *   - รับงานซ่อม (Accept Job)
 *   - ปิดงานซ่อม พร้อมบันทึกรายละเอียดการดำเนินการ
 *   - ส่งงานให้ช่างภายนอก
 *   - เปิดดูรายการเบิกของที่เกี่ยวข้องกับใบแจ้งซ่อม
 *
 * @requires
 *  - vue
 *  - vue-router
 *  - sweetalert2
 *  - @/composables/useAuthToken
 *  - @/composables/repair/useTechnicianRepairList
 *  - @/components/table-component.vue
 *  - @/components/table-actions-component.vue
 *  - @/components/modal/accept-job-modal-component.vue
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - แก้ไขชื่อหน้าจอ                                    [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - แก้ไขข้อความหัวตาราง                              [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - เพิ่มฟิลด์รองรับ repair_method และ result_status  [2026-02-22, นราธิป แสนทวีสุข]
 *   - ปรับ Modal ปิดงานให้มีตัวเลือกครบถ้วน             [2026-02-22, นราธิป แสนทวีสุข]
 *   - แก้ไขสีปุ่ม                                    [2026-02-27, เศรษฐพงศ์ หอมชื่น]
 * =====================================================================
 */

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'

import { useTechnicianRepairList } from '@/composables/repair/useTechnicianRepairList'

import { useAuthToken } from '@/composables/useAuthToken'
const { token, userId, isAuthenticated, logout } = useAuthToken()

import TableComponent from '@/components/table-component.vue'
import TableActionsComponent from '@/components/table-actions-component.vue'
import AcceptJobModal from '@/components/modal/accept-job-modal-component.vue'

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE

const { repairList, fetchRepairList } = useTechnicianRepairList(API_BASE, token, isAuthenticated, logout)

const openMenuId = ref(null)

const searchQuery = ref('')
const selectedDate = ref('')
const selectedStatusFilter = ref('all')

const showAcceptPopup = ref(false)
const currentAcceptCode = ref(null)
const showTechSummaryModal = ref(false)
const currentCloseJobCode = ref(null)
const techSummary = ref('')

// ตัวแปรสำหรับฟิลด์ใหม่ในการปิดงาน (DB Schema v1.1.0)
const repairMethod = ref('in_house') // in_house, outsource, other
const repairMethodRemark = ref('')
const resultStatus = ref('completed') // completed, incomplete, other
const resultRemark = ref('')

/**
 * จัดรูปแบบข้อมูลแถวให้สอดคล้องกับ TableComponent
 * @param {Object} r - ข้อมูลการแจ้งซ่อม
 * @returns {Array} formattedRow
 */

/**
 * คำนวณรายการที่ผ่านการค้นหาและกรองตามสถานะ
 */
const filteredRows = computed(() => {
  const query = searchQuery.value.toLowerCase()

  return repairList.value.filter((row) => {
    const matchSearch = row[0].toLowerCase().includes(query) || row[1].toLowerCase().includes(query)
    const matchStatus = selectedStatusFilter.value === 'all' || row[2] === selectedStatusFilter.value
    return matchSearch && matchStatus
  })
})

/**
 * เปิดหน้ารายละเอียดใบแจ้งซ่อม
 * @param {string} code - รหัสใบแจ้งซ่อม
 */
function goToDetail(code) {
  router.push({
    path: `/main/repair-detail/${code}`,
    state: { fromTechnician: true },
  })
}

/**
 * เปิด Modal เพื่อยืนยันการรับงาน
 * @param {string} code
 */
function handleAccept(code) {
  currentAcceptCode.value = code
  showAcceptPopup.value = true
}

/**
 * เปิดหน้า Stock List โดยบันทึก code ใน session
 * @param {string} code
 */
function handleOpenStock(code) {
  sessionStorage.setItem('selected_rf_code', code)
  router.push('/main/technician-stock-list')
}

/**
 * เปิด modal สำหรับปิดงานซ่อม
 *
 * @author เศรษฐพงศ์ หอมชื่น
 * @since 2025-10-21
 * @lastModified 2026-02-22
 * @lastModifiedBy นราธิป แสนทวีสุข
 * @contributors
 *  - เศรษฐพงศ์ หอมชื่น
 *  - นราธิป แสนทวีสุข
 *
 * @param {string} code - รหัสใบแจ้งซ่อม
 */
function handleCloseJob(code) {
  currentCloseJobCode.value = code

  // ตรวจสอบว่างานนี้เคยจ้างช่างภายนอกหรือไม่
  const repairItem = repairList.value.find(r => r[0] === code)
  const isOutsourced = repairItem && repairItem[2] === 'outsource'

  // Reset ค่าทั้งหมดเป็น default
  techSummary.value = ''
  repairMethod.value = isOutsourced ? 'outsource' : 'in_house'
  repairMethodRemark.value = ''
  resultStatus.value = 'completed'
  resultRemark.value = ''
  showTechSummaryModal.value = true
}

/**
 * เปิด modal สำหรับจ้างช่างภายนอก
 * @param {string} code
 */
async function handleOutsource(code) {
  const result = await Swal.fire({
    title: 'จ้างช่างภายนอก',
    text: 'คุณต้องการส่งงานให้ช่างภายนอกหรือไม่?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ใช่, ส่งงาน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: '#d4d4d4',
  })

  if (!result.isConfirmed) return

  try {
    const res = await fetch(`${API_BASE}/technician/close-job/${code}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'outsource' }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'ส่งงานให้ช่างภายนอกเรียบร้อย',
      showConfirmButton: false,
      timer: 2000,
    })
    fetchRepairList()
  } catch (err) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: 'ไม่สามารถส่งงานได้',
      showConfirmButton: false,
      timer: 3000,
    })
  }
}

/**
 * ปิดงานซ่อม (Close Job) หลังจากกรอก summary
 *
 * @author เศรษฐพงศ์ หอมชื่น
 * @since 2025-10-21
 * @lastModified 2026-02-22
 * @lastModifiedBy นราธิป แสนทวีสุข
 * @contributors
 *  - เศรษฐพงศ์ หอมชื่น
 *  - นราธิป แสนทวีสุข
 *
 * @description ปิดงานพร้อมส่งข้อมูล repair_method, result_status และหมายเหตุต่างๆ
 */
async function confirmCloseJob() {

  try {
    const res = await fetch(`${API_BASE}/technician/close-job/${currentCloseJobCode.value}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'done',
        tech_summary: techSummary.value || 'ดำเนินการเสร็จสิ้น',
        rf_tech_image_after: null,
        repair_method: repairMethod.value,
        repair_method_remark: repairMethodRemark.value,
        result_status: resultStatus.value,
        result_remark: resultRemark.value
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'ปิดงานเรียบร้อยแล้ว',
      showConfirmButton: false,
      timer: 2000,
    })
    showTechSummaryModal.value = false
    fetchRepairList()
  } catch (err) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: err.message,
      showConfirmButton: false,
      timer: 3000,
    })
  }
}

/* =========================
   Lifecycle Hooks
======================== */
onMounted(() => {
  fetchRepairList()
})
</script>

<template>
  <div class="max-w-7xl mx-auto p-8 bg-white rounded-xl shadow-md">
    <h1 class="mb-6 text-xl font-bold">รายการงานซ่อมของฉัน</h1>

    <!-- Search & Filter Controls -->
    <div class="flex flex-wrap gap-3 mb-6">
      <input v-model="searchQuery" placeholder="ค้นหารายการงานซ่อม" class="w-[260px] h-10 px-4 border border-gray-300 rounded-lg" />

      <input v-model="selectedDate" type="date" class="h-10 px-3 border border-gray-300 rounded-lg" />

      <select v-model="selectedStatusFilter" class="h-10 px-3 text-sm text-gray-700 border border-gray-300 rounded-lg">
        <option value="all">ทุกสถานะ</option>
        <option value="pending">รอดำเนินการ</option>
        <option value="in_progress">กำลังดำเนินการ</option>
        <option value="outsource">จ้างช่างภายนอก</option>
      </select>
    </div>

    <!-- Table Component -->
    <TableComponent :columns="['หมายเลขแจ้งซ่อม', 'รายละเอียดโดยย่อ', 'สถานะงาน', 'ตัวดำเนินการ']" :rows="filteredRows" :perPage="10" :statusColumn="2" :columnAlign="['left', 'left', 'center', 'center']" :id-column-index="0" :id-column-as-link="true" @detail="goToDetail">
      <template #cell-3="{ row }">
        <TableActionsComponent role="technician" :row-id="row[0]" :open-menu-id="openMenuId" :row="row" :status="row[2]" @toggle-menu="openMenuId = $event" @detail="goToDetail(row[0])" @accept="handleAccept(row[0])" @close-job="handleCloseJob(row[0])" @outsource="handleOutsource(row[0])" @open-stock="handleOpenStock(row[0])" />
      </template>
    </TableComponent>

    <!-- Accept Job Modal -->
    <AcceptJobModal v-if="showAcceptPopup" :repairCode="currentAcceptCode" :currentUserId="userId" @close="showAcceptPopup = false" @success="fetchRepairList" />

    <!-- Modal สำหรับกรอกรายละเอียดการตรวจสอบ/ซ่อม -->
    <div v-if="showTechSummaryModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm" @click.self="showTechSummaryModal = false">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-5 text-center border-b border-gray-100">
          <h3 class="text-xl font-bold text-gray-800">รายละเอียดการดำเนินการ</h3>
        </div>

        <div class="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <!-- 1. วิธีการซ่อม (ซ่อนถ้าเป็น outsource อยู่แล้ว) -->
          <div v-if="repairMethod !== 'outsource'">
            <label class="block text-sm font-semibold text-gray-700 mb-2">1. สำหรับเจ้าหน้าที่ ตรวจสอบ/ซ่อม</label>
            <div class="space-y-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" v-model="repairMethod" value="in_house" class="text-blue-600 focus:ring-blue-500"> สามารถแก้ไข/ซ่อมบำรุงได้
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" v-model="repairMethod" value="other" class="text-blue-600 focus:ring-blue-500"> อื่นๆ
              </label>
              <input v-if="repairMethod === 'other'" v-model="repairMethodRemark" type="text" placeholder="ระบุเหตุผลอื่นๆ..." class="mt-2 w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            </div>
          </div>

          <!-- 2. รายละเอียดการทำงาน -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">{{ repairMethod === 'outsource' ? '1' : '2' }}. รายละเอียดการตรวจสอบ/ซ่อม</label>
            <textarea v-model="techSummary" placeholder="กรอกรายละเอียด..." class="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500" maxlength="500"></textarea>
            <div class="text-right text-xs text-gray-400 mt-1">{{ techSummary.length }}/500</div>
          </div>

          <!-- 3. สรุปผล -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">{{ repairMethod === 'outsource' ? '2' : '3' }}. สรุปผล</label>
            <div class="flex gap-4 mb-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" v-model="resultStatus" value="completed" class="text-green-600 focus:ring-green-500"> เรียบร้อย
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" v-model="resultStatus" value="incomplete" class="text-red-600 focus:ring-red-500"> ไม่เรียบร้อย
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" v-model="resultStatus" value="other" class="text-amber-600 focus:ring-amber-500"> อื่นๆ
              </label>
            </div>
            <input v-if="resultStatus === 'incomplete' || resultStatus === 'other'" v-model="resultRemark" type="text" :placeholder="resultStatus === 'incomplete' ? 'ระบุสาเหตุที่ไม่เรียบร้อย...' : 'ระบุอื่นๆ...'" class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          </div>
        </div>

        <div class="p-5 border-t border-gray-100 flex gap-3">
          <button @click="showTechSummaryModal = false" class="flex-1 py-3 px-6 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">ยกเลิก</button>
          <button @click="confirmCloseJob" :disabled="!techSummary.trim()" :class="['flex-1 py-3 px-6 rounded-xl font-medium transition-colors text-white', techSummary.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed']">ยืนยันปิดงาน</button>
        </div>
      </div>
    </div>
  </div>
</template>
