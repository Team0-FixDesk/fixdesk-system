/**
 * =====================================================================
 * @file            upload-excel-user-component.vue
 * @layer           Component Layer (UI Component)
 * @version         1.0.0
 * @since           2026-02-05
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *
 * @lastModified    2026-02-25
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  คอมโพเนนต์อัปโหลดไฟล์ Excel (.xlsx) เพื่อเตรียมข้อมูลผู้ใช้งานสำหรับนำเข้า
 *  อ่าน sheet แรก แปลงเป็นรายการผู้ใช้ ทำความสะอาดและตรวจสอบข้อมูล
 *  แล้วส่งข้อมูลที่แปลงผ่าน `next` เพื่อแสดงตัวอย่างก่อนนำเข้า
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-02-05] V1.0.0 - พชร ไพศรีสกุล
 *  - ปรับปรุงและแก้ไขการ import user
 *  - เพิ่ม validation และ clean phone number ก่อนส่งข้อมูล
 *  [2026-02-25, พชร ไพศรีสกุล] V 1.2.0
 *  - แก้ไขการสร้างบัญชีผู้ใช้จากการ import จากไฟล์ ให้รองรับการสร้าง default รหัสผ่าน
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

// ฟังก์ชัน Helper สำหรับดึงค่าจาก cell ให้เป็น string
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

      // อ่านแบบ Array of Arrays (header: 1) เพื่ออิงตามลำดับคอลัมน์แทนชื่อ
      // Row 0 = Header, Row 1+ = Data
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      // ตัด Header ออก (สมมติว่าแถวแรกเป็น Header เสมอ)
      const dataRows = rows.slice(1)

      if (dataRows.length === 0) {
        errorMessage.value = 'ไม่พบข้อมูลในไฟล์'
        return
      }

      // Logic ตรวจสอบความถูกต้อง
      const isValidPhone = (p) => /^\d{9,10}$/.test(p)

      const users = dataRows
        .map((row, index) => {
          // Map ข้อมูลตามลำดับ Index (0-11)
          const username = getVal(row[0])
          const title = getVal(row[1])
          const position = getVal(row[2])
          const firstNameTh = getVal(row[3])
          const lastNameTh = getVal(row[4])
          const firstNameEn = getVal(row[5])
          const lastNameEn = getVal(row[6])

          // --- แก้ไขจุดนี้ (Clean Phone) ---
          // รับค่ามา -> ลบขีด (-) ออก -> ลบช่องว่างออก
          let phone = getVal(row[7]).replace(/-/g, '').replace(/\s/g, '')
          // -----------------------------

          const department = getVal(row[8])
          const role = getVal(row[9])
          const techType = getVal(row[10])

          const isTechnician = role === 'Technician'

          // ตรวจสอบว่า Valid หรือไม่
          const isValid = !!(
            username &&
            title &&
            // validTitles.includes(title) && // **แนะนำ**: เปิดบรรทัดนี้ถ้าอยากบังคับคำนำหน้า
            firstNameTh &&
            lastNameTh &&
            firstNameEn &&
            lastNameEn &&
            department &&
            role &&
            isValidPhone(phone) && // ตอนนี้ phone ไม่มีขีดแล้ว จะผ่าน Regex ได้
            (!isTechnician || techType)
          )

          return {
            id: index + 1,
            username: username,
            title_name: title,
            position: position,
            first_name_th: firstNameTh,
            last_name_th: lastNameTh,
            first_name_en: firstNameEn,
            last_name_en: lastNameEn,
            phone: phone, // ส่งค่าเบอร์โทรที่ Clean แล้วไปแสดงผล/บันทึก
            department: department,
            role_name: role,
            technician_type: isTechnician ? techType : null,

            selected: isValid,
            isValid: isValid,
          }
        })
        .filter((u) => u.username)

      emit('next', users)
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
