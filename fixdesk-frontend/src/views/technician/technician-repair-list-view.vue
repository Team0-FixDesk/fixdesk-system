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
 * @param {string} code
 */
function handleCloseJob(code) {
  currentCloseJobCode.value = code
  techSummary.value = ''
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
  })

  if (!result.isConfirmed) return

  try {
    const res = await fetch(`${API_BASE}/technician/close-job/${code}`, {
      method: 'PUT',
      headers: {
        headers: {
          Authorization: `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
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
 */
async function confirmCloseJob() {
  try {
    const res = await fetch(`${API_BASE}/technician/close-job/${currentCloseJobCode.value}`, {
      method: 'PUT',
      headers: {
        headers: {
          Authorization: `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
      },
      body: JSON.stringify({
        status: 'done',
        tech_summary: techSummary.value || 'ดำเนินการเสร็จสิ้น',
        tech_remark: '',
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
    <h1 class="mb-6 text-xl font-bold">รายการแจ้งซ่อมสำหรับช่าง</h1>

    <!-- Search & Filter Controls -->
    <div class="flex flex-wrap gap-3 mb-6">
      <input v-model="searchQuery" placeholder="ค้นหา: หมายเลข / ผู้แจ้ง / อาการเสีย" class="w-[260px] h-10 px-4 border border-gray-300 rounded-lg" />

      <input v-model="selectedDate" type="date" class="h-10 px-3 border border-gray-300 rounded-lg" />

      <select v-model="selectedStatusFilter" class="h-10 px-3 text-sm text-gray-700 border border-gray-300 rounded-lg">
        <option value="all">ทุกสถานะ</option>
        <option value="pending">รอดำเนินการ</option>
        <option value="in_progress">กำลังดำเนินการ</option>
        <option value="outsource">จ้างช่างภายนอก</option>
      </select>
    </div>

    <!-- Table Component -->
    <TableComponent :columns="['รหัสใบแจ้ง', 'รายละเอียด', 'สถานะ', 'ดำเนินการ']" :rows="filteredRows" :perPage="10" :statusColumn="2" :columnAlign="['left', 'left', 'center', 'center']" :id-column-index="0" :id-column-as-link="true" @detail="goToDetail">
      <template #cell-3="{ row }">
        <TableActionsComponent role="technician" :row-id="row[0]" :open-menu-id="openMenuId" :row="row" :status="row[2]" @toggle-menu="openMenuId = $event" @detail="goToDetail(row[0])" @accept="handleAccept(row[0])" @close-job="handleCloseJob(row[0])" @outsource="handleOutsource(row[0])" @open-stock="handleOpenStock(row[0])" />
      </template>
    </TableComponent>

    <!-- Accept Job Modal -->
    <AcceptJobModal v-if="showAcceptPopup" :repairCode="currentAcceptCode" :currentUserId="userId" @close="showAcceptPopup = false" @success="fetchRepairList" />

    <!-- Modal สำหรับกรอกรายละเอียดการตรวจสอบ/ซ่อม -->
    <div v-if="showTechSummaryModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm" @click.self="showTechSummaryModal = false">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-6 text-center border-b border-gray-100">
          <h3 class="text-xl font-bold text-gray-800">รายละเอียดการดำเนินการ</h3>
          <p class="text-gray-500 text-sm mt-1">กรุณากรอกรายละเอียดการตรวจสอบ/ซ่อม</p>
        </div>
        <div class="p-6 space-y-4">
          <textarea v-model="techSummary" placeholder="กรอกรายละเอียดการตรวจสอบ/ซ่อม..." class="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxlength="500"></textarea>
          <div class="text-right text-xs text-gray-400">{{ techSummary.length }}/500</div>
        </div>
        <div class="p-6 pt-0 flex gap-3">
          <button @click="showTechSummaryModal = false" class="flex-1 py-3 px-6 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">ยกเลิก</button>
          <button @click="confirmCloseJob" :disabled="!techSummary.trim()" :class="['flex-1 py-3 px-6 rounded-xl font-medium transition-colors', techSummary.trim() ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed']">ยืนยันปิดงาน</button>
        </div>
      </div>
    </div>
  </div>
</template>
