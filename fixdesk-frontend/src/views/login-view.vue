<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// ===========================
// CONFIG
// ===========================
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const LOGIN_URL = `${API_BASE}/auth/login`

// ===========================
// STATE
// ===========================
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

// ===========================
// LOGIN FUNCTION
// ===========================
const handleLogin = async (e) => {
  e.preventDefault()
  errorMessage.value = ''
  isLoading.value = true

  console.log('📤 กำลังเข้าสู่ระบบที่:', LOGIN_URL)

  try {
    const res = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_name: username.value,
        password: password.value,
      }),
    })

    const data = await res.json()
    console.log('📬 ผลลัพธ์จาก backend (login):', data)

    if (!res.ok) throw new Error(data.message || 'เข้าสู่ระบบไม่สำเร็จ')

    // ✅ เก็บ token
    localStorage.setItem('token', data.token)

    // ✅ decode token เพื่ออ่าน role_name
    const payload = JSON.parse(atob(data.token.split('.')[1]))
    const role = payload.role_name
    console.log('✅ role:', role)

    // ✅ redirect ตาม role_name
    switch (role) {
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
    console.error('❌ Login error:', err)
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
      class="relative bg-white/95 rounded-xl shadow-xl w-full max-w-2xl flex flex-col md:flex-row items-center gap-8 p-8"
    >
      <!-- โลโก้ -->
      <div class="flex flex-col items-center justify-center flex-1">
        <img alt="92 Tech logo" class="absolute top-4 left-4 w-10" src="/icon/92Tech-logo.png" />
        <img alt="App logo" class="w-48 h-auto" src="/icon/Logo.png" />
      </div>

      <!-- ฟอร์มล็อกอิน -->
      <div class="flex-1 flex flex-col items-center">
        <h1 class="text-3xl font-bold text-[#4db5ff] mb-6">LOGIN</h1>

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
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-2 rounded-md bg-[#4db5ff] text-white font-medium text-base hover:bg-blue-500 transition-colors disabled:opacity-60"
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
