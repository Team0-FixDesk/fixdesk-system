<script setup>
import { ref, onMounted } from 'vue'
import { jwtDecode } from 'jwt-decode'

// สถานะเปิด/ปิด sidebar
const isOpen = ref(false)
const showDropdown = ref(false)

// ดึงชื่อผู้ใช้จาก token
const userFullname = ref('')

onMounted(() => {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const decoded = jwtDecode(token)
      userFullname.value = decoded.us_name || decoded.us_user_name || 'ผู้ใช้ระบบ'
    } catch (err) {
      console.error('❌ Decode token error:', err)
    }
  }
})

// เมนูทั้งหมด
const menus = [
  { icon: '/icon/sidebar/home-icon.svg', label: 'หน้าหลัก', path: '/main/stock-home' },
  { icon: '/icon/sidebar/repair-icon.svg', label: 'แจ้งซ่อม', path: '/main/repair-request' },
  { icon: '/icon/sidebar/list-icon.svg', label: 'รายการของฉัน', path: '/main/my-list' },
  { icon: '/icon/sidebar/logs-list-icon.svg', label: 'รายการเบิกของ', path: '/main/stock-withdraw-list' },
  { icon: '/icon/sidebar/history-list-icon.svg', label: 'ประวัติการเบิกของ', path: '/main/stock-withdraw-history' },
  { icon: '/icon/sidebar/stock-icon.svg', label: 'จัดการคลัง', path: '/main/stock-manage-inventory' },
]

// ฟังก์ชันออกจากระบบ
function logout() {
  localStorage.removeItem('token')
  window.location.href = '/login'
}
</script>

<template>
  <!-- Sidebar -->
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

    <!-- Footer โปรไฟล์ผู้ใช้ -->
    <footer
      class="relative border-t border-blue-700 px-4 py-3 flex items-center gap-3 hover:bg-blue-800 transition-all duration-300 cursor-pointer select-none"
      @click="showDropdown = !showDropdown"
    >
      <!-- icon ผู้ใช้ -->
      <div class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 shrink-0">
        <img src="/icon/sidebar/person-icon.svg" alt="User Icon" class="w-6 h-6" />
      </div>

      <!-- ชื่อผู้ใช้ -->
      <div v-show="isOpen" class="flex flex-col text-white leading-tight">
        <span class="text-lg font-semibold">{{ userFullname }}</span>
      </div>

      <!-- ลูกศร -->
      <img
        v-if="isOpen"
        :src="showDropdown ? '/icon/sidebar/chevron-down-icon.svg' : '/icon/sidebar/chevron-up-icon.svg'"
        alt="Chevron Icon"
        class="w-5 h-5 ml-auto transition-transform duration-200"
      />

      <!-- เมนูย่อย -->
      <div
        v-if="showDropdown && isOpen"
        class="absolute bottom-16 left-0 w-full bg-blue-900 rounded-lg shadow-lg py-2 z-50"
      >
        <button
          class="flex items-center w-full gap-2 px-4 py-2 text-left hover:bg-blue-800 transition-all"
        >
          <img src="/icon/sidebar/settings-icon.svg" class="w-4 h-4" />
          <span class="text-white text-sm">ตั้งค่าบัญชี</span>
        </button>

        <button
          @click="logout"
          class="flex items-center w-full gap-2 px-4 py-2 text-left hover:bg-blue-800 transition-all"
        >
          <img src="/icon/sidebar/logout-icon.svg" class="w-4 h-4" />
          <span class="text-white text-sm">ออกจากระบบ</span>
        </button>
      </div>
    </footer>
  </aside>
</template>
