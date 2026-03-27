/**
* =====================================================================
* @file : repair-detail-view.vue
* @module : แสดงรายละเอียดใบแจ้งซ่อม
* @layer : View (Presentation Layer)
* @version : 1.3.2
* @since : 2026-02-17
* @lastModified : 2026-03-21
* @lastModifiedBy : นราธิป แสนทวีสุข
* ---------------------------------------------------------------------
* @description
* View สำหรับแสดงรายละเอียดใบแจ้งซ่อม (Repair Detail)
* โดยแสดงข้อมูลที่เกี่ยวข้องกับงานซ่อม สถานที่ ผู้แจ้ง ช่างผู้รับผิดชอบ
* สถานะการดำเนินงาน และรายการวัสดุ/อุปกรณ์ที่เบิกจากระบบ stock
*
* รองรับการทำงาน:
* - โหลดและแสดงรายละเอียดใบแจ้งซ่อมจาก rf_code
* - แสดง timeline ของสถานะงานซ่อม
* - แสดงรายการวัสดุ/อุปกรณ์ที่เบิก (stock_items)
* - คืนวัสดุ/อุปกรณ์ที่มีสถานะ approved
* - คืนวัสดุแบบเลือกหลายรายการ (batch return)
* - รับงานซ่อม (accept job)
* - เปลี่ยนสถานะงาน (done, outsource)
* - มอบหมายงานให้ช่าง (assign technician)
* - แสดงรูปภาพและวิดีโอที่แนบมากับใบแจ้งซ่อม
* - แสดง modal สำหรับ assign, accept และ summary
*
* เชื่อมต่อกับ API:
* - GET /repair-requests/:code
* - PUT /technician/close-job/:code
* - PUT /stock-forms/return-item
* - GET /technician-types
*
* @requires
* - vue
* - vue-router
* - sweetalert2
* - jwt-decode
* - @iconify/vue
*
* - @/composables/useAuthToken
* - @/composables/usePhoneFormat
*
* - @/utils/date.util
* - @/utils/repairTimeline.util
* - @/utils/badge.util
*
* - @/components/status-timeline-component.vue
* - @/components/modal/assign-job-modal-component.vue
* - @/components/modal/accept-job-modal-component.vue
* - @/components/button/back-button-component.vue
* - @/components/button/base/base-button-component.vue
*
* @dataFlow
* Route Params → View → API → Backend Controller → Service → Database
*
* @stateManagement
* - repair
* - returnableItems
* - selectedReturnItems
* - showReturnModal
* - showAssignPopup
* - showAcceptPopup
* - showStatusPopup
* - showTechSummaryModal
*
* @responsibility
* - แสดงข้อมูล repair detail
* - จัดการ UI interactions
* - เรียก API ที่เกี่ยวข้องกับ repair และ stock
* - ควบคุม modal states
* - จัดการ media display
*
* @author
* - นายพชร ไพศรีสกุล
*
* ---------------------------------------------------------------------
* @changelog
* - เพิ่มระบบคืนอุปกรณ์แบบรายชิ้น และหลายรายการ (Return Item)
* - เพิ่ม Return Modal และ logic สำหรับเลือกหลายรายการ
* - เพิ่มการ refresh repair detail หลังคืนอุปกรณ์
* [2026-02-17, นายพชร ไพศรีสกุล]
* - เพิ่มฟิลด์รองรับ repair_method และ result_status
* - ปรับ Modal ปิดงานให้มีตัวเลือกครบถ้วน
* [2026-02-22, นราธิป แสนทวีสุข]
* - รองรับการคืนอุปกรณ์แบบบางส่วน (Partial Return)ปรับปรุง UX/UI หน้า Return Modal และเพิ่มตัวเลือกจำนวนที่ต้องการคืน
* [2026-02-23, พชร ไพศรีสกุล] V1.3.0
* - แก้ไขสีปุ่ม
[2026-02-27, เศรษฐพงศ์ หอมชื่น]
* - แก้ไขรายการคืนอุปกรณ์ (ไม่แสดงถ้าจำนวนอุปกรณ์ = 0)
[2026-03-05], ณัฐภัทร จันทร์อิ่ม]
* - เพิ่มระบบอัปโหลดรูปภาพหลังซ่อม (after-repair image upload)
* - เพิ่ม drag & drop upload area ใน modal ปิดงาน
* - สนับสนุน FormData submission พร้อมไฟล์และข้อมูลอื่น
* - แสดง preview รูปภาพพร้อมชื่อไฟล์และขนาดไฟล์
* - Validation: ตรวจสอบประเภทไฟล์ (image/* เท่านั้น)
* - เพิ่มกำหนดการแสดงรูปภาพแบบมีเงื่อนไข (shown only when status='done')
* [2026-03-17, นราธิป แสนทวีสุข]
* - ปรับปรุง UI การจัดการแสดงข้อความ Error Alert ให้ดึงข้อมูลมาแสดงถูกต้องชัดเจนยิ่งขึ้น
* [2026-03-21, นราธิป แสนทวีสุข]
* =====================================================================
*/

<script setup>
defineOptions({ name: 'RepairDetailView' }) // ชื่อคอมโพเนนต์สำหรับ debug

import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import Swal from 'sweetalert2' // SweetAlert2 สำหรับแจ้งเตือน
import { Icon } from '@iconify/vue' // ไอคอน SVG จาก Iconify
import { jwtDecode } from 'jwt-decode' // ถอดรหัส JWT token

import RepairStatusTimeline from '@/components/status-timeline-component.vue' // แสดง Timeline สถานะ
import assignJobModalComponent from '@/components/modal/assign-job-modal-component.vue' // Modal มอบหมายงาน
import AcceptJobModalComponent from '@/components/modal/accept-job-modal-component.vue' // Modal รับงาน
import BackButtonComponent from '@/components/button/back-button-component.vue' // ปุ่มกลับ
import BaseButtonComponent from '@/components/button/base/base-button-component.vue' // ปุ่มกลับ

import { usePhoneNumberFormatter } from '@/composables/usePhoneFormat' // จัดรูปแบบเบอร์โทร
import { useAuthToken } from '@/composables/useAuthToken' // จัดการ token และการยืนยัน

import { formatThaiLongDate } from '@/utils/date.util' // จัดรูปแบบวันที่
import { createRepairTimelineData } from '@/utils/repairTimeline.util' // สร้างข้อมูล timeline
import { getRepairStatusBadge, getUrgencyLevelBadge } from '@/utils/badge.util' // จัดรูปแบบ badge

const API_BASE_URL = import.meta.env.VITE_API_BASE // URL ของ API จากตัวแปร environment

const { toDisplay } = usePhoneNumberFormatter() // ฟังก์ชันจัดรูปแบบเบอร์โทร
const { token, isAuthenticated, logout } = useAuthToken() // Token และฟังก์ชันจัดการการยืนยัน
const route = useRoute() // ข้อมูลเส้นทาง Router ปัจจุบัน
const router = useRouter() // ฟังก์ชัน navigate ของ Router

const repair = ref(null) // ข้อมูลซ่อมแซม
const isLoading = ref(true) // สถานะกำลังโหลด
const isError = ref(false) // สถานะมีข้อผิดพลาด
const repairCode = route.params.code // รหัสซ่อมแซมจาก URL params
const canAssign = ref(false) // สามารถมอบหมายงานได้หรือไม่
const canAccept = ref(false) // สามารถรับงานได้หรือไม่

// สถานะการแสดง/ซ่อน Modal
const showAssignPopup = ref(false) // แสดง Modal มอบหมายงาน
const showAcceptPopup = ref(false) // แสดง Modal รับงาน
const showStatusPopup = ref(false) // แสดง Modal เปลี่ยนสถานะ
const showTechSummaryModal = ref(false) // แสดง Modal สรุปจากช่างซ่อม

const showReturnModal = ref(false)
const selectedReturnItems = ref([])

const returnableItems = computed(() => {
  if (!repair.value?.stock_items) return []

  return repair.value.stock_items
    .filter((item) => item.status === 'approved')
    .map((item) => ({
      ...item,
      returnQty: item.qty, // default = คืนทั้งหมด
    }))
})

// สถานะข้อมูลอื่น ๆ
const mediaFileList = ref([]) // รายการไฟล์สื่อ
const afterMediaFileList = ref([]) // รายการไฟล์สื่อภาพหลังซ่อม
const activeLightboxList = ref([]) // list ที่กำลังเปิดใน lightbox
const technicianTypeList = ref([]) // รายการประเภทช่างซ่อม
const techSummary = ref('') // สรุปจากช่างซ่อม
const techImageAfterFiles = ref([]) // ไฟล์รูปหลังซ่อม (สูงสุด 5 รูป)
const techImageAfterPreviews = ref([]) // preview รูปหลังซ่อม

// ตัวแปรสำหรับฟิลด์ใหม่ในการปิดงาน (DB Schema v1.1.0)
const repairMethod = ref('in_house') // in_house, outsource, other
const repairMethodRemark = ref('')
const resultStatus = ref('completed') // completed, incomplete, other
const resultRemark = ref('')
const isEditDragOverTech = ref(false) // สถานะ drag over สำหรับรูปหลังซ่อม
const techImageFileInput = ref(null) // Template ref สำหรับ input element

/**
 * ตรวจสอบสิทธิ์การเข้าใช้งาน
 * ฟังก์ชันนี้ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
 * ถ้าไม่มี token หรือหมดอายุจะแสดงเตือนและ logout
 */
function requireAuth() {
  if (!isAuthenticated.value || !token.value) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: 'กรุณาเข้าสู่ระบบใหม่',
      showConfirmButton: false,
      timer: 3000,
    })
    logout()

    return false
  }

  return true
}

/**
 * ดึง ID ของผู้ใช้ปัจจุบันจาก JWT token
 * ใช้ try-catch เพราะ token อาจไม่ valid
 */
const currentUserId = computed(() => {
  try {
    return token?.value ? jwtDecode(token.value)?.us_id : null
  } catch {
    return null
  }
})

/**
 * เปิด Modal สำหรับต่างๆ ตามสถานะ
 * - pending: แสดง Modal รับงาน
 * - in_progress: Toggle Modal เปลี่ยนสถานะ
 */
function openActionPopup() {
  const status = repair.value?.rf_user_status

  if (status === 'pending') {
    showAcceptPopup.value = true
  } else if (status === 'in_progress') {
    // Toggle การแสดง/ซ่อน popup
    showStatusPopup.value = !showStatusPopup.value
  }
}

/**
 * ปิด Modal เปลี่ยนสถานะ
 */
function closeStatusPopup() {
  showStatusPopup.value = false
}

function onTechImageAfterChange(event) {
  const files = Array.from(event.target.files)
  if (!files.length) return
  processFiles(files)
  event.target.value = ''
}

function processFiles(files) {
  const remainingSlots = 5 - techImageAfterFiles.value.length
  if (remainingSlots <= 0) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: 'อัปโหลดได้สูงสุด 5 รูป',
      showConfirmButton: false,
      timer: 2500,
    })
    return
  }

  const filesToAdd = files.slice(0, remainingSlots)
  let hasInvalidFile = false

  filesToAdd.forEach(file => {
    if (!file.type.startsWith('image/')) {
      hasInvalidFile = true
      return
    }
    techImageAfterFiles.value.push(file)
    techImageAfterPreviews.value.push(URL.createObjectURL(file))
  })

  if (hasInvalidFile) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: 'รองรับเฉพาะไฟล์รูปภาพ',
      showConfirmButton: false,
      timer: 2500,
    })
  }
}

function removeTechImageAfter(index) {
  if (techImageAfterPreviews.value[index]) {
    URL.revokeObjectURL(techImageAfterPreviews.value[index])
  }
  techImageAfterPreviews.value.splice(index, 1)
  techImageAfterFiles.value.splice(index, 1)
}

function clearTechImageAfter() {
  techImageAfterPreviews.value.forEach(url => URL.revokeObjectURL(url))
  techImageAfterFiles.value = []
  techImageAfterPreviews.value = []
}

function handleTechImageDragOver() {
  isEditDragOverTech.value = true
}

function handleTechImageDragLeave() {
  isEditDragOverTech.value = false
}

function handleTechImageDrop(e) {
  isEditDragOverTech.value = false
  const files = Array.from(e.dataTransfer.files)
  if (files && files.length > 0) {
    processFiles(files)
  }
}

/**
 * จัดการการเลือกสถานะใหม่
 * - done: ปิดงานพร้อมสรุป
 * - outsource: ส่งงานให้ช่างภายนอก
 */
function handleSelectStatus(statusType) {
  if (statusType === 'done') {
    showStatusPopup.value = false
    confirmCloseJobWithSummary()
  } else if (statusType === 'outsource') {
    showStatusPopup.value = false
    confirmOutsource()
  }
}

/**
 * เตรียมการแสดง Modal สรุปงานก่อนปิด
 *
 * @author นายพชร ไพศรีสกุล
 * @since 2026-02-17
 * @lastModified 2026-02-22
 * @lastModifiedBy นราธิป แสนทวีสุข
 * @contributors
 *  - นายพชร ไพศรีสกุล
 *  - นราธิป แสนทวีสุข
 */
function confirmCloseJobWithSummary() {
  // ตรวจสอบว่างานนี้เคยจ้างช่างภายนอกหรือไม่
  const isOutsourced = repair.value?.rf_user_status === 'outsource'

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
 * ปิดงานพร้อมสรุปผลการซ่อมแซม
 * ส่ง PUT request ไปยัง API พร้อมสถานะ 'done' และสรุปงาน
 * หลังสำเร็จนำเข้าไปยังรายการงานช่างซ่อม
 *
 * @author นายพชร ไพศรีสกุล
 * @since 2026-02-17
 * @lastModified 2026-02-22
 * @lastModifiedBy นราธิป แสนทวีสุข
 * @contributors
 *  - นายพชร ไพศรีสกุล
 *  - นราธิป แสนทวีสุข
 */
async function confirmCloseJob() {
  if (!requireAuth()) return

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

    const res = await fetch(`${API_BASE_URL}/technician/close-job/${repairCode}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
      body: formData,
    })

    if (!res.ok) { let errMsg = 'UPDATE_FAILED'; try { const errData = await res.json(); if (errData.message) errMsg = errData.message; } catch (_) {} throw new Error(errMsg); }

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'อัปเดตสถานะเรียบร้อย',
      showConfirmButton: false,
      timer: 2000,
    })
    showTechSummaryModal.value = false
    clearTechImageAfter()

    // Redirect to technician repair list after successful job closure
    setTimeout(() => {
      router.push('/main/technician-repair-list')
    }, 2000)

    fetchRepairDetail()
  } catch (e) {
    console.error(e)
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: 'ไม่สามารถปิดงานได้',
      showConfirmButton: false,
      timer: 3000,
    })
  }
}

/**
 * ส่งงานให้ช่างภายนอก
 * แสดง confirmation dialog ก่อนส่ง
 * ส่ง PUT request พร้อมสถานะ 'outsource'
 */
async function confirmOutsource() {
  const result = await Swal.fire({
    title: 'จ้างช่างภายนอก',
    text: 'คุณต้องการส่งงานให้ช่างภายนอกหรือไม่?',
    icon: 'question',
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: '#d4d4d4',
  })

  if (!result.isConfirmed) return
  if (!requireAuth()) return

  try {
    const res = await fetch(`${API_BASE_URL}/technician/close-job/${repairCode}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ status: 'outsource' }),
    })

    if (!res.ok) throw new Error('OUTSOURCE_FAILED')

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'ส่งงานให้ช่างภายนอกเรียบร้อย',
      showConfirmButton: false,
      timer: 2000,
    })

    // Redirect to technician repair list after successful outsourcing
    setTimeout(() => {
      router.push('/main/technician-repair-list')
    }, 2000)

    fetchRepairDetail()
  } catch (e) {
    console.error(e)
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
 * หลังจากรับงานสำเร็จ ให้โหลดข้อมูลซ่อมแซมใหม่
 */
function handleAcceptSuccess() {
  fetchRepairDetail()
  showAcceptPopup.value = false
}

/**
 * ตรวจสอบว่างานได้รับมอบหมายให้ช่างซ่อมแล้วหรือไม่
 * ตรวจดูจากหลายเงื่อนไข: ID ช่างซ่อม, ฟ้อง assigned, ชื่อช่างซ่อม
 */
const isAssigned = computed(() => {
  const r = repair.value
  if (!r) return false

  const hasTechId = r.rf_assigned_tech_id && Number(r.rf_assigned_tech_id) > 0
  const hasAssignFlag = r.assigned === true || r.assigned === 1
  const hasTechName = r.main_technician && r.main_technician !== '-'

  return hasTechId || hasAssignFlag || hasTechName
})

/**
 * เปิด Modal มอบหมายงาน
 */
function openAssignPopup() {
  showAssignPopup.value = true
}

/**
 * หลังจากมอบหมายสำเร็จ ให้โหลดข้อมูลซ่อมแซมใหม่
 */
function handleAssignSuccess() {
  console.log('✅ [Detail] handleAssignSuccess called - refreshing repair detail')
  showAssignPopup.value = false
  fetchRepairDetail()
}

/**
 * ย้อนกลับไปหน้าก่อนหน้า
 * ถ้าไม่มีประวัติให้กลับไปหน้ารายการซ่อมแซมของฉัน
 */
function goBack() {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/main/my-list')
  }
}

/**
 * จัดการไฟล์มีเดีย
 * แปลง JSON string หรือ string เป็น array และสร้างข้อมูลสำหรับแต่ละไฟล์
 */
function parseMediaFiles(mediaSource) {
  if (!mediaSource) return []

  let rawFileList = []
  try {
    rawFileList = typeof mediaSource === 'string' ? (mediaSource.startsWith('[') ? JSON.parse(mediaSource) : [mediaSource]) : mediaSource
  } catch (err) {
    console.error('ไม่สามารถ parse mediaSource ได้:', err)
    rawFileList = []
  }

  // Ensure it's an array for robustness
  if (!Array.isArray(rawFileList)) {
    rawFileList = [rawFileList]
  }

  return rawFileList.map((filePath) => {
    const fileName = filePath.split('/').pop()
    const fileExt = fileName.split('.').pop().toLowerCase()

    return {
      path: filePath,
      fullUrl: `${API_BASE_URL}${filePath}`,
      fileName: fileName,
      isImage: ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt),
      isVideo: ['mp4', 'avi', 'mov', 'wmv'].includes(fileExt),
    }
  })
}

function processMediaFileList(rfImage) {
  mediaFileList.value = parseMediaFiles(rfImage)
}

function processAfterMediaFileList(rfTechImageAfter) {
  afterMediaFileList.value = parseMediaFiles(rfTechImageAfter)
}

/**
 * โหลดข้อมูลซ่อมแซมจาก API
 * รวมการสร้าง timeline และประมวลผลไฟล์มีเดีย
 * เพิ่ม query parameter เพื่อหลีกเลี่ยง cache
 */
async function fetchRepairDetail() {
  try {
    const res = await fetch(`${API_BASE_URL}/repair-requests/${repairCode}?_=${Date.now()}`)
    const data = await res.json()

    if (!res.ok) throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')

    const timeline = createRepairTimelineData(data)
    repair.value = {
      ...data,
      timeline,
    }

    // เสมอประมวลผลรูปปัญหา
    processMediaFileList(data.rf_image)

    // ประมวลผลรูปหลังซ่อมถ้ามี
    if (data.rf_tech_image_after && data.rf_tech_image_after.trim() !== '') {
      processAfterMediaFileList(data.rf_tech_image_after)
    } else {
      afterMediaFileList.value = []
    }
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

// ฟังก์ชันการแสดง Lightbox สำหรับมีเดีย
const showLightbox = ref(false) // สถานะแสดง Lightbox
const currentMediaIndex = ref(0) // ดัชนีไฟล์มีเดียปัจจุบัน

/**
 * เปิด Lightbox แสดงไฟล์มีเดีย
 */
function openMedia(index, list = mediaFileList.value) {
  activeLightboxList.value = list
  currentMediaIndex.value = index
  showLightbox.value = true
}

/**
 * ปิด Lightbox
 * หยุดการเล่นวิดีโอทั้งหมด
 */
function closeMedia() {
  showLightbox.value = false
  const videoElements = document.querySelectorAll('video')
  videoElements.forEach((video) => {
    video.pause()
  })
}

/**
 * แสดงไฟล์มีเดียถัดไป
 */
function nextMedia() {
  if (currentMediaIndex.value < activeLightboxList.value.length - 1) {
    currentMediaIndex.value++
  }
}

/**
 * แสดงไฟล์มีเดียก่อนหน้า
 */
function prevMedia() {
  if (currentMediaIndex.value > 0) {
    currentMediaIndex.value--
  }
}

// การถอนงาน (Withdrawal Logic)
/**
 * แสดงปุ่มถอนงาน
 * หากสถานะ pending/done หรือมาจากหน้า technician ไม่แสดง
 */
const showWithdrawButton = computed(() => {
  if (!repair.value) return false

  const status = repair.value.rf_user_status
  if (status === 'pending' || status === 'done') return false
  if (!history.state?.fromTechnician) return false

  return true
})

/**
 * โหลดรายการประเภทช่างซ่อมจาก API
 */
async function fetchTechnicianTypeList() {
  try {
    const res = await fetch(`${API_BASE_URL}/technician-types`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'โหลดประเภทงานซ่อมไม่สำเร็จ')

    technicianTypeList.value = data
  } catch (err) {
    console.error('โหลดประเภทงานซ่อมไม่สำเร็จ:', err)
  }
}

/**
 * จัดเก็บรหัสซ่อมแซมในหน่วยความจำเซดชั่น
 * แล้วนำเข้าไปยังหน้ารายการสต็อค
 */
function handleRepairFrom(code) {
  try {
    sessionStorage.setItem('selected_rf_code', String(code))
  } catch (e) {
    console.warn('Cannot store selected_rf_code', e)
  }
  router.push('/main/technician-stock-list')
}

/**
 * สร้าง HTML badge สำหรับสถานะสต็อค
 * ตรวจสอบลักษณะของสถานะและคืนค่า HTML string
 */
function getStockStatusBadge(status) {
  const baseClass =
    'inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full font-semibold text-xs sm:text-sm'

  switch (status) {
    case 'waiting':
      return `<span class="${baseClass} bg-amber-50 text-amber-600">รออนุมัติ</span>`
    case 'approved':
      return `<span class="${baseClass} bg-green-50 text-green-600">อนุมัติแล้ว</span>`
    case 'returned':
      return `<span class="${baseClass} bg-blue-50 text-blue-600">คืนแล้ว</span>`
    case 'rejected':
      return `<span class="${baseClass} bg-red-50 text-red-600">ไม่อนุมัติ</span>`

    default:
      return `<span class="${baseClass} bg-gray-50 text-gray-600">-</span>`
  }
}

function openReturnModal() {
  selectedReturnItems.value = []
  showReturnModal.value = true
}

function closeReturnModal() {
  showReturnModal.value = false
}

function toggleReturnItem(item) {
  const index = selectedReturnItems.value.findIndex(
    (i) => i.sf_code === item.sf_code && i.id === item.id,
  )

  if (index >= 0) {
    selectedReturnItems.value.splice(index, 1)
  } else {
    selectedReturnItems.value.push(item)
  }
}

function toggleSelectAll() {
  if (selectedReturnItems.value.length === returnableItems.value.length) {
    selectedReturnItems.value = []
  } else {
    selectedReturnItems.value = [...returnableItems.value]
  }
}

async function returnSelectedItems() {
  if (!requireAuth()) return

  const approvedItems = selectedReturnItems.value.filter((item) => item.status === 'approved')

  if (approvedItems.length === 0) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: 'ไม่มีรายการที่สามารถคืนได้',
      showConfirmButton: false,
      timer: 2000,
    })

    return
  }

  try {
    for (const item of approvedItems) {
      const res = await fetch(`${API_BASE_URL}/stock-forms/return-item`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify({
          sf_code: item.sf_code,
          pd_id: item.id,
          quantity: item.returnQty,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.message)
    }

    selectedReturnItems.value = []
    showReturnModal.value = false

    await fetchRepairDetail()

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'คืนอุปกรณ์สำเร็จ',
      showConfirmButton: false,
      timer: 2000,
    })
  } catch (err) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: err.message,
      showConfirmButton: false,
      timer: 3000,
    })
  }
}

function validateReturnQty(item) {
  if (item.returnQty < 1) item.returnQty = 1

  if (item.returnQty > item.qty) item.returnQty = item.qty
}

// Lifecycle Hooks - วัฏจักรชีวิตของคอมโพเนนต์
onMounted(() => {
  const state = history.state || {}
  canAssign.value = !!state.fromAdmin
  canAccept.value = !!state.fromTechnician

  fetchRepairDetail()
  fetchTechnicianTypeList()
})
</script>

<template>
  <div class="min-h-screen px-3 bg-gray-50 sm:px-6 lg:px-8">
    <div v-if="isLoading" class="py-16 text-base text-center text-gray-500 sm:text-lg">
      กำลังโหลดข้อมูล...
    </div>

    <div v-else-if="isError" class="py-16 text-base font-medium text-center text-red-500 sm:text-lg">
      ไม่พบข้อมูลใบแจ้งซ่อม {{ repairCode }}
    </div>

    <div v-else-if="repair" class="space-y-4 max-w-7xl mx-auto py-8">
      <!-- หัวข้อบนสุด -->
      <div
        class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white px-8 py-5 rounded-3xl shadow-sm border border-gray-100">
        <div class="flex items-center gap-6">
          <BackButtonComponent @click="goBack"
            class="bg-gray-50 hover:bg-gray-100 rounded-lg p-2.5 transition-colors border border-gray-100" />
          <div class="flex flex-col items-start leading-tight">
            <h1 class="text-xl font-extrabold text-gray-800 flex items-center gap-2 tracking-wide mb-1">
              งานซ่อม {{ repair?.rf_code }}
            </h1>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <!-- ป้ายประเภทงานซ่อม -->
              <span
                class="inline-flex justify-center items-center w-28 sm:w-36 h-7 sm:h-8 px-3 rounded-full font-semibold text-xs sm:text-sm bg-indigo-100 text-indigo-600">
                {{ repair?.repair_type_name || 'ทั่วไป' }}
              </span>
              <!-- ป้ายความเร่งด่วน -->
              <span v-html="getUrgencyLevelBadge(repair?.rf_urgency)"></span>
            </div>
          </div>
        </div>
        <div class="flex flex-col items-end px-4">
          <span class="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">
            สถานะปัจจุบัน
          </span>
          <div v-html="getRepairStatusBadge(repair?.rf_user_status)"></div>
        </div>
      </div>

      <!-- รายละเอียดจากผู้แจ้ง -->
      <div class="space-y-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div class="flex items-center gap-2.5 px-3">
          <div class="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Icon icon="fluent:info-16-filled" class="w-4 h-4 text-blue-500" />
          </div>
          <h2 class="text-sm font-bold text-gray-400 tracking-wider">รายละเอียดจากผู้แจ้ง</h2>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 1. การ์ดอาการ (Issue) -->
          <div
            class="lg:col-span-2 relative p-8 bg-blue-50/40 rounded-[32px] overflow-hidden border border-blue-100/50 flex flex-col justify-between">
            <div
              class="absolute top-2 right-4 text-8xl font-black text-gray-200/40 italic select-none pointer-events-none tracking-widest z-0 mix-blend-multiply">
            </div>

            <div class="relative z-10 mb-8 flex flex-col md:flex-row gap-8">
              <!-- ข้อมูล Text -->
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-bold text-blue-600 mb-2">อาการที่แจ้งซ่อม</h3>
                <h1 class="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-4 leading-snug">{{ repair?.rf_problem ||
                  '-' }}</h1>
                <p class="text-gray-600 leading-relaxed max-w-2xl text-sm sm:text-base">{{ repair?.rf_detail || '-' }}
                </p>
              </div>

              <!-- Media -->
              <div class="w-full md:w-5/12 lg:w-1/2 shrink-0">
                <div v-if="mediaFileList.length > 0"
                  class="w-full h-48 sm:h-64 p-1.5 border border-gray-300 border-dashed rounded-2xl bg-white/50 backdrop-blur-sm">
                  <template v-if="mediaFileList.length === 1">
                    <img v-if="mediaFileList[0].isImage" :src="mediaFileList[0].fullUrl"
                      :alt="mediaFileList[0].fileName"
                      class="object-cover w-full h-full transition rounded-xl cursor-pointer hover:opacity-90"
                      @click="openMedia(0)" />
                    <video v-else-if="mediaFileList[0].isVideo" :src="mediaFileList[0].fullUrl" controls
                      class="w-full h-full rounded-xl cursor-pointer object-cover" @click="openMedia(0)"></video>
                  </template>
                  <template v-else>
                    <div class="grid grid-cols-2 gap-1.5 h-full">
                      <template v-for="(file, index) in mediaFileList.slice(0, 3)" :key="index">
                        <div class="relative h-full min-h-[5rem]">
                          <img v-if="file.isImage" :src="file.fullUrl" :alt="file.fileName"
                            class="object-cover w-full h-full transition rounded-xl cursor-pointer hover:opacity-90"
                            @click="openMedia(index)" />
                          <video v-else-if="file.isVideo" :src="file.fullUrl"
                            class="object-cover w-full h-full rounded-xl" muted @click="openMedia(index)"></video>
                          <div v-if="file.isVideo"
                            class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-xl cursor-pointer"
                            @click="openMedia(index)">
                            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                d="M6.3 2.84A1 1 0 004 3.75v12.5a1 1 0 001.65.76L17.3 10.76a1 1 0 000-1.52L5.65 3.08z" />
                            </svg>
                          </div>
                        </div>
                      </template>
                      <div v-if="mediaFileList.length > 3"
                        class="flex items-center justify-center h-full min-h-[5rem] bg-gray-100/50 rounded-xl cursor-pointer backdrop-blur-sm"
                        @click="openMedia(3)">
                        <span class="font-bold text-gray-500">+{{ mediaFileList.length - 3 }}</span>
                      </div>
                    </div>
                  </template>
                </div>
                <!-- Box ว่างเพื่อจองพื้นที่ -->
                <div v-else
                  class="w-full h-48 sm:h-64 flex flex-col items-center justify-center p-1.5 border border-gray-300 border-dashed rounded-2xl bg-white/50 backdrop-blur-sm text-gray-400">
                  <Icon icon="fluent:image-off-24-regular" class="w-8 h-8 mb-2 opacity-50" />
                  <span class="text-xs font-medium">ไม่มีรูปภาพแนบ</span>
                </div>
              </div>
            </div>

            <!-- กลุ่มการ์ดสถานที่ และ เลขครุภัณฑ์ -->
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 relative z-10 w-full">
              <!-- การ์ดสถานที่ (ให้กว้างกว่าโดยใช้ lg:col-span-3) -->
              <div
                class="lg:col-span-3 flex items-center gap-4 bg-white/90 backdrop-blur-sm p-4 rounded-[20px] shadow-sm border border-white">
                <div class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                  <Icon icon="fluent:location-28-filled" class="w-5 h-5 text-blue-500" />
                </div>
                <div class="min-w-0">
                  <span
                    class="text-[10px] font-extrabold text-gray-400 block mb-0.5 uppercase tracking-widest">สถานที่</span>
                  <span class="text-xs font-bold text-gray-800 truncate block">
                    {{ repair?.building_name || '-' }} {{ repair?.floor_name ? 'ชั้น ' + repair.floor_name : '' }} {{
                      repair?.room_name || '' }}
                  </span>
                </div>
              </div>

              <!-- การ์ดเลขครุภัณฑ์ (กินพื้นที่น้อยกว่า lg:col-span-2) -->
              <div
                class="lg:col-span-2 flex items-center gap-4 bg-white/90 backdrop-blur-sm p-4 rounded-[20px] shadow-sm border border-white">
                <div class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                  <Icon icon="fluent:barcode-scanner-24-regular" class="w-5 h-5 text-blue-500" />
                </div>
                <div class="min-w-0">
                  <span
                    class="text-[10px] font-extrabold text-gray-400 block mb-0.5 uppercase tracking-widest">เลขครุภัณฑ์</span>
                  <span class="text-xs font-bold text-gray-800 truncate block">{{ repair?.rf_prop_number || 'N/A'
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. การ์ดผู้แจ้ง -->
          <div
            class="p-8 bg-[#3b60e4] rounded-[32px] text-white flex flex-col relative overflow-hidden shadow-lg shadow-blue-500/20 lg:h-auto sm:h-[350px]">
            <div class="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl z-0 pointer-events-none">
            </div>
            <div
              class="absolute -left-12 -bottom-12 w-40 h-40 bg-indigo-900/30 rounded-full blur-2xl z-0 pointer-events-none">
            </div>

            <div class="relative z-10 flex flex-col h-full">
              <h3 class="text-xs font-bold text-blue-200 mb-6 tracking-widest">ผู้ส่งคำขอแจ้งซ่อม</h3>

              <div class="flex items-center gap-4 mb-6">
                <div
                  class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 shrink-0 shadow-sm border border-blue-50">
                  <Icon icon="fluent:person-24-filled" class="w-7 h-7" />
                </div>
                <div>
                  <h2 class="text-lg font-bold">{{ repair?.reporter?.name || '-' }}</h2>
                  <p class="text-xs font-medium text-blue-200 mt-1 line-clamp-1">{{ repair?.reporter?.department || '-'
                  }}</p>
                </div>
              </div>

              <!-- ดันข้อมูลส่วนนี้ลงไปติดด้านล่างสุดของการ์ดด้วย mt-auto -->
              <div class="space-y-3 p-4 bg-white/10 rounded-2xl text-[13px] font-medium text-blue-50 mt-auto backdrop-blur-sm border border-white/5">
                <div class="flex items-center gap-4">
                  <Icon icon="fluent:call-24-regular" class="w-[18px] h-[18px] shrink-0 text-blue-200" />
                  <span>{{ repair?.reporter?.phone ? toDisplay(repair.reporter.phone) : '-' }}</span>
                </div>
                <div class="flex items-center gap-4">
                  <Icon icon="fluent:calendar-ltr-24-regular" class="w-[18px] h-[18px] shrink-0 text-blue-200" />
                  <span>{{ formatThaiLongDate(repair?.rf_create_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- แผนการดำเนินงานของช่าง -->
      <div class="space-y-4">
        <div class="space-y-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div class="flex items-center gap-2.5 px-3 mt-4">
            <div class="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Icon icon="fluent:wrench-24-filled" class="w-3.5 h-3.5 text-orange-500" />
            </div>
            <h2 class="text-sm font-bold text-gray-400 tracking-wider">การดำเนินงานของช่าง</h2>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

            <!-- ซ้าย: ช่างรับผิดชอบ + วัสดุ -->
            <div
              class="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
              <!-- 1. ช่างผู้รับผิดชอบ -->
              <div class="shrink-0 mb-6">
                <div class="flex items-center justify-between mb-5">
                  <h3 class="text-sm font-bold text-orange-600">ช่างผู้รับผิดชอบ</h3>
                  <span v-if="isAssigned"
                    class="px-2.5 py-1 text-[9px] font-black bg-gray-100/80 text-gray-400 rounded-md uppercase tracking-widest">มอบหมายแล้ว</span>
                </div>

                <div v-if="!isAssigned"
                  @click="canAssign && repair?.rf_user_status !== 'done' ? openAssignPopup() : null"
                  :class="['border-2 border-dashed border-gray-200 rounded-[20px] py-6 flex flex-col items-center justify-center text-gray-400 transition-colors group', canAssign && repair?.rf_user_status !== 'done' ? 'cursor-pointer hover:bg-gray-50 hover:border-blue-300' : '']">
                  <div
                    class="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-50 transition-colors">
                    <Icon icon="fluent:person-add-24-regular"
                      class="w-6 h-6 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <span
                    class="text-sm font-bold text-gray-400 group-hover:text-blue-500 transition-colors">คลิกเพื่อมอบหมายงานให้ช่าง</span>
                </div>

                <div v-else
                  class="border border-gray-100 bg-gray-50/50 rounded-[20px] p-4 flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div
                      class="w-12 h-12 bg-white border border-gray-200 shadow-sm rounded-full flex items-center justify-center text-gray-400 shrink-0">
                      <Icon icon="fluent:person-24-filled" class="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p class="text-sm font-bold text-gray-800">{{ repair?.main_technician || '-' }}</p>
                      <p class="text-xs font-medium text-gray-500 mt-0.5">{{ repair?.tech_position || '-' }}</p>
                    </div>
                  </div>
                  <button v-if="canAssign && repair?.rf_user_status !== 'done'"
                    class="p-2.5 text-gray-400 hover:text-blue-500 bg-white rounded-full shadow-sm border border-gray-100 transition-colors"
                    @click="openAssignPopup">
                    <Icon icon="fluent:edit-24-regular" class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Divider -->
              <hr class="border-gray-100 border-dashed mb-6" />

              <!-- 2. Materials & Actions -->
              <div class="flex-1 flex flex-col overflow-hidden">
                <!-- Materials Header -->
                <div class="flex items-center justify-between mb-4 shrink-0">
                  <h3 class="text-sm font-bold text-gray-600">รายการวัสดุที่ต้องใช้</h3>
                  <div v-if="canAccept && repair?.rf_user_status !== 'done' && repair?.rf_user_status !== 'pending'"
                    class="relative">
                    <button @click="openReturnModal"
                      class="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors">
                      <Icon icon="oui:return-key" class="w-3 h-3" />
                      คืนอุปกรณ์
                    </button>
                  </div>
                </div>

                <!-- Materials List (Scrollable) -->
                <div class="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 custom-scrollbar max-h-[260px]">
                  <div v-if="repair?.stock_items?.length" class="space-y-3 pb-2">
                    <div v-for="(item, i) in repair.stock_items" :key="i"
                      class="flex items-center justify-between p-4 bg-gray-50/80 rounded-2xl border border-gray-100">
                      <div class="flex-1 pr-4 min-w-0">
                        <p class="mb-1 text-sm font-bold text-gray-800 truncate">{{ item.name }}</p>
                        <p class="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                          รหัส: <span class="font-bold text-gray-700">{{ item.assetCode || '-' }}</span>
                        </p>
                      </div>
                      <div class="flex flex-col items-end gap-1.5 shrink-0">
                        <div v-html="getStockStatusBadge(item.status)"></div>
                        <div class="text-[11px] font-medium text-gray-500">
                          จำนวน <span class="font-black text-gray-700 text-[13px] mx-0.5">{{ item.qty }}</span> ชิ้น
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else
                    class="flex flex-col items-center justify-center p-8 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed h-full min-h-[120px]">
                    <p class="text-sm font-bold text-gray-400">ยังไม่มีการเพิ่มรายการวัสดุ</p>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div v-if="showWithdrawButton || (canAccept && repair?.rf_user_status !== 'done')"
                  class="pt-6 mt-4 border-t border-gray-100 shrink-0">
                  <div :class="['grid gap-3', showWithdrawButton ? 'grid-cols-2' : 'grid-cols-1']">
                    <button v-if="showWithdrawButton" type="button"
                      class="w-full px-4 py-3.5 text-sm font-bold rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-md bg-blue-600 hover:bg-blue-700 text-white"
                      @click="handleRepairFrom(repair?.rf_code)">
                      <Icon icon="ix:box-open" class="w-5 h-5" style="color: #ffffff" />
                      เบิกวัสดุ
                    </button>

                    <div v-if="canAccept && repair?.rf_user_status !== 'done'" class="relative">
                      <button
                        @click="repair?.rf_user_status === 'pending' ? openActionPopup() : repair?.rf_user_status === 'outsource' ? confirmCloseJobWithSummary() : openActionPopup()"
                        :class="[
                          'w-full px-4 py-3.5 text-sm font-bold rounded-2xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2 text-white hover:shadow-md',
                          repair?.rf_user_status === 'pending' ? 'bg-[#3b60e4] hover:bg-blue-700' :
                            repair?.rf_user_status === 'outsource' ? 'bg-green-600 hover:bg-green-700' :
                              'bg-amber-500 hover:bg-amber-600'
                        ]">
                        <Icon icon="fa7-solid:rotate" class="w-4 h-4" style="color: #ffffff" />
                        <span>
                          {{ repair?.rf_user_status === 'pending' ? 'รับงาน' : repair?.rf_user_status === 'outsource' ?
                            'เสร็จสิ้น' : 'เปลี่ยนสถานะ' }}
                        </span>
                      </button>

                      <div v-if="showStatusPopup"
                        class="absolute right-0 z-50 mb-2 bg-white border border-gray-100 shadow-2xl bottom-full w-64 rounded-3xl overflow-hidden p-2">
                        <div class="flex items-center gap-2 p-3 mb-1 border-b border-gray-50">
                          <div class="flex items-center justify-center rounded-full w-6 h-6 bg-amber-500 shrink-0">
                            <Icon icon="fa7-solid:rotate" class="w-3 h-3 text-white" />
                          </div>
                          <h3 class="text-xs font-bold text-gray-800">เปลี่ยนสถานะงาน</h3>
                          <button @click="closeStatusPopup"
                            class="p-1 ml-auto transition rounded-full hover:bg-gray-100 text-gray-400">
                            <Icon icon="radix-icons:cross-2" class="w-4 h-4" />
                          </button>
                        </div>
                        <div class="space-y-1 p-1">
                          <button @click="handleSelectStatus('done')"
                            class="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-green-50 transition-colors group">
                            <div
                              class="flex items-center justify-center w-9 h-9 transition bg-green-100 rounded-full group-hover:bg-green-200 text-green-600 shrink-0">
                              <Icon icon="fluent:checkmark-12-filled" class="w-5 h-5" />
                            </div>
                            <div class="text-left leading-tight">
                              <p class="text-sm font-bold text-gray-800 group-hover:text-green-700">ปิดงาน</p>
                              <p class="text-[10px] text-gray-400 mt-1 font-medium">ดำเนินการเสร็จสิ้นแล้ว</p>
                            </div>
                          </button>
                          <button v-if="repair?.rf_user_status !== 'outsource'" @click="handleSelectStatus('outsource')"
                            class="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-amber-50 transition-colors group">
                            <div
                              class="flex items-center justify-center w-9 h-9 transition bg-amber-100 rounded-full group-hover:bg-amber-200 text-amber-600 shrink-0">
                              <Icon icon="fluent:people-community-16-filled" class="w-5 h-5" />
                            </div>
                            <div class="text-left leading-tight">
                              <p class="text-sm font-bold text-gray-800 group-hover:text-amber-700">จ้างช่างภายนอก</p>
                              <p class="text-[10px] text-gray-400 mt-1 font-medium">ส่งต่องานให้ผู้รับเหมา</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ขวา: Activity Log -->
            <div
              class="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 flex flex-col h-full min-h-[500px]">
              <h3 class="text-sm font-bold text-gray-600 tracking-wider mb-8 px-2">ความคืบหน้า
              </h3>
              <div class="flex-1 px-4 mt-2">
                <RepairStatusTimeline :timeline-steps="repair?.timeline || []" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- รายละเอียดปิดงาน (Job Closing Details) -->
      <div v-if="repair?.rf_user_status === 'done'" class="space-y-4">
        <div class="space-y-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div class="flex items-center gap-2.5 px-3 mt-4">
            <div class="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
              <Icon icon="fluent:checkmark-starburst-24-filled" class="w-3.5 h-3.5 text-green-500" />
            </div>
            <h2 class="text-sm font-bold text-gray-400 tracking-wider">รายละเอียดปิดงาน</h2>
            <span v-if="repair?.rf_done_at"
              class="ml-auto text-xs font-semibold text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
              ปิดงานเมื่อ: {{ formatThaiLongDate(repair?.rf_done_at) }}
            </span>
          </div>

          <div class="bg-white p-7 rounded-[32px] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8">
            <!-- Data Section -->
            <div class="flex-1 space-y-6">
              <div>
                <h3 class="text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">สรุปการดำเนินการซ่อม</h3>
                <p class="text-sm font-medium text-gray-800">{{ repair?.rf_tech_summary || '-' }}</p>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <h3 class="text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">วิธีการที่ใช้ดำเนินการ</h3>
                  <div class="text-sm font-bold text-gray-800">
                    <span v-if="repair?.rf_repair_method === 'in_house'"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-blue-600 text-[11px] uppercase tracking-wide">
                      <Icon icon="fluent:wrench-24-filled" class="w-3 h-3" />
                      ซ่อมแซมเอง
                    </span>
                    <span v-else-if="repair?.rf_repair_method === 'outsource'"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 text-amber-600 text-[11px] uppercase tracking-wide">
                      <Icon icon="fluent:people-community-16-filled" class="w-3 h-3" />
                      จ้างช่างภายนอก
                    </span>
                    <span v-else-if="repair?.rf_repair_method === 'other'"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-50 text-gray-600 text-[11px] uppercase tracking-wide">
                      <Icon icon="fluent:document-edit-24-regular" class="w-3 h-3" />
                      อื่นๆ {{ repair?.rf_repair_method_remark ? `(${repair.rf_repair_method_remark})` : '' }}
                    </span>
                    <span v-else>-</span>
                  </div>
                </div>

                <div>
                  <h3 class="text-xs font-bold text-gray-400 mb-1 uppercase tracking-widest">ผลการซ่อม</h3>
                  <div class="text-sm font-bold text-gray-800">
                    <span v-if="repair?.rf_result_status === 'completed'"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-50 text-green-600 text-[11px] uppercase tracking-wide">
                      <Icon icon="fluent:checkmark-circle-24-filled" class="w-3 h-3" />
                      เสร็จสมบูรณ์
                    </span>
                    <span v-else-if="repair?.rf_result_status === 'incomplete'"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 text-red-600 text-[11px] uppercase tracking-wide">
                      <Icon icon="fluent:dismiss-circle-24-filled" class="w-3 h-3" />
                      ไม่เสร็จสมบูรณ์
                    </span>
                    <span v-else-if="repair?.rf_result_status === 'other'"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-50 text-gray-600 text-[11px] uppercase tracking-wide">
                      <Icon icon="fluent:document-edit-24-regular" class="w-3 h-3" />
                      อื่นๆ {{ repair?.rf_result_remark ? `(${repair.rf_result_remark})` : '' }}
                    </span>
                    <span v-else>-</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- After Image Section -->
            <div class="md:w-1/3 shrink-0">
              <h3 class="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest">รูปภาพแนบหลังซ่อม</h3>
              <div v-if="afterMediaFileList.length > 0" class="w-full">
                <div class="w-full p-1.5 border border-gray-200 border-dashed rounded-[20px] bg-gray-50/50">
                  <template v-if="afterMediaFileList.length === 1">
                    <img v-if="afterMediaFileList[0].isImage" :src="afterMediaFileList[0].fullUrl"
                      :alt="afterMediaFileList[0].fileName"
                      class="object-cover w-full h-32 transition rounded-[14px] cursor-pointer hover:opacity-90"
                      @click="openMedia(0, afterMediaFileList)" />
                    <video v-else-if="afterMediaFileList[0].isVideo" :src="afterMediaFileList[0].fullUrl" controls
                      class="w-full h-32 transition rounded-[14px] cursor-pointer hover:opacity-90 object-cover"
                      @click="openMedia(0, afterMediaFileList)"></video>
                  </template>
                  <template v-else>
                    <div class="grid grid-cols-2 gap-1.5">
                      <template v-for="(file, index) in afterMediaFileList.slice(0, 3)" :key="index">
                        <div class="relative h-24">
                          <img v-if="file.isImage" :src="file.fullUrl" :alt="file.fileName"
                            class="object-cover w-full h-full transition rounded-[14px] cursor-pointer hover:opacity-90"
                            @click="openMedia(index, afterMediaFileList)" />
                          <video v-else-if="file.isVideo" :src="file.fullUrl"
                            class="object-cover w-full h-full transition rounded-[14px] cursor-pointer hover:opacity-90"
                            @click="openMedia(index, afterMediaFileList)"></video>
                          <div v-if="file.isVideo"
                            class="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div
                              class="w-8 h-8 flex items-center justify-center bg-black/50 rounded-full backdrop-blur-sm">
                              <Icon icon="fluent:play-24-filled" class="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </div>
                      </template>
                      <div v-if="afterMediaFileList.length > 3"
                        class="flex items-center justify-center h-24 bg-gray-100/50 rounded-[14px] cursor-pointer backdrop-blur-sm border border-gray-200/50"
                        @click="openMedia(3, afterMediaFileList)">
                        <span class="font-bold text-gray-500">+{{ afterMediaFileList.length - 3 }}</span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
              <div v-else
                class="flex items-center justify-center h-32 bg-gray-50/80 rounded-[20px] border border-gray-100 border-dashed text-gray-400 text-xs font-medium">
                ไม่มีการแนบรูปภาพหลังซ่อม
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <assignJobModalComponent v-if="showAssignPopup" :repairId="repair?.rf_code" @close="showAssignPopup = false"
      @completed="handleAssignSuccess" />

    <AcceptJobModalComponent v-if="showAcceptPopup" :repairCode="repair?.rf_code" :isOpen="showAcceptPopup"
      :currentUserId="currentUserId" @close="showAcceptPopup = false" @success="handleAcceptSuccess" />

    <!-- Modal สำหรับกรอกรายละเอียดการตรวจสอบ/ซ่อม -->
    <div v-if="showTechSummaryModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm"
      @click.self="showTechSummaryModal = false">
      <div
        class="w-full max-w-xl overflow-hidden duration-200 bg-white shadow-2xl rounded-2xl animate-in fade-in zoom-in">
        <div class="p-5 text-center border-b border-gray-100">
          <h3 class="text-xl font-bold text-gray-800">รายละเอียดการดำเนินการ</h3>
        </div>

        <div class="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <!-- 1. วิธีการซ่อม (ซ่อนถ้าเป็น outsource อยู่แล้ว) -->
          <div v-if="repairMethod !== 'outsource'">
            <label class="block mb-2 text-sm font-semibold text-gray-700">1. สำหรับเจ้าหน้าที่ ตรวจสอบ/ซ่อม</label>
            <div class="space-y-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" v-model="repairMethod" value="in_house" class="text-blue-600 focus:ring-blue-500" />
                สามารถแก้ไข/ซ่อมบำรุงได้
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" v-model="repairMethod" value="other" class="text-blue-600 focus:ring-blue-500" />
                อื่นๆ
              </label>
              <input v-if="repairMethod === 'other'" v-model="repairMethodRemark" type="text"
                placeholder="ระบุเหตุผลอื่นๆ..."
                class="w-full p-2 mt-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <!-- 2. รายละเอียดการทำงาน -->
          <div>
            <label class="block mb-2 text-sm font-semibold text-gray-700">{{ repairMethod === 'outsource' ? '1' : '2'
            }}.
              รายละเอียดการตรวจสอบ/ซ่อม</label>
            <textarea v-model="techSummary" placeholder="กรอกรายละเอียด..."
              class="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
              maxlength="500"></textarea>
            <div class="mt-1 text-xs text-right text-gray-400">{{ techSummary.length }}/500</div>
          </div>

          <!-- 3. สรุปผล -->
          <div>
            <label class="block mb-2 text-sm font-semibold text-gray-700">{{ repairMethod === 'outsource' ? '2' : '3'
            }}.
              สรุปผล</label>
            <div class="flex gap-4 mb-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" v-model="resultStatus" value="completed"
                  class="text-green-600 focus:ring-green-500" />
                เรียบร้อย
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" v-model="resultStatus" value="incomplete" class="text-red-600 focus:ring-red-500" />
                ไม่เรียบร้อย
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" v-model="resultStatus" value="other" class="text-amber-600 focus:ring-amber-500" />
                อื่นๆ
              </label>
            </div>
            <input v-if="resultStatus === 'incomplete' || resultStatus === 'other'" v-model="resultRemark" type="text"
              :placeholder="resultStatus === 'incomplete' ? 'ระบุสาเหตุที่ไม่เรียบร้อย...' : 'ระบุอื่นๆ...'
                " class="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label class="block mb-2 text-sm font-semibold text-gray-700">{{ repairMethod === 'outsource' ? '3' : '4'
            }}.
              รูปภาพหลังซ่อม (ถ้ามี)</label>

            <div v-if="techImageAfterFiles.length < 5"
              class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
              :class="isEditDragOverTech ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'"
              @click="techImageFileInput?.click()" @dragover.prevent="handleTechImageDragOver"
              @dragleave.prevent="handleTechImageDragLeave" @drop.prevent="handleTechImageDrop">
              <svg class="mx-auto mb-3 w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p class="text-base font-medium text-gray-800 mb-1">คลิกเพื่อเลือกรูปภาพ</p>
              <p class="text-xs text-gray-500 mb-3">รองรับรูปภาพเฉพาะ (สูงสุด 5 รูป) สามารถแนบรูปแบบประกอบได้</p>
              <div class="flex gap-2 justify-center">
                <span class="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">JPG</span>
                <span class="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">PNG</span>
                <span class="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">WEBP</span>
              </div>
              <input ref="techImageFileInput" type="file" accept="image/*" multiple class="hidden"
                @change="onTechImageAfterChange" />
            </div>

            <div v-if="techImageAfterFiles.length > 0" class="mt-3 space-y-2">
              <div v-for="(file, index) in techImageAfterFiles" :key="index" class="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-start gap-4 transition-all">
                <div class="flex-shrink-0">
                  <img :src="techImageAfterPreviews[index]" alt="preview" class="w-20 h-20 object-cover rounded-lg">
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">{{ file.name }}</p>
                  <p class="text-xs text-gray-500 mt-1">ขนาด: {{ (file.size / 1024 / 1024).toFixed(2) }} MB</p>
                  <p class="text-xs text-green-600 font-medium mt-2">✓ อัปโหลดไว้แล้ว ({{ index + 1 }}/{{ techImageAfterFiles.length }})</p>
                </div>
                <button type="button"
                  class="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-700 transition-colors"
                  @click="removeTechImageAfter(index)" title="ลบรูป">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label class="block mb-2 text-sm font-semibold text-gray-700"
              >{{ repairMethod === 'outsource' ? '3' : '4' }}. รูปภาพหลังซ่อม (ถ้ามี)</label
            >

            <div
              v-if="!techImageAfterPreview"
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
              <p class="text-xs text-gray-500 mb-3">รองรับรูปภาพเฉพาะ (สูงสุด 1 รู) สามารถแนบรูปแบบประกอบได้</p>
              <div class="flex gap-2 justify-center">
                <span class="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">JPG</span>
                <span class="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">PNG</span>
                <span class="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">WEBP</span>
              </div>
              <input
                ref="techImageFileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onTechImageAfterChange"
              />
            </div>

            <div v-else class="mt-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0">
                  <img :src="techImageAfterPreview" alt="preview" class="w-20 h-20 object-cover rounded-lg">
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">{{ techImageAfterFile?.name }}</p>
                  <p class="text-xs text-gray-500 mt-1">ขนาด: {{ (techImageAfterFile?.size / 1024 / 1024).toFixed(2) }} MB</p>
                  <p class="text-xs text-green-600 font-medium mt-2">✓ อัปโหลดพร้อมบันทึก</p>
                </div>
                <button
                  type="button"
                  class="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-700 transition-colors"
                  @click="clearTechImageAfter"
                  title="ลบรูป"
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-3 p-5 border-t border-gray-100">
          <button @click="showTechSummaryModal = false"
            class="flex-1 px-6 py-3 font-medium text-white transition-colors rounded-lg bg-neutral-300 hover:bg-neutral-400">
            ยกเลิก
          </button>
          <button @click="confirmCloseJob" :disabled="!techSummary.trim()" :class="[
            'flex-1 py-3 px-6 rounded-lg font-medium transition-colors text-white',
            techSummary.trim()
              ? 'bg-blue-700 hover:bg-blue-800'
              : 'bg-gray-300 cursor-not-allowed',
          ]">
            ยืนยันการปิดงาน
          </button>
        </div>
      </div>
    </div>

    <div v-if="showLightbox"
      class="fixed inset-0 z-[100] bg-black bg-opacity-95 flex flex-col items-center justify-center p-4 backdrop-blur-md"
      @click.self="closeMedia">
      <button @click="closeMedia"
        class="absolute p-2 text-white transition rounded-full top-6 right-6 hover:text-gray-300 bg-white/10">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div class="relative w-full max-w-5xl h-[70vh] flex items-center justify-center">
        <button v-if="currentMediaIndex > 0" @click="prevMedia"
          class="absolute left-0 z-10 p-4 text-white transition rounded-full hover:bg-white/10">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div class="flex items-center justify-center w-full h-full">
          <img v-if="activeLightboxList[currentMediaIndex]?.isImage"
            :src="activeLightboxList[currentMediaIndex]?.fullUrl"
            class="object-contain max-w-full max-h-full rounded-lg shadow-2xl" />
          <video v-else-if="activeLightboxList[currentMediaIndex]?.isVideo"
            :src="activeLightboxList[currentMediaIndex]?.fullUrl" controls autoplay
            class="max-w-full max-h-full rounded-lg shadow-2xl"></video>
        </div>

        <button v-if="currentMediaIndex < activeLightboxList.length - 1" @click="nextMedia"
          class="absolute right-0 z-10 p-4 text-white transition rounded-full hover:bg-white/10">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div class="mt-8 text-center text-white">
        <p class="text-lg font-medium">{{ activeLightboxList[currentMediaIndex]?.fileName }}</p>
        <p class="mt-1 text-sm text-gray-400">
          ไฟล์ที่ {{ currentMediaIndex + 1 }} จาก {{ activeLightboxList.length }}
        </p>
      </div>
    </div>
  </div>
  <!-- Return Modal -->
  <div v-if="showReturnModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="bg-white rounded-xl shadow-lg w-[500px] max-h-[80vh] overflow-auto">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <h2 class="text-lg font-semibold">คืนอุปกรณ์</h2>
        <button @click="closeReturnModal">✕</button>
      </div>

      <!-- Body -->
      <div class="p-4 space-y-3">
        <!-- Select All -->
        <div v-if="returnableItems.some((i) => i.qty > 0)" class="flex items-center justify-between pb-2 border-b">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" :checked="selectedReturnItems.length === returnableItems.filter((i) => i.qty > 0).length &&
              returnableItems.filter((i) => i.qty > 0).length > 0
              " @change="toggleSelectAll"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-500" />
            เลือกทั้งหมด
          </label>

          <span class="text-sm text-gray-500"> เลือก {{ selectedReturnItems.length }} รายการ </span>
        </div>

        <!-- Empty -->
        <div v-if="returnableItems.filter((i) => i.qty > 0).length === 0" class="text-sm text-gray-500">
          ไม่มีรายการที่สามารถคืนได้
        </div>

        <!-- Items -->
        <div v-for="item in returnableItems.filter((i) => i.qty > 0)" :key="item.sf_code + '-' + item.id"
          class="flex items-center justify-between p-3 border rounded-lg">
          <label class="flex items-center flex-1 gap-3 cursor-pointer">
            <input type="checkbox" :checked="selectedReturnItems.some((i) => i.sf_code === item.sf_code && i.id === item.id)
              " @change="toggleReturnItem(item)"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-500" />

            <div class="text-center">
              <span class="font-medium">{{ item.name }}</span>
              <span class="text-sm text-gray-500">- จำนวนที่ยังคืนได้: {{ item.qty }}</span>
            </div>
          </label>

          <!-- input ใหม่ -->
          <input type="number" min="1" :max="item.qty" v-model.number="item.returnQty" @input="validateReturnQty(item)"
            class="w-20 px-2 py-1 border rounded" @click.stop />
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 p-4 border-t">
        <button @click="closeReturnModal"
          class="px-4 py-2 text-white border rounded-lg bg-neutral-300 hover:bg-neutral-400">
          ยกเลิก
        </button>

        <button @click="returnSelectedItems" :disabled="selectedReturnItems.length === 0"
          class="px-4 py-2 text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed">
          คืนที่เลือก
        </button>
      </div>
    </div>
  </div>
</template>
