<script setup>
import { ref } from 'vue'

// สถานะเปิด/ปิด sidebar
const isOpen = ref(false)

// เมนูต่าง ๆ ต้องอยู่ใน <script setup> เดียวกัน
const menus = [
  { icon: '/icon/sidebar/home-icon.svg', label: 'หน้าหลัก', path: '/admin-home' },
  { icon: '/icon/sidebar/repair-icon.svg', label: 'แจ้งซ่อม', path: '/repair-request' },
  { icon: '/icon/sidebar/list-icon.svg', label: 'รายการของฉัน', path: '/my-list' },
  { icon: '/icon/sidebar/list-checks-icon.svg', label: 'ตรวจสอบคำร้อง', path: '/admin-check-request' },
  { icon: '/icon/sidebar/user-icon.svg', label: 'ข้อมูลผู้ใช้', path: '/admin-user-info' },
  { icon: '/icon/sidebar/dashboard-icon.svg', label: 'หน้าสรุปผล', path: '/admin-summary' },
  { icon: '/icon/sidebar/building-icon.svg', label: 'จัดการสถานที่', path: '/admin-manage-location' },
  { icon: '/icon/sidebar/report-icon.svg', label: 'สร้างรายงาน', path: '/admin-report' },
]

</script>

<template>
  <aside
    class="fixed top-0 left-0 h-screen bg-[#1E48D1] text-white shadow-lg transition-all duration-300 ease-in-out overflow-hidden"
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
    <nav class="flex flex-col gap-2 mt-6 px-2">
      <RouterLink
        v-for="(menu, index) in menus"
        :key="index"
        :to="menu.path"
        class="group flex items-center rounded-lg hover:bg-blue-800 transition-all duration-300 h-12 px-2"
      >
        <!-- ไอคอน -->
        <div class="flex items-center justify-center w-12 h-12 shrink-0">
          <img :src="menu.icon" :alt="menu.label" class="w-6 h-6" />
        </div>

        <!-- ข้อความ -->
        <span
          class="text-lg font-medium whitespace-nowrap transition-all duration-300"
          :class="isOpen ? 'opacity-100 visible ml-2' : 'opacity-0 invisible ml-0'"
        >
          {{ menu.label }}
        </span>
      </RouterLink>
    </nav>
  </aside>
</template>

