<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="w-full max-w-4xl p-6 bg-white shadow-lg rounded-xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">นำเข้าข้อมูลผู้ใช้งาน (ขั้นตอนที่ {{ step }}/2)</h2>
        <button @click="$emit('close')" class="text-gray-500 hover:text-black">✕</button>
      </div>

      <!-- Body -->
      <UploadExcelStep v-if="step === 1" @next="goPreview" />

      <PreviewUserStep
        v-if="step === 2"
        :users="users"
        @back="step = 1"
        @close="$emit('close')"
        @refresh="$emit('refresh')"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import UploadExcelStep from './upload-excel-component.vue'
import PreviewUserStep from './preview-user-excel.vue'

const step = ref(1)
const users = ref([])

//ฟังก์ชันเมื่ออัปโหลด Excel เสร็จ
function goPreview(data) {
  users.value = data
  step.value = 2
}
</script>
