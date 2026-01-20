<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { jwtDecode } from 'jwt-decode'

/* ===================== Config ===================== */
const API_BASE = import.meta.env.VITE_API_BASE
const LOGIN_URL = `${API_BASE}/login`

const router = useRouter()

/* ===================== State ===================== */
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const rememberMe = ref(false)

/* ===================== Actions ===================== */
// LOGIN FUNCTION
const handleLogin = async () => {
  errorMessage.value = ''

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
    const response = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_name: username.value.trim(),
        password: password.value.trim(),
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'LOGIN_FAILED')
    }

    const storage = rememberMe.value ? localStorage : sessionStorage

    // เก็บ token
    storage.setItem('token', data.token)

    // decode token
    const payload = jwtDecode(data.token)

    // เก็บข้อมูลผู้ใช้ (ไม่ใช่ข้อมูลลับ)
    const sessionUser = {
      id: payload.us_id,
      username: payload.us_user_name,
      fullName: `${payload.us_prefix_th || ''}${payload.us_first_name_th || ''} ${payload.us_last_name_th || ''}`,
      department: payload.us_department,
      role: payload.role_name,
    }

    storage.setItem('session_user', JSON.stringify(sessionUser))

    // redirect ตาม role
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
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-200 bg-center px-4"
  >
    <div
      class="relative bg-white/95 rounded-xl shadow-xl w-full max-w-md sm:max-w-xl lg:max-w-3xl flex flex-col lg:flex-row items-center gap-8 p-10"
    >
      <!-- โลโก้ -->
      <div class="flex flex-col items-center justify-center flex-1">
        <img
          alt="92 Tech logo"
          class="hidden md:block absolute top-4 left-4 w-10"
          src="/icon/92Tech-logo.png"
        />
        <img alt="FixDesk logo" class="w-48 h-auto" src="/icon/Logo.png" />
      </div>

      <!-- ฟอร์มล็อกอิน -->
      <div class="flex-1 flex flex-col items-center">
        <h1 class="text-3xl font-bold text-[#1E48D1] mb-6">เข้าสู่ระบบ</h1>

        <form class="flex flex-col gap-4 w-full max-w-sm" @submit.prevent="handleLogin">
          <input
            v-model="username"
            type="text"
            aria-label="ชื่อผู้ใช้"
            placeholder="ชื่อผู้ใช้"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-base placeholder-gray-400"
          />

          <input
            v-model="password"
            type="password"
            aria-label="รหัสผ่าน"
            placeholder="รหัสผ่าน"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-base placeholder-gray-400"
          />

          <label class="flex items-center gap-2 text-sm text-gray-700 relative">
            <input
              v-model="rememberMe"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-[#1E48D1] focus:ring-[#1E48D1]"
            />
            <span>จำฉันไว้</span>

            <!-- Info icon -->
            <span
              class="group relative inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full text-gray-400 cursor-pointer select-none hover:text-gray-600 transition"
              aria-label="คำอธิบายการจำฉันไว้"
              tabindex="0"
            >
              <img
                src="/icon/circle-info-icon.svg"
                class="opacity-30 hover:opacity-100 transition"
              />
              <!-- Tooltip -->
              <div
                class="absolute bottom-full left-0 mt-2 w-72 p-3 text-xs text-white bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none text-left"
              >
                <p class="mb-1">หากเลือก ระบบจะจำการเข้าสู่ระบบไว้ในอุปกรณ์นี้</p>
                <ul class="list-disc list-inside space-y-0.5 text-gray-200">
                  <li>ปิด – เปิดเบราว์เซอร์ได้โดยไม่ต้องเข้าสู่ระบบใหม่</li>
                  <li>ระบบจะออกจากระบบอัตโนมัติเมื่อถึงเวลาที่กำหนด</li>
                  <li>แนะนำให้ใช้เฉพาะอุปกรณ์ส่วนตัว</li>
                </ul>
              </div>
            </span>
          </label>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-2 rounded-md bg-[#1E48D1] text-white font-medium text-base hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {{ isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
          </button>
        </form>

        <!-- Error message (reserved space) -->
        <div class="min-h-[1.25rem] mt-3">
          <p v-if="errorMessage" class="text-red-600 text-center text-sm font-medium">
            {{ errorMessage }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
