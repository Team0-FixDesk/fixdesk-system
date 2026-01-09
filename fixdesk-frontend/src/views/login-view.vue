<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { jwtDecode } from 'jwt-decode'

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE
const LOGIN_URL = `${API_BASE}/auth/login`

const username = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const rememberMe = ref(false)

// LOGIN FUNCTION
const handleLogin = async (e) => {
  e.preventDefault()
  errorMessage.value = ''
  isLoading.value = true
  console.log('กำลังเข้าสู่ระบบที่:', LOGIN_URL)
  try {
    const res = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_name: username.value.trim(),
        password: password.value.trim(),
      }),
    })

    const data = await res.json()
    console.log('ผลลัพธ์จาก backend (login):', data)
    if (!res.ok) throw new Error(data.message || 'เข้าสู่ระบบไม่สำเร็จ')
    const storage = rememberMe.value ? localStorage : sessionStorage

    // เก็บ token
    storage.setItem('token', data.token)

    // decode token เพื่ออ่านข้อมูลผู้ใช้
    const payload = jwtDecode(data.token)
    console.log('ข้อมูลใน token:', payload)

    // เก็บข้อมูลผู้ใช้ใน localStorage เผื่อหน้าอื่นต้องใช้
    const sessionUser = {
      id: payload.us_id,
      username: payload.us_user_name,
      prefix: payload.us_prefix_th,
      firstName: payload.us_first_name_th,
      lastName: payload.us_last_name_th,
      firstNameEN: payload.us_first_name_en,
      lastNameEN: payload.us_last_name_en,
      fullName: `${payload.us_prefix_th || ''}${payload.us_first_name_th || ''} ${payload.us_last_name_th || ''}`,
      tel: payload.us_tel,
      department: payload.us_department,
      role: payload.role_name,

    }
    storage.setItem('session_user', JSON.stringify(sessionUser))

    // redirect ตาม role_name
    switch (payload.role_name) {
      case 'Admin':
        router.push('/main/admin-home')
        break
      case 'Technician':
        router.push('/main/technician-home')
        break
      case 'Stock':
        router.push('/main/stock-home')
        break
      case 'Manager':
        router.push('/main/manager-home')
        break
      default:
        router.push('/main/user-home')
        break
    }
  } catch (err) {
    console.error('Login error:', err)
    if (err.message.includes('ชื่อผู้ใช้')) {
      errorMessage.value = 'ไม่พบชื่อผู้ใช้นี้ในระบบ'
    } else if (err.message.includes('รหัสผ่าน')) {
      errorMessage.value = 'รหัสผ่านไม่ถูกต้อง'
    } else {
      errorMessage.value = 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gray-100 bg-cover bg-center px-4"
    style="background-image: url('/background-login.png')"
  >
    <div
      class="relative bg-white/95 rounded-xl shadow-xl w-full max-w-md sm:max-w-xl lg:max-w-3xl flex flex-col lg:flex-row items-center gap-8 p-10"
    >
      <!-- โลโก้ -->
      <div class="flex flex-col items-center justify-center flex-1">
        <img alt="92 Tech logo" class="hidden md:block absolute top-4 left-4 w-10" src="/icon/92Tech-logo.png" />
        <img alt="App logo" class="w-48 h-auto" src="/icon/Logo.png" />
      </div>
      <!-- ฟอร์มล็อกอิน -->
      <div class="flex-1 flex flex-col items-center">
        <h1 class="text-3xl font-bold text-[#1E48D1] mb-6">LOGIN</h1>
        <form class="flex flex-col gap-4 w-full max-w-sm" @submit.prevent="handleLogin">
          <input
            v-model="username"
            type="text"
            placeholder="ชื่อผู้ใช้"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-base"
            required
          />
          <input
            v-model="password"
            type="password"
            placeholder="รหัสผ่าน"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-base"
            required
          />
          <label class="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              v-model="rememberMe"
              class="h-4 w-4 rounded border-gray-300 text-[#1E48D1] focus:ring-[#1E48D1]"
            />
            <span>จำฉันไว้ (Remember me)</span>
          </label>
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-2 rounded-md bg-[#1E48D1] text-white font-medium text-base hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {{ isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
          </button>
        </form>
        <!-- แสดงข้อความ error -->
        <p
          v-if="errorMessage"
          class="text-red-600 text-center text-sm font-medium mt-3 bg-red-50 px-3 py-2 rounded-md"
        >
          {{ errorMessage }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
input::placeholder {
  color: #a0aec0;
}
</style>
