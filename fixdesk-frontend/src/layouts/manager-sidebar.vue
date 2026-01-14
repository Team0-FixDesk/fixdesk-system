<script setup>
import { ref } from 'vue'
import SidebarProfile from '@/components/sidebar-profile-component.vue'

// สถานะเปิด/ปิด sidebar
const isOpen = ref(false)

// รายการเมนู
const menus = [
  { icon: '/icon/sidebar/home-icon.svg', label: 'หน้าหลัก', path: '/main/manager-home' },
  { icon: '/icon/sidebar/repair-icon.svg', label: 'แจ้งซ่อม', path: '/main/repair-request' },
  { icon: '/icon/sidebar/list-icon.svg', label: 'รายการของฉัน', path: '/main/my-list' },
  { icon: '/icon/sidebar/dashboard-icon.svg', label: 'หน้าสรุปผล', path: '/main/manager-summary' },
  { icon: '/icon/sidebar/report-icon.svg', label: 'สร้างรายงาน', path: '/main/manage-report' },
]
</script>

<template>
  <aside
    class="fixed top-0 left-0 h-screen bg-[#1E48D1] text-white shadow-lg transition-all duration-300 ease-in-out overflow-hidden flex flex-col justify-between"
    :class="isOpen ? 'w-64' : 'w-20'"
    @mouseenter="isOpen = true"
    @mouseleave="isOpen = false"
  >
    <!-- โลโก้ -->
    <div class="flex items-center justify-start h-20 border-b border-blue-700 px-4">
      <img src="/icon/LogoFIXDESK-logo.png" alt="FixDesk Logo" class="w-10 h-10 object-contain" />
      <span
        class="ml-3 text-2xl font-bold tracking-wide transition-opacity duration-300"
        :class="isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'"
      >
        FIXDESK
      </span>
    </div>
    <!-- เมนูหลัก -->
    <nav class="flex flex-col gap-3 mt-6 px-2 flex-1">
      <RouterLink
        v-for="(menu, index) in menus"
        :key="index"
        :to="menu.path"
        class="group flex items-center rounded-lg hover:bg-blue-800 transition-all duration-300 h-12 px-2"
      >
        <div class="flex items-center justify-center w-12 h-12 shrink-0">
          <img :src="menu.icon" :alt="menu.label" class="w-6 h-6" />
        </div>
        <span
          class="text-lg font-medium whitespace-nowrap transition-all duration-300"
          :class="isOpen ? 'opacity-100 visible ml-2' : 'opacity-0 invisible ml-0'"
        >
          {{ menu.label }}
        </span>
      </RouterLink>
    </nav>
    <SidebarProfile :expanded="isOpen" />
  </aside>
</template>
