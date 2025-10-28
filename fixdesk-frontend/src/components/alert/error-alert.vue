<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50"
  >
    <div
      class="w-[500px] bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center relative"
    >
      <div
        class="w-20 h-20 flex items-center justify-center bg-red-100 rounded-full mb-4"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <h2 class="text-2xl font-bold text-red-600 mb-2">{{ title }}</h2>
      <p class="text-center text-gray-600 text-lg mb-8">{{ message }}</p>

      <button
        @click="close"
        class="px-10 py-2.5 rounded-md bg-red-600 text-white text-lg font-medium hover:bg-red-700 transition"
      >
        ตกลง
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'เกิดข้อผิดพลาด',
  },
  message: {
    type: String,
    default: '',
  },
})

const emits = defineEmits(['close'])

const close = () => emits('close')
</script>
