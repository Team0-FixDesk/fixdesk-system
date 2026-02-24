import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { getRoutePathByUserRole } from '@/utils/auth.util'

// Composable สำหรับจัดการกระบวนการล็อกอิน
// เก็บ state ฟอร์ม, ตรวจความถูกต้องพื้นฐาน และเรียก API ผ่าน store
export function useLogin() {
  const router = useRouter()
  const authStore = useAuthStore()

  // ฟอร์มข้อมูลและสถานะ UI
  const username = ref('')
  const password = ref('')
  const errorMessage = ref('')
  const isLoading = ref(false)
  const isRememberMe = ref(false)

  // ฟังก์ชันส่งข้อมูลเข้าสู่ระบบ
  const handleLogin = async () => {
    errorMessage.value = ''

    // ตรวจสอบฟิลด์พื้นฐาน (ไม่ต้องซับซ้อน)
    if (!username.value.trim() && !password.value.trim()) {
      errorMessage.value = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
      return
    }

    if (!username.value.trim()) {
      errorMessage.value = 'กรุณากรอกชื่อผู้ใช้'
      return
    }

    if (!password.value.trim()) {
      errorMessage.value = 'กรุณากรอกรหัสผ่าน'
      return
    }

    isLoading.value = true

    try {
      const user = await authStore.loginUserAccount(username.value, password.value, isRememberMe.value)

      // นำทางไปยังหน้าเฉพาะตามบทบาท
      router.push(getRoutePathByUserRole(user.role))
    } catch (error) {
      console.error('Login failed:', error.message)

      if (error.message.includes('ชื่อผู้ใช้')) {
        errorMessage.value = 'ไม่พบชื่อผู้ใช้นี้ในระบบ'
      } else if (error.message.includes('รหัสผ่าน')) {
        errorMessage.value = 'รหัสผ่านไม่ถูกต้อง'
      } else {
        errorMessage.value = 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    username,
    password,
    errorMessage,
    isLoading,
    isRememberMe,
    handleLogin,
  }
}
