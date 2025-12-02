<script setup>
import { ref, onMounted, reactive } from 'vue'
import { jwtDecode } from 'jwt-decode'
import Swal from 'sweetalert2'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

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

const editForm = ref({
  us_ttn_id: '',
  us_department: '',
  us_phone: '',
  oldPassword: '',
  password: '',
  confirmPassword: ''
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


// รีเซ็ตฟอร์มและ errors
function resetForm() {
  editForm.value = {
    us_ttn_id: '',
    us_department: '',
    us_phone: '',
    oldPassword: '',
    password: '',
    confirmPassword: ''
  }

  firstNameTH.value = ''
  lastNameTH.value = ''
  firstNameEN.value = ''
  lastNameEN.value = ''
  username.value = ''

  errors.value = {
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
  }
}

// map ข้อมูลจาก token
function initFormFromToken() {
  const data = tokenData.value || {}
  const prefixText = data.us_prefix_th || ''
  if (prefixText === 'นาย') editForm.value.us_ttn_id = '1'
  else if (prefixText === 'นาง') editForm.value.us_ttn_id = '2'
  else if (prefixText === 'นางสาว') editForm.value.us_ttn_id = '3'
  else editForm.value.us_ttn_id = '4'

  editForm.value.us_department = data.us_department || ''
  editForm.value.us_phone = data.us_tel || ''

  firstNameTH.value = data.us_first_name_th || ''
  lastNameTH.value = data.us_last_name_th || ''
  firstNameEN.value = data.us_first_name_en || ''
  lastNameEN.value = data.us_last_name_en || ''
  username.value = data.us_user_name || ''
}

// ดึงข้อมูลจาก database
async function fetchDataFromDB() {
  try {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await res.json()

    if (data) {
      editForm.value.us_ttn_id = data.us_ttn_id || editForm.value.us_ttn_id
      editForm.value.us_department = data.us_department || editForm.value.us_department
      editForm.value.us_phone = data.us_phone || editForm.value.us_phone
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
  // ❌ initFormFromToken()   เอาออก
  await loadUserData()       // ดึงจาก DB ตาม userId ที่อยู่ใน token
  activeTab.value = 'personal'
  showPopup.value = true
}

// ปิด popup
function closePopup() {
  showPopup.value = false
}

function validateForm() {
  let valid = true
  errors.value = {
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
  }
  if (!/^\d{9,10}$/.test(editForm.value.us_phone)) {
    errors.value.us_phone = "เบอร์โทรศัพท์ต้องมี 9 หรือ 10 หลัก";
    valid = false;
  }
  if (!editForm.value.us_ttn_id) { 
    errors.value.us_ttn_id = "เลือกคำนำหน้า"; valid = false; 
  }
  if (!firstNameTH.value) { 
    errors.value.firstNameTH = "กรุณากรอกชื่อ (ไทย)"; valid = false; 
  }
  if (!lastNameTH.value) { 
    errors.value.lastNameTH = "กรุณากรอกนามสกุล (ไทย)"; valid = false; 
  }
  if (!editForm.value.us_phone) { 
    errors.value.us_phone = "กรุณากรอกเบอร์โทรศัพท์"; valid = false; 
  }
  if (!username.value) { 
    errors.value.username = "กรุณากรอกชื่อบัญชีผู้ใช้"; valid = false; 
  }
  if (!editForm.value.oldPassword) { 
    errors.value.oldPassword = "กรุณากรอกรหัสผ่านเดิม"; valid = false; 
  }

  if (editForm.value.password) {
    if (!editForm.value.confirmPassword) {
      errors.value.confirmPassword = "กรุณายืนยันรหัสผ่านใหม่"
      valid = false
    } else if (editForm.value.password !== editForm.value.confirmPassword) {
      errors.value.confirmPassword = "รหัสผ่านใหม่ไม่ตรงกัน"
      return "passwordMismatch"
    }
  }

  return valid
}

async function saveProfile() {
  const validateResult = validateForm();

  if (validateResult === "passwordMismatch") {
    return Swal.fire({
      icon: "error",
      title: "รหัสผ่านไม่ตรงกัน",
      text: "กรุณากรอกรหัสผ่านใหม่ให้ตรงกัน",
    });
  }

  if (!validateResult) {
    return Swal.fire({
      icon: "warning",
      title: "กรุณากรอกข้อมูลให้ครบ",
      text: "กรุณาตรวจสอบข้อมูลอีกครั้ง",
    });
  }

  // ยืนยันก่อนบันทึก
  const { isConfirmed } = await Swal.fire({
    title: "ยืนยันการบันทึก?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "บันทึก",
    cancelButtonText: "ยกเลิก",
  });
  if (!isConfirmed) return;

  try {
    const userId = tokenData.value?.us_id;
    if (!userId) {
      return Swal.fire({
        icon: "error",
        title: "ผิดพลาด",
        text: "ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่",
      });
    }

    // เตรียมข้อมูลส่งไป backend
    const payload = {
      us_ttn_id: editForm.value.us_ttn_id,
      us_department: editForm.value.us_department,
      us_phone: editForm.value.us_phone,
      us_first_name_th: firstNameTH.value,
      us_last_name_th: lastNameTH.value,
      us_first_name_en: firstNameEN.value,
      us_last_name_en: lastNameEN.value,
      us_user_name: username.value,

      // ต้องส่ง oldPassword ทุกครั้งถ้าผู้ใช้กรอกรหัสใหม่
      oldPassword: editForm.value.oldPassword || "",

      // optional ถ้าไม่แก้จะเป็น ""
      password: editForm.value.password || ""
    };

    const res = await fetch(`${API_BASE}/edit-personal/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    // ❗ ถ้ารหัสผ่านเดิมผิด → backend ต้องส่ง error กลับมา → ห้ามบันทึก
    if (!res.ok) {
      return Swal.fire({
        icon: "error",
        title: data.message || "อัปเดตไม่สำเร็จ",
        text: data.error || "",
      });
    }

    // ดึงข้อมูลล่าสุดจาก backend เพื่อ sync กับ popup
    await loadUserData();  // ← ต้องมีฟังก์ชันนี้ (ผมให้ด้านล่าง)

    Swal.fire({
      icon: "success",
      title: "บันทึกสำเร็จ",
      text: data.message || "อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว",
    });

    closePopup();

  } catch (err) {
    console.error("saveProfile error:", err);
    Swal.fire({
      icon: "error",
      title: "ข้อผิดพลาด",
      text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ โปรดตรวจสอบ backend",
    });
  }
}


async function loadUserData() {
  try {
    const userId = tokenData.value?.us_id;
    if (!userId) return;

    const res = await fetch(`${API_BASE}/user/${userId}`);
    if (!res.ok) throw new Error("ไม่พบข้อมูลผู้ใช้");

    const data = await res.json();

    // อัปเดตข้อมูลใน popup
    editForm.value.us_ttn_id = data.us_ttn_id;
    editForm.value.us_department = data.us_department;
    editForm.value.us_phone = data.us_phone;
    firstNameTH.value = data.us_first_name_th;
    lastNameTH.value = data.us_last_name_th;
    firstNameEN.value = data.us_first_name_en;
    lastNameEN.value = data.us_last_name_en;
    username.value = data.us_user_name;

  } catch (err) {
    console.error("โหลดข้อมูลผู้ใช้ล้มเหลว:", err);
  }
}




const getFullNameTH = () => {
  const title = {
    1: "นาย",
    2: "นาง",
    3: "นางสาว",
    4: "อื่นๆ"
  }[editForm.value.us_ttn_id] || ""

  return `${title}${firstNameTH.value} ${lastNameTH.value}`.trim()
}

const getFullNameEN = () => {
  const title = {
    1: "Mr.",
    2: "Mrs.",
    3: "Ms.",
    4: "Other"
  }[editForm.value.us_ttn_id] || ""

  return `${title}${firstNameEN.value} ${lastNameEN.value}`.trim()
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
    <div v-if="showPopup" class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 px-4 py-6 sm:py-8 cursor-default" @click.self="closePopup">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg sm:max-w-2xl max-h-[92vh] overflow-y-auto p-6 sm:p-8">
        <!-- Tabs -->
        <div class="mb-6">
          <div class="flex bg-gray-100 border border-gray-300 rounded-xl p-1">
            <button @click="activeTab = 'personal'" class="flex-1 py-2 text-sm sm:text-base font-semibold rounded-lg transition-all duration-300"
              :class="activeTab === 'personal' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'">
              ข้อมูลส่วนตัว
            </button>
            <button @click="activeTab = 'account'" class="flex-1 py-2 text-sm sm:text-base font-semibold rounded-lg transition-all duration-300"
              :class="activeTab === 'account' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'">
              ข้อมูลบัญชี
            </button>
          </div>
        </div>
      
        <div>
          <!-- PERSONAL TAB -->
          <div v-if="activeTab === 'personal'">
            <h2 class="text-black text-xl sm:text-2xl font-bold mb-6">ข้อมูลส่วนตัว</h2>
          
            <!-- ชื่อภาษาไทย -->
            <div class="mb-5">
              <label class="block text-sm sm:text-base font-medium mb-1 text-black">
                ชื่อ - นามสกุล (ภาษาไทย)
              </label>
              <input 
                type="text"
                :value="getFullNameTH()"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-gray-100 cursor-not-allowed"
                disabled
              >
            </div>
          
            <!-- ชื่อภาษาอังกฤษ -->
            <div class="mb-5">
              <label class="block text-sm sm:text-base font-medium mb-1 text-black">
                ชื่อ - นามสกุล (ภาษาอังกฤษ)
              </label>
              <input 
                type="text"
                :value="getFullNameEN()"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-gray-100 cursor-not-allowed"
                disabled
              >
            </div>
          
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm sm:text-base font-medium mb-1 text-black">
                  หน่วยงาน
                </label>
                <input v-model="editForm.us_department" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-black bg-gray-100 cursor-not-allowed" disabled>
              </div>
              <div>
                <label class="block text-sm sm:text-base font-medium mb-1 text-black">
                  เบอร์โทรศัพท์ <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="editForm.us_phone"
                  type="text"
                  maxlength="10"
                  @input="editForm.us_phone = editForm.us_phone.replace(/[^0-9]/g, '').slice(0, 10)"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
                />
                <p v-if="errors.us_phone" class="text-red-500 text-sm mt-1">{{ errors.us_phone }}</p>
              </div>
            </div>
          </div>
        
          <!-- ACCOUNT TAB -->
          <div v-if="activeTab === 'account'">
            <h2 class="text-black text-xl sm:text-2xl font-bold mb-6">ข้อมูลบัญชี</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm sm:text-base font-medium text-black mb-2">
                  ชื่อบัญชีผู้ใช้ <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="username"
                  type="text"
                  placeholder="กรอกชื่อบัญชีผู้ใช้"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 sm:px-4 sm:py-2 text-black focus:ring-2 focus:ring-black focus:outline-none transition"
                />
                <p v-if="errors.username" class="text-red-500 text-sm mt-1">{{ errors.username }}</p>
              </div>
            
              <div>
                <label class="block text-sm sm:text-base font-medium text-black mb-2">
                  รหัสผ่านเดิม <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="editForm.oldPassword"
                  type="password"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 sm:px-4 sm:py-2 text-black focus:ring-2 focus:ring-black focus:outline-none transition"
                />
                <p v-if="errors.oldPassword" class="text-red-500 text-sm mt-1">{{ errors.oldPassword }}</p>
              </div>
            
              <div>
                <label class="block text-sm sm:text-base font-medium text-black mb-2">
                  รหัสผ่านใหม่
                </label>
                <input
                  v-model="editForm.password"
                  type="password"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 sm:px-4 sm:py-2 text-black focus:ring-2 focus:ring-black focus:outline-none transition"
                />
                <p v-if="errors.password" class="text-red-500 text-sm mt-1">{{ errors.password }}</p>
              </div>
            
              <div>
                <label class="block text-sm sm:text-base font-medium text-black mb-2">
                  ยืนยันรหัสผ่าน
                </label>
                <input
                  v-model="editForm.confirmPassword"
                  type="password"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 sm:px-4 sm:py-2 text-black focus:ring-2 focus:ring-black focus:outline-none transition"
                />
                <p v-if="errors.confirmPassword" class="text-red-500 text-sm mt-1">{{ errors.confirmPassword }}</p>
              </div>
            </div>
          </div>
        
          <!-- Footer -->
          <div class="flex flex-col sm:flex-row justify-end gap-3 mt-4 pt-4 border-t">
            <button @click="closePopup" class="px-6 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-100 transition">
              ยกเลิก
            </button>
            <button @click="saveProfile" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
              ยืนยัน
            </button>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>
