<script setup>
import { ref, onMounted } from 'vue'
import { jwtDecode } from 'jwt-decode'

// รับสถานะจาก parent
const props = defineProps({
  expanded: { type: Boolean, default: false },
})

const showDropdown = ref(false)
const userFullname = ref('')

// โหลดชื่อจาก token
onMounted(() => {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const decoded = jwtDecode(token)
      userFullname.value = decoded.us_first_name_th || decoded.us_user_name || 'ผู้ใช้ระบบ'
    } catch (err) {
      console.error('❌ Decode token error:', err)
    }
  }
})

function toggleDropdown() {
  if (!props.expanded) return // ย่ออยู่ ไม่ให้เปิด dropdown
  showDropdown.value = !showDropdown.value
}

function logout(e) {
  e.stopPropagation()
  localStorage.removeItem('token')
  window.location.href = '/login'
}
</script>

<template>
  <footer
    class="relative border-t border-blue-700 px-4 py-3 flex items-center gap-3 hover:bg-blue-800 transition-all duration-300 cursor-pointer select-none"
    @click="toggleDropdown"
  >
    <!-- ไอคอนผู้ใช้ -->
    <div class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 shrink-0">
      <img src="/icon/sidebar/person-icon.svg" alt="User Icon" class="w-6 h-6" />
    </div>

    <!-- ชื่อ: แสดงเฉพาะตอนขยาย -->
    <div v-show="props.expanded" class="flex flex-col text-white leading-tight">
      <span class="text-lg font-semibold">{{ userFullname }}</span>
    </div>

    <!-- ลูกศร: แสดงเฉพาะตอนขยาย -->
    <img
      v-if="props.expanded"
      :src="showDropdown ? '/icon/sidebar/chevron-down-icon.svg' : '/icon/sidebar/chevron-up-icon.svg'"
      alt="Chevron Icon"
      class="w-5 h-5 ml-auto transition-transform duration-200"
    />

    <!-- เมนูย่อย: แสดงเฉพาะตอนขยาย + dropdown เปิด -->
    <div
      v-if="props.expanded && showDropdown"
      class="absolute bottom-16 left-0 w-full bg-blue-900 rounded-lg shadow-lg py-2 z-50"
    >
      <button class="flex items-center w-full gap-2 px-4 py-2 text-left hover:bg-blue-800 transition-all">
        <img src="/icon/sidebar/settings-icon.svg" class="w-4 h-4" />
        <span class="text-white text-sm">ตั้งค่าบัญชี</span>
      </button>

      <button @click="logout" class="flex items-center w-full gap-2 px-4 py-2 text-left hover:bg-blue-800 transition-all">
        <img src="/icon/sidebar/logout-icon.svg" class="w-4 h-4" />
        <span class="text-white text-sm">ออกจากระบบ</span>
      </button>
    </div>
  </footer>
</template>
