/**
* =====================================================================
* @file : repair-detail-view.vue
* @module : แสดงรายละเอียดใบแจ้งซ่อม
* @layer : View (Presentation Layer)
* @version : 1.4.0
* @since : 2026-02-17
* @lastModified : 2026-02-25
* @lastModifiedBy : ธนภัทร จันทร์งาม
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
* [2026-02-25, นายธนภัทร จันทร์งาม]
* - แก้ไขปุ่มมอบหมายที่หายไปและปรับแต่งตำแหน่งการวางของปุ่ม
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
const technicianTypeList = ref([]) // รายการประเภทช่างซ่อม
const techSummary = ref('') // สรุปจากช่างซ่อม

// ตัวแปรสำหรับฟิลด์ใหม่ในการปิดงาน (DB Schema v1.1.0)
const repairMethod = ref('in_house') // in_house, outsource, other
const repairMethodRemark = ref('')
const resultStatus = ref('completed') // completed, incomplete, other
const resultRemark = ref('')

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
    const res = await fetch(`${API_BASE_URL}/technician/close-job/${repairCode}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({
        status: 'done',
        tech_summary: techSummary.value || 'ดำเนินการเสร็จสิ้น',
        rf_tech_image_after: null,
        repair_method: repairMethod.value,
        repair_method_remark: repairMethodRemark.value,
        result_status: resultStatus.value,
        result_remark: resultRemark.value,
      }),
    })

    if (!res.ok) throw new Error('UPDATE_FAILED')

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'อัปเดตสถานะเรียบร้อย',
      showConfirmButton: false,
      timer: 2000,
    })
    showTechSummaryModal.value = false

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
    confirmButtonText: 'ใช่, ส่งงาน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#f59e0b',
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
 * แปลง JSON string เป็น array และสร้างข้อมูลสำหรับแต่ละไฟล์
 * รวมประเภท (รูป/วิดีโอ) และ URL สมบูรณ์
 */
function processMediaFileList(rfImage) {
  if (!rfImage) {
    mediaFileList.value = []
    return
  }

  let rawFileList = []
  try {
    rawFileList = typeof rfImage === 'string' ? JSON.parse(rfImage) : rfImage
  } catch (err) {
    console.error('ไม่สามารถ parse rf_image ได้:', err)
    rawFileList = []
  }

  mediaFileList.value = rawFileList.map((filePath) => {
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
    processMediaFileList(data.rf_image)

    console.log('📄 [Detail] Repair data loaded:', {
      code: data.rf_code,
      main_technician: data.main_technician,
      main_technician_id: data.main_technician_id,
      rf_assigned_tech_id: data.rf_assigned_tech_id,
    })
    console.log(data.stock_items)
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
function openMedia(index) {
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
  if (currentMediaIndex.value < mediaFileList.value.length - 1) {
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
    'inline-flex items-center justify-center min-w-[110px] h-[20px] px-3 rounded-lg text-xs font-medium'

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

async function returnItem(item) {
  try {
    if (!requireAuth()) return

    const res = await fetch(`${API_BASE_URL}/stock-forms/return-item`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`, // ✅ ใช้อันนี้
      },
      body: JSON.stringify({
        sf_code: item.sf_code,
        pd_id: item.id,
      }),
    })

    const data = await res.json()

    if (!res.ok) throw new Error(data.message)

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
    console.error(err)

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: err.message || 'คืนอุปกรณ์ไม่สำเร็จ',
      showConfirmButton: false,
      timer: 3000,
    })
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
  try {
    const decoded = token?.value ? jwtDecode(token.value) : null
    canAssign.value = decoded?.role_name === 'Admin'
  } catch {
    canAssign.value = false
  }

  fetchRepairDetail()
  fetchTechnicianTypeList()
})
</script>

<template>
  <div class="bg-gray-50 min-h-screen px-3 sm:px-6 lg:px-8">
    <div v-if="isLoading" class="text-center text-gray-500 py-16 text-base sm:text-lg">
      กำลังโหลดข้อมูล...
    </div>

    <div v-else-if="isError" class="text-center text-red-500 py-16 text-base sm:text-lg font-medium">
      ไม่พบข้อมูลใบแจ้งซ่อม {{ repairCode }}
    </div>

    <div v-else-if="repair" class="space-y-8">
      <div class="bg-white rounded-xl shadow-sm p-4 sm:p-6 lg:p-8 mx-auto max-w-7xl border border-gray-100">
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div class="flex items-center gap-4 mb-6">
              <BackButtonComponent @click="goBack" />
              <div class="flex flex-col leading-tight">
                <h1 class="text-lg sm:text-xl font-bold text-gray-600">รายละเอียดงานซ่อม</h1>

                <p class="text-gray-800 font-semibold text-sm sm:text-base">
                  {{ repair?.rf_code }}
                </p>
              </div>
            </div>
          </div>

          <div class="flex flex-col items-start md:items-end gap-3">
            <div class="flex flex-wrap gap-2 sm:gap-3 justify-start md:justify-end items-center text-xs sm:text-sm">
              <span v-html="getRepairStatusBadge(repair?.rf_user_status)"></span>
              <span v-html="getUrgencyLevelBadge(repair?.rf_urgency)"></span>
              <span
                class="inline-flex justify-center items-center px-4 py-1.5 rounded-full bg-gray-100 text-gray-600 font-medium whitespace-nowrap">
                ประเภท: {{ repair?.repair_type_name || '-' }}
              </span>
            </div>
          </div>
        </div>
        <div>
          <p class="text-gray-700 text-sm sm:text-base">
            รายละเอียด:
            <span class="break-word">
              {{ repair?.rf_problem || '-' }}
            </span>
          </p>
          <p class="text-gray-500 mt-2 text-sm sm:text-base">
            สาเหตุ/อาการ:
            <span class="break-word">
              {{ repair?.rf_detail || '-' }}
            </span>
          </p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div class="border border-gray-200 rounded-lg p-3 sm:p-4">
            <p class="text-xs sm:text-sm text-gray-500">ผู้แจ้ง</p>
            <p class="font-medium text-gray-800 text-sm sm:text-base">
              {{ repair?.reporter?.name || '-' }}
            </p>
          </div>

          <div class="border border-gray-200 rounded-lg p-3 sm:p-4">
            <p class="text-xs sm:text-sm text-gray-500">ผู้รับผิดชอบงานหลัก</p>
            <p class="font-medium text-gray-800 text-sm sm:text-base">
              {{ repair?.main_technician || '-' }}
            </p>
            <p class="text-sm text-gray-500 mt-1">
              ตำแหน่ง:
              <span class="font-medium text-gray-800 text-sm sm:text-base">
                {{ repair?.tech_position || '-' }}
              </span>
            </p>
          </div>

          <div class="border border-gray-200 rounded-lg p-3 sm:p-4">
            <p class="text-xs sm:text-sm text-gray-500">แจ้งซ่อมเมื่อ</p>
            <p class="font-medium text-gray-800 text-sm sm:text-base">
              {{ formatThaiLongDate(repair?.rf_create_at) }}
            </p>
          </div>
        </div>
      </div>

      <div class="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <div class="border-b border-gray-300 pb-2 mb-4">
              <h2 class="text-lg font-semibold text-gray-800">สถานที่และอุปกรณ์</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
              <div class="space-y-4">
                <div class="flex items-start gap-3">
                  <div
                    class="min-w-[42px] min-h-[42px] sm:min-w-[46px] sm:min-h-[46px] flex items-center justify-center rounded-lg bg-blue-500">
                    <Icon icon="lucide:building" width="36" height="36" style="color: #ffffff" />
                  </div>
                  <div>
                    <span class="text-sm sm:text-base leading-tight text-gray-500 block">
                      อาคาร/ชั้น/ห้อง:
                    </span>
                    <span class="text-sm sm:text-base leading-tight text-gray-700 block tracking-wide break-all">
                      {{ repair?.building_name || '-' }}/{{ repair?.floor_name || '-' }}/{{
                        repair?.room_name || '-'
                      }}
                    </span>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <div
                    class="min-w-[42px] min-h-[42px] sm:min-w-[46px] sm:min-h-[46px] flex items-center justify-center rounded-lg bg-green-500">
                    <Icon icon="mdi:paper-outline" width="36" height="36" style="color: #ffffff" />
                  </div>
                  <div class="break-word">
                    <span class="text-sm sm:text-base leading-tight text-gray-500 block">หมายเลขครุภัณฑ์:</span>
                    <span class="text-sm sm:text-base leading-tight text-gray-700 block tracking-wide">
                      {{ repair?.rf_prop_number || '-' }}
                    </span>
                  </div>
                </div>

                <div class="flex items-start gap-3">
                  <div
                    class="min-w-[42px] min-h-[42px] sm:min-w-[46px] sm:min-h-[46px] flex items-center justify-center rounded-lg bg-amber-500">
                    <Icon icon="ix:box-open" width="36" height="36" style="color: #ffffff" />
                  </div>

                  <div>
                    <span class="text-sm sm:text-base leading-tight text-gray-500 block">อุปกรณ์ที่ชำรุด:</span>
                    <span class="text-sm sm:text-base leading-tight text-gray-700 block tracking-wide">
                      {{ repair?.rf_problem || '-' }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="border border-dashed border-gray-300 rounded-lg p-2 sm:p-3">
                <template v-if="mediaFileList.length > 0">
                  <template v-if="mediaFileList.length === 1">
                    <img v-if="mediaFileList[0].isImage" :src="mediaFileList[0].fullUrl"
                      :alt="mediaFileList[0].fileName"
                      class="max-h-40 sm:max-h-56 rounded-lg object-contain w-full cursor-pointer hover:opacity-90 transition"
                      @click="openMedia(0)" />
                    <video v-else-if="mediaFileList[0].isVideo" :src="mediaFileList[0].fullUrl" controls
                      class="max-h-40 sm:max-h-56 rounded-lg w-full cursor-pointer" @click="openMedia(0)">
                      เบราว์เซอร์ของคุณไม่สามารถเล่นวิดีโอได้
                    </video>
                  </template>

                  <template v-else>
                    <div class="grid grid-cols-2 gap-2">
                      <template v-for="(file, index) in mediaFileList.slice(0, 3)" :key="index">
                        <div class="relative">
                          <img v-if="file.isImage" :src="file.fullUrl" :alt="file.fileName"
                            class="h-20 sm:h-24 w-full rounded-lg object-cover cursor-pointer hover:opacity-90 transition"
                            @click="openMedia(index)" />
                          <video v-else-if="file.isVideo" :src="file.fullUrl"
                            class="h-20 sm:h-24 w-full rounded-lg object-cover" muted @click="openMedia(index)"></video>

                          <div v-if="file.isVideo"
                            class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg cursor-pointer"
                            @click="openMedia(index)">
                            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                d="M6.3 2.84A1 1 0 004 3.75v12.5a1 1 0 001.65.76L17.3 10.76a1 1 0 000-1.52L5.65 3.08z" />
                            </svg>
                          </div>
                        </div>
                      </template>

                      <div v-if="mediaFileList.length > 3"
                        class="h-20 sm:h-24 rounded-lg bg-gray-100 flex items-center justify-center cursor-pointer"
                        @click="openMedia(3)">
                        <span class="text-gray-500 font-medium">+{{ mediaFileList.length - 3 }}</span>
                      </div>
                    </div>
                  </template>
                </template>

                <template v-else>
                  <div class="flex items-center justify-center text-gray-400 text-xs sm:text-sm min-h-[80px]">
                    ไม่มีการแนบไฟล์
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4 border-b border-gray-300 pb-2 mb-4">
              <h2 class="text-lg font-semibold text-gray-800">รายการเบิก</h2>
              <div v-if="
                canAccept &&
                repair?.rf_user_status !== 'done' &&
                repair?.rf_user_status !== 'pending'
              " class="relative">
                <BaseButtonComponent @click="openReturnModal"
                  class="border-2 border-gray-400 p-2 text-gray-500 rounded-lg hover:bg-gray-100 text-sm">
                  <Icon icon="oui:return-key" width="24" height="24" style="color: gray" />
                  คืนอุปกรณ์
                </BaseButtonComponent>
              </div>
            </div>

            <div v-if="repair?.stock_items?.length" class="space-y-4 h-[250px] overflow-y-auto">
              <div v-for="(item, i) in repair.stock_items" :key="i" class="flex items-center justify-between py-1 p-3"
                :class="{
                  'border-b border-gray-200': i < repair.stock_items.length - 1,
                }">
                <!-- LEFT -->
                <div class="flex-1 pr-4">
                  <p class="text-gray-800 font-semibold text-sm mb-1">
                    {{ item.name }}
                  </p>

                  <p class="text-xs text-gray-500">
                    หมายเลขวัสดุ/ครุภัณฑ์:
                    <span class="text-gray-700 font-medium">
                      {{ item.assetCode || '-' }}
                    </span>
                  </p>
                </div>

                <!-- RIGHT -->
                <div class="flex flex-col items-end gap-1">
                  <div class="flex justify-end w-full mb-1" v-html="getStockStatusBadge(item.status)"></div>

                  <div class="text-xs text-gray-500 flex justify-between w-full">
                    <span>จำนวน</span>
                    <span class="text-gray-700 font-semibold"> {{ item.qty }} ชิ้น </span>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-center text-gray-400 text-sm sm:text-base py-8 h-[250px]">
              - ไม่มีรายการเบิก -
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <div class="border-b border-gray-300 pb-2 mb-4 flex items-center gap-2">
              <Icon icon="fluent:person-12-filled" width="40" height="40" style="color: #8e8e8e" />
              <h2 class="text-base sm:text-lg font-semibold text-gray-800">ข้อมูลผู้แจ้ง</h2>
            </div>

            <div class="space-y-2 text-gray-700 text-sm sm:text-base">
              <p><span class="text-gray-500">ชื่อ:</span> {{ repair?.reporter?.name || '-' }}</p>
              <p>
                <span class="text-gray-500">เบอร์โทร:</span>
                {{ repair?.reporter?.phone ? toDisplay(repair.reporter.phone) : '-' }}
              </p>
              <p>
                <span class="text-gray-500">หน่วยงาน:</span>
                {{ repair?.reporter?.department || '-' }}
              </p>
            </div>
          </div>

          <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-[427px]">
            <div class="border-b border-gray-300 pb-2 mb-4 flex items-center gap-2">
              <Icon icon="fluent:clock-16-filled" width="40" height="40" style="color: #8e8e8e" />
              <h2 class="text-base sm:text-lg font-semibold text-gray-800">สถานะการดำเนินงาน</h2>
            </div>

            <RepairStatusTimeline :timeline-steps="repair?.timeline || []" />
          </div>
          <!-- ✅ ปุ่มมอบหมายงาน (อยู่นอกกรอบสถานะงาน) -->
          <div v-if="canAssign && repair?.rf_user_status !== 'done'" class="mt-4">
            <button :disabled="isAssigned" @click="openAssignPopup" :class="[
              'w-full px-6 py-3.5 text-sm sm:text-base font-semibold rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-3',
              isAssigned
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            ]">
              <Icon icon="mdi:account-plus-outline" width="24" height="24" />
              {{ isAssigned ? 'มอบหมายแล้ว' : 'มอบหมายงาน' }}
            </button>
          </div>
          <div v-if="showWithdrawButton || (canAccept && repair?.rf_user_status !== 'done')">
            <div :class="['grid gap-4', showWithdrawButton ? 'grid-cols-2' : 'grid-cols-1']">
              <button v-if="showWithdrawButton" type="button"
                class="w-full px-6 py-3.5 text-sm sm:text-base font-semibold rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-3 hover:shadow-lg hover:-translate-y-0.5 bg-blue-600 hover:bg-blue-700 text-white"
                @click="handleRepairFrom(repair?.rf_code)">
                <Icon icon="ix:box-open" width="24" height="24" style="color: #ffffff" />
                เบิกวัสดุ/อุปกรณ์
              </button>

              <div v-if="canAccept && repair?.rf_user_status !== 'done'" class="relative">
                <button @click="
                  repair?.rf_user_status === 'pending'
                    ? openActionPopup()
                    : repair?.rf_user_status === 'outsource'
                      ? confirmCloseJobWithSummary()
                      : openActionPopup()
                  " :class="[
                    'w-full px-6 py-3.5 text-sm sm:text-base font-semibold rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-3 text-white hover:shadow-lg hover:-translate-y-0.5',
                    repair?.rf_user_status === 'pending'
                      ? 'bg-teal-500 hover:bg-teal-600'
                      : repair?.rf_user_status === 'outsource'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-amber-500 hover:bg-amber-600',
                  ]">
                  <Icon icon="fa7-solid:rotate" width="24" height="24" style="color: #ffffff" />
                  <span>
                    {{
                      repair?.rf_user_status === 'pending'
                        ? 'รับงาน'
                        : repair?.rf_user_status === 'outsource'
                          ? 'เสร็จสิ้น'
                          : 'เปลี่ยนสถานะ'
                    }}
                  </span>
                </button>

                <!-- Popup เลือกสถานะ (dropdown) -->
                <div v-if="showStatusPopup"
                  class="absolute bottom-full mb-2 right-0 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                  <!-- หน้าเลือกตัวเลือก -->
                  <div class="p-3">
                    <div class="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                      <div class="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center">
                        <Icon icon="fa7-solid:rotate" width="16" height="16" style="color: #ffffff" />
                      </div>
                      <div>
                        <h3 class="text-xs font-bold text-gray-800">เปลี่ยนสถานะงาน</h3>
                      </div>
                      <button @click="closeStatusPopup" class="ml-auto p-1 hover:bg-gray-100 rounded transition">
                        <Icon icon="radix-icons:cross-2" width="24" height="24" style="color: #8e8e8e" />
                      </button>
                    </div>

                    <div class="space-y-1.5">
                      <!-- ปิดงาน -->
                      <button @click="handleSelectStatus('done')"
                        class="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-green-50 transition-all duration-200 group">
                        <div
                          class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center group-hover:bg-green-200 transition">
                          <Icon icon="fluent:checkmark-32-filled" width="18" height="18" style="color: #ffffff" />
                        </div>
                        <div class="text-left">
                          <p class="text-sm font-medium text-gray-800 group-hover:text-green-700">
                            ปิดงาน
                          </p>
                          <p class="text-xs text-gray-400">ดำเนินการเสร็จสิ้นแล้ว</p>
                        </div>
                      </button>

                      <!-- จ้างช่างภายนอก (ไม่แสดงถ้าสถานะเป็น outsource อยู่แล้ว) -->
                      <button v-if="repair?.rf_user_status !== 'outsource'" @click="handleSelectStatus('outsource')"
                        class="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-amber-50 transition-all duration-200 group">
                        <div
                          class="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center group-hover:bg-amber-200 transition">
                          <Icon icon="fluent:people-community-12-regular" width="18" height="18"
                            style="color: #ffffff" />
                        </div>
                        <div class="text-left">
                          <p class="text-sm font-medium text-gray-800 group-hover:text-amber-700">
                            จ้างช่างภายนอก
                          </p>
                          <p class="text-xs text-gray-400">ส่งต่องานให้ผู้รับเหมา</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <assignJobModalComponent v-if="showAssignPopup" :repairCode="repair?.rf_code" :isOpen="showAssignPopup"
      @close="showAssignPopup = false" @completed="handleAssignSuccess" />

    <AcceptJobModalComponent v-if="showAcceptPopup" :repairCode="repair?.rf_code" :isOpen="showAcceptPopup"
      :currentUserId="currentUserId" @close="showAcceptPopup = false" @success="handleAcceptSuccess" />

    <!-- Modal สำหรับกรอกรายละเอียดการตรวจสอบ/ซ่อม -->
    <div v-if="showTechSummaryModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm"
      @click.self="showTechSummaryModal = false">
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-5 text-center border-b border-gray-100">
          <h3 class="text-xl font-bold text-gray-800">รายละเอียดการดำเนินการ</h3>
        </div>

        <div class="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <!-- 1. วิธีการซ่อม (ซ่อนถ้าเป็น outsource อยู่แล้ว) -->
          <div v-if="repairMethod !== 'outsource'">
            <label class="block text-sm font-semibold text-gray-700 mb-2">1. สำหรับเจ้าหน้าที่ ตรวจสอบ/ซ่อม</label>
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
                class="mt-2 w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <!-- 2. รายละเอียดการทำงาน -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">{{ repairMethod === 'outsource' ? '1' : '2'
              }}.
              รายละเอียดการตรวจสอบ/ซ่อม</label>
            <textarea v-model="techSummary" placeholder="กรอกรายละเอียด..."
              class="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
              maxlength="500"></textarea>
            <div class="text-right text-xs text-gray-400 mt-1">{{ techSummary.length }}/500</div>
          </div>

          <!-- 3. สรุปผล -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">{{ repairMethod === 'outsource' ? '2' : '3'
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
                " class="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div class="p-5 border-t border-gray-100 flex gap-3">
          <button @click="showTechSummaryModal = false"
            class="flex-1 py-3 px-6 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">
            ยกเลิก
          </button>
          <button @click="confirmCloseJob" :disabled="!techSummary.trim()" :class="[
            'flex-1 py-3 px-6 rounded-xl font-medium transition-colors text-white',
            techSummary.trim()
              ? 'bg-blue-600 hover:bg-blue-700'
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
        class="absolute top-6 right-6 text-white hover:text-gray-300 transition p-2 bg-white/10 rounded-full">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div class="relative w-full max-w-5xl h-[70vh] flex items-center justify-center">
        <button v-if="currentMediaIndex > 0" @click="prevMedia"
          class="absolute left-0 z-10 p-4 text-white hover:bg-white/10 rounded-full transition">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div class="w-full h-full flex items-center justify-center">
          <img v-if="mediaFileList[currentMediaIndex].isImage" :src="mediaFileList[currentMediaIndex].fullUrl"
            class="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          <video v-else-if="mediaFileList[currentMediaIndex].isVideo" :src="mediaFileList[currentMediaIndex].fullUrl"
            controls autoplay class="max-w-full max-h-full rounded-lg shadow-2xl"></video>
        </div>

        <button v-if="currentMediaIndex < mediaFileList.length - 1" @click="nextMedia"
          class="absolute right-0 z-10 p-4 text-white hover:bg-white/10 rounded-full transition">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div class="mt-8 text-white text-center">
        <p class="text-lg font-medium">{{ mediaFileList[currentMediaIndex].fileName }}</p>
        <p class="text-sm text-gray-400 mt-1">
          ไฟล์ที่ {{ currentMediaIndex + 1 }} จาก {{ mediaFileList.length }}
        </p>
      </div>
    </div>
  </div>
  ั <!-- Return Modal -->
  <div v-if="showReturnModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-lg w-[500px] max-h-[80vh] overflow-auto">
      <!-- Header -->
      <div class="flex justify-between items-center p-4 border-b">
        <h2 class="text-lg font-semibold">คืนอุปกรณ์</h2>
        <button @click="closeReturnModal">✕</button>
      </div>

      <!-- Body -->
      <div class="p-4 space-y-3">
        <!-- Select All -->
        <div class="flex items-center justify-between border-b pb-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" :checked="selectedReturnItems.length === returnableItems.length && returnableItems.length > 0
              " @change="toggleSelectAll" />
            เลือกทั้งหมด
          </label>

          <span class="text-sm text-gray-500"> เลือก {{ selectedReturnItems.length }} รายการ </span>
        </div>

        <!-- Empty -->
        <div v-if="returnableItems.length === 0" class="text-gray-500 text-sm">
          ไม่มีรายการที่สามารถคืนได้
        </div>

        <!-- Items -->
        <div v-for="item in returnableItems" :key="item.sf_code + '-' + item.id"
          class="flex justify-between items-center border rounded-lg p-3">
          <label class="flex items-center gap-3 cursor-pointer flex-1">
            <input type="checkbox" :checked="selectedReturnItems.some((i) => i.sf_code === item.sf_code && i.id === item.id)
              " @change="toggleReturnItem(item)" />

            <div>
              <div class="font-medium">{{ item.name }}</div>

              <div class="text-sm text-gray-500">จำนวนที่ยังคืนได้: {{ item.qty }}</div>

              <!-- input ใหม่ -->
              <input type="number" min="1" :max="item.qty" v-model.number="item.returnQty"
                @input="validateReturnQty(item)" class="mt-1 border rounded px-2 py-1 w-20" @click.stop />
            </div>
          </label>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t flex justify-end gap-2">
        <button @click="closeReturnModal" class="px-4 py-2 border rounded-lg hover:bg-gray-100">
          ยกเลิก
        </button>

        <button @click="returnSelectedItems" :disabled="selectedReturnItems.length === 0"
          class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
          คืนที่เลือก
        </button>
      </div>
    </div>
  </div>
</template>
