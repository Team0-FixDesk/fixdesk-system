/**
 * =====================================================================
 * @file            first-login-change-password-modal.vue
 * @module          Modal สำหรับเปลี่ยนรหัสผ่านครั้งแรก
 * @layer           Component (Presentation Layer)
 * @version         1.0.1
 * @since           2026-02-27
 * @author          อาจอนนต์ ภคนันทานนท์
 * @contributors
 *   - อาจอนนต์ ภคนันทานนท์
 *   - พชร ไพศรีสกุล
 *
 * @lastModified    2026-03-03
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  โมดอลบังคับให้ผู้ใช้เปลี่ยนรหัสผ่านครั้งแรก เมื่อบัญชียังไม่ได้เปิดใช้งาน
 *  แสดงชื่อผู้ใช้, ฟอร์มกรอกรหัสผ่านใหม่ พร้อมตรวจสอบความถูกต้อง
 *
 * @requires
 *   - vue
 *   - sweetalert2
 *   - @iconify/vue
 *
 * ---------------------------------------------------------------------
 * @changelog
 *
 * =====================================================================
 */
<script setup>

import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { Icon } from '@iconify/vue'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  username: { type: String, required: true },
  userId: { type: Number, required: true },
})

const emit = defineEmits(['close', 'success'])

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errors = ref({
  password: '',
  confirmPassword: '',
})

function resetForm() {
  password.value = ''
  confirmPassword.value = ''
  errors.value = {
    password: '',
    confirmPassword: '',
  }
}

function validateForm() {
  let valid = true
  errors.value = {
    password: '',
    confirmPassword: '',
  }

  if (!password.value) {
    errors.value.password = 'กรุณากรอกรหัสผ่านใหม่'
    valid = false
  }

  if (!confirmPassword.value) {
    errors.value.confirmPassword = 'กรุณากรอกยืนยันรหัสผ่าน'
    valid = false
  }

  if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
    errors.value.confirmPassword = 'รหัสผ่านใหม่ไม่ตรงกัน'
    valid = false
  }

  return valid
}

async function handleSubmit() {
  if (!validateForm()) return

  isLoading.value = true

  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    const response = await fetch(`${API_BASE}/edit-personal/${props.userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        password: password.value.trim(),
        isFirstLogin: true, // ต้องส่ง flag isFirstLogin เพื่อข้ามการตรวจสอบ oldPassword
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      Swal.fire({
        title: 'ผิดพลาด',
        text: data.message || 'เกิดบางอย่างผิดพลาด',
        icon: 'error',
        confirmButtonColor: '#1E48D1',
      })
      return
    }

    await Swal.fire({
      title: 'เปลี่ยนรหัสผ่านสำเร็จ',
      text: 'กรุณาเข้าสู่ระบบใหม่ด้วยรหัสผ่านที่ตั้งไว้',
      icon: 'success',
      confirmButtonColor: '#1E48D1',
      confirmButtonText: 'เข้าสู่ระบบใหม่',
    })

    /* บังคับ Logout */
    localStorage.removeItem('token')
    localStorage.removeItem('session_user')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('session_user')

    resetForm()

    /* edirect ไปหน้า Login */
    router.replace('/login')

    resetForm()
    emit('success')
  } catch (err) {
    console.error('Error changing password:', err)
    Swal.fire({
      title: 'ผิดพลาด',
      text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์',
      icon: 'error',
      confirmButtonColor: '#1E48D1',
    })
  } finally {
    isLoading.value = false
  }
}

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      resetForm()
    }
  },
)
</script>

<template>
  <!-- Modal Overlay -->
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center overflow-y-auto"
    @click.self="null"
  >
    <!-- Modal Container -->
    <div
      class="relative bg-white w-full max-w-2xl rounded-lg shadow-xl text-left overflow-hidden my-8 transform transition-all"
      @click.self="null"
    >
      <!-- Modal Header -->
      <div class="p-6 sm:p-8">
        <div class="flex items-center justify-between mb-4 sm:mb-6 border-b border-gray-100 pb-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-600 rounded-full">
              <Icon
                icon="fluent:lock-closed-24-regular"
                width="24"
                height="24"
                style="color: #ffffff"
              />
            </div>
            <h2 class="text-black text-xl sm:text-2xl font-bold">เปลี่ยนรหัสผ่านครั้งแรก</h2>
          </div>
          <div class="w-10"></div>
        </div>

        <!-- Content -->
        <div class="space-y-4 sm:space-y-5">
          <!-- Username Display -->
          <div>
            <label class="block text-sm sm:text-base font-medium mb-1 text-black">
              ชื่อบัญชีผู้ใช้
            </label>
            <div class="relative">
              <input
                :value="username"
                type="text"
                class="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-black bg-gray-100 cursor-not-allowed text-sm sm:text-base"
                disabled
              />
            </div>
          </div>

          <!-- New Password -->
          <div>
            <label class="block text-sm sm:text-base font-medium mb-1 text-black">
              รหัสผ่านใหม่
              <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <input
                v-model="password"
                type="password"
                :class="[
                  'w-full pl-3 pr-3 py-2 border rounded-lg text-black text-sm sm:text-base focus:ring-0 focus:outline-none transition-colors',
                  errors.password
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:border-black',
                ]"
                placeholder="กรอกรหัสผ่านใหม่"
              />
            </div>
            <p v-if="errors.password" class="text-red-500 text-xs sm:text-sm mt-1">
              {{ errors.password }}
            </p>
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="block text-sm sm:text-base font-medium mb-1 text-black">
              ยืนยันรหัสผ่านใหม่
              <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <input
                v-model="confirmPassword"
                type="password"
                :class="[
                  'w-full pl-3 pr-3 py-2 border rounded-lg text-black text-sm sm:text-base focus:ring-0 focus:outline-none transition-colors',
                  errors.confirmPassword
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:border-black',
                ]"
                placeholder="กรอกยืนยันรหัสผ่านใหม่"
              />
            </div>
            <p v-if="errors.confirmPassword" class="text-red-500 text-xs sm:text-sm mt-1">
              {{ errors.confirmPassword }}
            </p>
          </div>
        </div>

        <!-- Alert Message -->
        <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-black text-sm">
          <span class="font-semibold">จำเป็นต้องดำเนินการ:</span>
          เพื่อใช้งานระบบต่อไป กรุณาเปลี่ยนรหัสผ่านของคุณก่อน เมื่อดำเนินการเสร็จสิ้น
          ระบบจะออกจากระบบอัตโนมัติ และให้เข้าสู่ระบบใหม่อีกครั้ง
        </div>

        <!-- Footer - ปุ่มยืนยัน -->
        <div class="flex justify-end mt-6 pt-4 border-lg border-gray-200">
          <button
            type="button"
            @click="handleSubmit"
            :disabled="isLoading"
            class="px-6 py-2.5 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition text-sm sm:text-base disabled:opacity-60"
          >
            {{ isLoading ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
