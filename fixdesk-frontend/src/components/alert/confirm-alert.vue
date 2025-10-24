<template>
  <div v-if="visible" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
    <div class="w-[500px] h-auto bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center relative">
      <div class="w-20 h-20 flex items-center justify-center bg-[#8BBCDF] rounded-full mb-4">
        <img src="/icon/alert/confirm-icon.svg" alt="icon" class="w-12 h-12" />
      </div>
      <h2 class="text-2xl font-bold text-black mb-2">{{ title }}</h2>
      <p class="text-center text-gray-600 text-lg mb-8">{{ message }}</p>
      <div class="flex gap-6">
        <button @click="onCancel" class="px-8 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-medium transition">
          ยกเลิก
        </button>
        <button @click="onConfirm" class="px-8 py-2 rounded-md bg-[#005D9F] text-white hover:bg-blue-700 font-medium transition">
          ยืนยัน
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: Boolean,
  title: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
})

const emits = defineEmits(['confirm', 'cancel'])

const onConfirm = () => emits('confirm')
const onCancel = () => emits('cancel')
</script>

