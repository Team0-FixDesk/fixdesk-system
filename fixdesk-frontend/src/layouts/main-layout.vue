<script setup>
/**
 * =====================================================================
 * @file            main-layout.view.vue
 * @layer           View (Layout Layer)
 * @version         1.0.1
 * @since           2025-10-22
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - เศรษฐพงศ์ หอมชื่น
 *   - พชร ไพศรีสกุล
 *   - ปฏิพัทธ์ จงนันทพันธ์กุล
 *
 * @lastModified    2026-03-16
 * @lastModifiedBy  พชร ไพศรีสกุล
 *
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอ Layout หลักของระบบหลังจากผู้ใช้งานเข้าสู่ระบบสำเร็จ
 *
 *  ความสามารถ:
 *   - ตรวจสอบ token จาก localStorage / sessionStorage
 *   - Decode JWT เพื่อดึง role ของผู้ใช้งาน
 *   - Redirect ไปหน้า Home ตาม role อัตโนมัติ
 *   - แสดง Sidebar ตามสิทธิ์ (Admin / Stock / Technician / Manager / User/ TechnicianLead)
 *   - รองรับ Idle Timeout (2 ชั่วโมง) สำหรับกรณีไม่เลือก "จำฉันไว้"
 *   - แสดง <RouterView /> สำหรับโหลดหน้าภายในระบบ
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2025-10-22, พชร ไพศรีสกุล] V 1.0.0
 *  - สร้างไฟล์และโครงสร้างหลักของ Layout
 *  [2026-02-18, ปฏิพัทธ์ จงนันทพันธ์กุล] V 1.0.1
 *   - แก้ไขข้อความแจ้งเตือน
 *  [2026-02-20, ปฏิพัทธ์ จงนันทพันธ์กุล] V 1.0.2
 *   - ปรับปรุงการจัดการ Idle Timeout ให้เหมาะสม
 *  [2026-03-06, เศรษฐพงศ์ หอมชื่น] V 1.0.3
 *   - แก้ไข alert
 *  [2026-03-16, พชร ไพศรีสกุล] V 1.1.0
 *   - เพิ่ม Technician Lead Sidebar
 *
 * =====================================================================
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { jwtDecode } from 'jwt-decode'
import Swal from 'sweetalert2'

// import sidebar ของแต่ละ role
import AdminSidebar from './admin-sidebar.vue'
import StockSidebar from './stock-sidebar.vue'
import UserSidebar from './user-sidebar.vue'
import TechnicianSidebar from './technician-sidebar.vue'
import TechnicianLeadSidebar from './technician-lead-sidebar.vue'
import ManagerSidebar from './manager-sidebar.vue'

// import first-login modal
import FirstLoginChangePasswordModal from '@/components/modal/first-login-change-password-modal.vue'

const router = useRouter()
const role = ref(null)
const isInitialized = ref(false)
const showFirstLoginModal = ref(false)
const userIdForFirstLogin = ref(null)
const usernameForFirstLogin = ref(null)

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
      text: 'คุณไม่ได้ใช้งานเป็นระยะเวลาหนึ่ง กรุณาลงชื่อเข้าสู่ระบบใหม่',
      confirmButtonColor: '#0048EF',
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
    role.value = decoded.role_name

    // ตรวจสอบ us_active สำหรับ first-login
    if (decoded.us_active === 0) {
      showFirstLoginModal.value = true
      userIdForFirstLogin.value = decoded.us_id
      usernameForFirstLogin.value = decoded.us_user_name
    }

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
        case 'TechnicianLead':
          router.replace('/main/technician-lead-home')
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
    case 'TechnicianLead':
      return TechnicianLeadSidebar
    case 'Technician':
      return TechnicianSidebar
    case 'Manager':
      return ManagerSidebar
    default:
      return UserSidebar
  }
})

// Handler สำหรับเมื่อเปลี่ยนรหัสผ่านครั้งแรกสำเร็จ
function handleFirstLoginSuccess() {
  showFirstLoginModal.value = false
  // ปิด modal เท่านั้น - ไม่ต้องรีเฟรช
  // รหัสผ่านมีการเปลี่ยนแล้วในฐานข้อมูล และ us_active ถูกตั้งเป็น 1
}
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
      <footer class="mt-8 text-center text-sm text-gray-400">Powered by 92 Tech co,.ltd</footer>
    </main>

    <!-- First Login Modal -->
    <FirstLoginChangePasswordModal
      :isOpen="showFirstLoginModal"
      :username="usernameForFirstLogin || ''"
      :userId="userIdForFirstLogin || 0"
      @success="handleFirstLoginSuccess"
    />
  </div>
</template>
