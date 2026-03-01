/**
 * =====================================================================
 * @file            first-login-change-password-modal.vue
 * @module          Modal สำหรับเปลี่ยนรหัสผ่านครั้งแรก
 * @layer           Component (Presentation Layer)
 * @version         1.0.0
 * @since           2026-02-27
 * @author          อาจอนนต์ ภคนันทานนท์
 * @contributors
 *   - GitHub Copilot
 *
 * @lastModified    2026-02-27
 * @lastModifiedBy  อาจอนนต์ ภคนันทานนท์
 * ---------------------------------------------------------------------
 * @description
 *  Modal ที่ป้องกันการปิดเพื่อบังคับให้ผู้ใช้เปลี่ยนรหัสผ่านครั้งแรกเมื่อ us_active=0
 *  ความสามารถ:
 *    - แสดงชื่อผู้ใช้ในส่วนหัว
 *    - ฟอร์มสำหรับป้อนรหัสผ่านใหม่ และตรวจสอบ
 *    - Validation: ตรวจสอบว่ากรอกข้อมูลครบและรหัสผ่านตรงกัน
 *    - ปิดแบบบังคับ (ไม่มีปุ่มยกเลิก)
 *    - ปรากฏตรงกลางหน้าจอ

 * @requires
 *   - vue
 *   - sweetalert2
 *   - @iconify/vue
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
        isFirstLogin: true, // ต้องส่งฟ้ง isFirstLogin เพื่อข้ามการตรวจสอบ oldPassword
        us_first_name_th: '',
        us_last_name_th: '',
        us_phone: '',
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

    Swal.fire({
      title: 'สำเร็จ',
      text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว',
      icon: 'success',
      confirmButtonColor: '#1E48D1',
    })

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

function handleBackToLogin() {
  localStorage.removeItem('token')
  localStorage.removeItem('session_user')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('session_user')

  router.push('/login')
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
          <button
            type="button"
            @click="handleBackToLogin"
            class="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 hover:text-gray-900"
            title="กลับไปหน้าเข้าสู่ระบบ"
          >
            <Icon
              icon="fluent:arrow-left-24-regular"
              width="24"
              height="24"
              style="color: currentColor"
            />
          </button>
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-600 rounded-full">
              <Icon
                icon="fluent:lock-closed-24-regular"
                width="24"
                height="24"
                style="color: #ffffff"
              />
            </div>
            <h2 class="text-black text-xl sm:text-2xl font-bold">
              เปลี่ยนรหัสผ่านครั้งแรก
            </h2>
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
        <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm text-blue-700">
            <span class="font-semibold">หมายเหตุ:</span>
            กรุณาเปลี่ยนรหัสผ่านของคุณเพื่อทำการกระบวนการยืนยัน
            ขั้นแรก ท่านจำเป็นต้องกำหนดรหัสผ่านใหม่เพื่อใช้ในการเข้าสู่ระบบในครั้งต่อไป
          </p>
        </div>

        <!-- Footer - ปุ่มยืนยันและปุ่มกลับ -->
        <div class="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            @click="handleBackToLogin"
            class="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-semibold text-sm sm:text-base flex items-center justify-center gap-2"
          >
            <Icon
              icon="fluent:arrow-left-24-regular"
              width="18"
              height="18"
            />
            <span>กลับไปเข้าสู่ระบบ</span>
          </button>
          <button
            type="button"
            @click="handleSubmit"
            :disabled="isLoading"
            class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm sm:text-base disabled:opacity-60"
          >
            {{ isLoading ? 'กำลังบันทึก...' : 'ยืนยัน' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
