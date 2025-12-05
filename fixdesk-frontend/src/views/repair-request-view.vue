<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'

defineOptions({ name: 'RepairRequestView' })

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

const isSubmitting = ref(false)
const formData = ref({
  reporterName: '',
  phoneNumber: '',
  department: '',
  repairType: '',
  repairTypeOptions: [],
  building: '',
  buildingOptions: [],
  floor: '',
  floorOptions: [],
  room: '',
  roomOptions: [],
  assetCode: '',
  problemDetail: '',
  issueDescription: '',
  urgency: '',
  uploadedFiles: [],
})

const filePreview = ref([])
const maxFiles = 5

// Modal Preview
const showPreviewModal = ref(false)
const currentPreviewIndex = ref(0)

async function fetchTechnicianTypes() {
  try {
    const res = await fetch(`${API_BASE}/technician-types`)
    if (!res.ok) throw new Error('โหลดข้อมูลประเภทไม่สำเร็จ')
    const data = await res.json()
    formData.value.repairTypeOptions = data.map((item) => ({
      id: item.tt_id,
      name: item.tt_name,
    }))
  } catch (err) {
    console.error('โหลดประเภทงานไม่สำเร็จ:', err)
  }
}

async function fetchBuildings() {
  try {
    const res = await fetch(`${API_BASE}/buildings`)
    if (!res.ok) throw new Error('โหลดข้อมูลอาคารไม่สำเร็จ')
    const data = await res.json()
    formData.value.buildingOptions = data.map((b) => ({
      id: b.building_id,
      name: b.building_name,
    }))
  } catch (err) {
    console.error('โหลดอาคารไม่สำเร็จ:', err)
  }
}

async function fetchFloors(buildingId) {
  if (!buildingId) return
  try {
    const res = await fetch(`${API_BASE}/floors/${buildingId}`)
    if (!res.ok) throw new Error('โหลดข้อมูลชั้นไม่สำเร็จ')
    const data = await res.json()
    formData.value.floorOptions = data.map((f) => ({
      id: f.floor_id,
      name: f.floor_name,
    }))
  } catch (err) {
    console.error('โหลดชั้นไม่สำเร็จ:', err)
  }
}

async function fetchRooms(floorId) {
  if (!floorId) return
  try {
    const res = await fetch(`${API_BASE}/rooms/${floorId}`)
    if (!res.ok) throw new Error('โหลดข้อมูลห้องไม่สำเร็จ')
    const data = await res.json()
    formData.value.roomOptions = data.map((r) => ({
      id: r.room_id,
      name: r.room_name,
    }))
  } catch (err) {
    console.error('โหลดห้องไม่สำเร็จ:', err)
  }
}

// File Upload
function handleFileUpload(event) {
  const files = Array.from(event.target.files)
  processFiles(files)
}

const isDragOver = ref(false)

function handleDragOver(event) {
  event.preventDefault()
  isDragOver.value = true
}

function handleDragLeave(event) {
  event.preventDefault()
  isDragOver.value = false
}

function handleDrop(event) {
  event.preventDefault()
  isDragOver.value = false

  const files = Array.from(event.dataTransfer.files)
  if (files.length > 0) {
    processFiles(files)
  }
}

function processFiles(files) {
  // เช็คจำนวนไฟล์
  if (formData.value.uploadedFiles.length + files.length > maxFiles) {
    Swal.fire({
      title: 'ไฟล์เกินกำหนด',
      text: `สามารถอัพโหลดได้สูงสุด ${maxFiles} ไฟล์`,
      icon: 'warning',
      confirmButtonText: 'ตกลง',
    })
    return
  }

  // เช็คประเภทไฟล์
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
  ]
  const invalidFiles = files.filter((file) => !allowedTypes.includes(file.type))

  if (invalidFiles.length > 0) {
    Swal.fire({
      title: 'ประเภทไฟล์ไม่ถูกต้อง',
      text: 'รองรับเฉพาะไฟล์รูปภาพ (jpg, png, gif, webp) และวิดีโอ (mp4, avi, mov, wmv)',
      icon: 'error',
      confirmButtonText: 'ตกลง',
    })
    return
  }

  // เช็คขนาดไฟล์ (50MB)
  const maxSize = 50 * 1024 * 1024
  const oversizedFiles = files.filter((file) => file.size > maxSize)
  if (oversizedFiles.length > 0) {
    Swal.fire({
      title: 'ไฟล์ใหญ่เกินไป',
      text: 'ขนาดไฟล์ต้องไม่เกิน 50MB',
      icon: 'error',
      confirmButtonText: 'ตกลง',
    })
    return
  }

  // เพิ่มไฟล์และสร้าง preview
  files.forEach((file) => {
    formData.value.uploadedFiles.push(file)

    const reader = new FileReader()
    reader.onload = (e) => {
      filePreview.value.push({
        name: file.name,
        size: file.size,
        type: file.type,
        url: e.target.result,
        isImage: file.type.startsWith('image/'),
        isVideo: file.type.startsWith('video/'),
      })
    }
    reader.readAsDataURL(file)
  })
}

// ลบไฟล์
function removeFile(index) {
  formData.value.uploadedFiles.splice(index, 1)
  filePreview.value.splice(index, 1)
}

// Modal Preview Functions
function openPreview(index) {
  currentPreviewIndex.value = index
  showPreviewModal.value = true
}

function closePreview() {
  showPreviewModal.value = false
}

function nextPreview() {
  if (currentPreviewIndex.value < filePreview.value.length - 1) {
    currentPreviewIndex.value++
  }
}

function prevPreview() {
  if (currentPreviewIndex.value > 0) {
    currentPreviewIndex.value--
  }
}

// Urgency Options
const urgencyLevels = [
  { label: 'เร่งด่วนมาก', value: 'high', border: 'border-red-600', bg: 'bg-red-600' },
  { label: 'เร่งด่วน', value: 'medium', border: 'border-amber-400', bg: 'bg-amber-400' },
  { label: 'ไม่เร่งด่วน', value: 'low', border: 'border-green-600', bg: 'bg-green-600' },
]

// JWT Decode
function parseJwt(token) {
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

onMounted(() => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) return

  const payload = parseJwt(token)
  formData.value.reporterName =
    `${payload.us_prefix_th || ''}${payload.us_first_name_th || ''} ${payload.us_last_name_th || ''}`.trim()
  formData.value.phoneNumber = payload.us_tel || ''
  formData.value.department = payload.us_department || ''

  fetchTechnicianTypes()
  fetchBuildings()
})

async function handleSubmit() {
   // เช็กฟิลด์อื่น ๆ ตามปกติ
  if (!validateForm()) {
    Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาตรวจสอบช่องที่มีเครื่องหมาย *', 'error')
    return
  }
  // เช็กความเร่งด่วน
  if (!formData.value.urgency) {
    await Swal.fire({
      title: 'ยังไม่ได้เลือกความเร่งด่วน',
      text: 'กรุณาเลือกระดับความเร่งด่วนก่อนส่งแบบฟอร์ม',
      icon: 'warning',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#f59e0b',
    })
    return
  }

  const confirm = await Swal.fire({
    title: 'ยืนยันการส่งแบบฟอร์มแจ้งซ่อม?',
    text: 'กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยัน',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#1E48D1',
    cancelButtonColor: '#9CA3AF',
  })
  if (!confirm.isConfirmed) return

  Swal.fire({
    title: 'กำลังส่งแบบฟอร์ม...',
    text: 'กรุณารอสักครู่',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  })
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) throw new Error('ไม่พบ token')

    const payload = parseJwt(token)
    let res
    // ตรวจสอบว่ามีไฟล์หรือไม่ แล้วเลือก API endpoint ที่เหมาะสม
    if (formData.value.uploadedFiles.length > 0) {
      // ถ้ามีไฟล์ ใช้ FormData และ API with files
      const formDataToSend = new FormData()
      // เพิ่มข้อมูลฟอร์ม
      formDataToSend.append('us_id', payload.us_id)
      formDataToSend.append('phone_number', formData.value.phoneNumber)
      formDataToSend.append('repair_type_id', formData.value.repairType)
      formDataToSend.append('room_id', formData.value.room)
      formDataToSend.append('asset_code', formData.value.assetCode || '')
      formDataToSend.append('problem_detail', formData.value.problemDetail)
      formDataToSend.append('issue_description', formData.value.issueDescription)
      formDataToSend.append('urgency', formData.value.urgency || 'medium')
      // เพิ่มไฟล์
      formData.value.uploadedFiles.forEach((file) => {
        formDataToSend.append('files', file)
      })

      res = await fetch(`${API_BASE}/repair-requests-with-files`, {
        method: 'POST',
        body: formDataToSend,
      })
    } else {
      // ถ้าไม่มีไฟล์ ใช้ JSON และ API ปกติ
      const body = {
        us_id: payload.us_id,
        phone_number: formData.value.phoneNumber,
        repair_type_id: formData.value.repairType,
        room_id: formData.value.room,
        asset_code: formData.value.assetCode || null,
        problem_detail: formData.value.problemDetail,
        issue_description: formData.value.issueDescription,
        urgency: formData.value.urgency || 'medium',
      }

      res = await fetch(`${API_BASE}/repair-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'บันทึกข้อมูลไม่สำเร็จ')

    Swal.close()
    await Swal.fire({
      title: 'ส่งแบบฟอร์มสำเร็จ!',
      text: 'ระบบได้บันทึกใบแจ้งซ่อมของคุณเรียบร้อยแล้ว',
      icon: 'success',
      confirmButtonText: 'กลับไปหน้ารายการของฉัน',
      confirmButtonColor: '#1E48D1',
    })

    router.push('/main/my-list')
  } catch (err) {
    console.error('บันทึกไม่สำเร็จ:', err)
    Swal.close()
    Swal.fire({
      title: 'เกิดข้อผิดพลาด!',
      text: 'ไม่สามารถส่งแบบฟอร์มได้ กรุณาลองใหม่อีกครั้ง',
      icon: 'error',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#e53e3e',
    })
  } finally {
    isSubmitting.value = false
  }
}

const errors = ref({
  repairType: '',
  building: '',
  floor: '',
  room: '',
  problemDetail: '',
  issueDescription: '',
  urgency: '',
})

function validateForm() {
  let valid = true
  errors.value = {
    repairType: '',
    building: '',
    floor: '',
    room: '',
    problemDetail: '',
    issueDescription: '',
    urgency: '',
  }

  if (!formData.value.repairType) {
    errors.value.repairType = 'กรุณาเลือกประเภทงานซ่อม'
    valid = false
  }
  if (!formData.value.building) {
    errors.value.building = 'กรุณาเลือกอาคาร'
    valid = false
  }
  if (!formData.value.floor) {
    errors.value.floor = 'กรุณาเลือกชั้น'
    valid = false
  }
  if (!formData.value.room) {
    errors.value.room = 'กรุณาเลือกห้อง'
    valid = false
  }
  if (!formData.value.problemDetail.trim()) {
    errors.value.problemDetail = 'กรุณากรอกหัวข้อปัญหา'
    valid = false
  }
  if (!formData.value.issueDescription.trim()) {
    errors.value.issueDescription = 'กรุณากรอกสาเหตุ/อาการเสีย'
    valid = false
  }
  return valid
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-md mx-auto max-w-7xl p-4 sm:p-8 lg:p-12">
    <!-- หัวข้อ -->
    <div class="mb-6">
      <h1 class="text-lg sm:text-xl font-bold text-black">แบบฟอร์มแจ้งซ่อม</h1>

      <!-- แสดงชื่อหน่วยงาน (ถ้าอยากให้แสดงเฉย ๆ) -->
      <p class="text-gray-600 text-sm sm:text-base mt-2">
        {{ formData.department || 'ชื่อหน่วยงาน' }}
      </p>
    </div>
    <div class="mx-auto max-w-6xl">
      <!-- ฟอร์มหลัก -->
      <form class="space-y-6">
        <!-- แถว 1 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              ลงชื่อผู้แจ้ง <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">กรอกชื่อ–นามสกุลของผู้ที่ทำการแจ้งปัญหา</p>
            <input
              v-model="formData.reporterName"
              type="text"
              class="w-full text-xm bg-gray-100 border border-neutral-400 rounded-md cursor-not-allowed placeholder-[#A1A1A1] text-sm px-3 py-2"
              readonly
            />
          </div>

          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              เบอร์โทรศัพท์ <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">กรอกเบอร์โทรศัพท์ที่สามารถติดต่อกลับได้</p>
            <input
              v-model="formData.phoneNumber"
              type="text"
              class="w-full text-xm bg-gray-100 border border-neutral-400 rounded-md cursor-not-allowed placeholder-[#A1A1A1] text-sm px-3 py-2"
              readonly
            />
          </div>
        </div>

        <!-- แถว 2 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              หน่วยงาน <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">กรอกชื่อหน่วยงานหรือแผนกที่สังกัด</p>
            <input
              v-model="formData.department"
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
              v-model="formData.repairType"
              :class="[
                'w-full text-xm bg-white border rounded-md text-neutral-700 text-sm px-3 py-2',
                errors.repairType ? 'border-red-500' : 'border-neutral-400',
              ]"
            >
              <option value="">กรุณาเลือกประเภท</option>
              <option v-for="type in formData.repairTypeOptions" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>

            <p v-if="errors.repairType" class="text-red-500 text-xs sm:text-sm mt-1">
              {{ errors.repairType }}
            </p>
          </div>

          <div>
            <label class="text-base font-medium text-black">หมายเลขครุภัณฑ์</label>
            <p class="text-neutral-400 text-xs mb-2">กรอกหมายเลขครุภัณฑ์ (ถ้ามี)</p>
            <input
              v-model="formData.assetCode"
              type="text"
              class="w-full text-xm bg-white border-neutral-400 rounded-md placeholder-[#A1A1A1] text-sm px-3 py-2"
              placeholder="กรอกเลขครุภัณฑ์ (ถ้ามี)"
            />
          </div>
        </div>

        <!-- แถว 3 -->
        <div>
          <label class="text-sm sm:text-base font-medium text-black">
            ขอความอนุเคราะห์ตรวจสอบ/ซ่อมแซม <span class="text-red-600">*</span>
          </label>
          <p class="text-neutral-400 text-xs mb-2">กรอกปัญหาที่ต้องการให้ตรวจสอบหรือซ่อมแซม</p>
          <input
            v-model="formData.problemDetail"
            type="text"
            :class="[
              'w-full text-sm bg-white border rounded-md placeholder-[#A1A1A1] px-3 py-2',
              errors.problemDetail ? 'border-red-500' : 'border-neutral-400',
            ]"
            placeholder="กรุณากรอกรายละเอียดปัญหา"
          />
          <p v-if="errors.problemDetail" class="text-red-500 text-xs sm:text-sm mt-1">
            {{ errors.problemDetail }}
          </p>
        </div>

        <!-- แถว 4 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              อาคาร <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">โปรดระบุชื่ออาคารที่พบปัญหา</p>
            <select
              v-model="formData.building"
              @change="fetchFloors(formData.building)"
              :class="[
                'w-full text-xm bg-white border rounded-md text-neutral-700 text-sm px-3 py-2',
                errors.building ? 'border-red-500' : 'border-neutral-400',
              ]"
            >
              <option value="">กรุณาเลือกอาคาร</option>
              <option v-for="b in formData.buildingOptions" :key="b.id" :value="b.id">
                {{ b.name }}
              </option>
            </select>
            <p v-if="errors.building" class="text-red-500 text-xs sm:text-sm mt-1">
              {{ errors.building }}
            </p>
          </div>

          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              ชั้น <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">โปรดเลือกชั้นที่พบปัญหา</p>
            <select
              v-model="formData.floor"
              @change="fetchRooms(formData.floor)"
              :class="[
                'w-full text-xm bg-white border rounded-md text-neutral-700 text-sm px-3 py-2',
                errors.floor ? 'border-red-500' : 'border-neutral-400',
              ]"
            >
              <option value="">กรุณาเลือกชั้น</option>
              <option v-for="f in formData.floorOptions" :key="f.id" :value="f.id">
                {{ f.name }}
              </option>
            </select>
            <p v-if="errors.floor" class="text-red-500 text-xs sm:text-sm mt-1">
              {{ errors.floor }}
            </p>
          </div>

          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              ห้อง <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">โปรดเลือกห้องหรือพื้นที่ที่พบปัญหา</p>
            <select
              v-model="formData.room"
              :class="[
                'w-full text-xm bg-white border rounded-md text-neutral-700 text-sm px-3 py-2',
                errors.room ? 'border-red-500' : 'border-neutral-400',
              ]"
            >
              <option value="">กรุณาเลือกห้อง</option>
              <option v-for="r in formData.roomOptions" :key="r.id" :value="r.id">
                {{ r.name }}
              </option>
            </select>
            <p v-if="errors.room" class="text-red-500 text-xs sm:text-sm mt-1">{{ errors.room }}</p>
          </div>
        </div>

        <!-- แถว 5 -->
        <div class="mb-1">
          <label class="text-sm sm:text-base font-medium text-black">
            สาเหตุ/อาการเสีย <span class="text-red-600">*</span>
          </label>
          <p class="text-neutral-400 text-xs mb-2">อธิบายอาการเสียหรือสาเหตุที่พบอย่างชัดเจน</p>
        </div>

        <!--แถวหลัก (2 ช่องเท่ากัน) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
          <!-- ซ้าย: กล่องข้อความ -->
          <div class="flex flex-col flex-1">
            <textarea
              v-model="formData.issueDescription"
              :class="[
                'flex-1 w-full min-h-[220px] sm:min-h-[280px] text-sm bg-white border rounded-md resize-none placeholder-[#A1A1A1] px-3 py-2',
                errors.issueDescription ? 'border-red-500' : 'border-neutral-400',
              ]"
              placeholder="กรุณากรอกสาเหตุ/อาการที่เสีย"
            ></textarea>

            <p v-if="errors.issueDescription" class="text-red-500 text-sm mt-1">
              {{ errors.issueDescription }}
            </p>
          </div>

          <!-- ขวา: กล่องอัปโหลด + ปุ่มเร่งด่วน -->
          <div class="flex flex-col flex-1">
            <label
              for="dropzone-file"
              :class="[
                'flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition flex-1 min-h-[220px] sm:min-h-[280px] mb-4',
                isDragOver
                  ? 'border-blue-400 bg-blue-50 scale-105'
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100',
              ]"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              @drop="handleDrop"
            >
              <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <!-- ไอคอนเปลี่ยนสีเมื่อ drag -->
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
                  รองรับ: รูปภาพ, วิดีโอ (สูงสุด {{ maxFiles }} ไฟล์, 50MB/ไฟล์)
                </p>
                <p class="text-xs text-gray-500 mt-1">สามารถแนบหลักฐานประกอบการแจ้งซ่อมได้</p>

                <!-- แสดง file type badges -->
                <div class="flex items-center gap-2 mt-2">
                  <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">JPG</span>
                  <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">PNG</span>
                  <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">MP4</span>
                  <span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">+อื่นๆ</span>
                </div>
              </div>
              <input
                id="dropzone-file"
                type="file"
                multiple
                accept="image/*,video/*"
                class="hidden"
                @change="handleFileUpload"
              />
            </label>

            <!-- แสดง preview ไฟล์ที่เลือก แบบแถวเล็กๆ (ด้านล่าง drop zone) -->
            <div v-if="filePreview.length > 0" class="space-y-2 mb-4">
              <div
                v-for="(file, index) in filePreview"
                :key="index"
                class="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                @click="openPreview(index)"
              >
                <!-- รูปภาพขนาดเล็ก -->
                <div
                  class="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-gray-200 flex items-center justify-center"
                >
                  <img
                    v-if="file.isImage"
                    :src="file.url"
                    :alt="file.name"
                    class="w-full h-full object-cover"
                  />
                  <!-- ไอคอนวิดีโอ -->
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

                <!-- ข้อมูลไฟล์ -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">{{ file.name }}</p>
                  <div class="flex items-center justify-between">
                    <p class="text-xs text-gray-500">
                      {{ (file.size / 1024 / 1024).toFixed(1) }} MB
                    </p>
                  </div>
                </div>

                <!-- ปุ่มลบ -->
                <button
                  @click.stop="removeFile(index)"
                  class="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                  title="ลบไฟล์"
                >
                  ×
                </button>
              </div>
            </div>

            <!-- แสดงข้อความเมื่อไม่มีไฟล์ -->
            <div
              v-if="filePreview.length === 0"
              class="text-center text-gray-400 text-sm mb-4 py-2 border border-dashed border-gray-200 rounded-lg"
            >
              ไม่มีไฟล์แนบ (สามารถส่งฟอร์มได้โดยไม่แนบไฟล์)
            </div>

            <!-- ปุ่มเร่งด่วน -->
            <div class="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mt-4">
              <div
                v-for="(level, index) in urgencyLevels"
                :key="index"
                class="flex items-center gap-3 cursor-pointer select-none"
                @click="formData.urgency = level.value"
              >
                <div
                  class="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 shadow-md transition-all duration-200"
                  :class="[level.border, formData.urgency === level.value ? level.bg : 'bg-white']"
                ></div>
                <span class="text-base text-black font-normal">{{ level.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ปุ่มบันทึก -->
        <div class="flex justify-center sm:justify-end mt-8">
          <button
            type="button"
            :disabled="isSubmitting"
            class="bg-[#1E48D1] text-white px-6 py-2.5 sm:py-3 rounded-lg hover:bg-sky-700 transition disabled:opacity-50"
            @click="handleSubmit"
          >
            บันทึกฟอร์มแจ้งซ่อม
          </button>
        </div>
      </form>
      <!-- Popup ยืนยันก่อนส่ง -->
      <ConfirmDialog
        :visible="showConfirm"
        title="ยืนยันการส่งแบบฟอร์มแจ้งซ่อม"
        message="คุณต้องการยืนยันการส่งแบบฟอร์มแจ้งซ่อมนี้หรือไม่"
        @confirm="confirmSubmit"
        @cancel="cancelSubmit"
      />
    </div>

    <!-- Preview Modal -->
    <div
      v-if="showPreviewModal"
      class="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
      @click="closePreview"
    >
      <div class="relative max-w-4xl max-h-full p-4" @click.stop>
        <!-- ปุ่มปิด -->
        <button
          @click="closePreview"
          class="absolute -top-4 -right-4 w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white text-2xl hover:text-gray-300 hover:bg-opacity-70 z-10"
        >
          ×
        </button>

        <!-- รูปภาพ -->
        <img
          v-if="filePreview[currentPreviewIndex]?.isImage"
          :src="filePreview[currentPreviewIndex]?.url"
          :alt="filePreview[currentPreviewIndex]?.name"
          class="max-w-full max-h-full object-contain"
        />

        <!-- วิดีโอ -->
        <video
          v-else-if="filePreview[currentPreviewIndex]?.isVideo"
          :src="filePreview[currentPreviewIndex]?.url"
          controls
          autoplay
          class="max-w-full max-h-full"
          :key="currentPreviewIndex"
        >
          เบราว์เซอร์ของคุณไม่สามารถเล่นวิดีโอได้
        </video>

        <!-- ปุ่มนำทาง -->
        <button
          v-if="filePreview.length > 1 && currentPreviewIndex > 0"
          @click="prevPreview"
          class="absolute -left-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white text-2xl hover:text-gray-300 hover:bg-opacity-70"
        >
          ‹
        </button>
        <button
          v-if="filePreview.length > 1 && currentPreviewIndex < filePreview.length - 1"
          @click="nextPreview"
          class="absolute -right-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white text-2xl hover:text-gray-300 hover:bg-opacity-70"
        >
          ›
        </button>

        <!-- ตัวนับและข้อมูลไฟล์ -->
        <div
          v-if="filePreview.length > 1"
          class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded"
        >
          {{ currentPreviewIndex + 1 }} / {{ filePreview.length }}
        </div>

        <!-- ชื่อไฟล์ -->
        <div
          class="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded"
        >
          {{ filePreview[currentPreviewIndex]?.name }}
        </div>
      </div>
    </div>
  </div>
</template>
