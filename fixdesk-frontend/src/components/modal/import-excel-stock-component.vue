<script setup>
import { ref } from 'vue'
import UploadStockExcelStep from './upload-excel-stock-component.vue/'
import PreviewStockExcelStep from './preview-excel-stock-component.vue'

const step = ref(1)
const items = ref([])

//ฟังก์ชันเมื่ออัปโหลด Excel เสร็จ
function goPreview(data) {
  items.value = data
  step.value = 2
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="w-full max-w-4xl p-6 bg-white shadow-lg rounded-xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">
          นำเข้าข้อมูลคลัง (ขั้นตอนที่ {{ step }}/2)
        </h2>
        <button @click="$emit('close')" class="text-gray-500 hover:text-black">✕</button>
      </div>

      <!-- Body -->
      <UploadStockExcelStep
        v-if="step === 1"
        @next="goPreview"
      />

      <PreviewStockExcelStep
        v-if="step === 2"
        :items="items"
        @back="step = 1"
        @close="$emit('close')"
        @refresh="$emit('refresh')"
      />
    </div>
  </div>
</template>
