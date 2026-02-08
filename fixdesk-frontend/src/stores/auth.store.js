import { defineStore } from 'pinia'
import { jwtDecode } from 'jwt-decode'
import { login as loginService } from '@/services/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null,
  }),

  actions: {
    async login(username, password, remember) {
      const data = await loginService(username, password)

      const payload = jwtDecode(data.token)

      const user = {
        id: payload.us_id,
        username: payload.us_user_name,
        role: payload.role_name,
      }

      const storage = remember ? localStorage : sessionStorage

      storage.setItem('token', data.token)
      storage.setItem('session_user', JSON.stringify(user))

      this.token = data.token
      this.user = user

      return user
    },

    logout() {
      localStorage.clear()
      sessionStorage.clear()
      this.token = null
      this.user = null
    },
  },
})
