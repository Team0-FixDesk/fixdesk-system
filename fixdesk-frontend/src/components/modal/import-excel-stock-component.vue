/**
 * =====================================================================
 * @file            import-excel-stock-component.vue
 * @module          มอดูลการจัดการคลัง - นำเข้าข้อมูลจากไฟล์ Excel
 * @layer           View (Presentation Layer - Modal Component)
 * @version         1.0.0
 * @since           2026-02-20
 * @author          ธนภัทร จันทร์งาม
 * @lastModified    2026-02-21
 * @lastModifiedBy  ธนภัทร จันทร์งาม
 * ---------------------------------------------------------------------
 * @description
 *  Modal สำหรับนำเข้าข้อมูลคลังจากไฟล์ Excel
 *  ประกอบด้วย 2 ขั้นตอน:
 *   1. อัปโหลดไฟล์ Excel
 *   2. แสดงตัวอย่างข้อมูลก่อนยืนยันนำเข้า
 *
 *  การทำงาน:
 *   - รับข้อมูลจาก Upload Step และส่งต่อไป Preview Step
 *   - เมื่อบันทึกสำเร็จ จะส่ง event กลับไปยังหน้าหลัก
 *   - ใช้ sessionStorage เก็บข้อความ Toast ชั่วคราว
 *     เพื่อให้หน้าหลักแสดง Toast หลังปิด Modal
 *   - ป้องกันการแสดง Toast ซ้ำเมื่อรีเฟรชหน้า
 *
 * @requires
 *   - vue
 *   - @iconify/vue
 *   - ./upload-excel-stock-component.vue
 *   - ./preview-excel-stock-component.vue
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - เพิ่มการควบคุม Toast ด้วย sessionStorage
 *     เพื่อแสดงผลหลังปิด Modal
 *     [2026-02-21, ธนภัทร จันทร์งาม]
 * =====================================================================
 */

<script setup>
import { ref } from 'vue'
import UploadStockExcelStep from './upload-excel-stock-component.vue/'
import PreviewStockExcelStep from './preview-excel-stock-component.vue'
import { Icon } from '@iconify/vue'

const emit = defineEmits(['close', 'refresh', 'success', 'error'])

const step = ref(1)
const items = ref([])

// ฟังก์ชันรับข้อมูลจาก Step 1 (Upload) data: ต้องเป็น Array ของ Object ที่ map key มาแล้ว (username, password, etc.)
function goPreview(data) {
  items.value = data
  step.value = 2
}

// ฟังก์ชันรับ Event Success จาก Step 2 ส่งต่อผลลัพธ์ไปให้หน้าหลัก (Parent) เพื่อแจ้งเตือน
function handleSuccess(result) {
  sessionStorage.setItem(
    'stockImportSuccessToast',
    'นำเข้าข้อมูลคลังสำเร็จ',
  )

  emit('refresh')

  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div class="w-full max-w-5xl p-6 bg-white shadow-xl rounded-xl">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 mb-4 border-b">
        <div>
          <h2 class="text-xl font-semibold text-gray-800">นำเข้าข้อมูลคลัง</h2>
          <p class="text-sm text-gray-500">
            ขั้นตอนที่ {{ step }} จาก 2 : {{ step === 1 ? 'อัปโหลดไฟล์' : 'ตรวจสอบข้อมูล' }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <a v-if="step === 1" href="/example/TemplateExcelStock.xlsx" download="TemplateExcelStock.xlsx"
            class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors bg-green-50 border border-green-200 rounded-md hover:bg-green-100 hover:border-green-300">
            <Icon icon="icon-park-outline:excel" width="16" height="16" />
            <span>โหลด Template</span>
          </a>

          <button @click="$emit('close')"
            class="p-2 text-gray-400 transition-colors rounded-full hover:text-gray-600 hover:bg-gray-100">
            <Icon icon="radix-icons:cross-2" width="24" height="24" style="color: #8e8e8e" />
          </button>
        </div>
      </div>

      <div class="min-h-[300px]">
        <UploadStockExcelStep v-if="step === 1" @next="goPreview" @error="(msg) => $emit('error', msg)" />

        <PreviewStockExcelStep v-if="step === 2" :items="items" @back="step = 1" @close="$emit('close')"
          @refresh="$emit('refresh')" @success="handleSuccess" @error="(msg) => $emit('error', msg)" />
      </div>
    </div>
  </div>
</template>
