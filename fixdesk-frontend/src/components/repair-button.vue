<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

// ฟังก์ชันสำหรับลิงก์ไปยังหน้าแจ้งซ่อม
const goToCreate = () => {
  router.push('/main/repair-request')
}
</script>

<template>
  <button
    @click="goToCreate"
    class="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#1E48D1] hover:bg-[#163A9B] text-white font-medium shadow-sm transition"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m7-7H5" />
    </svg>
    แจ้งซ่อม
  </button>
</template>
