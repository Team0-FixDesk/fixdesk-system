<template>
  <div>
    <!-- กล่องอัปโหลดไฟล์ -->
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

// emit next = ส่งข้อมูล stock ที่อ่านจาก Excel ไปหน้า preview
const emit = defineEmits(['next'])
const fileInput = ref(null)

//อ่านไฟล์ excel
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

    const items = rows.map((row, index) => {
      const name = (row['ชื่อรายการ'] || '').toString().trim()
      const assetNo = (row['หมายเลขครุภัณฑ์'] || '').toString().trim()

      const rawQty = row['จำนวน']
      const quantity = Number(rawQty)
      const isValidQuantity = !isNaN(quantity) && quantity > 0

      const unit = (row['หน่วยนับ'] || '').toString().trim()
      const category = (row['หมวดหมู่'] || '').toString().trim()

      // ต้องกรอกชื่อ, จำนวน, หน่วย, หมวดหมู่
      const baseValid = !!(name && isValidQuantity && unit && category)

      return {
        id: index + 1,
        pd_name: name,
        pd_asset_code: assetNo || null,
        pd_quantity: quantity,
        pd_unit_name: unit,
        pd_category_name: category,
        status: 'พร้อมใช้งาน',

        selected: baseValid,
        isValid: baseValid,
      }
    })

    //ตรวจซ้ำชื่อรายการ หรือหมายเลขครุภัณฑ์
    const nameMap = new Map()
    const assetMap = new Map()

    items.forEach((item, index) => {
      const nameKey = item.pd_name
      const assetKey = item.pd_asset_code

      // ซ้ำชื่อ
      if (nameKey) {
        if (nameMap.has(nameKey)) {
          const firstIndex = nameMap.get(nameKey)
          items[firstIndex].isValid = false
          items[firstIndex].selected = false
          item.isValid = false
          item.selected = false
        } else {
          nameMap.set(nameKey, index)
        }
      }

      // ซ้ำหมายเลขครุภัณฑ์
      if (assetKey) {
        if (assetMap.has(assetKey)) {
          const firstIndex = assetMap.get(assetKey)
          items[firstIndex].isValid = false
          items[firstIndex].selected = false
          item.isValid = false
          item.selected = false
        } else {
          assetMap.set(assetKey, index)
        }
      }
    })

    // ส่งไปหน้า preview (Step 2)
    emit('next', items)
  }

  reader.readAsArrayBuffer(file)
}
</script>
