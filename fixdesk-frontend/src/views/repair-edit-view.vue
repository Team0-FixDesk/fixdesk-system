<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'

defineOptions({ name: 'RepairEditView' })

const route = useRoute()
const router = useRouter()
const repairCode = route.params.code
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
  uploadedFile: null,
})

// Dropdown Data Fetching
async function fetchTechnicianTypes() {
  try {
    const res = await fetch(`${API_BASE}/technician-types`)
    if (!res.ok) throw new Error('โหลดข้อมูลประเภทไม่สำเร็จ')
    const data = await res.json()
    formData.value.repairTypeOptions = data.map((item) => ({
      id: Number(item.tt_id),
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
      id: Number(b.building_id),
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
      id: Number(f.floor_id),
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
      id: Number(r.room_id),
      name: r.room_name,
    }))
  } catch (err) {
    console.error('โหลดห้องไม่สำเร็จ:', err)
  }
}

// File Upload
function handleFileUpload(event) {
  const file = event.target.files[0]
  formData.value.uploadedFile = file || null
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

// Fetch Repair Detail
async function fetchRepairDetail() {
  try {
    const res = await fetch(`${API_BASE}/repair-requests/${repairCode}`)
    if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
    const data = await res.json()

    const typeId = data.repair_type_id ? Number(data.repair_type_id) : ''
    const buildingId = data.building_id ? Number(data.building_id) : ''
    const floorId = data.floor_id ? Number(data.floor_id) : ''
    const roomId = data.room_id ? Number(data.room_id) : ''

    await fetchFloors(buildingId)
    await fetchRooms(floorId)

    formData.value.repairType = typeId
    formData.value.building = buildingId
    formData.value.floor = floorId
    formData.value.room = roomId
    formData.value.assetCode = data.rf_prop_number || ''
    formData.value.problemDetail = data.rf_problem || ''
    formData.value.issueDescription = data.rf_detail || ''
    formData.value.urgency = data.rf_urgency || 'medium'

    console.log('โหลดข้อมูลใบแจ้งซ่อมสำเร็จ:', formData.value)
  } catch (err) {
    console.error('โหลดข้อมูลใบแจ้งซ่อมไม่สำเร็จ:', err)
  }
}

onMounted(async () => {
  const token = localStorage.getItem('token')
  if (token) {
    const payload = parseJwt(token)
    formData.value.reporterName =
      `${payload.us_prefix_th || ''}${payload.us_first_name_th || ''} ${payload.us_last_name_th || ''}`.trim()
    formData.value.phoneNumber = payload.us_tel || ''
    formData.value.department = payload.us_department || ''
  }

  await Promise.all([fetchTechnicianTypes(), fetchBuildings()])
  await fetchRepairDetail()
})

function validateForm() {
  let valid = true
  // เช็กช่องบังคับ (ยกเว้น ความเร่งด่วน)
  if (!formData.value.repairType) valid = false
  if (!formData.value.building) valid = false
  if (!formData.value.floor) valid = false
  if (!formData.value.room) valid = false
  if (!formData.value.problemDetail.trim()) valid = false
  if (!formData.value.issueDescription.trim()) valid = false
  return valid
}

// Submit Logic (SweetAlert Flow)
async function handleSubmit() {
  // เช็กความเร่งด่วนก่อน validate อื่น ๆ
  if (!formData.value.urgency) {
    await Swal.fire({
      title: 'ยังไม่ได้เลือกความเร่งด่วน',
      text: 'กรุณาเลือกระดับความเร่งด่วนก่อนบันทึกข้อมูล',
      icon: 'warning',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#f59e0b',
    })
    return
  }

  // เช็กช่องอื่น ๆ ที่มีเครื่องหมาย *
  if (!validateForm()) {
    Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาตรวจสอบช่องที่มีเครื่องหมาย *', 'error')
    return
  }

  // Popup ยืนยันการบันทึก
  const confirm = await Swal.fire({
    title: 'ยืนยันการบันทึกข้อมูล?',
    text: 'คุณต้องการบันทึกการแก้ไขใบแจ้งซ่อมนี้หรือไม่',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#1E48D1',
    cancelButtonColor: '#9CA3AF',
  })

  if (!confirm.isConfirmed) return

  Swal.fire({
    title: 'กำลังบันทึก...',
    text: 'กรุณารอสักครู่',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  })
  try {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('Token not found')

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

    const res = await fetch(`${API_BASE}/repair-requests/${repairCode}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'บันทึกข้อมูลไม่สำเร็จ')

    Swal.close()
    await Swal.fire({
      title: 'บันทึกการแก้ไขสำเร็จ!',
      text: `ระบบได้อัปเดตข้อมูลใบแจ้งซ่อม ${repairCode} เรียบร้อยแล้ว`,
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
      text: 'ไม่สามารถบันทึกการแก้ไขได้ กรุณาลองใหม่อีกครั้ง',
      icon: 'error',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#e53e3e',
    })
  }
}
</script>


<template>
  <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-7xl">
    <!-- หัวข้อ -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-black">แก้ไขแบบฟอร์มแจ้งซ่อม</h1>

      <!-- แสดงชื่อหน่วยงาน (ถ้าอยากให้แสดงเฉย ๆ) -->
      <p class="text-gray-600 text-base mt-2">
        {{ formData.department || 'ชื่อหน่วยงาน' }}
      </p>
    </div>
    <div class="p-12 mx-auto max-w-8xl">
      <!-- ฟอร์มหลัก -->
      <form class="space-y-6">
        <!-- แถว 1 -->
        <div class="grid grid-cols-2 gap-10">
          <div>
            <label class="text-base font-medium text-black">
              ลงชื่อผู้แจ้ง <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">กรอกชื่อ–นามสกุลของผู้ที่ทำการแจ้งปัญหา</p>
            <input
              v-model="formData.reporterName"
              type="text"
              class="w-full text-xm bg-gray-100 border border-neutral-400 rounded-md cursor-not-allowed placeholder-[#A1A1A1]"
              readonly
            />
          </div>

          <div>
            <label class="text-base font-medium text-black">
              เบอร์โทรศัพท์ <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">กรอกเบอร์โทรศัพท์ที่สามารถติดต่อกลับได้</p>
            <input
              v-model="formData.phoneNumber"
              type="text"
              class="w-full text-xm bg-gray-100 border border-neutral-400 rounded-md cursor-not-allowed placeholder-[#A1A1A1]"
              readonly
            />
          </div>
        </div>

        <!-- แถว 2 -->
        <div class="grid grid-cols-3 gap-10">
          <div>
            <label class="text-base font-medium text-black">
              หน่วยงาน <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">กรอกชื่อหน่วยงานหรือแผนกที่สังกัด</p>
            <input
              v-model="formData.department"
              type="text"
              class="w-full text-xm bg-gray-100 border border-neutral-400 rounded-md cursor-not-allowed placeholder-[#A1A1A1]"
              readonly
            />
          </div>

          <div>
            <label class="text-base font-medium text-black">
              ประเภท <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">โปรดเลือกประเภทงานหรือสิ่งของที่ต้องการซ่อม</p>
            <select
              v-model="formData.repairType"
              class="w-full text-xm bg-white border border-neutral-400 rounded-md text-neutral-700 placeholder-[#A1A1A1]"
            >
              <option value="">กรุณาเลือกประเภท</option>
              <option v-for="type in formData.repairTypeOptions" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>
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
          <label class="text-base font-medium text-black">
            ขอความอนุเคราะห์ตรวจสอบ/ซ่อมแซม <span class="text-red-600">*</span>
          </label>
          <p class="text-neutral-400 text-xs mb-2">กรอกปัญหาที่ต้องการให้ตรวจสอบหรือซ่อมแซม</p>
          <input
            v-model="formData.problemDetail"
            type="text"
            class="w-full text-xm bg-white border border-neutral-400 rounded-md placeholder-[#A1A1A1]"
            placeholder="กรุณากรอกรายละเอียดปัญหา"
          />
        </div>

        <!-- แถว 4 -->
        <div class="grid grid-cols-3 gap-10">
          <div>
            <label class="text-base font-medium text-black">
              อาคาร <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">โปรดระบุชื่ออาคารที่พบปัญหา</p>
            <select
              v-model="formData.building"
              @change="fetchFloors(formData.building)"
              class="w-full text-xm bg-white border border-neutral-400 rounded-md text-neutral-700 placeholder-[#A1A1A1]"
            >
              <option value="">กรุณาเลือกอาคาร</option>
              <option v-for="b in formData.buildingOptions" :key="b.id" :value="b.id">
                {{ b.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-base font-medium text-black">
              ชั้น <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">โปรดเลือกชั้นที่พบปัญหา</p>
            <select
              v-model="formData.floor"
              @change="fetchRooms(formData.floor)"
              class="w-full text-xm bg-white border border-neutral-400 rounded-md text-neutral-700 placeholder-[#A1A1A1]"
            >
              <option value="">กรุณาเลือกชั้น</option>
              <option v-for="f in formData.floorOptions" :key="f.id" :value="f.id">
                {{ f.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-base font-medium text-black">
              ห้อง <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">โปรดเลือกห้องหรือพื้นที่ที่พบปัญหา</p>
            <select
              v-model="formData.room"
              class="w-full text-xm bg-white border border-neutral-400 rounded-md text-neutral-700 placeholder-[#A1A1A1]"
            >
              <option value="">กรุณาเลือกห้อง</option>
              <option v-for="r in formData.roomOptions" :key="r.id" :value="r.id">
                {{ r.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- แถว 5 -->
        <div class="mb-1">
          <label class="text-base font-medium text-black">
            สาเหตุ/อาการเสีย <span class="text-red-600">*</span>
          </label>
          <p class="text-neutral-400 text-xs mb-2">อธิบายอาการเสียหรือสาเหตุที่พบอย่างชัดเจน</p>
        </div>

        <!--แถวหลัก (2 ช่องเท่ากัน) -->
        <div class="grid grid-cols-2 gap-10 items-stretch">
          <!-- ซ้าย: กล่องข้อความ -->
          <div class="flex flex-col flex-1">
            <textarea
              v-model="formData.issueDescription"
              class="flex-1 w-full min-h-[320px] text-xm bg-white border border-neutral-400 rounded-md resize-none placeholder-[#A1A1A1]"
              placeholder="กรุณากรอกสาเหตุ/อาการที่เสีย"
            ></textarea>
          </div>

          <!-- ขวา: กล่องอัปโหลด + ปุ่มเร่งด่วน -->
          <div class="flex flex-col flex-1">
            <label
              for="dropzone-file"
              class="flex flex-col flex-1 min-h-[320px] items-center justify-center w-full border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
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
            <div class="flex justify-center items-center gap-12 mt-4">
              <div
                v-for="(level, index) in urgencyLevels"
                :key="index"
                class="flex items-center gap-3 cursor-pointer select-none"
                @click="formData.urgency = level.value"
              >
                <div
                  class="w-7 h-7 rounded-full border-2 shadow-md transition-all duration-200"
                  :class="[level.border, formData.urgency === level.value ? level.bg : 'bg-white']"
                ></div>
                <span class="text-base text-black font-normal">{{ level.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ปุ่มบันทึก -->
        <div class="flex justify-end mt-10">
          <button
            type="button"
            :disabled="isSubmitting"
            class="bg-[#1E48D1] text-white px-6 py-3 rounded-lg hover:bg-sky-700 transition disabled:opacity-50"
            @click="handleSubmit"
          >
            บันทึกการแก้ไข
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
