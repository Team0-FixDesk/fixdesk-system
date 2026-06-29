/**
 * =====================================================================
 * @file            upload-excel-stock-component.vue
 * @module
 * @layer           Component Layer (UI Component)
 * @version         1.0.0
 * @since           2026-02-05
 * @author
 * @contributors
 *
 * @lastModified    2026-02-05
 * @lastModifiedBy
 * ---------------------------------------------------------------------
 * @description
 *  คอมโพเนนต์อัปโหลดและแปลงไฟล์ Excel (.xlsx) สำหรับข้อมูลคลังสินค้า
 *  แมปคอลัมน์ตามเทมเพลตเป็นฟิลด์สินค้า ตรวจสอบความถูกต้องของข้อมูล
 *  แล้วส่งรายการที่แปลงผ่าน `next` เพื่อทำ preview หรือนำเข้า
 *
 * @requires
 *  - vue
 *  - xlsx
 * ---------------------------------------------------------------------
 * @changelog
 *
 * =====================================================================
 */

<template>
  <div>
    <div
      class="p-6 sm:p-10 text-center border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-500 bg-gray-50 hover:bg-blue-50 transition-colors"
      :class="isDragging ? 'border-blue-500 bg-blue-100' : 'border-gray-300'"
      @click="fileInput.click()"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <div class="flex flex-col items-center justify-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-10 h-10 sm:w-12 sm:h-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p class="font-medium text-gray-700">อัปโหลดไฟล์ Excel (.xlsx)</p>
        <p class="text-sm text-gray-500">ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์</p>
      </div>

      <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="handleFile" />
    </div>

    <p v-if="errorMessage" class="mt-2 text-sm text-red-500 text-center">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import * as XLSX from 'xlsx'

const emit = defineEmits(['next', 'error'])
const fileInput = ref(null)
const isDragging = ref(false)
const errorMessage = ref('')

// ฟังก์ชัน Helper สำหรับดึงค่าจาก cell ให้เป็น string และ trim ช่องว่าง
const getVal = (val) => (val !== undefined && val !== null ? String(val).trim() : '')

function processFile(file) {
  errorMessage.value = ''

  if (!file) return

  const reader = new FileReader()

  reader.onload = (event) => {
    try {
      const data = new Uint8Array(event.target.result)
      const workbook = XLSX.read(data, { type: 'array' })

      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      // อ่านแบบ Array of Arrays (header: 1) เพื่ออิงตามลำดับคอลัมน์
      // Row 0 = Header, Row 1+ = Data
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      // ตัด Header ออก
      const dataRows = rows.slice(1)

      if (dataRows.length === 0) {
        errorMessage.value = 'ไม่พบข้อมูลในไฟล์'
        return
      }

      // Map ข้อมูลให้เข้ากับ Structure ของ Stock
      const items = dataRows.map((row, index) => {
        // Map ตามลำดับ Column ในไฟล์ TemplateExcelStock.xlsx
        // Col 0: ชื่อรายการ *
        // Col 1: หมายเลขครุภัณฑ์
        // Col 2: หมวดหมู่ *
        // Col 3: จำนวน *
        // Col 4: หน่วยนับ *
        // Col 5: สถานะ *

        const name = getVal(row[0])
        const assetCode = getVal(row[1])
        const category = getVal(row[2])

        // จัดการเรื่องตัวเลข (จำนวน)
        const rawQty = row[3]
        const quantity = Number(rawQty)
        const isValidQty = !isNaN(quantity) && quantity > 0

        const unit = getVal(row[4])
        const status = getVal(row[5])

        // ตรวจสอบว่า Valid หรือไม่ (Mandatory fields)
        // ชื่อ, หมวดหมู่, จำนวน, หน่วยนับ, สถานะ จำเป็นต้องมี
        const isValid = !!(
          name &&
          category &&
          isValidQty &&
          unit &&
          status
        )

        return {
          id: index + 1,
          // Map Keys ให้ตรงกับที่ Step 2 (Preview) และ Backend ต้องการ
          pd_name: name,
          pd_asset_code: assetCode || null, // ถ้าไม่มีให้เป็น null
          pd_category_name: category,
          pd_quantity: quantity,
          pd_unit_name: unit,
          status: status,

          selected: isValid, // ถ้าข้อมูลถูกต้อง ให้ติ๊กเลือกไว้ก่อน
          isValid: isValid,
        }
      }).filter(item => item.pd_name) // กรองแถวว่างทิ้ง (ต้องมีชื่อรายการ)

      if (items.length === 0) {
        errorMessage.value = 'ไม่พบรายการที่สมบูรณ์ในไฟล์'
        return
      }

      emit('next', items)

    } catch (err) {
      console.error(err)
      errorMessage.value = 'เกิดข้อผิดพลาดในการอ่านไฟล์'
      emit('error', 'ไฟล์ไม่ถูกต้อง')
    }
  }

  reader.readAsArrayBuffer(file)
}

function handleFile(e) {
  const file = e.target.files[0]
  processFile(file)
  // Reset input เพื่อให้เลือกไฟล์เดิมซ้ำได้ถ้าต้องการ
  e.target.value = ''
}

function handleDrop(e) {
  isDragging.value = false
  const file = e.dataTransfer.files[0]
  if (file && file.name.endsWith('.xlsx')) {
    processFile(file)
  } else {
    errorMessage.value = 'กรุณาอัปโหลดไฟล์ .xlsx เท่านั้น'
  }
}
</script>
