/**
 * =====================================================================
 * @file            repair-edit.view.vue
 * @module          มอดูลแจ้งซ่อม - การแก้ไข หรือยกเลิกคำร้องแจ้งซ่อม
 * @layer           View (Presentation Layer)
 * @version         1.0.1
 * @since           2026-02-04
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-02-27
 * @lastModifiedBy  เศรษฐพงศ์ หอมชื่น
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอสำหรับแก้ไขข้อมูลรายการแจ้งซ่อมที่มีอยู่แล้ว
 *   - ดึงข้อมูลรายการแจ้งซ่อมจาก repairCode (route params)
 *   - แสดงข้อมูลเดิมในฟอร์มเพื่อให้ผู้ใช้งานแก้ไข
 *   - ตรวจสอบความถูกต้องของข้อมูลก่อนบันทึก (Form Validation)
 *   - อัปโหลดไฟล์แนบเพิ่มเติม และจัดการไฟล์เดิม
 *   - แสดง Preview รูปภาพ / วิดีโอใน Modal
 *   - บันทึกการแก้ไขผ่าน updateRepair()
 *   - แสดง SweetAlert2 สำหรับแจ้งเตือนสถานะการทำงาน
 *   - Redirect กลับหน้า /main/my-list หลังบันทึกสำเร็จหรือยกเลิก
 *
 * @requires
 *   - vue
 *   - vue-router
 *   - sweetalert2
 *   - @iconify/vue
 *   - @/composables/usePhoneFormat
 *   - @/composables/location/useRepairLocationData
 *   - @/composables/useFileUpload
 *   - @/composables/repair/useRepairFormValidation
 *   - @/composables/repair/useRepairService
 *   - @/utils/jwt.util
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - แก้ไขข้อความแจ้งเตือน  [2026-02-20, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - แก้ไขคำ และสีของปุ่ม   [2026-02-27, เศรษฐพงศ์ หอมชื่น]
 * =====================================================================
 */

<script setup>
defineOptions({ name: 'RepairEditView' })
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import Swal from 'sweetalert2'
import { Icon } from '@iconify/vue'

import { usePhoneNumberFormatter } from '@/composables/usePhoneFormat'
import { useRepairLocationData } from '@/composables/location/useRepairLocationData'
import { useFileUpload } from '@/composables/useFileUpload'
import { useRepairFormValidation } from '@/composables/repair/useRepairFormValidation'
import { useRepairService } from '@/composables/repair/useRepairService'

import { decodeJwtToken } from '@/utils/jwt.util'

const route = useRoute()
const router = useRouter()
const { toDisplay } = usePhoneNumberFormatter()

const API_BASE_URL = import.meta.env.VITE_API_BASE

// ข้อมูลหลักในฟอร์มแจ้งซ่อม
const repairFormData = ref({
  reporterName: '',
  phoneNumber: '',
  department: '',
  repairType: '',
  building: '',
  floor: '',
  room: '',
  assetCode: '',
  problemDetail: '',
  issueDescription: '',
  urgency: '',
  uploadedFileList: [],
})

const {
  repairTypeList,
  buildingList,
  floorList,
  roomList,
  fetchRepairTypeList,
  fetchBuildingList,
  fetchFloorList,
  fetchRoomList,
} = useRepairLocationData(API_BASE_URL)

const { errorData, validateFormData, validateField } = useRepairFormValidation(repairFormData)

const {
  isDragOver,
  filePreviewList,
  existingFileList,
  uploadedFileList,
  onFileUpload,
  onDragOver,
  onDragLeave,
  onDrop,
  deleteFile,
  setExistingFiles,
} = useFileUpload(API_BASE_URL)

const { fetchRepairDetail: fetchRepairDetailService, updateRepair } = useRepairService(API_BASE_URL)

const repairCode = route.params.code
const MAX_FILE_COUNT = 5

const isSubmitting = ref(false)
const showPreviewModal = ref(false)
const currentPreviewIndex = ref(0)

// ระดับความเร่งด่วน
const URGENCY_LEVEL_LIST = [
  { label: 'เร่งด่วนมาก', value: 'high', border: 'border-red-600', bg: 'bg-red-600' },
  { label: 'เร่งด่วน', value: 'medium', border: 'border-amber-400', bg: 'bg-amber-400' },
  { label: 'ไม่เร่งด่วน', value: 'low', border: 'border-green-600', bg: 'bg-green-600' },
]

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

// ดึงข้อมูลรายละเอียดการแจ้งซ่อมเดิม
async function fetchRepairDetail() {
  try {

    const data = await fetchRepairDetailService(repairCode)

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
    setExistingFiles(images)

  } catch (err) {
    console.error(err)
  }
}


// ส่งข้อมูลบันทึกการแก้ไข
async function submitRepairEdit() {

  if (!validateFormData()) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      timer: 2500,
      icon: 'warning',
      title: 'ข้อมูลไม่ครบถ้วน'
    })
    return
  }

  const confirm = await Swal.fire({
    title: 'ยืนยันการแก้ไขข้อมูล?',
    text: 'คุณต้องการบันทึกการแก้ไขแบบฟอร์มแจ้งซ่อมหรือไม่?',
    icon: 'question',
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#fb923c',
    cancelButtonColor: '#d4d4d4', 
  })

  if (!confirm.isConfirmed) return

  Swal.showLoading()

  try {

    isSubmitting.value = true

    await updateRepair({
      repairCode,
      repairFormData: repairFormData.value,
      uploadedFileList: uploadedFileList.value,
      existingFileList: existingFileList.value
    })

    Swal.close()

    Swal.fire({
      toast: true,
      position: 'top-end',
      timer: 2500,
      icon: 'success',
      title: 'บันทึกการแก้ไขสำเร็จ',
      showConfirmButton: false
    })

    router.push('/main/my-list')

  } catch (err) {

    Swal.fire({
      toast: true,
      position: 'top-end',
      timer: 3000,
      icon: 'error',
      title: err.message
    })

  } finally {
    isSubmitting.value = false
  }
}


// ยกเลิกการแก้ไข
async function cancelRepairEdit() {
  const confirm = await Swal.fire({
    title: 'ยกเลิกการแก้ไขข้อมูล?',
    text: 'ข้อมูลแบบฟอร์มแจ้งซ่อมที่แก้ไขอยู่จะไม่ถูกบันทึก',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ยกเลิกการแก้ไข',
    cancelButtonText: 'กลับไปแก้ไขต่อ',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#a3a3a3',
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
    const userPayload = decodeJwtToken(token)
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
              <option v-for="type in repairTypeList" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>
            <p v-if="errorData.repairType" class="text-red-500 text-xs sm:text-sm mt-1">
              {{ errorData.repairType }}
            </p>
          </div>

          <div>
            <label class="text-base font-medium text-black">หมายเลขครุภัณฑ์</label>
            <p class="text-neutral-400 text-xs mb-2">หมายเลขครุภัณฑ์ของอุปกรณ์ (ถ้ามี)</p>
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
                  repairFormData.floor = ''
                  repairFormData.room = ''
                  repairFormData.floor = ''
                  repairFormData.room = ''

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
              <option v-for="b in buildingList" :key="b.id" :value="b.id">
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
                  repairFormData.room = ''
                  repairFormData.roomList = []

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
              <option v-for="f in floorList" :key="f.id" :value="f.id">
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
              <option v-for="r in roomList" :key="r.id" :value="r.id">
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
                  <Icon icon="ri:image-upload-line" width="60" height="60" style="color: gray" />
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
                  :class="[
                    level.border,
                    repairFormData.urgency === level.value ? level.bg : 'bg-white',
                  ]"
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
            class="bg-neutral-300 text-white px-6 py-2.5 sm:py-3 rounded-lg hover:bg-neutral-400 transition disabled:opacity-50 mr-4"
            @click="cancelRepairEdit"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            :disabled="isSubmitting"
            class="bg-orange-400 text-white px-6 py-2.5 sm:py-3 rounded-lg hover:bg-orange-500 transition disabled:opacity-50"
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
