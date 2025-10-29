<template>
  <!-- 🔹 Popup ฉากหลัง -->
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50"
  >
    <!-- 🔸 กล่อง Alert -->
    <div
      class="w-[480px] bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center relative animate-fade-in"
    >
      <!-- 🟡 ไอคอนด้านบน -->
      <div class="w-20 h-20 flex items-center justify-center bg-yellow-100 rounded-full mb-5">
        <img src="/icon/alert/edit-user-icon.svg" alt="icon" class="w-12 h-12" />
      </div>

      <!-- 🔹 หัวข้อ -->
      <h2 class="text-2xl font-bold text-gray-900 mb-2">
        {{ title || 'ยืนยันการแก้ไขผู้ใช้' }}
      </h2>

      <!-- 🔸 รายละเอียด -->
      <p class="text-gray-600 text-base mb-8 leading-relaxed">
        {{ message || 'คุณต้องการบันทึกการเปลี่ยนแปลงข้อมูลผู้ใช้นี้หรือไม่?' }}
      </p>

      <!-- 🔘 ปุ่ม -->
      <div class="flex gap-6">
        <button
          @click="onCancel"
          class="px-8 py-2 rounded-md border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-100 transition-all duration-150"
        >
          ยกเลิก
        </button>

        <button
          @click="onConfirm"
          class="px-8 py-2 rounded-md bg-yellow-500 text-white font-medium hover:bg-yellow-600 transition-all duration-150"
        >
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

<style scoped>
@keyframes fade-in {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fade-in {
  animation: fade-in 0.25s ease-out;
}
</style>
