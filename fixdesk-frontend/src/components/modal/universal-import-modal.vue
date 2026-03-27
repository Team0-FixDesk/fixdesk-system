/**
 * =====================================================================
 * @file            universal-import-modal.vue
 * @layer           Presentation Layer (Component)
 * @version         1.0.0
 * @since           2026-03-21
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *
 * @lastModified    2026-03-21
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  Universal Import Excel Modal Component
 *  รวมการนำเข้า Users, Locations, Stocks ไว้ในตัวเดียว
 *  ทำหน้าที่:
 *  - รับ Props เพื่อกำหนดประเภทของข้อมูลที่ต้องการนำเข้า (เช่น users, locations, stocks) และชื่อไฟล์ Template ที่จะดาวน์โหลด
 *  - แสดง Modal ที่มีขั้นตอนการนำเข้า 2 ขั้นตอน: อัปโหลดไฟล์ Excel และตรวจสอบข้อมูลก่อนบันทึก
 *  - ใช้ Dynamic Component เพื่อแสดงฟอร์มอัปโหลดและการตรวจสอบข้อมูลที่แตกต่างกันตามประเภทของข้อมูล
 *  - โครงสร้างเป็นแบบ Layered Architecture
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-03-21, พชร ไพศรีสกุล] V 1.0.0
 *  - Initial implementation Universal Import Excel Modal Component
 *
 * =====================================================================
 */

<script setup>

/**
 * Universal Import Excel Modal
 * รวมการนำเข้า Users, Locations, Stocks ไว้ในตัวเดียว
 */
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import DownloadTemplateButton from '@/components/button/download-template-button.vue'

// Import Sub-components ทั้งหมด
import UploadUserStep from './upload-excel-user-component.vue'
import PreviewUserStep from './preview-user-excel-component.vue'
import UploadLocationStep from './upload-excel-location-component.vue'
import PreviewLocationStep from './preview-location-excel-component.vue'
import UploadStockStep from './upload-excel-stock-component.vue'
import PreviewStockStep from './preview-excel-stock-component.vue'

const props = defineProps({
  type: {
    type: String, // 'users', 'locations', 'stocks'
    required: true
  },
  title: {
    type: String,
    required: true
  },
  templateFileName: {
    type: String,
    default: 'Template.xlsx'
  }
})

const emit = defineEmits(['close', 'refresh', 'success', 'error'])

const step = ref(1)
const importData = ref([])

// 1. เลือก Component ที่จะแสดงตามประเภท (type)
const currentStepComponents = computed(() => {
  const map = {
    users: { upload: UploadUserStep, preview: PreviewUserStep },
    locations: { upload: UploadLocationStep, preview: PreviewLocationStep },
    stocks: { upload: UploadStockStep, preview: PreviewStockStep }
  }
  return map[props.type]
})

// 2. ฟังก์ชันจัดการข้อมูลก่อน Preview (ทำ Logic เฉพาะของ Stock ตรงนี้)
function goPreview(data) {
  if (props.type === 'stocks') {
    // Logic พิเศษของ Stock: ถ้ามีรหัสครุภัณฑ์ ให้ตั้งจำนวนเป็น 1 อัตโนมัติ
    importData.value = data.map((item) => {
      const assetCode = item.assetNumber || item.pd_asset_code || ''
      if (assetCode && String(assetCode).trim() !== '') {
        return { ...item, pd_quantity: 1 }
      }
      return item
    })
  } else {
    importData.value = data
  }
  step.value = 2
}

// 3. ฟังก์ชันเมื่อบันทึกสำเร็จ
function handleSuccess(result) {
  if (props.type === 'stocks') {
    sessionStorage.setItem('stockImportSuccessToast', 'นำเข้าข้อมูลคลังสำเร็จ')
  }
  emit('success', result)
  emit('refresh')
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
    <div class="w-full max-w-5xl p-6 bg-white shadow-xl rounded-xl">
      <div class="flex items-center justify-between pb-4 mb-4 border-b">
        <div>
          <h2 class="text-xl font-semibold text-gray-800">นำเข้าข้อมูล{{ title }}</h2>
          <p class="text-sm text-gray-500">
            ขั้นตอนที่ {{ step }} จาก 2 : {{ step === 1 ? 'อัปโหลดไฟล์' : 'ตรวจสอบข้อมูล' }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <DownloadTemplateButton
            :templateType="type"
            :fileName="templateFileName"
            buttonText="ดาวน์โหลด Template"
          />

          <button
            @click="$emit('close')"
            class="p-2 text-gray-400 transition-colors rounded-full hover:text-gray-600 hover:bg-gray-100"
          >
            <Icon icon="radix-icons:cross-2" width="24" height="24" />
          </button>
        </div>
      </div>

      <div class="min-h-[400px]">
        <component
          :is="currentStepComponents.upload"
          v-if="step === 1"
          @next="goPreview"
          @error="(msg) => $emit('error', msg)"
        />

        <component
          :is="currentStepComponents.preview"
          v-if="step === 2"
          :users="type === 'users' ? importData : undefined"
          :locations="type === 'locations' ? importData : undefined"
          :items="type === 'stocks' ? importData : undefined"
          @back="step = 1"
          @close="$emit('close')"
          @refresh="$emit('refresh')"
          @success="handleSuccess"
          @error="(msg) => $emit('error', msg)"
        />
      </div>
    </div>
  </div>
</template>
