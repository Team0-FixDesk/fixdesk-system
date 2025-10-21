<script setup>
import { ref } from 'vue'

// สถานะเปิด/ปิด sidebar (hover)
const isOpen = ref(false)

// เมนูทั้งหมด (ข้อมูลจาก array เดียว)
const menus = [
  { icon: '/icon/sidebar/home-icon.svg', label: 'หน้าหลัก' },
  { icon: '/icon/sidebar/repair-icon.svg', label: 'แจ้งซ่อม' },
  { icon: '/icon/sidebar/list-icon.svg', label: 'รายการของฉัน' },
  { icon: '/icon/sidebar/logs-list-icon.svg', label: 'รายการเบิกของ' },
  { icon: '/icon/sidebar/history-list-icon.svg', label: 'ประวัติการเบิกของ' },
  { icon: '/icon/sidebar/stock-icon.svg', label: 'จัดการคลัง' },
]
</script>

<template>
  <!-- Sidebar -->
  <aside
    class="fixed top-0 left-0 h-screen bg-[#1E48D1] text-white shadow-lg transition-all duration-300 ease-in-out overflow-hidden"
    :class="isOpen ? 'w-64' : 'w-20'"
    @mouseenter="isOpen = true"
    @mouseleave="isOpen = false">
    <!-- โลโก้คงที่ + แสดงคำว่า FIXDESK ตอนขยาย -->
    <div class="flex items-center justify-start h-20 border-b border-blue-700 px-4">
      <img
        src="/icon/LogoFIXDESK-logo.png"
        alt="FixDesk Logo"
        class="w-10 h-10 object-contain"
      />
      <span
        class="ml-3 text-2xl font-bold tracking-wide transition-opacity duration-300"
        :class="isOpen ? 'opacity-100' : 'opacity-0'"
      >
        FIXDESK
      </span>
    </div>
    <!-- เมนูหลัก -->
    <nav class="flex flex-col gap-4 mt-6 px-2">
      <router-link
        v-for="(menu, index) in menus"
        :key="index"
        :to="menu.path"
        class="group flex items-center rounded-lg hover:bg-blue-800 transition-all duration-300 relative h-12"
      >
        <!-- icon -->
        <div class="flex items-center justify-center w-12 h-12 leading-none">
          <img :src="menu.icon" :alt="menu.label" class="w-6 h-6 block" />
        </div>

        <!-- text -->
        <span
          v-show="isOpen"
          class="absolute left-16 text-lg font-medium whitespace-nowrap"
        >
          {{ menu.label }}
        </span>
      </router-link>
    </nav>
  </aside>
</template>
