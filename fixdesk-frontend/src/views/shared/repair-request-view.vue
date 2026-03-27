/**
 * =====================================================================
 * @file            repair-request.view.vue
 * @module          มอดูลแจ้งซ่อม - การสร้างแบบฟอร์มแจ้งซ่อม
 * @layer           View (Presentation Layer)
 * @version         1.0.2
 * @since           2026-02-04
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-02-27
 * @lastModifiedBy  เศรษฐพงศ์ หอมชื่น
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอแบบฟอร์มสำหรับสร้างรายการแจ้งซ่อมใหม่
 *  ผู้ใช้งานสามารถ:
 *   - กรอกข้อมูลรายละเอียดปัญหา
 *   - เลือกประเภทงาน อาคาร ชั้น และห้อง
 *   - ระบุระดับความเร่งด่วน
 *   - แนบรูปภาพ หรือวิดีโอประกอบ (สูงสุด 5 ไฟล์)
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
 *   - แก้ไขข้อความช่องกรอกข้อมูล   [2026-02-18, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - แก้ไขข้อความแจ้งเตือน       [2026-02-19, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - แก้ไขข้อความแจ้งเตือน       [2026-02-20, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - แก้ไขข้อความ และสีปุ่ม       [2026-02-27, เศรษฐพงศ์ หอมชื่น]
 * =====================================================================
 */

<script setup>
defineOptions({ name: 'RepairRequestView' })
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import Swal from 'sweetalert2'
import { Icon } from '@iconify/vue'

import { usePhoneNumberFormatter } from '@/composables/usePhoneFormat'
import { useRepairLocationData } from '@/composables/location/useRepairLocationData'
import { useFileUpload } from '@/composables/useFileUpload'
import { useRepairFormValidation } from '@/composables/repair/useRepairFormValidation'
import { useRepairService } from '@/composables/repair/useRepairService'

import { decodeJwtToken } from '@/utils/jwt.util'

const { toDisplay } = usePhoneNumberFormatter()

const router = useRouter()
const API_BASE_URL = import.meta.env.VITE_API_BASE
const MAX_FILE_COUNT = 5

const { createRepair, createRepairWithoutLineNotification, deleteRepair } = useRepairService(API_BASE_URL)

// ข้อมูลหลักในแบบฟอร์มแจ้งซ่อม
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

const {
  isDragOver,
  filePreviewList,
  uploadedFileList,
  onFileUpload,
  onDragOver,
  onDragLeave,
  onDrop,
  deleteFile,
} = useFileUpload(API_BASE_URL)

const { errorData, validateFormData, validateField } = useRepairFormValidation(repairFormData)

const isSubmitting = ref(false)
const showPreviewModal = ref(false)
const currentPreviewIndex = ref(0)

// ระดับความเร่งด่วน (Constant List)
const URGENCY_LEVEL_LIST = [
  { label: 'เร่งด่วนมาก', value: 'high', border: 'border-red-600', bg: 'bg-red-600' },
  { label: 'เร่งด่วน', value: 'medium', border: 'border-amber-400', bg: 'bg-amber-400' },
  { label: 'ไม่เร่งด่วน', value: 'low', border: 'border-green-600', bg: 'bg-green-600' },
]

// ฟังก์ชันสำหรับ Preview Modal
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

/** * Lifecycle Hooks
 */
onMounted(() => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) return

  const userPayload = decodeJwtToken(token)
  repairFormData.value.reporterName =
    `${userPayload.us_prefix_th || ''}${userPayload.us_first_name_th || ''} ${userPayload.us_last_name_th || ''}`.trim()
  repairFormData.value.phoneNumber = toDisplay(userPayload.us_tel || '')
  repairFormData.value.department = userPayload.us_department || ''

  fetchRepairTypeList()
  fetchBuildingList()
})

// บันทึกแบบฟอร์ม
async function submitRepairRequest() {
  if (!validateFormData()) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
      timer: 2500,
      showConfirmButton: false,
    })
    return
  }

  if (!repairFormData.value.urgency) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: 'ยังไม่ได้เลือกระดับความเร่งด่วน',
      timer: 2500,
      showConfirmButton: false,
    })
    return
  }

  const confirmResult = await Swal.fire({
    title: 'ยืนยันการส่งแบบฟอร์มแจ้งซ่อม?',
    text: 'คุณต้องการส่งแบบฟอร์มแจ้งซ่อมหรือไม่?',
    icon: 'question',
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#0048EF',
    cancelButtonColor: '#d4d4d4',
  })

  if (!confirmResult.isConfirmed) return

  Swal.fire({
    title: 'กำลังส่งแบบฟอร์ม...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  })

  try {
    await createRepair({
      repairFormData: repairFormData.value,
      uploadedFileList: uploadedFileList.value,
    })

    Swal.close()

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'ระบบบันทึกคำขอแจ้งซ่อมเรียบร้อยแล้ว',
      timer: 2500,
      showConfirmButton: false,
      width: '380px',
    })

    router.push('/main/my-list')
  } catch (err) {
    console.error(err)

    Swal.close()

    // ถ้า LINE rate limit และใบแจ้งซ่อมสร้างสำเร็จแล้ว
    if (err.message === 'LINE_RATE_LIMIT') {
      const responseData = err.responseData

      // ถ้า repair สร้างสำเร็จแล้ว (มี insertId) แต่ LINE failed
      if (responseData && responseData.rf_code) {
        const confirmResult = await Swal.fire({
          title: '⚠️ ถึงขีดจำกัด',
          html: `<div style="text-align: left; font-size: 15px; line-height: 1.8;">
            <p>เนื่องจากใช้ credit เต็มแล้ว</p>
            <p style="margin-top: 12px;">สามารถแจ้งซ่อมโดยไม่แจ้งเตือนผ่าน LINE ได้</p>
            <p style="margin-top: 4px;">และจะกลับมาแจ้งเตือนผ่าน LINE ได้ใหม่ ในวันที่ 1 ของเดือนถัดไป</p>
            <p style="margin-top: 16px;"><strong>ต้องการแจ้งซ่อมต่อหรือไม่?</strong></p>
          </div>`,
          icon: 'warning',
          background: '#FFFFFF',
          color: '#92400e',
          confirmButtonColor: '#0048EF',
          cancelButtonColor: '#a3a3a3',
          confirmButtonText: 'ตกลง (แจ้งซ่อมต่อ)',
          cancelButtonText: 'ยกเลิก',
          showCancelButton: true,
          reverseButtons: false,
        })

        // ถ้า user เลือก "ยอมรับ"
        if (confirmResult.isConfirmed) {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'ระบบบันทึกคำขอแจ้งซ่อมเรียบร้อยแล้ว',
            timer: 2500,
            showConfirmButton: false,
            width: '380px',
          })
          router.push('/main/my-list')
          return
        }

        // ถ้า user เลือก "ลบและรีซ้ำ"
        if (confirmResult.isDenied || confirmResult.isDismissed) {
          // ลบใบแจ้งซ่อมที่สร้างไป
          Swal.fire({
            title: 'กำลังจัดการ...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
          })

          try {
            await deleteRepair(responseData.rf_code)

            // สร้างใหม่แบบไม่ส่ง LINE
            const retryResult = await createRepairWithoutLineNotification({
              repairFormData: repairFormData.value,
              uploadedFileList: uploadedFileList.value,
            })

            Swal.close()

            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: 'ระบบบันทึกคำขอแจ้งซ่อมเรียบร้อยแล้ว',
              timer: 2500,
              showConfirmButton: false,
              width: '380px',
            })

            router.push('/main/my-list')
          } catch (deleteErr) {
            console.error(deleteErr)
            Swal.close()

            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'error',
              title: 'เกิดข้อผิดพลาด',
              timer: 2500,
              showConfirmButton: false,
            })
          }
          return
        }
      } else {
        // ถ้า rate limit แต่ repair ไม่สร้างสำเร็จ (fallback)
        const confirmResult = await Swal.fire({
          title: '⚠️ ถึงขีดจำกัด',
          html: `<div style="text-align: left; font-size: 15px; line-height: 1.8;">
            <p>เนื่องจากใช้ credit เต็มแล้ว</p>
            <p style="margin-top: 12px;">สามารถแจ้งซ่อมโดยไม่แจ้งเตือนผ่าน LINE ได้</p>
            <p style="margin-top: 4px;">และจะกลับมาแจ้งเตือนผ่าน LINE ได้ใหม่ ในวันที่ 1 ของเดือนถัดไป</p>
            <p style="margin-top: 16px;"><strong>ต้องการแจ้งซ่อมต่อหรือไม่?</strong></p>
          </div>`,
          icon: 'warning',
          background: '#fef3c7',
          color: '#92400e',
          confirmButtonColor: '#0048EF',
          cancelButtonColor: '#a3a3a3',
          confirmButtonText: 'ตกลง (แจ้งซ่อมต่อ)',
          cancelButtonText: 'ยกเลิก',
          showCancelButton: true,
          reverseButtons: false,
        })

        // ถ้า user ยอมรับให้ส่งแจ้งซ่อมต่อแต่ไม่มี LINE notification
        if (confirmResult.isConfirmed) {
          Swal.fire({
            title: 'กำลังส่งแบบฟอร์ม...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
          })

          try {
            // ส่งแจ้งซ่อมโดยไม่รอ LINE notification
            await createRepairWithoutLineNotification({
              repairFormData: repairFormData.value,
              uploadedFileList: uploadedFileList.value,
            })

            Swal.close()

            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: 'ระบบบันทึกคำขอแจ้งซ่อมเรียบร้อยแล้ว',
              timer: 2500,
              showConfirmButton: false,
              width: '380px',
            })

            router.push('/main/my-list')
          } catch (submitErr) {
            console.error(submitErr)
            Swal.close()

            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'error',
              title: 'ส่งแบบฟอร์มแจ้งซ่อมไม่สำเร็จ',
              timer: 2500,
              showConfirmButton: false,
            })
          }
        }
        return
      }
    }

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: 'ส่งแบบฟอร์มแจ้งซ่อมไม่สำเร็จ',
      timer: 2500,
      showConfirmButton: false,
    })
  }
}

async function cancelRepairRequest() {
  const confirmResult = await Swal.fire({
    title: 'ยกเลิกการแจ้งซ่อม?',
    text: 'ข้อมูลที่กรอกลงแบบฟอร์มแจ้งซ่อมจะไม่ถูกบันทึก',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ยกเลิกการแจ้งซ่อม',
    cancelButtonText: 'กลับไปแก้ไข',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#a3a3a3',
  })
  if (confirmResult.isConfirmed) {
    router.push('/main/my-list')
  }
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-md mx-auto max-w-7xl p-4 sm:p-8 lg:p-12">
    <div class="mb-6">
      <h1 class="text-lg sm:text-xl font-bold text-black">แบบฟอร์มแจ้งซ่อม</h1>
    </div>
    <div class="mx-auto max-w-6xl">
      <form class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              ลงชื่อผู้แจ้ง <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">ชื่อ–นามสกุลของผู้แจ้งปัญหา</p>
            <input v-model="repairFormData.reporterName" type="text"
              class="w-full text-xm bg-gray-100 border border-neutral-400 rounded-md cursor-not-allowed placeholder-[#A1A1A1] text-sm px-3 py-2"
              readonly />
          </div>

          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              หมายเลขโทรศัพท์ <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">หมายเลขโทรศัพท์ที่สามารถติดต่อกลับได้</p>
            <input v-model="repairFormData.phoneNumber" type="text"
              class="w-full text-xm bg-gray-100 border border-neutral-400 rounded-md cursor-not-allowed placeholder-[#A1A1A1] text-sm px-3 py-2"
              readonly />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              หน่วยงาน <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">ชื่อของหน่วยงาน หรือแผนกที่สังกัด</p>
            <input v-model="repairFormData.department" type="text"
              class="w-full text-xm bg-gray-100 border border-neutral-400 rounded-md cursor-not-allowed placeholder-[#A1A1A1] text-sm px-3 py-2"
              readonly />
          </div>

          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              ประเภท <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">ประเภทของงานซ่อม หรือประเภทของปัญหาที่ต้องการแจ้ง</p>

            <select v-model="repairFormData.repairType" @change="validateField('repairType')" :class="[
              'w-full text-xm bg-white border rounded-md text-neutral-700 text-sm px-3 py-2',
              errorData.repairType ? 'border-red-500' : 'border-neutral-400',
            ]">
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
            <p class="text-neutral-400 text-xs mb-2">หมายเลขครุภัณฑ์ของวัสดุ/อุปกรณ์ (ถ้ามี)</p>
            <input v-model="repairFormData.assetCode" type="text"
              class="w-full text-xm bg-white border-neutral-400 rounded-md placeholder-[#A1A1A1] text-sm px-3 py-2"
              placeholder="กรุณากรอกเลขครุภัณฑ์ (ถ้ามี)" />
          </div>
        </div>

        <div>
          <label class="text-sm sm:text-base font-medium text-black">
            ขอความอนุเคราะห์ตรวจสอบ/ซ่อมแซม <span class="text-red-600">*</span>
          </label>
          <p class="text-neutral-400 text-xs mb-2">ปัญหา หรือเหตุที่ต้องการให้ตรวจสอบ/ซ่อมแซม</p>
          <input v-model="repairFormData.problemDetail" @input="validateField('problemDetail')" type="text" :class="[
            'w-full text-sm bg-white border rounded-md placeholder-[#A1A1A1] px-3 py-2',
            errorData.problemDetail ? 'border-red-500' : 'border-neutral-400',
          ]" placeholder="กรุณากรอกปัญหา หรือเหตุที่ต้องการแจ้ง" />
          <p v-if="errorData.problemDetail" class="text-red-500 text-xs sm:text-sm mt-1">
            {{ errorData.problemDetail }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          <div>
            <label class="text-sm sm:text-base font-medium text-black">
              อาคาร <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">อาคารที่พบปัญหา หรือสาเหตุที่ต้องการให้ตรวจสอบ/ซ่อมแซม</p>
            <select v-model="repairFormData.building" @change="
              () => {
                repairFormData.floor = ''
                repairFormData.room = ''

                fetchFloorList(repairFormData.building)
                validateField('building')
              }
            " :class="[
                'w-full text-xm bg-white border rounded-md text-neutral-700 text-sm px-3 py-2',
                errorData.building ? 'border-red-500' : 'border-neutral-400',
              ]">
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
            <p class="text-neutral-400 text-xs mb-2">ชั้นที่พบปัญหา หรือเหตุที่ต้องการให้ตรวจสอบ/ซ่อมแซม</p>
            <select v-model="repairFormData.floor" @change="
              () => {
                repairFormData.room = ''

                fetchRoomList(repairFormData.floor)
                validateField('floor')
              }
            " :class="[
                'w-full text-xm bg-white border rounded-md text-neutral-700 text-sm px-3 py-2',
                errorData.floor ? 'border-red-500' : 'border-neutral-400',
              ]">
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
            <p class="text-neutral-400 text-xs mb-2">ห้องที่พบปัญหา หรือเหตุที่ต้องการให้ตรวจสอบ/ซ่อมแซม</p>
            <select v-model="repairFormData.room" @change="validateField('room')" :class="[
              'w-full text-xm bg-white border rounded-md text-neutral-700 text-sm px-3 py-2',
              errorData.room ? 'border-red-500' : 'border-neutral-400',
            ]">
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
            สาเหตุ/อาการเสีย <span class="text-red-600">*</span>
          </label>
          <p class="text-neutral-400 text-xs mb-2">คำอธิบายสาเหตุ/อาการเสียของปัญหา หรือเหตุที่พบอย่างชัดเจน</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
          <div class="flex flex-col flex-1">
            <textarea v-model="repairFormData.issueDescription" @input="validateField('issueDescription')" :class="[
              'flex-1 w-full min-h-[220px] sm:min-h-[280px] text-sm bg-white border rounded-md resize-none placeholder-[#A1A1A1] px-3 py-2',
              errorData.issueDescription ? 'border-red-500' : 'border-neutral-400',
            ]" placeholder="กรุณาอธิบายสาเหตุ/อาการเสียที่พบ"></textarea>

            <p v-if="errorData.issueDescription" class="text-red-500 text-sm mt-1">
              {{ errorData.issueDescription }}
            </p>
          </div>

          <div class="flex flex-col flex-1">
            <label for="dropzone-file" :class="[
              'flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition flex-1 min-h-[220px] sm:min-h-[280px] mb-4',
              isDragOver
                ? 'border-blue-400 bg-blue-50 scale-105'
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100',
            ]" @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop">
              <div class="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <div :class="['transition-all duration-200', isDragOver ? 'scale-110' : '']">
                  <Icon icon="ri:image-upload-line" width="60" height="60" style="color: gray" />
                </div>
                <p :class="[
                  'text-sm mb-1',
                  isDragOver ? 'text-blue-600 font-semibold' : 'text-gray-500',
                ]">
                  <span class="font-semibold">{{
                    isDragOver ? 'วางไฟล์ที่นี่' : 'ลากไฟล์ หรือคลิกเพื่อเลือกไฟล์'
                    }}</span>
                </p>
                <p class="text-xs text-gray-400 mt-1">
                  รองรับ : รูปภาพ และวิดีโอ (สูงสุด {{ MAX_FILE_COUNT }} ไฟล์/50 MB)
                </p>
                <div class="flex items-center gap-2 mt-2 justify-center">
                  <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">JPG</span>
                  <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">PNG</span>
                  <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">MP4</span>
                </div>
              </div>
              <input id="dropzone-file" type="file" multiple accept="image/*,video/*" class="hidden"
                @change="onFileUpload" />
            </label>

            <div v-if="filePreviewList.length > 0" class="space-y-2 mb-4">
              <div v-for="(file, index) in filePreviewList" :key="index"
                class="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                @click="openPreview(index)">
                <div
                  class="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-gray-200 flex items-center justify-center">
                  <img v-if="file.isImage" :src="file.url" :alt="file.name" class="w-full h-full object-cover" />
                  <svg v-else-if="file.isVideo" class="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.84A1 1 0 004 3.75v12.5a1 1 0 001.65.76L17.3 10.76a1 1 0 000-1.52L5.65 3.08z" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">{{ file.name }}</p>
                  <p class="text-xs text-gray-500">{{ (file.size / 1024 / 1024).toFixed(1) }} MB</p>
                </div>
                <button @click.stop="deleteFile(index)"
                  class="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-full text-sm hover:bg-red-600 transition-colors">
                  ×
                </button>
              </div>
            </div>

            <div v-if="filePreviewList.length === 0"
              class="text-center text-gray-400 text-sm mb-4 py-2 border border-dashed border-gray-200 rounded-lg">
              ไม่พบไฟล์แนบ (สามารถบันทึกแบบฟอร์มได้โดยไม่แนบไฟล์)
            </div>

            <div class="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mt-4">
              <div v-for="(level, index) in URGENCY_LEVEL_LIST" :key="index"
                class="flex items-center gap-3 cursor-pointer select-none"
                @click="repairFormData.urgency = level.value">
                <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 shadow-md transition-all duration-200" :class="[
                  level.border,
                  repairFormData.urgency === level.value ? level.bg : 'bg-white',
                ]"></div>
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
            @click="cancelRepairRequest"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            class="bg-blue-700 text-white px-6 py-2.5 sm:py-3 rounded-lg hover:bg-blue-800 transition disabled:opacity-50"
            @click="submitRepairRequest"
          >
            ส่งแบบฟอร์มแจ้งซ่อม
          </button>
        </div>
      </form>
    </div>

    <div v-if="showPreviewModal" class="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
      @click="closePreview">
      <div class="relative max-w-4xl max-h-full p-4" @click.stop>
        <button @click="closePreview"
          class="absolute -top-4 -right-4 w-10 h-10 bg-black bg-opacity-50 rounded-full text-white text-2xl hover:text-gray-300 z-10">
          ×
        </button>
        <img v-if="filePreviewList[currentPreviewIndex]?.isImage" :src="filePreviewList[currentPreviewIndex]?.url"
          class="max-w-full max-h-full object-contain" />
        <video v-else-if="filePreviewList[currentPreviewIndex]?.isVideo"
          :src="filePreviewList[currentPreviewIndex]?.url" controls autoplay class="max-w-full max-h-full"
          :key="currentPreviewIndex"></video>

        <button v-if="filePreviewList.length > 1 && currentPreviewIndex > 0" @click="prevPreview"
          class="absolute -left-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 rounded-full text-white text-2xl">
          ‹
        </button>
        <button v-if="filePreviewList.length > 1 && currentPreviewIndex < filePreviewList.length - 1"
          @click="nextPreview"
          class="absolute -right-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 rounded-full text-white text-2xl">
          ›
        </button>

        <div v-if="filePreviewList.length > 1"
          class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
          {{ currentPreviewIndex + 1 }} / {{ filePreviewList.length }}
        </div>
        <div class="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
          {{ filePreviewList[currentPreviewIndex]?.name }}
        </div>
      </div>
    </div>
  </div>
</template>
