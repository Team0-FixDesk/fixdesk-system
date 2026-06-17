/**
 * =====================================================================
 * @file            technician-repair-list.view.vue
 * @module          มอดูลการจัดการงานของช่าง - การรับงาน และเปลี่ยนแปลงสถานะงานซ่อม
 * @layer           View (Presentation Layer)
 * @version         1.0.1
 * @since           2025-10-21
 * @author          เศรษฐพงศ์ หอมชื่น
 * @lastModified    2026-03-17
 * @lastModifiedBy  นราธิป แสนทวีสุข
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
 *   - เพิ่มระบบอัปโหลดรูปภาพหลังซ่อม (after-repair image upload)
 *     - เพิ่ม drag & drop upload area ใน modal ปิดงาน
 *     - สนับสนุน FormData submission พร้อมไฟล์และข้อมูลอื่น
 *     - แสดง preview รูปภาพพร้อมชื่อไฟล์และขนาดไฟล์
 *     - Validation: ตรวจสอบประเภทไฟล์ (image/* เท่านั้น)
 *     [2026-03-17, นราธิป แสนทวีสุข]
 *   - เพิ่มการแสดงผลแบบ Responsive: สลับจาก Table เป็น Card บนหน้าจอขนาดเล็ก
 *     [2026-06-17, บุณยกร จันประภาส]
 * =====================================================================
 */

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
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
const techImageAfterFiles = ref([])
const techImageAfterPreviews = ref([])
const isEditDragOverTech = ref(false) // สถานะ drag over สำหรับรูปหลังซ่อม
const techImageFileInput = ref(null) // Template ref สำหรับ input element

// ตัวแปรสำหรับฟิลด์ใหม่ในการปิดงาน (DB Schema v1.1.0)
const repairMethod = ref('in_house') // in_house, outsource, other
const repairMethodRemark = ref('')
const resultStatus = ref('completed') // completed, incomplete, other
const resultRemark = ref('')

// --- Responsive Table/Card Switching ---
const screenSize = ref('lg')

function handleResize() {
  if (window.innerWidth < 768) {
    screenSize.value = 'sm'
  } else {
    screenSize.value = 'lg'
  }
}

// แปลงรหัสสถานะ (เก็บไว้ใช้เฉพาะมุมมอง Card บนมือถือ)
function renderStatusLabel(status) {
  switch (status) {
    case 'pending':
      return 'รอดำเนินการ'
    case 'in_progress':
      return 'กำลังดำเนินการ'
    case 'outsource':
      return 'จ้างช่างภายนอก'
    case 'done':
      return 'เสร็จสิ้น'
    default:
      return status
  }
}

// "รายละเอียดโดยย่อ" เก็บมาเป็น string ต่อกันด้วย </br> เช่น
// "วันที่แจ้งซ่อม : ... </br> ชื่อผู้แจ้ง : ... </br> หน่วยงาน : ..."
// ฟังก์ชันนี้แยกออกเป็น label/value ทีละฟิลด์ เพื่อแสดงผลบน Card ให้อ่านง่าย
function parseRepairDetail(text) {
  if (!text) return []
  return text
    .split(/<\/br>/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf(':')
      if (idx === -1) return { label: '', value: part }
      return {
        label: part.slice(0, idx).trim(),
        value: part.slice(idx + 1).trim(),
      }
    })
}

// ดึงค่าของฟิลด์ที่ต้องการจาก "รายละเอียดโดยย่อ" มาแสดงเป็นหัวข้อย่อยบน Card
function getRepairField(text, label) {
  const found = parseRepairDetail(text).find((p) => p.label === label)
  return found ? found.value : ''
}

// แปลง "รายละเอียดโดยย่อ" ทั้งสตริง เป็น object ที่มีฟิลด์ชัดเจน สำหรับแสดงผลบน Card
function getRepairDetailObject(text) {
  return {
    date: getRepairField(text, 'วันที่แจ้งซ่อม') || '-',
    reporter: getRepairField(text, 'ชื่อผู้แจ้ง') || '-',
    department: getRepairField(text, 'หน่วยงาน') || '-',
    problem: getRepairField(text, 'เรื่องที่แจ้ง') || '-',
    location: getRepairField(text, 'สถานที่') || '-',
  }
}

// สีของ badge สถานะงาน (ใช้เฉพาะมุมมอง Card บนมือถือ)
function techStatusClass(status) {
  switch (status) {
    case 'done':
      return 'bg-green-100 text-green-700'
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-700'
    case 'outsource':
      return 'bg-purple-100 text-purple-700'
    case 'pending':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function processFiles(files) {
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']
  let addedCount = 0

  Array.from(files).forEach((file) => {
    if (techImageAfterFiles.value.length >= 5) return

    if (validTypes.includes(file.type)) {
      techImageAfterFiles.value.push(file)
      techImageAfterPreviews.value.push(URL.createObjectURL(file))
      addedCount++
    } else {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: `ไฟล์ ${file.name} ไม่รองรับ`,
        showConfirmButton: false,
        timer: 2500,
      })
    }
  })

  if (techImageFileInput.value) {
    techImageFileInput.value.value = ''
  }
}

function onTechImageAfterChange(event) {
  const files = event.target.files
  if (files && files.length > 0) {
    processFiles(files)
  }
}

function removeTechImageAfter(index) {
  if (techImageAfterPreviews.value[index]) {
    URL.revokeObjectURL(techImageAfterPreviews.value[index])
  }
  techImageAfterFiles.value.splice(index, 1)
  techImageAfterPreviews.value.splice(index, 1)
}

function clearTechImageAfter() {
  techImageAfterPreviews.value.forEach((preview) => {
    if (preview) URL.revokeObjectURL(preview)
  })
  techImageAfterFiles.value = []
  techImageAfterPreviews.value = []
  if (techImageFileInput.value) {
    techImageFileInput.value.value = ''
  }
}

function handleTechImageDragOver() {
  isEditDragOverTech.value = true
}

function handleTechImageDragLeave() {
  isEditDragOverTech.value = false
}

function handleTechImageDrop(e) {
  isEditDragOverTech.value = false
  const files = e.dataTransfer.files
  if (files && files.length > 0) {
    processFiles(files)
  }
}

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
 * ข้อมูลสำหรับมุมมอง Card บนมือถือ: row เดิม + detail ที่แยกฟิลด์ไว้ล่วงหน้า
 */
const cardItems = computed(() =>
  filteredRows.value.map((row) => ({
    row,
    detail: getRepairDetailObject(row[1]),
  }))
)

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
  clearTechImageAfter()
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
    const formData = new FormData()
    formData.append('status', 'done')
    formData.append('tech_summary', techSummary.value || 'ดำเนินการเสร็จสิ้น')
    formData.append('repair_method', repairMethod.value)
    formData.append('repair_method_remark', repairMethodRemark.value)
    formData.append('result_status', resultStatus.value)
    formData.append('result_remark', resultRemark.value)
    if (techImageAfterFiles.value.length > 0) {
      techImageAfterFiles.value.forEach(file => {
        formData.append('tech_image_after', file)
      })
    }

    const res = await fetch(`${API_BASE}/technician/close-job/${currentCloseJobCode.value}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
      body: formData,
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
    clearTechImageAfter()
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
  window.addEventListener('resize', handleResize)
  handleResize() // ตรวจสอบครั้งแรก
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
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

    <!-- Desktop Table View -->
    <div v-if="screenSize === 'lg'" class="-mx-2 overflow-x-auto sm:mx-0">
      <TableComponent :columns="['หมายเลขแจ้งซ่อม', 'รายละเอียดโดยย่อ', 'สถานะงาน', 'ตัวดำเนินการ']" :rows="filteredRows" :perPage="10" :statusColumn="2" :columnAlign="['left', 'left', 'center', 'center']" :id-column-index="0" :id-column-as-link="true" @detail="goToDetail">
        <template #cell-3="{ row }">
          <TableActionsComponent role="technician" :row-id="row[0]" :open-menu-id="openMenuId" :row="row" :status="row[2]" @toggle-menu="openMenuId = $event" @detail="goToDetail(row[0])" @accept="handleAccept(row[0])" @close-job="handleCloseJob(row[0])" @outsource="handleOutsource(row[0])" @open-stock="handleOpenStock(row[0])" />
        </template>
      </TableComponent>
    </div>

    <!-- Mobile Card View -->
    <div v-else class="space-y-3 px-2 sm:px-0">
      <div
        v-for="item in cardItems"
        :key="item.row[0]"
        class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden"
      >
        <!-- Card Header -->
        <div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-gray-900 text-base leading-tight">
              {{ item.row[0] }}
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">{{ item.detail.problem }}</p>
          </div>
          <div class="flex-shrink-0 ml-3">
            <TableActionsComponent
              role="technician"
              :row-id="item.row[0]"
              :open-menu-id="openMenuId"
              :row="item.row"
              :status="item.row[2]"
              @toggle-menu="openMenuId = $event"
              @detail="goToDetail(item.row[0])"
              @accept="handleAccept(item.row[0])"
              @close-job="handleCloseJob(item.row[0])"
              @outsource="handleOutsource(item.row[0])"
              @open-stock="handleOpenStock(item.row[0])"
            />
          </div>
        </div>

        <!-- Card Body -->
        <div class="px-4 py-3 space-y-1.5 text-sm">
          <div>
            <span class="text-gray-500 font-medium">วันที่แจ้งซ่อม :</span>
            <span class="text-gray-900 ml-1">{{ item.detail.date }}</span>
          </div>
          <div>
            <span class="text-gray-500 font-medium">ชื่อผู้แจ้ง :</span>
            <span class="text-gray-900 ml-1">{{ item.detail.reporter }}</span>
          </div>
          <div>
            <span class="text-gray-500 font-medium">หน่วยงาน :</span>
            <span class="text-gray-900 ml-1">{{ item.detail.department }}</span>
          </div>
          <div>
            <span class="text-gray-500 font-medium">เรื่องที่แจ้ง :</span>
            <span class="text-gray-900 ml-1">{{ item.detail.problem }}</span>
          </div>
          <div>
            <span class="text-gray-500 font-medium">สถานที่ :</span>
            <span class="text-gray-900 ml-1">{{ item.detail.location }}</span>
          </div>

          <!-- Badge -->
          <div class="flex flex-wrap gap-2 pt-2">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              :class="techStatusClass(item.row[2])"
            >
              {{ renderStatusLabel(item.row[2]) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="cardItems.length === 0" class="text-center py-12">
        <p class="text-gray-500 text-sm">ไม่พบรายการงานซ่อม</p>
      </div>
    </div>

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

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">{{ repairMethod === 'outsource' ? '3' : '4' }}. รูปภาพหลังซ่อม (ถ้ามี)</label>

            <div
              v-if="techImageAfterFiles.length < 5"
              class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
              :class="isEditDragOverTech ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'"
              @click="techImageFileInput?.click()"
              @dragover.prevent="handleTechImageDragOver"
              @dragleave.prevent="handleTechImageDragLeave"
              @drop.prevent="handleTechImageDrop"
            >
              <svg class="mx-auto mb-3 w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p class="text-base font-medium text-gray-800 mb-1">คลิกเพื่อเลือกรูปภาพ</p>
              <p class="text-xs text-gray-500 mb-3">รองรับรูปภาพเฉพาะ (สูงสุด 5 รูป) สามารถแนบรูปแบบประกอบได้</p>
              <div class="flex gap-2 justify-center">
                <span class="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">JPG</span>
                <span class="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">PNG</span>
                <span class="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">WEBP</span>
              </div>
              <input
                ref="techImageFileInput"
                  type="file"
                  accept="image/*"
                  multiple
                  class="hidden"
                @change="onTechImageAfterChange"
              />
            </div>

            <!-- Preview List -->
              <div v-if="techImageAfterFiles.length > 0" class="mt-4 space-y-3">
                <div v-for="(file, index) in techImageAfterFiles" :key="index" class="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-start justify-between">
                  <div class="flex items-start gap-4">
                    <div class="flex-shrink-0">
                      <img :src="techImageAfterPreviews[index]" alt="preview" class="w-20 h-20 object-cover rounded-lg">
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-800 truncate" :title="file.name">{{ file.name }}</p>
                      <p class="text-xs text-gray-500 mt-1">ขนาด: {{ (file.size / 1024 / 1024).toFixed(2) }} MB</p>
                      <p class="text-xs text-green-600 font-medium mt-2">✓ พร้อมอัปโหลด</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
                    @click="removeTechImageAfter(index)"
                    title="ลบรูป"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
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