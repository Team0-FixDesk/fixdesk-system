/**
 * =====================================================================
 * @file            main-layout.view.vue
 * @layer           View (Layout Layer)
 * @version         1.0.0
 * @since           2025-10-22
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-02-18
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอ Layout หลักของระบบหลังจากผู้ใช้งานเข้าสู่ระบบสำเร็จ
 *
 *  ความสามารถ:
 *   - ตรวจสอบ token จาก localStorage / sessionStorage
 *   - Decode JWT เพื่อดึง role ของผู้ใช้งาน
 *   - Redirect ไปหน้า Home ตาม role อัตโนมัติ
 *   - แสดง Sidebar ตามสิทธิ์ (Admin / Stock / Technician / Manager / User)
 *   - รองรับ Idle Timeout (2 ชั่วโมง) สำหรับกรณีไม่เลือก "จำฉันไว้"
 *   - แสดง <RouterView /> สำหรับโหลดหน้าภายในระบบ
 *
 * @requires
 *   - vue
 *   - vue-router
 *   - jwt-decode
 *   - sweetalert2
 *   - Sidebar Components (Admin / Stock / Technician / Manager / User)
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - ปรับปรุงข้อความแจ้งเตือนที่ใช้ให้เหมาะสม  [2026-02-18, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * =====================================================================
 */

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { jwtDecode } from 'jwt-decode'
import Swal from 'sweetalert2'

// import sidebar ของแต่ละ role
import AdminSidebar from './admin-sidebar.vue'
import StockSidebar from './stock-sidebar.vue'
import UserSidebar from './user-sidebar.vue'
import TechnicianSidebar from './technician-sidebar.vue'
import ManagerSidebar from './manager-sidebar.vue'

const router = useRouter()
const role = ref(null)
const isInitialized = ref(false)

/* Idle timeout: 2 ชั่วโมง */
const IDLE_TIMEOUT = 2 * 60 * 60 * 1000
let idleTimer = null

function clearAuthAndGoLogin(showAlert = false) {
  localStorage.removeItem('token')
  localStorage.removeItem('session_user')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('session_user')

  if (showAlert) {
    Swal.fire({
      icon: 'warning',
      title: 'หมดเวลาในการใช้งาน',
      text: 'คุณไม่ได้ใช้งานเป็นระยะเวลาหนึ่ง บัญชีได้ออกจากระบบอัตโนมัติ',
      confirmButtonText: 'ตกลง',
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(() => {
      router.push('/login')
    })
  } else {
    router.push('/login')
  }
}

function resetIdleTimer() {
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    clearAuthAndGoLogin(true)
  }, IDLE_TIMEOUT)
}

onMounted(() => {
  const localToken = localStorage.getItem('token')
  const sessionToken = sessionStorage.getItem('token')
  const token = localToken || sessionToken

  if (!token) {
    clearAuthAndGoLogin(false)
    return
  }

  const isRemembered = !!localToken // ถ้ามีใน local แปลว่าติ๊ก "จำฉันไว้"

  try {
    const decoded = jwtDecode(token)
    console.log('decoded token:', decoded)
    role.value = decoded.role_name
    isInitialized.value = true

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

    // เริ่มจับเวลา idle เฉพาะกรณี "ไม่จำฉันไว้"
    if (!isRemembered) {
      resetIdleTimer()
      window.addEventListener('mousemove', resetIdleTimer)
      window.addEventListener('keydown', resetIdleTimer)
      window.addEventListener('click', resetIdleTimer)
      window.addEventListener('scroll', resetIdleTimer)
      window.addEventListener('touchstart', resetIdleTimer)
    }
  } catch (err) {
    console.error('invalid token', err)
    clearAuthAndGoLogin(false)
  }
})

onUnmounted(() => {
  clearTimeout(idleTimer)
  window.removeEventListener('mousemove', resetIdleTimer)
  window.removeEventListener('keydown', resetIdleTimer)
  window.removeEventListener('click', resetIdleTimer)
  window.removeEventListener('scroll', resetIdleTimer)
  window.removeEventListener('touchstart', resetIdleTimer)
})

// เลือก sidebar ตาม role
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
    <component :is="SidebarComponent" class="z-50" />
    <main
      class="p-6 bg-gray-50 min-h-screen transition-all duration-300"
      style="padding-left: 120px"
    >
      <RouterView />
    </main>
  </div>
</template>
