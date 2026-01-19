<script setup>
/** * การนำเข้า Library และ Component
 */
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { usePhoneFormat } from "@/composables/usePhoneFormat"

/**
 * การกำหนด Options / Props
 */
defineOptions({ name: 'RepairEditView' })

/**
 * การประกาศตัวแปรและค่าคงที่
 */
const route = useRoute()
const router = useRouter()
const { toDisplay } = usePhoneFormat()

const repairCode = route.params.code
const API_BASE_URL = import.meta.env.VITE_API_BASE
const MAX_FILE_COUNT = 5
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

const isSubmitting = ref(false)
const isDragOver = ref(false)
const showPreviewModal = ref(false)
const currentPreviewIndex = ref(0)

// ข้อมูลหลักในฟอร์มแจ้งซ่อม
const repairFormData = ref({
  reporterName: '',
  phoneNumber: '',
  department: '',
  repairType: '',
  repairTypeList: [],
  building: '',
  buildingList: [],
  floor: '',
  floorList: [],
  room: '',
  roomList: [],
  assetCode: '',
  problemDetail: '',
  issueDescription: '',
  urgency: '',
  uploadedFileList: [],
})

// ข้อมูลข้อผิดพลาดของแต่ละฟิลด์
const errorData = ref({
  repairType: '',
  building: '',
  floor: '',
  room: '',
  problemDetail: '',
  issueDescription: '',
  urgency: '',
})

const filePreviewList = ref([]) // รายการไฟล์สำหรับแสดงผล Preview
const existingFileList = ref([]) // รายการ Path ไฟล์เดิมที่มีอยู่ในระบบ

// ระดับความเร่งด่วน
const URGENCY_LEVEL_LIST = [
  { label: 'เร่งด่วนมาก', value: 'high', border: 'border-red-600', bg: 'bg-red-600' },
  { label: 'เร่งด่วน', value: 'medium', border: 'border-amber-400', bg: 'bg-amber-400' },
  { label: 'ไม่เร่งด่วน', value: 'low', border: 'border-green-600', bg: 'bg-green-600' },
]

/**
 *  ส่วนของฟังก์ชัน
 */

// ดึงข้อมูลประเภทงานซ่อม
async function fetchRepairTypeList() {
  try {
    const response = await fetch(`${API_BASE_URL}/technician-types`)
    if (!response.ok) throw new Error('โหลดข้อมูลประเภทไม่สำเร็จ')
    const data = await response.json()
    repairFormData.value.repairTypeList = data.map((item) => ({
      id: Number(item.tt_id),
      name: item.tt_name,
    }))
  } catch (err) {
    console.error('โหลดประเภทงานไม่สำเร็จ:', err)
  }
}

// ดึงข้อมูลอาคาร
async function fetchBuildingList() {
  try {
    const response = await fetch(`${API_BASE_URL}/buildings`)
    if (!response.ok) throw new Error('โหลดข้อมูลอาคารไม่สำเร็จ')
    const data = await response.json()
    repairFormData.value.buildingList = data.map((b) => ({
      id: Number(b.building_id),
      name: b.building_name,
    }))
  } catch (err) {
    console.error('โหลดอาคารไม่สำเร็จ:', err)
  }
}

// ดึงข้อมูลชั้นตามอาคารที่เลือก
async function fetchFloorList(buildingId) {
  if (!buildingId) return
  try {
    const response = await fetch(`${API_BASE_URL}/floors/${buildingId}`)
    if (!response.ok) throw new Error('โหลดข้อมูลชั้นไม่สำเร็จ')
    const data = await response.json()
    repairFormData.value.floorList = data.map((f) => ({
      id: Number(f.floor_id),
      name: f.floor_name,
    }))
  } catch (err) {
    console.error('โหลดชั้นไม่สำเร็จ:', err)
  }
}

// ดึงข้อมูลห้องตามชั้นที่เลือก
async function fetchRoomList(floorId) {
  if (!floorId) return
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${floorId}`)
    if (!response.ok) throw new Error('โหลดข้อมูลห้องไม่สำเร็จ')
    const data = await response.json()
    repairFormData.value.roomList = data.map((r) => ({
      id: Number(r.room_id),
      name: r.room_name,
    }))
  } catch (err) {
    console.error('โหลดห้องไม่สำเร็จ:', err)
  }
}

// จัดการการอัปโหลดไฟล์ผ่านการเลือกไฟล์
function onFileUpload(event) {
  const fileList = Array.from(event.target.files)
  processFileList(fileList)
}

function onDragOver(event) {
  event.preventDefault()
  isDragOver.value = true
}

function onDragLeave(event) {
  event.preventDefault()
  isDragOver.value = false
}

function onDrop(event) {
  event.preventDefault()
  isDragOver.value = false
  const fileList = Array.from(event.dataTransfer.files)
  if (fileList.length > 0) {
    processFileList(fileList)
  }
}

// ตรวจสอบและประมวลผลไฟล์
function processFileList(fileList) {
  // ตรวจสอบจำนวนไฟล์สูงสุด
  if (repairFormData.value.uploadedFileList.length + fileList.length > MAX_FILE_COUNT) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true
    })
    Toast.fire({
      title: 'ไฟล์เกินกำหนด',
      text: `สามารถอัพโหลดได้สูงสุด ${MAX_FILE_COUNT} ไฟล์`,
      icon: 'warning'
    })
    return
  }

  // ตรวจสอบประเภทไฟล์ที่อนุญาต
  const allowedTypeList = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
  ]
  const invalidFileList = fileList.filter((file) => !allowedTypeList.includes(file.type))

  if (invalidFileList.length > 0) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true
    })
    Toast.fire({
      title: 'ประเภทไฟล์ไม่ถูกต้อง',
      text: 'รองรับเฉพาะไฟล์รูปภาพและวิดีโอที่กำหนด',
      icon: 'error'
    })
    return
  }

  // ตรวจสอบขนาดไฟล์
  const oversizedFileList = fileList.filter((file) => file.size > MAX_FILE_SIZE)
  if (oversizedFileList.length > 0) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true
    })
    Toast.fire({
      title: 'ไฟล์ใหญ่เกินไป',
      text: 'ขนาดไฟล์ต้องไม่เกิน 50MB',
      icon: 'error'
    })
    return
  }

  // สร้างรายการ Preview และเก็บไฟล์ลงใน State
  fileList.forEach((file) => {
    repairFormData.value.uploadedFileList.push(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      filePreviewList.value.push({
        name: file.name,
        size: file.size,
        type: file.type,
        url: e.target.result,
        isImage: file.type.startsWith('image/'),
        isVideo: file.type.startsWith('video/'),
        fromServer: false,
        serverPath: null,
        fileRef: file,
      })
    }
    reader.readAsDataURL(file)
  })
}

// ลบไฟล์ออกจากรายการ (ทั้งไฟล์ใหม่และไฟล์เดิมจากเซิร์ฟเวอร์)
function deleteFile(index) {
  const item = filePreviewList.value[index]

  // กรณีเป็นไฟล์เดิมจากเซิร์ฟเวอร์
  if (item?.fromServer && item.serverPath) {
    const filename = item.serverPath.split('/').pop()
    fetch(`${API_BASE_URL}/delete-file/${filename}`, {
      method: 'DELETE',
    }).catch((err) => {
      console.error('ลบไฟล์บนเซิร์ฟเวอร์ไม่สำเร็จ:', err)
    })
    existingFileList.value = existingFileList.value.filter((p) => p !== item.serverPath)
  }

  // กรณีเป็นไฟล์ที่เพิ่มมาใหม่
  if (!item?.fromServer && item.fileRef) {
    repairFormData.value.uploadedFileList = repairFormData.value.uploadedFileList.filter((f) => f !== item.fileRef)
  }

  filePreviewList.value.splice(index, 1)
}

// จัดการ Modal Preview
function openPreview(index) {
  currentPreviewIndex.value = index
  showPreviewModal.value = true
}

function closePreview() {
  showPreviewModal.value = false
}

function nextPreview() {
  if (currentPreviewIndex.value < filePreviewList.value.length - 1) {
    currentPreviewIndex.value++
  }
}

function prevPreview() {
  if (currentPreviewIndex.value > 0) {
    currentPreviewIndex.value--
  }
}

// ถอดรหัส Token เพื่อดึงข้อมูลผู้ใช้
function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch (err) {
    console.error('ไม่สามารถ decode token ได้:', err)
    return {}
  }
}

// ดึงข้อมูลรายละเอียดการแจ้งซ่อมเดิม
async function fetchRepairDetail() {
  try {
    const response = await fetch(`${API_BASE_URL}/repair-requests/${repairCode}`)
    if (!response.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
    const data = await response.json()

    const typeId = data.repair_type_id ? Number(data.repair_type_id) : ''
    const buildingId = data.building_id ? Number(data.building_id) : ''
    const floorId = data.floor_id ? Number(data.floor_id) : ''
    const roomId = data.room_id ? Number(data.room_id) : ''

    await fetchFloorList(buildingId)
    await fetchRoomList(floorId)

    repairFormData.value.repairType = typeId
    repairFormData.value.building = buildingId
    repairFormData.value.floor = floorId
    repairFormData.value.room = roomId
    repairFormData.value.assetCode = data.rf_prop_number || ''
    repairFormData.value.problemDetail = data.rf_problem || ''
    repairFormData.value.issueDescription = data.rf_detail || ''
    repairFormData.value.urgency = data.rf_urgency || 'medium'

    const images = Array.isArray(data.rf_image) ? data.rf_image : []
    existingFileList.value = images

    filePreviewList.value = []
    images.forEach((path) => {
      const filename = path.split('/').pop()
      const isVideo = /\.(mp4|avi|mov|wmv)$/i.test(path)
      filePreviewList.value.push({
        name: filename,
        size: null,
        type: isVideo ? 'video/*' : 'image/*',
        url: `${API_BASE_URL}${path}`,
        isImage: !isVideo,
        isVideo,
        fromServer: true,
        serverPath: path,
        fileRef: null,
      })
    })
  } catch (err) {
    console.error('โหลดข้อมูลใบแจ้งซ่อมไม่สำเร็จ:', err)
  }
}

// ตรวจสอบความถูกต้องของข้อมูลในฟอร์ม
function validateFormData() {
  let isValid = true
  errorData.value = {
    repairType: '', building: '', floor: '', room: '',
    problemDetail: '', issueDescription: '', urgency: '',
  }

  if (!repairFormData.value.repairType) {
    errorData.value.repairType = 'กรุณาเลือกประเภทงานซ่อม'
    isValid = false
  }
  if (!repairFormData.value.building) {
    errorData.value.building = 'กรุณาเลือกอาคาร'
    isValid = false
  }
  if (!repairFormData.value.floor) {
    errorData.value.floor = 'กรุณาเลือกชั้น'
    isValid = false
  }
  if (!repairFormData.value.room) {
    errorData.value.room = 'กรุณาเลือกห้อง'
    isValid = false
  }
  if (!repairFormData.value.problemDetail.trim()) {
    errorData.value.problemDetail = 'กรุณากรอกหัวข้อปัญหา'
    isValid = false
  }
  if (!repairFormData.value.issueDescription.trim()) {
    errorData.value.issueDescription = 'กรุณากรอกสาเหตุ/อาการเสีย'
    isValid = false
  }

  return isValid
}

// ตรวจสอบความถูกต้องรายฟิลด์
function validateField(fieldName) {
  switch (fieldName) {
    case 'repairType':
      errorData.value.repairType = repairFormData.value.repairType ? '' : 'กรุณาเลือกประเภทงานซ่อม'
      break
    case 'building':
      errorData.value.building = repairFormData.value.building ? '' : 'กรุณาเลือกอาคาร'
      break
    case 'floor':
      errorData.value.floor = repairFormData.value.floor ? '' : 'กรุณาเลือกชั้น'
      break
    case 'room':
      errorData.value.room = repairFormData.value.room ? '' : 'กรุณาเลือกห้อง'
      break
    case 'problemDetail':
      errorData.value.problemDetail = repairFormData.value.problemDetail.trim() ? '' : 'กรุณากรอกหัวข้อปัญหา'
      break
    case 'issueDescription':
      errorData.value.issueDescription = repairFormData.value.issueDescription.trim() ? '' : 'กรุณากรอกสาเหตุ/อาการเสีย'
      break
  }
}

// ส่งข้อมูลบันทึกการแก้ไข
async function submitRepairEdit() {
  if (!validateFormData()) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true
    })
    Toast.fire({
      title: 'ข้อมูลไม่ครบถ้วน',
      text: 'กรุณากรอกข้อมูลให้ครบถ้วนตามที่กำหนด',
      icon: 'warning'
    })
    return
  }

  const confirm = await Swal.fire({
    title: 'ยืนยันการบันทึกข้อมูล?',
    text: 'คุณต้องการบันทึกการแก้ไขใบแจ้งซ่อมนี้หรือไม่',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#1E48D1',
  })

  if (!confirm.isConfirmed) return

  Swal.fire({
    title: 'กำลังบันทึก...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  })

  try {
    isSubmitting.value = true
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) throw new Error('Token not found')

    const userPayload = decodeJwt(token)
    const formDataToSend = new FormData()
    formDataToSend.append('us_id', userPayload.us_id)
    formDataToSend.append('phone_number', repairFormData.value.phoneNumber)
    formDataToSend.append('repair_type_id', repairFormData.value.repairType)
    formDataToSend.append('room_id', repairFormData.value.room)
    formDataToSend.append('asset_code', repairFormData.value.assetCode || '')
    formDataToSend.append('problem_detail', repairFormData.value.problemDetail)
    formDataToSend.append('issue_description', repairFormData.value.issueDescription)
    formDataToSend.append('urgency', repairFormData.value.urgency || 'medium')
    formDataToSend.append('existing_files', JSON.stringify(existingFileList.value || []))

    repairFormData.value.uploadedFileList.forEach((file) => {
      formDataToSend.append('files', file)
    })

    const response = await fetch(`${API_BASE_URL}/repair-requests-with-files/${repairCode}`, {
      method: 'PUT',
      body: formDataToSend,
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'บันทึกข้อมูลไม่สำเร็จ')

    Swal.close()
    const toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true
    })
    toast.fire({
      title: 'บันทึกสำเร็จ!',
      text: 'แก้ไขใบแจ้งซ่อมเรียบร้อยแล้ว',
      icon: 'success'
    })
    router.push('/main/my-list')
  } catch (err) {
    Swal.close()
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    })
    Toast.fire({
      title: 'บันทึกไม่สำเร็จ',
      text: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      icon: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}

// ยกเลิกการแก้ไข
async function cancelRepairEdit() {
  const confirm = await Swal.fire({
    title: 'ยกเลิกการแก้ไขข้อมูล?',
    text: 'ข้อมูลที่กรอกจะไม่ถูกบันทึก',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ยกเลิกการแก้ไข',
    cancelButtonText: 'กลับไปแก้ไข',
    confirmButtonColor: '#e53e3e',
  })
  if (confirm.isConfirmed) {
    router.push('/main/my-list')
  }
}

/**
 * [1.1.7] Lifecycle Hooks
 */
onMounted(async () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (token) {
    const userPayload = decodeJwt(token)
    repairFormData.value.reporterName =
      `${userPayload.us_prefix_th || ''}${userPayload.us_first_name_th || ''} ${userPayload.us_last_name_th || ''}`.trim()
    repairFormData.value.phoneNumber = toDisplay(userPayload.us_tel || '')
    repairFormData.value.department = userPayload.us_department || ''
  }

  await Promise.all([fetchRepairTypeList(), fetchBuildingList()])
  await fetchRepairDetail()
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md mx-auto max-w-7xl p-4 sm:p-8 lg:p-12">
    <div class="mb-6">
      <h1 class="text-lg sm:text-xl font-bold text-black">แก้ไขแบบฟอร์มแจ้งซ่อม</h1>
    </div>
    <div class="mx-auto max-w-6xl">
      <form class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              ลงชื่อผู้แจ้ง <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">ชื่อ–นามสกุลของผู้ที่ทำการแจ้งปัญหา</p>
            <input
              v-model="repairFormData.reporterName"
              type="text"
              class="w-full text-xm bg-gray-100 border border-neutral-400 rounded-md cursor-not-allowed placeholder-[#A1A1A1] text-sm px-3 py-2"
              readonly
            />
          </div>

          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              เบอร์โทรศัพท์ <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">เบอร์โทรศัพท์ที่สามารถติดต่อกลับได้</p>
            <input
              v-model="repairFormData.phoneNumber"
              type="text"
              class="w-full text-xm bg-gray-100 border border-neutral-400 rounded-md cursor-not-allowed placeholder-[#A1A1A1] text-sm px-3 py-2"
              readonly
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              หน่วยงาน <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">ชื่อหน่วยงานหรือแผนกที่สังกัด</p>
            <input
              v-model="repairFormData.department"
              type="text"
              class="w-full text-xm bg-gray-100 border border-neutral-400 rounded-md cursor-not-allowed placeholder-[#A1A1A1] text-sm px-3 py-2"
              readonly
            />
          </div>

          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              ประเภท <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">โปรดเลือกประเภทงานหรือสิ่งของที่ต้องการซ่อม</p>
            <select
              v-model="repairFormData.repairType"
              @change="validateField('repairType')"
              :class="[
                'w-full text-xm bg-white border rounded-md text-neutral-700 text-sm px-3 py-2',
                errorData.repairType ? 'border-red-500' : 'border-neutral-400',
              ]"
            >
              <option value="">กรุณาเลือกประเภท</option>
              <option v-for="type in repairFormData.repairTypeList" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>
            <p v-if="errorData.repairType" class="text-red-500 text-xs sm:text-sm mt-1">
              {{ errorData.repairType }}
            </p>
          </div>

          <div>
            <label class="text-base font-medium text-black">หมายเลขครุภัณฑ์</label>
            <p class="text-neutral-400 text-xs mb-2">กรอกหมายเลขครุภัณฑ์ของอุปกรณ์ (ถ้ามี)</p>
            <input
              v-model="repairFormData.assetCode"
              type="text"
              class="w-full text-xm bg-white border-neutral-400 rounded-md placeholder-[#A1A1A1] text-sm px-3 py-2"
              placeholder="กรุณากรอกหมายเลขครุภัณฑ์ของอุปกรณ์ (ถ้ามี)"
            />
          </div>
        </div>

        <div>
          <label class="text-sm sm:text-base font-medium text-black">
            ขอความอนุเคราะห์ตรวจสอบ/ซ่อมแซม <span class="text-red-600">*</span>
          </label>
          <p class="text-neutral-400 text-xs mb-2">กรอกปัญหาที่ต้องการให้ตรวจสอบหรือซ่อมแซม</p>
          <input
            v-model="repairFormData.problemDetail"
            @input="validateField('problemDetail')"
            type="text"
            :class="[
              'w-full text-sm bg-white border rounded-md placeholder-[#A1A1A1] px-3 py-2',
              errorData.problemDetail ? 'border-red-500' : 'border-neutral-400',
            ]"
            placeholder="กรุณากรอกรายละเอียดปัญหา"
          />
          <p v-if="errorData.problemDetail" class="text-red-500 text-xs sm:text-sm mt-1">
            {{ errorData.problemDetail }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              อาคาร <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">โปรดระบุชื่ออาคารที่พบปัญหา</p>
            <select
              v-model="repairFormData.building"
              @change="
                () => {
                  fetchFloorList(repairFormData.building)
                  validateField('building')
                }
              "
              :class="[
                'w-full text-xm bg-white border rounded-md text-neutral-700 text-sm px-3 py-2',
                errorData.building ? 'border-red-500' : 'border-neutral-400',
              ]"
            >
              <option value="">กรุณาเลือกอาคาร</option>
              <option v-for="b in repairFormData.buildingList" :key="b.id" :value="b.id">
                {{ b.name }}
              </option>
            </select>
            <p v-if="errorData.building" class="text-red-500 text-xs sm:text-sm mt-1">
              {{ errorData.building }}
            </p>
          </div>

          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              ชั้น <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">โปรดเลือกชั้นที่พบปัญหา</p>
            <select
              v-model="repairFormData.floor"
              @change="
                () => {
                  fetchRoomList(repairFormData.floor)
                  validateField('floor')
                }
              "
              :class="[
                'w-full text-xm bg-white border rounded-md text-neutral-700 text-sm px-3 py-2',
                errorData.floor ? 'border-red-500' : 'border-neutral-400',
              ]"
            >
              <option value="">กรุณาเลือกชั้น</option>
              <option v-for="f in repairFormData.floorList" :key="f.id" :value="f.id">
                {{ f.name }}
              </option>
            </select>
            <p v-if="errorData.floor" class="text-red-500 text-xs sm:text-sm mt-1">
              {{ errorData.floor }}
            </p>
          </div>

          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              ห้อง <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">โปรดเลือกห้องหรือพื้นที่ที่พบปัญหา</p>
            <select
              v-model="repairFormData.room"
              @change="validateField('room')"
              :class="[
                'w-full text-xm bg-white border rounded-md text-neutral-700 text-sm px-3 py-2',
                errorData.room ? 'border-red-500' : 'border-neutral-400',
              ]"
            >
              <option value="">กรุณาเลือกห้อง</option>
              <option v-for="r in repairFormData.roomList" :key="r.id" :value="r.id">
                {{ r.name }}
              </option>
            </select>
            <p v-if="errorData.room" class="text-red-500 text-xs sm:text-sm mt-1">
              {{ errorData.room }}
            </p>
          </div>
        </div>

        <div class="mb-1">
          <label class="text-sm sm:text-base font-medium text-black">
            สาเหตุ / อาการเสีย <span class="text-red-600">*</span>
          </label>
          <p class="text-neutral-400 text-xs mb-2">อธิบายอาการเสียหรือสาเหตุที่พบอย่างชัดเจน</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
          <div class="flex flex-col flex-1">
            <textarea
              v-model="repairFormData.issueDescription"
              @input="validateField('issueDescription')"
              :class="[
                'flex-1 w-full min-h-[220px] sm:min-h-[280px] text-sm bg-white border rounded-md resize-none placeholder-[#A1A1A1] px-3 py-2',
                errorData.issueDescription ? 'border-red-500' : 'border-neutral-400',
              ]"
              placeholder="กรุณากรอกสาเหตุ / อาการที่เสีย"
            ></textarea>
            <p v-if="errorData.issueDescription" class="text-red-500 text-sm mt-1">
              {{ errorData.issueDescription }}
            </p>
          </div>

          <div class="flex flex-col flex-1">
            <label
              for="dropzone-file"
              :class="[
                'flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition flex-1 min-h-[220px] sm:min-h-[280px] mb-4',
                isDragOver
                  ? 'border-blue-400 bg-blue-50 scale-105'
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100',
              ]"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
              @drop="onDrop"
            >
              <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <div :class="['transition-all duration-200', isDragOver ? 'scale-110' : '']">
                  <img
                    src="/icon/image-up-icon.svg"
                    :class="['w-10 h-10 mb-2', isDragOver ? 'opacity-80' : 'opacity-70']"
                  />
                </div>

                <p
                  :class="[
                    'text-sm mb-1',
                    isDragOver ? 'text-blue-600 font-semibold' : 'text-gray-500',
                  ]"
                >
                  <span class="font-semibold">
                    {{ isDragOver ? 'วางไฟล์ที่นี่' : 'ลากไฟล์ หรือ คลิกเพื่อเลือกไฟล์' }}
                  </span>
                </p>

                <p class="text-xs text-gray-400 mt-1">
                  รองรับ: รูปภาพ, วิดีโอ (สูงสุด {{ MAX_FILE_COUNT }} ไฟล์, 50MB/ไฟล์)
                </p>
                <p class="text-xs text-gray-500 mt-1">สามารถแนบหลักฐานประกอบการแจ้งซ่อมได้</p>
              </div>
              <input
                id="dropzone-file"
                type="file"
                multiple
                accept="image/*,video/*"
                class="hidden"
                @change="onFileUpload"
              />
            </label>

            <div v-if="filePreviewList.length > 0" class="space-y-2 mb-4">
              <div
                v-for="(file, index) in filePreviewList"
                :key="index"
                class="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                @click="openPreview(index)"
              >
                <div
                  class="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-gray-200 flex items-center justify-center"
                >
                  <img
                    v-if="file.isImage"
                    :src="file.url"
                    :alt="file.name"
                    class="w-full h-full object-cover"
                  />
                  <svg
                    v-else-if="file.isVideo"
                    class="w-6 h-6 text-gray-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M6.3 2.84A1 1 0 004 3.75v12.5a1 1 0 001.65.76L17.3 10.76a1 1 0 000-1.52L5.65 3.08z"
                    />
                  </svg>
                </div>

                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">{{ file.name }}</p>
                  <p class="text-xs text-gray-500">
                    <span v-if="file.size">{{ (file.size / 1024 / 1024).toFixed(1) }} MB</span>
                  </p>
                </div>

                <button
                  @click.stop="deleteFile(index)"
                  class="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                  title="ลบไฟล์"
                >
                  ×
                </button>
              </div>
            </div>

            <div
              v-if="filePreviewList.length === 0"
              class="text-center text-gray-400 text-sm mb-4 py-2 border border-dashed border-gray-200 rounded-lg"
            >
              ไม่มีไฟล์แนบ (สามารถบันทึกฟอร์มได้โดยไม่แนบไฟล์)
            </div>

            <div class="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mt-4">
              <div
                v-for="(level, index) in URGENCY_LEVEL_LIST"
                :key="index"
                class="flex items-center gap-3 cursor-pointer select-none"
                @click="repairFormData.urgency = level.value"
              >
                <div
                  class="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 shadow-md transition-all duration-200"
                  :class="[level.border, repairFormData.urgency === level.value ? level.bg : 'bg-white']"
                ></div>
                <span class="text-base text-black font-normal">{{ level.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-center sm:justify-end mt-8">
          <button
            type="button"
            :disabled="isSubmitting"
            class="bg-gray-400 text-white px-6 py-2.5 sm:py-3 rounded-lg hover:bg-gray-500 transition disabled:opacity-50 mr-4"
            @click="cancelRepairEdit"
          >
            ยกเลิกการแก้ไข
          </button>

          <button
            type="button"
            :disabled="isSubmitting"
            class="bg-[#1E48D1] text-white px-6 py-2.5 sm:py-3 rounded-lg hover:bg-sky-700 transition disabled:opacity-50"
            @click="submitRepairEdit"
          >
            บันทึกการแก้ไข
          </button>
        </div>
      </form>
    </div>

    <div
      v-if="showPreviewModal"
      class="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
      @click="closePreview"
    >
      <div class="relative max-w-4xl max-h-full p-4" @click.stop>
        <button
          @click="closePreview"
          class="absolute -top-4 -right-4 w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white text-2xl hover:text-gray-300 hover:bg-opacity-70 z-10"
        >
          ×
        </button>

        <img
          v-if="filePreviewList[currentPreviewIndex]?.isImage"
          :src="filePreviewList[currentPreviewIndex]?.url"
          :alt="filePreviewList[currentPreviewIndex]?.name"
          class="max-w-full max-h-full object-contain"
        />

        <video
          v-else-if="filePreviewList[currentPreviewIndex]?.isVideo"
          :src="filePreviewList[currentPreviewIndex]?.url"
          controls
          autoplay
          class="max-w-full max-h-full"
          :key="currentPreviewIndex"
        >
          เบราว์เซอร์ของคุณไม่สามารถเล่นวิดีโอได้
        </video>

        <button
          v-if="filePreviewList.length > 1 && currentPreviewIndex > 0"
          @click="prevPreview"
          class="absolute -left-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white text-2xl hover:text-gray-300 hover:bg-opacity-70"
        >
          ‹
        </button>
        <button
          v-if="filePreviewList.length > 1 && currentPreviewIndex < filePreviewList.length - 1"
          @click="nextPreview"
          class="absolute -right-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white text-2xl hover:text-gray-300 hover:bg-opacity-70"
        >
          ›
        </button>

        <div
          v-if="filePreviewList.length > 1"
          class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded"
        >
          {{ currentPreviewIndex + 1 }} / {{ filePreviewList.length }}
        </div>

        <div
          class="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded"
        >
          {{ filePreviewList[currentPreviewIndex]?.name }}
        </div>
      </div>
    </div>
  </div>
</template>
