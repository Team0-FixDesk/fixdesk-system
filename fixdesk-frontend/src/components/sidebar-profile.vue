<script setup>
import { ref, onMounted } from 'vue'
import { jwtDecode } from 'jwt-decode'

// รับสถานะจาก parent
const props = defineProps({
  expanded: { type: Boolean, default: false },
})

const showDropdown = ref(false)
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
})

// โหลดชื่อจาก token
onMounted(() => {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const decoded = jwtDecode(token)
      tokenData.value = decoded
      
      userFullname.value = decoded.us_first_name_th || decoded.us_user_name || 'ผู้ใช้ระบบ'
      firstNameTH.value = decoded.us_first_name_th
      lastNameTH.value = decoded.us_last_name_th
      firstNameEN.value = decoded.us_first_name_en
      lastNameEN.value = decoded.us_last_name_en
      username.value = decoded.us_user_name
      console.log("📌 us_first_name_en =", decoded.us_first_name_en)
      console.log("📌 us_last_name_en =", decoded.us_last_name_en)
      console.log("TOKEN:", decoded)
      
    } catch (err) {
      console.error('❌ Decode token error:', err)
    }
  }
})

function toggleDropdown() {
  if (!props.expanded) return // ย่ออยู่ ไม่ให้เปิด dropdown
  showDropdown.value = !showDropdown.value
}

function logout(e) {
  e.stopPropagation()
  localStorage.removeItem('token')
  window.location.href = '/login'
}


function initForm() {
  const data = tokenData.value || {}
  
  // ดึงคำนำหน้าภาษาไทย
  const prefixText = data.us_prefix_th || '' 

  if (prefixText === 'นาย') {
    editForm.value.us_ttn_id = "1"
  } else if (prefixText === 'นาง') {
    editForm.value.us_ttn_id = "2"
  } else if (prefixText === 'นางสาว') {
    editForm.value.us_ttn_id = "3"
  } else if (prefixText === 'อื่นๆ') {
    editForm.value.us_ttn_id = "4"
  } else {
    // กรณีที่ไม่ตรงกับอะไรเลย ก็ให้ลงที่ อื่นๆ (4) ไว้ก่อน
    editForm.value.us_ttn_id = "4" 
  }
  
  editForm.value.us_department = data.us_department || ''
  editForm.value.us_phone = data.us_tel || '' 
}

const showPopup = ref(false)
const activeTab = ref('personal') 

function openPopup() {
  activeTab.value = 'personal'
  initForm() // เรียกทำงานเพื่อ Map ข้อมูล
  showPopup.value = true
}

function closePopup() {
  showPopup.value = false
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

    <div v-if="showPopup" class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 cursor-default" @click.stop>
      
      <div class="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-hidden">
        
        <div class="flex text-lg">
          <button 
            @click="activeTab = 'personal'"
            class="flex-1 py-3 font-bold transition-colors duration-200"
            :class="activeTab === 'personal' ? 'bg-[#0070d2] text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'"
          >
            ข้อมูลส่วนตัว
          </button>
          
          <button 
            @click="activeTab = 'account'"
            class="flex-1 py-3 font-bold transition-colors duration-200"
            :class="activeTab === 'account' ? 'bg-[#0070d2] text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'"
          >
            ข้อมูลบัญชี
          </button>
        </div>

        <div class="p-6">
          
          <div v-if="activeTab === 'personal'">
            <h2 class="text-black text-2xl font-bold mb-6">ข้อมูลส่วนตัว</h2>
            
            <div class="mb-4">
              <label class="block text-sm font-medium mb-2 text-black">คำนำหน้าชื่อ</label>
              <select
                v-model="editForm.us_ttn_id"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>เลือกคำนำหน้า</option>
                <option value="1">นาย</option>
                <option value="2">นาง</option>
                <option value="3">นางสาว</option>
                <option value="4">อื่นๆ</option>
              </select>
            </div>

            <div class="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label class="text-black block text-sm font-medium mb-2">ชื่อ (ไทย)</label>
                <input type="text" :value="firstNameTH" class="text-black w-full border border-gray-300 rounded px-3 py-2" >
              </div>
              <div>
                <label class="text-black block text-sm font-medium mb-2">นามสกุล (ไทย)</label>
                <input type="text" :value="lastNameTH" class="text-black w-full border border-gray-300 rounded px-3 py-2" >
              </div>
            </div>

            <div class="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label class="text-black block text-sm font-medium mb-2">ชื่อ (EN)</label>
                <input type="text" :value="firstNameEN" class="text-black w-full border border-gray-300 rounded px-3 py-2">
              </div>
              <div>
                <label class="text-black block text-sm font-medium mb-2">นามสกุล (EN)</label>
                <input type="text" :value="lastNameEN" class="text-black w-full border border-gray-300 rounded px-3 py-2">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm font-medium mb-2 text-black">หน่วยงาน</label>
                <input 
                  type="text" 
                  v-model="editForm.us_department" 
                  class="w-full border border-gray-300 rounded px-3 py-2 text-black" 
                  disabled
                >
              </div>
              <div>
                <label class="block text-sm font-medium mb-2 text-black">เบอร์โทรศัพท์</label>
                <input 
                  type="text" 
                  v-model="editForm.us_phone" 
                  class="w-full border border-gray-300 rounded px-3 py-2 text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'account'">
            <h2 class="text-black text-2xl font-bold mb-6">ข้อมูลบัญชี</h2>
            
            <div class="mb-4">
              <label class="text-black block text-sm font-medium mb-2">ชื่อบัญชีผู้ใช้</label>
              <input type="text" :value="username" class="text-black w-full border border-gray-300 rounded px-3 py-2">
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label class="text-black block text-sm font-medium mb-2">รหัสผ่านใหม่</label>
                <input type="password" class="text-black w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>
              <div>
                <label class="text-black block text-sm font-medium mb-2">ยืนยันรหัสผ่าน</label>
                <input type="password" class="text-black w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-4">
            <button 
              @click="closePopup" 
              class="px-6 py-2 border border-gray-300 rounded text-black hover:bg-gray-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button 
              class="px-6 py-2 bg-[#006ec4] text-white rounded hover:bg-blue-700 transition-colors font-semibold"
            >
              ยืนยัน
            </button>
          </div>

        </div> 
      </div>
    </div>
  </footer>
</template>