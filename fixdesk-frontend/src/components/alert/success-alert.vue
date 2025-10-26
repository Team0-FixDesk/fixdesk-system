<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50"
  >
    <div
      class="w-[420px] bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center relative text-center"
    >
      <div
        class="w-20 h-20 flex items-center justify-center bg-blue-100 rounded-full mb-5"
      >
        <img src="/icon/alert/confirm-icon.svg" alt="success" class="w-12 h-12" />
      </div>

      <h2 class="text-2xl font-bold text-blue-600 mb-3">
        ดำเนินการเสร็จสิ้น
      </h2>

      <button
        @click="close"
        class="mt-2 px-10 py-2.5 rounded-md bg-blue-600 text-white text-lg font-medium hover:bg-blue-800 transition"
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
})

const emits = defineEmits(['close'])

const close = () => emits('close')
</script>

