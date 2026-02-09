<script setup>
import { ref, watch, onMounted } from 'vue'
import { jwtDecode } from 'jwt-decode'
import Swal from 'sweetalert2'
import { usePhoneNumberFormatter } from '@/composables/usePhoneFormat'
import { Icon } from '@iconify/vue'
import ChevronDownIcon from '@/assets/icons/sidebar/chevron-down-icon.svg'
import ChevronUpIcon from '@/assets/icons/sidebar/chevron-up-icon.svg'
import LogoutIcon from '@/assets/icons/sidebar/logout-icon.svg'
import PersonIcon from '@/assets/icons/sidebar/person-icon.svg'
import SettingIcon from '@/assets/icons/sidebar/settings-icon.svg'




defineExpose({ forceClose })

const { toRaw, toDisplay, maskInput } = usePhoneNumberFormatter()

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

const props = defineProps({
  expanded: { type: Boolean, default: false },
})

const showDropdown = ref(false)
const showPopupProfile = ref(false)
const showPopupPassword = ref(false)
const showPopupConfirm = ref(false)
const tempOldPassword = ref('')
const pendingSaveType = ref('')

const userFullname = ref('')
const firstNameTH = ref('')
const lastNameTH = ref('')
const firstNameEN = ref('')
const lastNameEN = ref('')
const username = ref('')
const tokenData = ref({})

const editForm = ref({
  us_ttn_id: '',
  us_department: '',
  us_phone: '',
  oldPassword: '',
  password: '',
  confirmPassword: '',
})

const errors = ref({
  us_ttn_id: '',
  firstNameTH: '',
  lastNameTH: '',
  firstNameEN: '',
  lastNameEN: '',
  us_department: '',
  us_phone: '',
  username: '',
  password: '',
  confirmPassword: '',
  tempOldPassword: '',
})

onMounted(() => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (token) {
    try {
      const decoded = jwtDecode(token)
      tokenData.value = decoded

      userFullname.value = decoded.us_first_name_th || decoded.us_user_name || 'ผู้ใช้ระบบ'
      firstNameTH.value = decoded.us_first_name_th || ''
      lastNameTH.value = decoded.us_last_name_th || ''
      firstNameEN.value = decoded.us_first_name_en || ''
      lastNameEN.value = decoded.us_last_name_en || ''
      username.value = decoded.us_user_name || ''
    } catch (err) {
      console.error('❌ Decode token error:', err)
    }
  }
})

function forceClose() {
  showDropdown.value = false
  closeAllPopup()
}

function toggleDropdown() {
  if (!props.expanded) return
  showDropdown.value = !showDropdown.value
}

function logout(e) {
  e.stopPropagation()
  // ลบทุกที่ที่เราเคยใช้เก็บ token
  localStorage.removeItem('token')
  localStorage.removeItem('session_user')
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('session_user')

  window.location.href = '/login'
}

// รีเซ็ตฟอร์มและ errors
function resetProfileForm() {
  editForm.value.us_phone = ''
  errors.value.us_phone = ''
}

function resetPasswordForm() {
  editForm.value.password = ''
  editForm.value.confirmPassword = ''
  errors.value.password = ''
  errors.value.confirmPassword = ''
}

function validateProfileForm() {
  let valid = true
  errors.value.us_phone = ''

  if (!editForm.value.us_phone) {
    errors.value.us_phone = 'กรุณากรอกเบอร์โทรศัพท์'
    valid = false
    Swal.fire({
      title: 'กรุณากรอกข้อมูลให้ครบ',
      text: errors.value.us_phone,
      icon: 'warning',
      confirmButtonColor: '#f59e0b',
    })
  } else if (!/^\d{9,10}$/.test(toRaw(editForm.value.us_phone))) {
    errors.value.us_phone = 'เบอร์โทรศัพท์ต้องมี 9 หรือ 10 หลัก'
    valid = false
    Swal.fire({
      title: 'กรุณากรอกข้อมูลให้ถูกต้อง',
      text: errors.value.us_phone,
      icon: 'warning',
      confirmButtonColor: '#f59e0b', // สีส้ม Warning
    })
  }

  return valid
}

function validatePasswordForm() {
  let valid = true
  errors.value.password = ''
  errors.value.confirmPassword = ''

  // ตรวจ password ใหม่
  if (!editForm.value.password) {
    errors.value.password = 'กรุณากรอกรหัสผ่านใหม่'
    valid = false
  }

  // ตรวจ confirm password
  if (!editForm.value.confirmPassword) {
    errors.value.confirmPassword = 'กรุณากรอกยืนยันรหัสผ่าน'
    valid = false
  }

  // ตรวจ password ไม่ตรงกัน
  if (
    editForm.value.password &&
    editForm.value.confirmPassword &&
    editForm.value.password !== editForm.value.confirmPassword
  ) {
    errors.value.confirmPassword = 'รหัสผ่านใหม่ไม่ตรงกัน'
    valid = false
    // แสดง SweetAlert สำหรับรหัสผ่านไม่ตรงกัน
    Swal.fire({
      icon: 'warning',
      title: 'รหัสผ่านไม่ตรงกัน',
      text: errors.value.confirmPassword,
      confirmButtonColor: '#f59e0b', //orange
    })
    return false // ไม่ต้องแสดง alert อื่น ๆ
  }

  // แสดง SweetAlert ถ้ามี field ว่าง
  if (!valid) {
    let messages = []
    if (errors.value.password) messages.push(errors.value.password)
    if (errors.value.confirmPassword && editForm.value.password === editForm.value.confirmPassword)
      messages.push(errors.value.confirmPassword)

    if (messages.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาตรวจสอบการกรอกรหัสผ่าน',
        html: messages.join('<br/>'),
        confirmButtonColor: '#f59e0b', //orange
      })
    }
  }

  return valid
}

async function saveProfile(type = 'profile') {
  const userId = tokenData.value?.us_id
  if (!userId) return

  // 1. ตรวจสอบความถูกต้องของฟอร์ม (Validate)
  let valid = type === 'profile' ? validateProfileForm() : validatePasswordForm()
  if (!valid) return

  // 2. เตรียมข้อมูลและเปิด Popup ยืนยันรหัสผ่านปัจจุบัน
  pendingSaveType.value = type // จำสถานะไว้ว่าเรากำลังจะบันทึกอะไร
  tempOldPassword.value = '' // ล้างค่ารหัสผ่านปัจจุบัน
  errors.value.tempOldPassword = '' // ล้างค่า error
  showPopupConfirm.value = true // เปิด Popup
}

async function loadUserData() {
  try {
    const userId = tokenData.value?.us_id
    if (!userId) return

    const res = await fetch(`${API_BASE}/user/${userId}`)
    if (!res.ok) throw new Error('ไม่พบข้อมูลผู้ใช้')

    const data = await res.json()

    // อัปเดตข้อมูลใน popup
    editForm.value.us_ttn_id = data.us_ttn_id
    editForm.value.us_department = data.us_department
    editForm.value.us_phone = toDisplay(data.us_phone)
    firstNameTH.value = data.us_first_name_th
    lastNameTH.value = data.us_last_name_th
    firstNameEN.value = data.us_first_name_en
    lastNameEN.value = data.us_last_name_en
    username.value = data.us_user_name
  } catch (err) {
    console.error('โหลดข้อมูลผู้ใช้ล้มเหลว:', err)
  }
}

async function executeSave() {
  // 1. ตรวจสอบว่ากรอกรหัสผ่านปัจจุบันหรือยัง
  if (!tempOldPassword.value) {
    errors.value.tempOldPassword = 'กรุณากรอกรหัสผ่านปัจจุบัน'
    return
  }

  const userId = tokenData.value?.us_id
  const type = pendingSaveType.value

  // 2. เตรียม Payload (ดึงค่าจาก tempOldPassword มาใช้)
  const payload = {
    us_ttn_id: editForm.value.us_ttn_id,
    us_department: editForm.value.us_department,
    us_phone: toRaw(editForm.value.us_phone),
    us_first_name_th: firstNameTH.value,
    us_last_name_th: lastNameTH.value,
    us_first_name_en: firstNameEN.value,
    us_last_name_en: lastNameEN.value,
    us_user_name: username.value,
    oldPassword: tempOldPassword.value, // <--- ใช้ตัวแปรใหม่ตรงนี้
    password: type === 'password' ? editForm.value.password.trim() : null,
  }

  try {
    const res = await fetch(`${API_BASE}/edit-personal/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      // เช็ค error จาก Backend
      if (data.message.includes('รหัสผ่านปัจจุบันไม่ถูกต้อง')) {
        // แจ้งเตือน error ที่ input และไม่ต้องปิด popup
        errors.value.tempOldPassword = 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
        Swal.fire({
          title: 'ผิดพลาด',
          text: 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
          icon: 'error',
          confirmButtonColor: '#e53e3e', // สีแดง Error
        })
      } else {
        Swal.fire({
          title: 'ผิดพลาด',
          text: data.message || 'เกิดข้อผิดพลาด',
          icon: 'error',
          confirmButtonColor: '#1E48D1', // สีแดง Error
        })
        showPopupConfirm.value = false // error อื่นๆ ปิด popup ไปเลย
      }
      return
    }

    // 3. สำเร็จ
    Swal.fire({
      title: 'สำเร็จ',
      text: type === 'password' ? 'เปลี่ยนรหัสผ่านเรียบร้อย' : 'อัปเดตข้อมูลเรียบร้อย',
      icon: 'success',
      confirmButtonColor: '#1E48D1',
    })

    // Reset ค่าต่างๆ
    editForm.value.password = ''
    editForm.value.confirmPassword = ''
    tempOldPassword.value = ''

    closeAllPopup() // ปิดทุก Popup
  } catch (err) {
    console.error(err)
    Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error')
    showPopupConfirm.value = false
  }
}

const getFullNameTH = () => {
  const title =
    {
      1: 'นาย',
      2: 'นาง',
      3: 'นางสาว',
      4: 'อื่นๆ',
    }[editForm.value.us_ttn_id] || ''

  return `${title}${firstNameTH.value} ${lastNameTH.value}`.trim()
}

const getFullNameEN = () => {
  const title =
    {
      1: 'Mr.',
      2: 'Mrs.',
      3: 'Ms.',
      4: 'Other',
    }[editForm.value.us_ttn_id] || ''

  return `${title}${firstNameEN.value} ${lastNameEN.value}`.trim()
}

function openProfilePopup() {
  resetProfileForm()
  loadUserData()
  showPopupProfile.value = true
}

function openPasswordPopup() {
  resetPasswordForm()
  username.value = tokenData.value?.us_user_name || ''
  loadUserData()
  showPopupPassword.value = true
}

function closeAllPopup() {
  showPopupProfile.value = false
  showPopupPassword.value = false
  showPopupConfirm.value = false
}

watch(
  () => props.expanded,
  (newVal) => {
    if (!newVal) {
      showDropdown.value = false
      closeAllPopup()
    }
  },
)
</script>

<template>
  <footer
    ref="rootRef"
    class="relative border-t border-blue-700 px-4 py-3 flex items-center gap-3 hover:bg-blue-800 transition-all duration-300 cursor-pointer select-none"
    @click="toggleDropdown"
  >
    <!-- ไอคอนผู้ใช้ -->
    <div class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 shrink-0">
      <img :src="PersonIcon" alt="User Icon" class="w-6 h-6" />
    </div>

    <!-- ชื่อ: แสดงเฉพาะตอนขยาย -->
    <div v-show="props.expanded" class="flex flex-col text-white leading-tight">
      <span class="text-lg font-semibold">{{ userFullname }}</span>
    </div>

    <!-- ลูกศร: แสดงเฉพาะตอนขยาย -->
    <img
      v-if="props.expanded"
      :src="
        showDropdown ? ChevronDownIcon : ChevronUpIcon
      "
      alt="Chevron Icon"
      class="w-5 h-5 ml-auto transition-transform duration-200"
    />

    <!-- เมนูย่อย: แสดงเฉพาะตอนขยาย + dropdown เปิด -->
    <div
      v-if="props.expanded && showDropdown"
      class="absolute bottom-16 left-0 w-full bg-blue-900 rounded-lg shadow-lg py-2 z-50"
    >
      <button
        @click.stop="openProfilePopup"
        class="flex items-center w-full gap-2 px-4 py-2 text-left hover:bg-blue-800 transition-all"
      >
        <img :src="SettingIcon" class="w-4 h-4" />
        <span class="text-white text-sm">ตั้งค่าบัญชี</span>
      </button>

      <button
        @click="openPasswordPopup"
        class="flex items-center w-full gap-2 px-4 py-2 text-left hover:bg-blue-800 transition-all"
      >
        <Icon icon="fluent:edit-24-regular" width="16" height="16" style="color: #ffffff" />
        <span class="text-white text-sm">ตั้งค่ารหัสผ่าน</span>
      </button>

      <button
        @click="logout"
        class="flex items-center w-full gap-2 px-4 py-2 text-left hover:bg-blue-800 transition-all"
      >
        <img :src="LogoutIcon" class="w-4 h-4" />
        <span class="text-white text-sm">ออกจากระบบ</span>
      </button>
    </div>
  </footer>

  <!-- Popup Profile -->
  <div
    v-if="showPopupProfile"
    class="fixed inset-0 z-50 bg-black/50 overflow-y-auto"
    @click.self="closeAllPopup"
  >
    <div
      class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
      @click.self="closeAllPopup"
    >
      <div
        class="relative bg-white w-full max-w-2xl rounded-lg shadow-xl text-left overflow-hidden sm:my-8 transform transition-all"
      >
        <div class="p-6 sm:p-8">
          <div class="flex items-center gap-3 mb-4 sm:mb-6 border-b border-gray-100 pb-4">
            <div class="p-2 bg-blue-600 rounded-full">
              <Icon
                icon="fluent:person-square-16-regular"
                width="36"
                height="36"
                style="color: #ffffff"
              />
            </div>
            <h2 class="text-black text-xl sm:text-2xl font-bold">ตั้งค่าบัญชี</h2>
          </div>

          <div class="space-y-4 sm:space-y-5">
            <div>
              <label class="block text-sm sm:text-base font-medium mb-1 text-black"
                >ชื่อ - นามสกุล (ภาษาไทย)</label
              >
              <div class="relative">
                <input
                  type="text"
                  :value="getFullNameTH()"
                  class="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-black bg-gray-100 cursor-not-allowed text-sm sm:text-base"
                  disabled
                />
              </div>
            </div>

            <div>
              <label class="block text-sm sm:text-base font-medium mb-1 text-black"
                >ชื่อ - นามสกุล (ภาษาอังกฤษ)</label
              >
              <div class="relative">
                <input
                  type="text"
                  :value="getFullNameEN()"
                  class="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-black bg-gray-100 cursor-not-allowed text-sm sm:text-base"
                  disabled
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm sm:text-base font-medium mb-1 text-black"
                  >หน่วยงาน</label
                >
                <div class="relative">
                  <input
                    v-model="editForm.us_department"
                    type="text"
                    class="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-black bg-gray-100 cursor-not-allowed text-sm sm:text-base"
                    disabled
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm sm:text-base font-medium mb-1 text-black"
                  >เบอร์โทรศัพท์ <span class="text-red-500">*</span></label
                >
                <div class="relative">
                  <input
                    v-model="editForm.us_phone"
                    type="tel"
                    @input="maskInput($event.target)"
                    class="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-black"
                    placeholder="กรอกเบอร์โทร"
                  />
                </div>
                <p v-if="errors.us_phone" class="text-red-500 text-xs sm:text-sm mt-1">
                  {{ errors.us_phone }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t border-gray-200"
          >
            <button
              type="button"
              @click="closeAllPopup"
              class="w-full sm:w-auto px-6 py-2.5 border border-gray-300 rounded-lg text-black hover:bg-gray-100 transition text-sm sm:text-base"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              @click="saveProfile('profile')"
              class="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm sm:text-base"
            >
              ยืนยัน
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="showPopupPassword"
    class="fixed inset-0 z-50 bg-black/50 overflow-y-auto"
    @click.self="closeAllPopup"
  >
    <div
      class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
      @click.self="closeAllPopup"
    >
      <div
        class="relative bg-white w-full max-w-2xl rounded-lg shadow-xl text-left overflow-hidden sm:my-8 transform transition-all"
      >
        <div class="p-6 sm:p-8">
          <div class="flex items-center gap-3 mb-4 sm:mb-6 border-b border-gray-100 pb-4">
            <div class="p-2 bg-blue-600 rounded-full">
              <Icon icon="fluent:edit-24-regular" width="24" height="24" style="color: #ffffff" />
            </div>
            <h2 class="text-black text-xl sm:text-2xl font-bold">ตั้งค่ารหัสผ่าน</h2>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm sm:text-base font-medium mb-1 text-black"
                >ชื่อบัญชีผู้ใช้</label
              >
              <div class="relative">
                <input
                  v-model="username"
                  type="text"
                  class="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-black bg-gray-100 cursor-not-allowed text-sm sm:text-base"
                  disabled
                />
              </div>
              <p v-if="errors.username" class="text-red-500 text-xs sm:text-sm mt-1">
                {{ errors.username }}
              </p>
            </div>

            <div>
              <label class="block text-sm sm:text-base font-medium mb-1 text-black"
                >รหัสผ่านใหม่ <span class="text-red-500">*</span></label
              >
              <div class="relative">
                <input
                  v-model="editForm.password"
                  type="password"
                  class="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-black text-sm sm:text-base focus:border-black focus:ring-0 focus:outline-none transition-colors"
                  placeholder="กรอกรหัสผ่านใหม่"
                />
              </div>
              <p v-if="errors.password" class="text-red-500 text-xs sm:text-sm mt-1">
                {{ errors.password }}
              </p>
            </div>

            <div>
              <label class="block text-sm sm:text-base font-medium mb-1 text-black"
                >ยืนยันรหัสผ่านใหม่ <span class="text-red-500">*</span></label
              >
              <div class="relative">
                <input
                  v-model="editForm.confirmPassword"
                  type="password"
                  class="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-black text-sm sm:text-base focus:border-black focus:ring-0 focus:outline-none transition-colors"
                  placeholder="กรอกยืนยันรหัสผ่านใหม่"
                />
              </div>
              <p v-if="errors.confirmPassword" class="text-red-500 text-xs sm:text-sm mt-1">
                {{ errors.confirmPassword }}
              </p>
            </div>
          </div>

          <div
            class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t border-gray-200"
          >
            <button
              type="button"
              @click="closeAllPopup"
              class="w-full sm:w-auto px-6 py-2.5 border border-gray-300 rounded-lg text-black hover:bg-gray-100 transition text-sm sm:text-base"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              @click="saveProfile('password')"
              class="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm sm:text-base"
            >
              ยืนยัน
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="showPopupConfirm"
    class="fixed inset-0 z-50 bg-black/50 overflow-y-auto"
    @click.self="showPopupConfirm = false"
  >
    <div
      class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
      @click.self="showPopupConfirm = false"
    >
      <div
        class="relative bg-white w-full max-w-xl rounded-lg shadow-xl text-left overflow-hidden sm:my-8 transform transition-all"
      >
        <div class="p-6 sm:p-8">
          <div class="flex items-center gap-3 mb-4 sm:mb-6 border-b border-gray-100 pb-4">
            <h2 class="text-black text-xl sm:text-2xl font-bold">ยืนยันตัวตน</h2>
          </div>

          <div class="space-y-4">
            <p class="text-gray-600 text-sm sm:text-base">
              กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันการทำรายการ
            </p>

            <div>
              <label class="block text-sm sm:text-base font-medium mb-1 text-black"
                >รหัสผ่านปัจจุบัน <span class="text-red-500">*</span></label
              >
              <div class="relative">
                <input
                  v-model="tempOldPassword"
                  type="password"
                  class="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-black text-sm sm:text-base focus:border-black focus:ring-0 focus:outline-none transition-colors"
                  placeholder="รหัสผ่านปัจจุบัน"
                  @keyup.enter="executeSave"
                />
              </div>
              <p v-if="errors.tempOldPassword" class="text-red-500 text-xs sm:text-sm mt-1">
                {{ errors.tempOldPassword }}
              </p>
            </div>
          </div>

          <div
            class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t border-gray-200"
          >
            <button
              type="button"
              @click="showPopupConfirm = false"
              class="w-full sm:w-auto px-6 py-2.5 border border-gray-300 rounded-lg text-black hover:bg-gray-100 transition text-sm sm:text-base"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              @click="executeSave"
              class="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm sm:text-base"
            >
              ยืนยัน
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
