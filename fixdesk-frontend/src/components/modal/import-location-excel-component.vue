<script setup>
import { ref } from 'vue'
import UploadExcelLocationStep from './upload-excel-location-component.vue'
import PreviewLocationStep from './preview-location-excel-component.vue'
import { Icon } from '@iconify/vue'

const emit = defineEmits(['close','refresh','success','error'])

const step = ref(1)
const locations = ref([])

function goPreview(data){
  locations.value = data
  step.value = 2
}

function handleSuccess(result){
  emit('success', result)
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
          <h2 class="text-xl font-semibold text-gray-800">นำเข้าข้อมูลสถานที่</h2>
          <p class="text-sm text-gray-500">
            ขั้นตอนที่ {{ step }} จาก 2 :
            {{ step === 1 ? 'อัปโหลดไฟล์' : 'ตรวจสอบข้อมูล' }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <!-- เปลี่ยน path ตามไฟล์ template ของคุณ -->
          <a
            v-if="step === 1"
            href="/example/TemplateExcelLocation.xlsx"
            download
            class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors bg-green-50 border border-green-200 rounded-md hover:bg-green-100 hover:border-green-300"
          >
            <Icon icon="icon-park-outline:excel" width="16" height="16" />
            <span>โหลด Template</span>
          </a>

          <button
            @click="$emit('close')"
            class="p-2 text-gray-400 transition-colors rounded-full hover:text-gray-600 hover:bg-gray-100"
          >
            <Icon icon="radix-icons:cross-2" width="24" height="24" />
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="min-h-[300px]">
        <UploadExcelLocationStep
          v-if="step === 1"
          @next="goPreview"
          @error="(msg) => $emit('error', msg)"
        />

        <PreviewLocationStep
          v-if="step === 2"
          :locations="locations"
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
