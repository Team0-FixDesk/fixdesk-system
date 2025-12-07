<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const goToCreate = () => {
  router.push('/main/repair-request')
}
</script>

<template>
  <button
    @click="goToCreate"
    class="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#1E48D1] hover:bg-[#163A9B] text-white font-medium shadow-sm transition"
  >
    <img src="/icon/plus-icon.svg" alt="User Icon" class="w-6 h-6" />
    แจ้งซ่อม
  </button>
</template>
