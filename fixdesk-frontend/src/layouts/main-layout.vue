<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { jwtDecode } from 'jwt-decode'

// ✅ import sidebar ของแต่ละ role
import AdminSidebar from './admin-sidebar.vue'
import StockSidebar from './stock-sidebar.vue'
import UserSidebar from './user-sidebar.vue'
import TechnicianSidebar from './technician-sidebar.vue'
import ManagerSidebar from './manager-sidebar.vue'

const router = useRouter()
const role = ref(null)
const isInitialized = ref(false)

onMounted(() => {
  const token = localStorage.getItem('token')

  if (!token) {
    router.push('/login')
    return
  }

  try {
    const decoded = jwtDecode(token)
    console.log('🧩 decoded token:', decoded)
    role.value = decoded.role_name
    isInitialized.value = true

    // ✅ redirect ไปหน้า home ตาม role (ถ้าเพิ่งเข้าครั้งแรก)
    const current = router.currentRoute.value.path
    if (current === '/main' || current === '/main/') {
      switch (decoded.role_name) {
        case 'Admin':
          router.replace('/main/admin-home')
          break
        case 'Stock':
          router.replace('/main/stock-home')
          break
        case 'Technician':
          router.replace('/main/technician-home')
          break
        case 'Manager':
          router.replace('/main/manager-home')
          break
        default:
          router.replace('/main/user-home')
          break
      }
    }
  } catch (err) {
    console.error('❌ invalid token', err)
    localStorage.removeItem('token')
    router.push('/login')
  }
})

// ✅ เลือก sidebar ตาม role
const SidebarComponent = computed(() => {
  switch (role.value) {
    case 'Admin':
      return AdminSidebar
    case 'Stock':
      return StockSidebar
    case 'Technician':
      return TechnicianSidebar
    case 'Manager':
      return ManagerSidebar
    default:
      return UserSidebar
  }
})
</script>

<template>
  <!-- รอโหลด role -->
  <div v-if="!isInitialized" class="min-h-screen flex items-center justify-center text-gray-500">
    กำลังโหลดข้อมูลผู้ใช้...
  </div>

  <!-- layout หลัก -->
  <div v-else class="relative">
    <!-- Sidebar -->
    <component :is="SidebarComponent" class="z-50" />

    <!-- เนื้อหาหลัก -->
    <main
      class="p-6 bg-gray-50 min-h-screen transition-all duration-300"
      style="padding-left: 120px;"
    >
      <RouterView />
    </main>
  </div>
</template>
