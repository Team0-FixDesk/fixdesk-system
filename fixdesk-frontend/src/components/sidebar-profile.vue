<script setup>
import { ref, onMounted, reactive } from 'vue'
import { jwtDecode } from 'jwt-decode'

const props = defineProps({
  expanded: { type: Boolean, default: false },
})

const showDropdown = ref(false)
const showPopup = ref(false)
const activeTab = ref('personal')

const userFullname = ref('')
const firstNameTH = ref('')
const lastNameTH = ref('')
const firstNameEN = ref('')
const lastNameEN = ref('')
const username = ref('')
const tokenData = ref({})

const editForm = reactive({
  us_ttn_id: '',
  us_department: '',
  us_phone: '',
  password: '',
  confirmPassword: ''
})

const errors = reactive({
  us_ttn_id: '',
  firstNameTH: '',
  lastNameTH: '',
  firstNameEN: '',
  lastNameEN: '',
  us_department: '',
  us_phone: '',
  username: '',
  password: '',
  confirmPassword: ''
})

onMounted(() => {
  const token = localStorage.getItem('token')
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

function toggleDropdown() {
  if (!props.expanded) return
  showDropdown.value = !showDropdown.value
}

function logout(e) {
  e.stopPropagation()
  localStorage.removeItem('token')
  window.location.href = '/login'
}

function initForm() {
  const data = tokenData.value || {}

  const prefixText = data.us_prefix_th || ''
  if (prefixText === 'นาย') editForm.us_ttn_id = '1'
  else if (prefixText === 'นาง') editForm.us_ttn_id = '2'
  else if (prefixText === 'นางสาว') editForm.us_ttn_id = '3'
  else editForm.us_ttn_id = '4'

  editForm.us_department = data.us_department || ''
  editForm.us_phone = data.us_tel || ''
}


// รีเซ็ตฟอร์มและ errors
function resetForm() {
  editForm.us_ttn_id = ''
  editForm.us_department = ''
  editForm.us_phone = ''
  editForm.password = ''
  editForm.confirmPassword = ''

  firstNameTH.value = ''
  lastNameTH.value = ''
  firstNameEN.value = ''
  lastNameEN.value = ''
  username.value = ''

  for (const key in errors) errors[key] = ''
}

// map ข้อมูลจาก token
function initFormFromToken() {
  const data = tokenData.value || {}
  const prefixText = data.us_prefix_th || ''
  if (prefixText === 'นาย') editForm.us_ttn_id = '1'
  else if (prefixText === 'นาง') editForm.us_ttn_id = '2'
  else if (prefixText === 'นางสาว') editForm.us_ttn_id = '3'
  else editForm.us_ttn_id = '4'

  editForm.us_department = data.us_department || ''
  editForm.us_phone = data.us_tel || ''

  firstNameTH.value = data.us_first_name_th || ''
  lastNameTH.value = data.us_last_name_th || ''
  firstNameEN.value = data.us_first_name_en || ''
  lastNameEN.value = data.us_last_name_en || ''
  username.value = data.us_user_name || ''
}

// ดึงข้อมูลจาก database
async function fetchDataFromDB() {
  try {
    // สมมติ endpoint: /api/user/profile
    const res = await axios.get('/api/user/profile', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = res.data

    if (data) {
      editForm.us_ttn_id = data.us_ttn_id || editForm.us_ttn_id
      editForm.us_department = data.us_department || editForm.us_department
      editForm.us_phone = data.us_phone || editForm.us_phone
      firstNameTH.value = data.us_first_name_th || firstNameTH.value
      lastNameTH.value = data.us_last_name_th || lastNameTH.value
      firstNameEN.value = data.us_first_name_en || firstNameEN.value
      lastNameEN.value = data.us_last_name_en || lastNameEN.value
      username.value = data.us_user_name || username.value
    }
  } catch (err) {
    console.error('❌ Fetch user data error:', err)
  }
}

async function openPopup() {
  resetForm()
  initFormFromToken()
  await fetchDataFromDB() // ดึงข้อมูลเดิมจาก DB
  activeTab.value = 'personal'
  showPopup.value = true
}

// ปิด popup
function closePopup() {
  showPopup.value = false
}

function validateForm() {
  let valid = true

  for (const key in errors) errors[key] = ''

  if (!editForm.us_ttn_id) { 
    errors.us_ttn_id = 'กรุณาเลือกคำนำหน้า'; valid = false 
  }
  if (!firstNameTH.value) { 
    errors.firstNameTH = 'กรุณากรอกชื่อภาษาไทย'; valid = false 
  }
  if (!lastNameTH.value) { 
    errors.lastNameTH = 'กรุณากรอกนามสกุลภาษาไทย'; valid = false 
  }
  if (!firstNameEN.value) { 
    errors.firstNameEN = 'กรุณากรอกชื่อภาษาอังกฤษ'; valid = false 
  }
  if (!lastNameEN.value) { 
    errors.lastNameEN = 'กรุณากรอกนามสกุลภาษาอังกฤษ'; valid = false 
  }
  if (!editForm.us_department) { 
    errors.us_department = 'กรุณากรอกหน่วยงาน'; valid = false 
  }
  if (!editForm.us_phone) { 
    errors.us_phone = 'กรุณากรอกเบอร์โทรศัพท์'; valid = false 
  }
  if (!username.value) { 
    errors.username = 'กรุณากรอกชื่อบัญชีผู้ใช้'; valid = false 
  }
  if (!editForm.password) { 
    errors.password = 'กรุณากรอกรหัสผ่าน'; valid = false 
  }
  if (!editForm.confirmPassword) { 
    errors.confirmPassword = 'กรุณายืนยันรหัสผ่าน'; valid = false 
  }
  if (editForm.password && editForm.confirmPassword && editForm.password !== editForm.confirmPassword) {
    errors.confirmPassword = 'รหัสผ่านไม่ตรงกัน'; valid = false
  }

  if (valid) {
    alert('บันทึกสำเร็จ!')
    closePopup()
  }
}
</script>

<template>
  <footer
    class="relative border-t border-blue-700 px-4 py-3 flex items-center gap-3 hover:bg-blue-800 transition-all duration-300 cursor-pointer select-none"
    @click="toggleDropdown"
  >
    <!-- ไอคอนผู้ใช้ -->
    <div class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 shrink-0">
      <img src="/icon/sidebar/person-icon.svg" alt="User Icon" class="w-6 h-6" />
    </div>

    <!-- ชื่อ: แสดงเฉพาะตอนขยาย -->
    <div v-show="props.expanded" class="flex flex-col text-white leading-tight">
      <span class="text-lg font-semibold">{{ userFullname }}</span>
    </div>

    <!-- ลูกศร: แสดงเฉพาะตอนขยาย -->
    <img
      v-if="props.expanded"
      :src="showDropdown ? '/icon/sidebar/chevron-down-icon.svg' : '/icon/sidebar/chevron-up-icon.svg'"
      alt="Chevron Icon"
      class="w-5 h-5 ml-auto transition-transform duration-200"
    />

    <!-- เมนูย่อย: แสดงเฉพาะตอนขยาย + dropdown เปิด -->
    <div
      v-if="props.expanded && showDropdown"
      class="absolute bottom-16 left-0 w-full bg-blue-900 rounded-lg shadow-lg py-2 z-50"
    >
      <button @click="openPopup" class="flex items-center w-full gap-2 px-4 py-2 text-left hover:bg-blue-800 transition-all">
        <img src="/icon/sidebar/settings-icon.svg" class="w-4 h-4" />
        <span class="text-white text-sm">ตั้งค่าบัญชี</span>
      </button>

      <button @click="logout" class="flex items-center w-full gap-2 px-4 py-2 text-left hover:bg-blue-800 transition-all">
        <img src="/icon/sidebar/logout-icon.svg" class="w-4 h-4" />
        <span class="text-white text-sm">ออกจากระบบ</span>
      </button>
    </div>

    <!-- Popup -->
    <div v-if="showPopup" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 px-4 cursor-default" @click.stop>
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-8">
        <!-- Tabs -->
        <div class="mb-6">
          <div class="flex bg-gray-100 border border-gray-300 rounded-xl p-1">
            <button @click="activeTab = 'personal'" class="flex-1 py-2.5 text-sm md:text-base font-semibold rounded-lg transition-all duration-300"
              :class="activeTab === 'personal' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'">
              ข้อมูลส่วนตัว
            </button>
            <button @click="activeTab = 'account'" class="flex-1 py-2.5 text-sm md:text-base font-semibold rounded-lg transition-all duration-300"
              :class="activeTab === 'account' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'">
              ข้อมูลบัญชี
            </button>
          </div>
        </div>

        <div>
          <!-- PERSONAL TAB -->
          <div v-if="activeTab === 'personal'">
            <h2 class="text-black text-2xl font-bold mb-6">ข้อมูลส่วนตัว</h2>

            <div class="mb-5">
              <label class="block text-sm font-medium mb-1 text-black">
                คำนำหน้าชื่อ <span class="text-red-500">*</span>
              </label>
              <select v-model="editForm.us_ttn_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
                <option value="">เลือกคำนำหน้า</option>
                <option value="1">นาย</option>
                <option value="2">นาง</option>
                <option value="3">นางสาว</option>
                <option value="4">อื่นๆ</option>
              </select>
              <p v-if="errors.us_ttn_id" class="text-red-500 text-sm mt-1">{{ errors.us_ttn_id }}</p>
            </div>

            <div class="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-black block text-sm font-medium mb-1">
                  ชื่อ (ไทย) <span class="text-red-500">*</span>
                </label>
                <input v-model="firstNameTH" type="text" class="text-black w-full border border-gray-300 rounded-lg px-3 py-2">
                <p v-if="errors.firstNameTH" class="text-red-500 text-sm mt-1">{{ errors.firstNameTH }}</p>
              </div>
              <div>
                <label class="text-black block text-sm font-medium mb-1">
                  นามสกุล (ไทย) <span class="text-red-500">*</span>
                </label>
                <input v-model="lastNameTH" type="text" class="text-black w-full border border-gray-300 rounded-lg px-3 py-2">
                <p v-if="errors.lastNameTH" class="text-red-500 text-sm mt-1">{{ errors.lastNameTH }}</p>
              </div>
            </div>

            <div class="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-black block text-sm font-medium mb-1">
                  ชื่อ (EN) <span class="text-red-500">*</span>
                </label>
                <input v-model="firstNameEN" type="text" class="text-black w-full border border-gray-300 rounded-lg px-3 py-2">
                <p v-if="errors.firstNameEN" class="text-red-500 text-sm mt-1">{{ errors.firstNameEN }}</p>
              </div>
              <div>
                <label class="text-black block text-sm font-medium mb-1">
                  นามสกุล (EN) <span class="text-red-500">*</span>
                </label>
                <input v-model="lastNameEN" type="text" class="text-black w-full border border-gray-300 rounded-lg px-3 py-2">
                <p v-if="errors.lastNameEN" class="text-red-500 text-sm mt-1">{{ errors.lastNameEN }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm font-medium mb-1 text-black">
                  หน่วยงาน <span class="text-red-500">*</span>
                </label>
                <input v-model="editForm.us_department" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-black">
                <p v-if="errors.us_department" class="text-red-500 text-sm mt-1">{{ errors.us_department }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1 text-black">
                  เบอร์โทรศัพท์ <span class="text-red-500">*</span>
                </label>
                <input v-model="editForm.us_phone" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-black">
                <p v-if="errors.us_phone" class="text-red-500 text-sm mt-1">{{ errors.us_phone }}</p>
              </div>
            </div>
          </div>

          <!-- ACCOUNT TAB -->
          <div v-if="activeTab === 'account'">
            <h2 class="text-black text-2xl font-bold mb-6">ข้อมูลบัญชี</h2>

            <div class="mb-5">
              <label class="text-black block text-sm font-medium mb-1">
                ชื่อบัญชีผู้ใช้ <span class="text-red-500">*</span>
              </label>
              <input v-model="username" type="text" class="text-black w-full border-gray-300 border rounded-lg px-3 py-2">
              <p v-if="errors.username" class="text-red-500 text-sm mt-1">{{ errors.username }}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="text-black block text-sm font-medium mb-1">
                  รหัสผ่านใหม่ <span class="text-red-500">*</span>
                </label>
                <input v-model="editForm.password" type="password" class="text-black w-full border border-gray-300 rounded-lg px-3 py-2">
                <p v-if="errors.password" class="text-red-500 text-sm mt-1">{{ errors.password }}</p>
              </div>
              <div>
                <label class="text-black block text-sm font-medium mb-1">
                  ยืนยันรหัสผ่าน <span class="text-red-500">*</span>
                </label>
                <input v-model="editForm.confirmPassword" type="password" class="text-black w-full border border-gray-300 rounded-lg px-3 py-2">
                <p v-if="errors.confirmPassword" class="text-red-500 text-sm mt-1">{{ errors.confirmPassword }}</p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-3 mt-4 pt-4 border-t">
            <button @click="closePopup" class="px-6 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-100 transition">
              ยกเลิก
            </button>
            <button @click="validateForm" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
              ยืนยัน
            </button>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>
