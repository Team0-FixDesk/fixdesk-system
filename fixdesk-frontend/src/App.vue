<script setup>
import Sidebar from './layouts/technician-sidebar.vue'
</script>

<template>
  <div class="relative">
    <!-- Sidebar อยู่บนสุด -->
    <Sidebar class="z-50" />

    <!-- เนื้อหาหลัก -->
    <main
      class="p-6 bg-gray-50 min-h-screen transition-all duration-300"
      style="padding-left: 120px;"
    >
      <RouterView />
    </main>
  </div>
</template>
