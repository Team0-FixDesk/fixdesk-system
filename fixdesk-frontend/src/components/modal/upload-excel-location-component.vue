<script setup>
import { ref } from 'vue'
import * as XLSX from 'xlsx'

const emit = defineEmits(['next','error'])

const fileInput = ref(null)
const isDragging = ref(false)
const errorMessage = ref('')

const getVal = (v) =>
  v !== undefined && v !== null ? String(v).trim() : ''

function processFile(file){
  errorMessage.value = ''
  if(!file) return

  const reader = new FileReader()

  reader.onload = (e) => {
    try{
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data,{type:'array'})
      const sheet = workbook.Sheets[workbook.SheetNames[0]]

      // อ่านเป็น Array of Arrays
      const rows = XLSX.utils.sheet_to_json(sheet,{header:1})
      const dataRows = rows.slice(1)

      if(!dataRows.length){
        errorMessage.value = 'ไม่พบข้อมูลในไฟล์'
        return
      }

      const locations = dataRows.map((row,index)=>{

        const building = getVal(row[0])
        const floor = getVal(row[1])
        const room = getVal(row[2])

        const isValid = !!(building && floor && room)

        return {
          id:index+1,
          building_name:building,
          floor_name:floor,
          room_name:room,
          selected:isValid,
          isValid
        }
      }).filter(r=>r.building_name)

      emit('next',locations)

    }catch{
      emit('error','ไฟล์ Excel ไม่ถูกต้อง')
    }
  }

  reader.readAsArrayBuffer(file)
}

function handleFile(e){
  processFile(e.target.files[0])
  e.target.value=''
}

function handleDrop(e){
  isDragging.value=false
  const file = e.dataTransfer.files[0]

  if(!file.name.endsWith('.xlsx')){
    errorMessage.value='รองรับเฉพาะไฟล์ .xlsx'
    return
  }

  processFile(file)
}
</script>

<template>
  <div>
    <div
      class="p-10 text-center border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-500 bg-gray-50 hover:bg-blue-50 transition-colors"
      :class="isDragging ? 'border-blue-500 bg-blue-100' : 'border-gray-300'"
      @click="fileInput.click()"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <p class="font-medium text-gray-700">อัปโหลดไฟล์ Excel (.xlsx)</p>
      <p class="text-sm text-gray-500">ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์</p>

      <input
        ref="fileInput"
        type="file"
        accept=".xlsx"
        class="hidden"
        @change="handleFile"
      />
    </div>

    <p v-if="errorMessage" class="mt-2 text-sm text-red-500 text-center">
      {{ errorMessage }}
    </p>
  </div>
</template>
