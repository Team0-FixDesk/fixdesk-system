import { computed } from 'vue'
import { jwtDecode } from 'jwt-decode'

// Composable สำหรับจัดการ Token และข้อมูลที่ถอดจาก JWT
// คืนค่า: token, decodedToken, userId, userRole, isAuthenticated, logout()
export function useAuthToken() {
  const token = computed(() => localStorage.getItem('token') || sessionStorage.getItem('token'))

  // ข้อมูลที่ได้จากการถอด Token (หรือ null ถ้าไม่มี/ถอดไม่สำเร็จ)
  const decodedToken = computed(() => {
    if (!token.value) return null
    try {
      return jwtDecode(token.value)
    } catch {
      return null
    }
  })

  // ค่าเชิงธุรกิจที่ใช้งานบ่อย
  const userId = computed(() => decodedToken.value?.us_id || null)
  const userRole = computed(() => decodedToken.value?.role || null)
  const isAuthenticated = computed(() => !!token.value)

  // ล็อกเอาต์: ลบ token และกลับไปหน้าเข้าสู่ระบบ
  const logout = () => {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    globalThis.location.href = '/#/login'
  }

  return {
    token,
    decodedToken,
    userId,
    userRole,
    isAuthenticated,
    logout,
  }
}
