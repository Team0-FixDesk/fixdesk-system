<template>
  <div>
    <div
      class="p-10 text-center border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-500"
      @click="fileInput.click()"
    >
      <p class="mb-1 font-medium">อัปโหลดไฟล์ Excel (.xlsx)</p>
      <p class="text-sm text-gray-500">ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์</p>

      <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="handleFile" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import * as XLSX from 'xlsx'

// next = ส่งข้อมูลผู้ใช้ที่อ่านจาก Excel ไปหน้า preview
const emit = defineEmits(['next'])
const fileInput = ref(null)

function handleFile(e) {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()

  reader.onload = (event) => {
    const data = new Uint8Array(event.target.result)
    const workbook = XLSX.read(data, { type: 'array' })

    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
    })

    const isValidPhone = (phone) => /^\d{9,10}$/.test(phone)
    const validTitles = ['นาย', 'นาง', 'นางสาว']

    const users = rows.map((row, index) => {
      const role = (row['บทบาท'] || '').toString().trim()
      const isTechnician = role === 'Technician'
      const technicianType = (row['ตำแหน่งช่าง'] || '').toString().trim()
      const phone = (row['เบอร์โทร'] || '').toString().trim()
      const title = (row['คำนำหน้า'] || '').toString().trim()

      const isValid = !!(
        row['ชื่อผู้ใช้'] &&
        title &&
        validTitles.includes(title) &&
        row['ชื่อ (TH)'] &&
        row['นามสกุล (TH)'] &&
        row['ชื่อ (EN)'] &&
        row['นามสกุล (EN)'] &&
        isValidPhone(phone) && 
        row['หน่วยงาน'] &&
        role &&
        (!isTechnician || technicianType)
      )

      return {
        id: index + 1,

        username: row['ชื่อผู้ใช้'],
        title_name: title,
        first_name_th: row['ชื่อ (TH)'],
        last_name_th: row['นามสกุล (TH)'],
        first_name_en: row['ชื่อ (EN)'],
        last_name_en: row['นามสกุล (EN)'],
        phone,
        department: row['หน่วยงาน'],
        role_name: role,
        technician_type: isTechnician ? technicianType : null,

        selected: isValid,
        isValid,
      }
    })

    //ส่งข้อมูลไปหน้า Preview (ขั้นตอน 2)
    emit('next', users)
  }

  reader.readAsArrayBuffer(file)
}
</script>
