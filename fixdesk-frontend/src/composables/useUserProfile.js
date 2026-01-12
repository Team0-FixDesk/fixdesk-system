import { ref } from 'vue'
import { useAuthToken } from '@/composables/useAuthToken'

export function useUserProfile(API_BASE) {
  const { token, userId } = useAuthToken()

  const displayName = ref('ผู้ใช้งาน')
  const displayDepartment = ref('หน่วยงาน')
  const loading = ref(false)
  const error = ref(null)

  const fetchUserProfile = async () => {
    if (!token.value || !userId.value) return

    loading.value = true
    error.value = null

    try {
      const res = await fetch(`${API_BASE}/users/${userId.value}`, {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      })

      if (!res.ok) throw new Error('Fetch user failed')

      const user = await res.json()

      if (user.us_first_name_th) {
        displayName.value = `${user.us_first_name_th} ${user.us_last_name_th || ''}`.trim()
        displayDepartment.value = user.us_department
      }
    } catch (err) {
      console.error('โหลดข้อมูลผู้ใช้ไม่สำเร็จ', err)
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return {
    displayName,
    displayDepartment,
    loading,
    error,
    fetchUserProfile,
  }
}
