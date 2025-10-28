<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50"
  >
    <div
      class="w-[480px] bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center relative animate-fadeIn"
    >
      <!-- 🧰 ไอคอน -->
      <div class="w-20 h-20 flex items-center justify-center bg-blue-100 rounded-full mb-5">
        <img src="/icon/alert/confirm-icon.svg" alt="confirm" class="w-12 h-12" />
      </div>

      <!-- 🧾 ข้อความ -->
      <h2 class="text-2xl font-bold text-gray-800 mb-2">ยืนยันการปิดงาน</h2>
      <p class="text-gray-600 text-center mb-8">
        คุณแน่ใจหรือไม่ว่าต้องการปิดงานนี้?<br />
        เมื่องานถูกปิดแล้วจะไม่สามารถแก้ไขได้
      </p>

      <!-- 🔘 ปุ่ม -->
      <div class="flex gap-5">
        <button
          @click="onCancel"
          class="px-8 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-medium transition"
        >
          ยกเลิก
        </button>
        <button
          @click="onConfirm"
          class="px-8 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-800 font-medium transition"
        >
          ปิดงาน
        </button>
      </div>
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

const emits = defineEmits(['confirm', 'cancel'])

const onConfirm = () => emits('confirm')
const onCancel = () => emits('cancel')
</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-fadeIn {
  animation: fadeIn 0.25s ease;
}
</style>
