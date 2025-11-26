<script setup>
/* ==============================
   📦 Imports & Setup
   ============================== */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'

defineOptions({ name: 'RepairRequestView' })

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

/* ==============================
   📄 Reactive States
   ============================== */
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
  uploadedFile: null,
})

/* ==============================
   🧱 Dropdown Data Fetching
   ============================== */
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

/* ==============================
   🖼️ File Upload
   ============================== */
function handleFileUpload(event) {
  const file = event.target.files[0]
  formData.value.uploadedFile = file || null
}

/* ==============================
   ⚡ Urgency Options
   ============================== */
const urgencyLevels = [
  { label: 'เร่งด่วนมาก', value: 'high', border: 'border-red-600', bg: 'bg-red-600' },
  { label: 'เร่งด่วน', value: 'medium', border: 'border-amber-400', bg: 'bg-amber-400' },
  { label: 'ไม่เร่งด่วน', value: 'low', border: 'border-green-600', bg: 'bg-green-600' },
]

/* ==============================
   🔐 JWT Decode
   ============================== */
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

/* ==============================
   🚀 Lifecycle
   ============================== */
onMounted(() => {
  const token = localStorage.getItem('token')
  if (!token) return

  const payload = parseJwt(token)
  formData.value.reporterName =
    `${payload.us_prefix_th || ''}${payload.us_first_name_th || ''} ${payload.us_last_name_th || ''}`.trim()
  formData.value.phoneNumber = payload.us_tel || ''
  formData.value.department = payload.us_department || ''

  fetchTechnicianTypes()
  fetchBuildings()
})

/* ==============================
   💾 Submit Logic (SweetAlert Flow)
   ============================== */
async function handleSubmit() {
  // 🔥 เช็กความเร่งด่วนก่อนเลย
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

  // แล้วค่อยเช็กฟิลด์อื่น ๆ ตามปกติ
  if (!validateForm()) {
    Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาตรวจสอบช่องที่มีเครื่องหมาย *', 'error')
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
    const token = localStorage.getItem('token')
    if (!token) throw new Error('ไม่พบ token')

    const payload = parseJwt(token)
    const body = {
      us_id: payload.us_id,
      phone_number: formData.value.phoneNumber,
      repair_type_id: formData.value.repairType,
      building_id: formData.value.building,
      floor_id: formData.value.floor,
      room_id: formData.value.room,
      asset_code: formData.value.assetCode || null,
      problem_detail: formData.value.problemDetail,
      issue_description: formData.value.issueDescription,
      urgency: formData.value.urgency || 'medium',
    }

    const res = await fetch(`${API_BASE}/repair-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

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
    console.error('❌ บันทึกไม่สำเร็จ:', err)
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
              class="w-full text-xm bg-white border border-neutral-400 rounded-md placeholder-[#A1A1A1]"
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
                'flex-1 w-full min-h-[220px] sm:min-h-[280px] text-sm bg-white border rounded-md resize-none px-3 py-2',
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
              class="flex flex-col flex-1 min-h-[220px] sm:min-h-[280px] items-center justify-center w-full border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
            >
              <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <img src="/icon/image-up-icon.svg" class="w-10 h-10 mb-2 opacity-70" />
                <p class="text-sm text-gray-500">
                  <span class="font-semibold">เลือกไฟล์ หรือลากไฟล์เพื่ออัปโหลด</span>
                </p>
              </div>
              <input id="dropzone-file" type="file" class="hidden" @change="handleFileUpload" />
            </label>

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
  </div>
</template>
