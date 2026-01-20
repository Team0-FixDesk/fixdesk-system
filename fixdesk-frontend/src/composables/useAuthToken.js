import { computed } from 'vue'
import { jwtDecode } from 'jwt-decode'

export function useAuthToken() {
  const token = computed(() => {
    return localStorage.getItem('token') || sessionStorage.getItem('token')
  })

  const decoded = computed(() => {
    if (!token.value) return null
    try {
      return jwtDecode(token.value)
    } catch {
      return null
    }
  })

  const userId = computed(() => decoded.value?.us_id || null)
  const role = computed(() => decoded.value?.role || null)
  const isAuthenticated = computed(() => !!token.value)

  const logout = () => {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    window.location.href = '/login'
  }

  return {
    token,
    decoded,
    userId,
    role,
    isAuthenticated,
    logout,
  }
}
