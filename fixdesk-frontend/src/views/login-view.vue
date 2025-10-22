<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// ===========================
// CONFIG
// ===========================
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/users'
const LOGIN_URL = `${API_BASE}/auth/login`
const REGISTER_URL = `${API_BASE}/users`

// ===========================
// STATE
// ===========================
const username = ref('')
const password = ref('')
const fullName = ref('')
const phone = ref('')
const department = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)
const isRegisterMode = ref(false)

// ===========================
// LOGIN FUNCTION
// ===========================
const handleLogin = async (e) => {
  e.preventDefault()
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

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

    if (!res.ok) throw new Error(data.message || 'เข้าสู่ระบบไม่สำเร็จ')

    localStorage.setItem('token', data.token)
    router.push('/userhome')
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    isLoading.value = false
  }
}

// ===========================
// REGISTER FUNCTION
// ===========================
const handleRegister = async (e) => {
  e.preventDefault()
  errorMessage.value = ''
  successMessage.value = ''
  isLoading.value = true

  try {
    const res = await fetch(REGISTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        us_user_name: username.value,
        us_user_pass: password.value,
        us_name: fullName.value,
        us_phone: phone.value,
        us_department: department.value,
        us_role_id: 3, // 🔹 user ทั่วไป
        us_tt_id: null,
      }),
    })

    const data = await res.json()

    if (!res.ok) throw new Error(data.message || 'สมัครสมาชิกไม่สำเร็จ')

    successMessage.value = '✅ สมัครสมาชิกสำเร็จ! สามารถเข้าสู่ระบบได้เลย'
    isRegisterMode.value = false
    username.value = ''
    password.value = ''
    fullName.value = ''
    phone.value = ''
    department.value = ''
  } catch (err) {
    errorMessage.value = err.message
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

      <!-- ฟอร์ม -->
      <div class="flex-1 flex flex-col items-center">
        <h1 class="text-3xl font-bold text-[#4db5ff] mb-6">
          {{ isRegisterMode ? 'REGISTER' : 'LOGIN' }}
        </h1>

        <!-- FORM -->
        <form
          class="flex flex-col gap-4 w-full max-w-sm"
          @submit="isRegisterMode ? handleRegister : handleLogin"
        >
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

          <!-- REGISTER FIELDS -->
          <div v-if="isRegisterMode" class="flex flex-col gap-3">
            <input
              v-model="fullName"
              type="text"
              placeholder="ชื่อ-นามสกุล"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-base"
              required
            />
            <input
              v-model="phone"
              type="text"
              placeholder="เบอร์โทรศัพท์"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-base"
            />
            <input
              v-model="department"
              type="text"
              placeholder="หน่วยงาน/แผนก"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-base"
            />
          </div>

          <!-- BUTTON -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-2 rounded-md bg-[#4db5ff] text-white font-medium text-base hover:bg-blue-500 transition-colors disabled:opacity-60"
          >
            {{ isLoading ? 'กำลังดำเนินการ...' : (isRegisterMode ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ') }}
          </button>
        </form>

        <!-- MESSAGE -->
        <p v-if="errorMessage" class="text-red-600 text-center text-sm font-medium mt-3">
          {{ errorMessage }}
        </p>
        <p v-if="successMessage" class="text-green-600 text-center text-sm font-medium mt-3">
          {{ successMessage }}
        </p>

        <!-- SWITCH MODE -->
        <p class="text-sm text-gray-600 mt-4">
          <span v-if="!isRegisterMode">
            ยังไม่มีบัญชีใช่ไหม?
            <button
              @click="isRegisterMode = true"
              class="text-blue-500 hover:underline font-medium"
            >
              สมัครสมาชิก
            </button>
          </span>
          <span v-else>
            มีบัญชีอยู่แล้ว?
            <button
              @click="isRegisterMode = false"
              class="text-blue-500 hover:underline font-medium"
            >
              เข้าสู่ระบบ
            </button>
          </span>
        </p>
      </div>
    </div>
  </div>
</template>
