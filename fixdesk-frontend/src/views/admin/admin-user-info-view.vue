<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import TableComponent from '@/components/table-component.vue'
import Swal from 'sweetalert2'

defineOptions({ name: 'AdminUserInfoView' })

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

/* ===============================
 * 🔐 Auth Header Helper
 * =============================== */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/* ===============================
 * 💾 STATE
 * =============================== */
const columns = ['ชื่อเต็ม', 'ชื่อผู้ใช้', 'บทบาท', 'หน่วยงาน', 'ตำแหน่ง', 'ตัวดำเนินการ']
const rows = ref([])
const searchQuery = ref('')
const selectedRoles = ref([])
const selectedTechTypes = ref([])
const showRoleFilter = ref(false)
const showTechFilter = ref(false)

// ===============================
// 📦 ดึงข้อมูลผู้ใช้ (แก้ไข)
// ===============================
const userIdByUsername = ref({}) // <— เพิ่ม map เก็บ id จาก username

async function fetchUsers() {
  try {
    const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')

    // ✅ เก็บข้อมูลเต็ม พร้อมชื่อ EN
    rows.value = data.map((u) => ({
      fullNameTh: `${u.us_first_name_th || ''} ${u.us_last_name_th || ''}`,
      fullNameEn: `${u.us_first_name_en || ''} ${u.us_last_name_en || ''}`,
      username: u.us_user_name || '-',
      role: u.role_name || '-',
      department: u.us_department || '-',
      technicianType: u.technician_type || '-',
      raw: u, // 👉 เก็บข้อมูล user ทั้ง object เอาไว้ใช้ใน modal
    }))

    // ✅ map username -> id (สำหรับลบ/แก้ไข)
    const map = {}
    for (const u of data) {
      if (u.us_user_name && u.us_id != null) map[u.us_user_name] = u.us_id
    }
    userIdByUsername.value = map
  } catch (err) {
    console.error('❌ โหลดข้อมูลไม่สำเร็จ:', err)
    Swal.fire('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้', 'error')
  }
}

/* ===============================
 * 🔍 ฟิลเตอร์
 * =============================== */
const filteredRows = computed(() => {
  return rows.value.filter((r) => {
    const q = searchQuery.value.toLowerCase()
    const matchSearch =
      r.fullNameTh.toLowerCase().includes(q) ||
      r.fullNameEn.toLowerCase().includes(q) ||
      r.username.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q)

    const matchRole = selectedRoles.value.length === 0 || selectedRoles.value.includes(r.role)
    const matchTech =
      selectedTechTypes.value.length === 0 || selectedTechTypes.value.includes(r.technicianType)

    return matchSearch && matchRole && matchTech
  })
})

function clearFilters() {
  selectedRoles.value = []
  selectedTechTypes.value = []
}

/* ===============================
 * 🧹 ปิด dropdown เมื่อคลิกรอบนอก
 * =============================== */
function closeDropdown(e) {
  if (!e.target.closest('.relative')) {
    showRoleFilter.value = false
    showTechFilter.value = false
  }
}

onMounted(() => {
  fetchUsers()
  document.addEventListener('click', closeDropdown)
})
onBeforeUnmount(() => document.removeEventListener('click', closeDropdown))

/* ===============================
 * 🔵 ดูรายละเอียดผู้ใช้ (View)
 * =============================== */
const showViewModal = ref(false)
const viewForm = ref({
  us_id: '',
  us_ttn_id: '',
  us_first_name_th: '',
  us_last_name_th: '',
  us_first_name_en: '',
  us_last_name_en: '',
  us_user_name: '',
  us_phone: '',
  us_department: '',
  us_role_id: '',
  us_tt_id: '',
  role_name: '',
  technician_type: '',
})

function openViewModal(username) {
  try {
    const row = rows.value.find((r) => r.username === username)
    if (!row) throw new Error('ไม่พบผู้ใช้ในข้อมูลที่โหลดไว้')

    Object.assign(viewForm.value, row.raw)
    showViewModal.value = true
  } catch (err) {
    Swal.fire('ผิดพลาด', err.message, 'error')
  }
}

function closeViewModal() {
  showViewModal.value = false
}

/* ===============================
 * 🟢 เพิ่มผู้ใช้
 * =============================== */
const showAddModal = ref(false)
const addForm = ref({
  us_ttn_id: '',
  us_first_name_th: '',
  us_last_name_th: '',
  us_first_name_en: '',
  us_last_name_en: '',
  us_user_name: '',
  us_user_pass: '',
  us_phone: '',
  us_department: '',
  us_role_id: '',
  us_tt_id: '',
})

function openAddModal() {
  Object.keys(addForm.value).forEach((key) => (addForm.value[key] = ''))
  showAddModal.value = true
}
function closeAddModal() {
  showAddModal.value = false
}

async function confirmAddUser() {
  if (!validateAddForm()) return
  const result = await Swal.fire({
    title: 'ยืนยันการเพิ่มผู้ใช้งาน?',
    text: 'คุณต้องการเพิ่มผู้ใช้งานใหม่ในระบบหรือไม่?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#16a34a',
  })
  if (!result.isConfirmed) return

  try {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...addForm.value,
        us_ttn_id: parseInt(addForm.value.us_ttn_id),
        us_role_id: parseInt(addForm.value.us_role_id),
        us_tt_id: addForm.value.us_tt_id ? parseInt(addForm.value.us_tt_id) : null,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'เพิ่มผู้ใช้ไม่สำเร็จ')

    Swal.fire('สำเร็จ', 'เพิ่มผู้ใช้เรียบร้อยแล้ว', 'success')
    showAddModal.value = false
    await fetchUsers()
  } catch (err) {
    Swal.fire('ผิดพลาด', err.message, 'error')
  }
}

/* ===============================
 * 🟠 แก้ไขผู้ใช้
 * =============================== */
const showEditModal = ref(false)
const editForm = ref({
  us_id: '',
  us_ttn_id: '',
  us_first_name_th: '',
  us_last_name_th: '',
  us_first_name_en: '',
  us_last_name_en: '',
  us_user_name: '',
  us_phone: '',
  us_department: '',
  us_role_id: '',
  us_tt_id: '',
})

function openEditModal(username) {
  try {
    const row = rows.value.find((r) => r.username === username)
    if (!row) throw new Error('ไม่พบผู้ใช้ในข้อมูลที่โหลดไว้')

    Object.assign(editForm.value, row.raw)
    showEditModal.value = true
  } catch (err) {
    Swal.fire('ผิดพลาด', err.message, 'error')
  }
}

function closeEditModal() {
  showEditModal.value = false
}

async function confirmEditUser() {
  if (!validateEditForm()) return
  const result = await Swal.fire({
    title: 'ยืนยันการแก้ไขข้อมูล?',
    text: 'คุณต้องการบันทึกการแก้ไขนี้หรือไม่?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#f97316',
  })
  if (!result.isConfirmed) return

  try {
    const res = await fetch(`${API_BASE}/users/${editForm.value.us_id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...editForm.value,
        us_ttn_id: parseInt(editForm.value.us_ttn_id),
        us_role_id: parseInt(editForm.value.us_role_id),
        us_tt_id: editForm.value.us_tt_id ? parseInt(editForm.value.us_tt_id) : null,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'อัปเดตไม่สำเร็จ')

    Swal.fire('สำเร็จ', 'แก้ไขข้อมูลผู้ใช้เรียบร้อยแล้ว', 'success')
    showEditModal.value = false
    await fetchUsers()
  } catch (err) {
    Swal.fire('ผิดพลาด', err.message, 'error')
  }
}

// ===============================
// 🔴 ลบผู้ใช้ (แก้ไข)
// ===============================
async function confirmDelete(username) {
  const result = await Swal.fire({
    title: 'ยืนยันการลบ?',
    text: `คุณแน่ใจหรือไม่ว่าต้องการลบ "${username}"?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ลบ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#dc2626',
  })
  if (!result.isConfirmed) return

  try {
    // แปลง username -> id
    let id = userIdByUsername.value[username]

    // กันกรณี map ยังไม่มีข้อมูล (เช่นเพิ่งรีเฟรชหน้า/ข้อมูลไม่ sync)
    if (!id) {
      const resUsers = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() })
      const dataUsers = await resUsers.json()
      if (resUsers.ok) {
        const found = dataUsers.find((u) => u.us_user_name === username)
        if (found) {
          id = found.us_id
          userIdByUsername.value[username] = id
        }
      }
    }

    if (!id && id !== 0) {
      throw new Error('ไม่พบผู้ใช้จากชื่อผู้ใช้ (username) นี้')
    }

    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    // พยายามอ่านเป็น JSON ก่อน ถ้าไม่ได้ค่อยอ่านเป็น text
    let payload
    let message = ''
    try {
      payload = await res.json()
      message = payload?.message || ''
    } catch (_) {
      const txt = await res.text()
      message = txt && txt.trim().startsWith('<') ? 'ปลายทางส่งกลับเป็น HTML' : txt
    }

    if (!res.ok) {
      throw new Error(message || `ลบไม่สำเร็จ (HTTP ${res.status})`)
    }

    Swal.fire('สำเร็จ', 'ลบผู้ใช้เรียบร้อยแล้ว', 'success')
    await fetchUsers()
  } catch (err) {
    Swal.fire('ผิดพลาด', err.message || 'ไม่สามารถลบผู้ใช้ได้', 'error')
  }
}

function handleAddRoleChange() {
  if (addForm.value.us_role_id !== '2') {
    addForm.value.us_tt_id = ''
  }
}

function handleEditRoleChange() {
  if (editForm.value.us_role_id !== '2' && editForm.value.us_role_id !== 2) {
    editForm.value.us_tt_id = ''
  }
}
const addErrors = ref({
  username: '',
  password: '',
  ttn: '',
  firstTh: '',
  lastTh: '',
  firstEn: '',
  lastEn: '',
  phone: '',
  department: '',
  role: '',
  techType: '',
})

const editErrors = ref({
  ttn: '',
  firstTh: '',
  lastTh: '',
  firstEn: '',
  lastEn: '',
  phone: '',
  department: '',
  role: '',
  techType: '',
})
function validateAddForm() {
  let valid = true

  addErrors.value = {
    username: '',
    password: '',
    ttn: '',
    firstTh: '',
    lastTh: '',
    firstEn: '',
    lastEn: '',
    phone: '',
    department: '',
    role: '',
    techType: '',
  }

  // USERNAME
  if (!addForm.value.us_user_name.trim()) {
    addErrors.value.username = 'กรุณากรอกชื่อผู้ใช้'
    valid = false
  }

  // PASSWORD
  if (!addForm.value.us_user_pass.trim()) {
    addErrors.value.password = 'กรุณากรอกรหัสผ่าน'
    valid = false
  }

  // TITLE
  if (!addForm.value.us_ttn_id) {
    addErrors.value.ttn = 'กรุณาเลือกคำนำหน้า'
    valid = false
  }

  // FIRST NAME TH
  if (!addForm.value.us_first_name_th.trim()) {
    addErrors.value.firstTh = 'กรุณากรอกชื่อภาษาไทย'
    valid = false
  } else if (!/^[ก-๙\s]+$/.test(addForm.value.us_first_name_th)) {
    addErrors.value.firstTh = 'กรุณากรอกเป็นภาษาไทยเท่านั้น'
    valid = false
  }

  // LAST NAME TH
  if (!addForm.value.us_last_name_th.trim()) {
    addErrors.value.lastTh = 'กรุณากรอกนามสกุลภาษาไทย'
    valid = false
  } else if (!/^[ก-๙\s]+$/.test(addForm.value.us_last_name_th)) {
    addErrors.value.lastTh = 'กรุณากรอกเป็นภาษาไทยเท่านั้น'
    valid = false
  }

  // FIRST NAME EN
  if (!addForm.value.us_first_name_en.trim()) {
    addErrors.value.firstEn = 'กรุณากรอกชื่อภาษาอังกฤษ'
    valid = false
  } else if (!/^[A-Za-z\s]+$/.test(addForm.value.us_first_name_en)) {
    addErrors.value.firstEn = 'กรุณากรอกเป็นภาษาอังกฤษเท่านั้น'
    valid = false
  }

  // LAST NAME EN
  if (!addForm.value.us_last_name_en.trim()) {
    addErrors.value.lastEn = 'กรุณากรอกนามสกุลภาษาอังกฤษ'
    valid = false
  } else if (!/^[A-Za-z\s]+$/.test(addForm.value.us_last_name_en)) {
    addErrors.value.lastEn = 'กรุณากรอกเป็นภาษาอังกฤษเท่านั้น'
    valid = false
  }

  // PHONE
  if (!addForm.value.us_phone.trim()) {
    addErrors.value.phone = 'กรุณากรอกเบอร์โทร'
    valid = false
  } else if (!/^[0-9]{9,10}$/.test(addForm.value.us_phone)) {
    addErrors.value.phone = 'เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก'
    valid = false
  }

  // DEPARTMENT
  if (!addForm.value.us_department.trim()) {
    addErrors.value.department = 'กรุณากรอกหน่วยงาน'
    valid = false
  }

  // ROLE
  if (!addForm.value.us_role_id) {
    addErrors.value.role = 'กรุณาเลือกบทบาท'
    valid = false
  }

  // TECH TYPE (technician only)
  if (addForm.value.us_role_id === '2' && !addForm.value.us_tt_id) {
    addErrors.value.techType = 'กรุณาเลือกประเภทช่าง'
    valid = false
  }

  return valid
}

function validateEditForm() {
  let valid = true

  editErrors.value = {
    ttn: '',
    firstTh: '',
    lastTh: '',
    firstEn: '',
    lastEn: '',
    phone: '',
    department: '',
    role: '',
    techType: '',
  }

  // TITLE
  if (!editForm.value.us_ttn_id) {
    editErrors.value.ttn = 'กรุณาเลือกคำนำหน้า'
    valid = false
  }

  // FIRST NAME TH
  if (!editForm.value.us_first_name_th.trim()) {
    editErrors.value.firstTh = 'กรุณากรอกชื่อภาษาไทย'
    valid = false
  } else if (!/^[ก-๙\s]+$/.test(editForm.value.us_first_name_th)) {
    editErrors.value.firstTh = 'กรุณากรอกเป็นภาษาไทยเท่านั้น'
    valid = false
  }

  // LAST NAME TH
  if (!editForm.value.us_last_name_th.trim()) {
    editErrors.value.lastTh = 'กรุณากรอกนามสกุลภาษาไทย'
    valid = false
  } else if (!/^[ก-๙\s]+$/.test(editForm.value.us_last_name_th)) {
    editErrors.value.lastTh = 'กรุณากรอกเป็นภาษาไทยเท่านั้น'
    valid = false
  }

  // FIRST NAME EN
  if (!editForm.value.us_first_name_en.trim()) {
    editErrors.value.firstEn = 'กรุณากรอกชื่อภาษาอังกฤษ'
    valid = false
  } else if (!/^[A-Za-z\s]+$/.test(editForm.value.us_first_name_en)) {
    editErrors.value.firstEn = 'กรุณากรอกเป็นภาษาอังกฤษเท่านั้น'
    valid = false
  }

  // LAST NAME EN
  if (!editForm.value.us_last_name_en.trim()) {
    editErrors.value.lastEn = 'กรุณากรอกนามสกุลภาษาอังกฤษ'
    valid = false
  } else if (!/^[A-Za-z\s]+$/.test(editForm.value.us_last_name_en)) {
    editErrors.value.lastEn = 'กรุณากรอกเป็นภาษาอังกฤษเท่านั้น'
    valid = false
  }

  // PHONE
  if (!editForm.value.us_phone.trim()) {
    editErrors.value.phone = 'กรุณากรอกเบอร์โทร'
    valid = false
  } else if (!/^[0-9]{9,10}$/.test(editForm.value.us_phone)) {
    editErrors.value.phone = 'เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก'
    valid = false
  }

  // DEPARTMENT
  if (!editForm.value.us_department.trim()) {
    editErrors.value.department = 'กรุณากรอกหน่วยงาน'
    valid = false
  }

  // ROLE
  if (!editForm.value.us_role_id) {
    editErrors.value.role = 'กรุณาเลือกบทบาท'
    valid = false
  }

  // TECH TYPE
  if (
    (editForm.value.us_role_id === '2' || editForm.value.us_role_id === 2) &&
    !editForm.value.us_tt_id
  ) {
    editErrors.value.techType = 'กรุณาเลือกประเภทช่าง'
    valid = false
  }

  return valid
}
</script>

<template>
  <div class="bg-gray-50 rounded-xl p-2 sm:p-4 lg:p-6 mx-auto max-w-7xl">
    <!-- ฟิลเตอร์ -->
    <div class="mb-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-wrap items-center gap-3">
          <!-- ค้นหา -->
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาชื่อผู้ใช้ / หน่วยงาน / บทบาท"
            class="w-full sm:w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
          />

          <!-- ฟิลเตอร์บทบาท -->
          <div class="relative">
            <button
              @click.stop="showRoleFilter = !showRoleFilter"
              class="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700"
            >
              บทบาท
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200"
                :class="{ 'rotate-180': showRoleFilter }"
              />
            </button>
            <div
              v-if="showRoleFilter"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10"
            >
              <label
                v-for="role in ['ADMIN', 'TECHNICIAN', 'STOCK', 'MANAGER', 'USER']"
                :key="role"
                class="flex items-center py-1"
              >
                <input
                  type="checkbox"
                  :value="role"
                  v-model="selectedRoles"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">{{ role }}</span>
              </label>
            </div>
          </div>

          <!-- ฟิลเตอร์ตำแหน่ง -->
          <div class="relative">
            <button
              @click.stop="showTechFilter = !showTechFilter"
              class="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700"
            >
              ตำแหน่ง
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200"
                :class="{ 'rotate-180': showTechFilter }"
              />
            </button>
            <div
              v-if="showTechFilter"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10"
            >
              <label
                v-for="t in ['ไฟฟ้า', 'ประปา', 'ช่างทั่วไป']"
                :key="t"
                class="flex items-center py-1"
              >
                <input
                  type="checkbox"
                  :value="t"
                  v-model="selectedTechTypes"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">{{ t }}</span>
              </label>
            </div>
          </div>

          <!-- ล้างตัวกรอง -->
          <button
            v-if="selectedRoles.length || selectedTechTypes.length"
            @click="clearFilters"
            class="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ล้างตัวกรอง
          </button>
        </div>

        <!-- ปุ่มเพิ่ม -->
        <button
          @click="openAddModal"
          class="inline-flex items-center justify-center sm:justify-start w-full sm:w-auto h-10 px-4 rounded-lg bg-[#1E48D1] hover:bg-[#1539a9] text-white font-medium shadow-sm transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m7-7H5" />
          </svg>
          เพิ่มผู้ใช้
        </button>
      </div>
    </div>

    <!-- ตาราง -->
    <div class="bg-white rounded-xl shadow-md p-4 sm:p-6 lg:p-8 mx-auto max-w-7xl">
      <h1 class="text-lg sm:text-xl font-bold text-black mb-3">จัดการผู้ใช้งานระบบ</h1>

      <div class="-mx-2 sm:mx-0 overflow-x-auto">
        <TableComponent
          :columns="columns"
          :rows="
            filteredRows.map((u) => [
              u.fullNameTh,
              u.username,
              u.role,
              u.department,
              u.technicianType,
              'actions',
            ])
          "
          :perPage="10"
          mode="full"
          @detail="(username) => openViewModal(username)"
          @edit="(username) => openEditModal(username)"
          @delete="confirmDelete"
        />
      </div>
    </div>

    <!-- 🔵 View User Modal (เหมือน Edit เป๊ะ แต่ disabled ทั้งหมด) -->
    <div
      v-if="showViewModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0"
      @click.self="closeViewModal"
    >
      <div
        class="bg-white rounded-lg p-4 sm:p-6 md:p-8 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <!-- Header with icon -->
        <div class="flex items-center gap-3 mb-6">
          <div class="bg-blue-100 p-3 rounded-full">
            <img src="/icon/user-info.svg" alt="View User" class="w-8 h-8" />
          </div>
          <h2 class="text-xl font-bold text-gray-800">รายละเอียดผู้ใช้งาน</h2>
        </div>

        <p class="text-gray-600 text-sm mb-6">แสดงข้อมูลผู้ใช้ในระบบ (ไม่สามารถแก้ไขได้)</p>

        <form>
          <!-- ชื่อผู้ใช้ -->
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1.5"> ชื่อผู้ใช้ </label>
            <input
              v-model="viewForm.us_user_name"
              type="text"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>

          <!-- คำนำหน้า -->
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1.5"> คำนำหน้าชื่อ </label>
            <select
              v-model="viewForm.us_ttn_id"
              disabled
              class="w-full px-3 py-2 border rounded-md appearance-none bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300"
            >
              <option value="" disabled>เลือกคำนำหน้า</option>
              <option value="1">นาย</option>
              <option value="2">นาง</option>
              <option value="3">นางสาว</option>
              <option value="4">อื่นๆ</option>
            </select>
          </div>

          <!-- ชื่อ - นามสกุล (ภาษาไทย) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5"> ชื่อ (ไทย) </label>
              <input
                v-model="viewForm.us_first_name_th"
                type="text"
                disabled
                class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5"> นามสกุล (ไทย) </label>
              <input
                v-model="viewForm.us_last_name_th"
                type="text"
                disabled
                class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>

          <!-- ชื่อ - นามสกุล (ภาษาอังกฤษ) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">ชื่อ (EN)</label>
              <input
                v-model="viewForm.us_first_name_en"
                type="text"
                disabled
                class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">นามสกุล (EN)</label>
              <input
                v-model="viewForm.us_last_name_en"
                type="text"
                disabled
                class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>

          <!-- เบอร์โทร และ หน่วยงาน -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">เบอร์โทร</label>
              <input
                v-model="viewForm.us_phone"
                type="tel"
                disabled
                class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">หน่วยงาน</label>
              <input
                v-model="viewForm.us_department"
                type="text"
                disabled
                class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>

          <!-- บทบาท - ตำแหน่งช่าง (เหมือน Edit แต่ disabled) -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">บทบาท</label>
              <select
                v-model="viewForm.us_role_id"
                disabled
                class="w-full px-3 py-2 border rounded-md appearance-none bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300"
              >
                <option value="" disabled>เลือกบทบาท</option>
                <option value="1">ADMIN</option>
                <option value="2">TECHNICIAN</option>
                <option value="3">STOCK</option>
                <option value="4">MANAGER</option>
                <option value="5">USER</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">ตำแหน่งช่าง</label>
              <select
                v-model="viewForm.us_tt_id"
                disabled
                class="w-full px-3 py-2 border rounded-md appearance-none bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300"
              >
                <option value="">ไม่ระบุ</option>
                <option value="1">ไฟฟ้า</option>
                <option value="2">ประปา</option>
              </select>
            </div>
          </div>

          <!-- ปุ่มปิด -->
          <div class="flex justify-end mt-6">
            <button
              type="button"
              @click="closeViewModal"
              class="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-medium transition"
            >
              ปิด
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 🟢 Modal เพิ่มผู้ใช้งาน -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closeAddModal"
    >
      <div class="bg-white rounded-lg p-8 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <!-- Header with icon -->
        <div class="flex items-center gap-3 mb-6">
          <div class="bg-green-100 p-3 rounded-full">
            <img src="/icon/alert/add-user-icon.svg" alt="Add User" class="w-8 h-8" />
          </div>
          <h2 class="text-xl font-bold text-gray-800">เพิ่มผู้ใช้งาน</h2>
        </div>

        <p class="text-gray-600 text-sm mb-6">กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้ใหม่ในระบบ</p>

        <form @submit.prevent="confirmAddUser">
          <!-- ชื่อผู้ใช้ และ รหัสผ่าน -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <!-- Username -->
            <div>
              <label class="block text-sm font-medium mb-1.5">
                ชื่อผู้ใช้ <span class="text-red-500">*</span>
              </label>

              <input
                v-model="addForm.us_user_name"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addErrors.username ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
                placeholder="กรอกชื่อผู้ใช้"
              />

              <p v-if="addErrors.username" class="text-red-500 text-sm mt-1">
                {{ addErrors.username }}
              </p>
            </div>

            <!-- Password -->
            <div>
              <label class="block text-sm font-medium mb-1.5">
                รหัสผ่าน <span class="text-red-500">*</span>
              </label>

              <input
                v-model="addForm.us_user_pass"
                type="password"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
                placeholder="กรอกรหัสผ่าน"
              />

              <p v-if="addErrors.password" class="text-red-500 text-sm mt-1">
                {{ addErrors.password }}
              </p>
            </div>
          </div>

          <!-- คำนำหน้า -->
          <div>
            <label class="block text-sm font-medium mb-1.5">
              คำนำหน้าชื่อ <span class="text-red-500">*</span>
            </label>

            <select
              v-model="addForm.us_ttn_id"
              :class="[
                'w-full px-3 py-2 border rounded-md bg-white',
                addErrors.ttn ? 'border-red-500 bg-red-50' : 'border-gray-300',
              ]"
            >
              <option value="">เลือกคำนำหน้า</option>
              <option value="1">นาย</option>
              <option value="2">นาง</option>
              <option value="3">นางสาว</option>
              <option value="4">อื่นๆ</option>
            </select>

            <p v-if="addErrors.ttn" class="text-red-500 text-sm mt-1">
              {{ addErrors.ttn }}
            </p>
          </div>

          <!-- ชื่อ - นามสกุล (ภาษาไทย) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm font-medium mb-1.5">
                ชื่อ (ไทย) <span class="text-red-500">*</span>
              </label>

              <input
                v-model="addForm.us_first_name_th"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addErrors.firstTh ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
                placeholder="กรอกชื่อ"
              />

              <p v-if="addErrors.firstTh" class="text-red-500 text-sm mt-1">
                {{ addErrors.firstTh }}
              </p>
            </div>

            <!-- Last Name TH -->
            <div>
              <label class="block text-sm font-medium mb-1.5">
                นามสกุล (ไทย) <span class="text-red-500">*</span>
              </label>

              <input
                v-model="addForm.us_last_name_th"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addErrors.lastTh ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
                placeholder="กรอกนามสกุล"
              />

              <p v-if="addErrors.lastTh" class="text-red-500 text-sm mt-1">
                {{ addErrors.lastTh }}
              </p>
            </div>
          </div>

          <!-- ชื่อ - นามสกุล (ภาษาอังกฤษ) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <!-- First Name EN -->
            <div>
              <label class="block text-sm font-medium mb-1.5">ชื่อ (EN)</label>

              <input
                v-model="addForm.us_first_name_en"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addErrors.firstEn ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
                placeholder="First Name"
              />

              <p v-if="addErrors.firstEn" class="text-red-500 text-sm mt-1">
                {{ addErrors.firstEn }}
              </p>
            </div>

            <!-- Last Name EN -->
            <div>
              <label class="block text-sm font-medium mb-1.5">นามสกุล (EN)</label>

              <input
                v-model="addForm.us_last_name_en"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addErrors.lastEn ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
                placeholder="Last Name"
              />

              <p v-if="addErrors.lastEn" class="text-red-500 text-sm mt-1">
                {{ addErrors.lastEn }}
              </p>
            </div>
          </div>

          <!-- เบอร์โทร และ หน่วยงาน -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm font-medium mb-1.5">เบอร์โทร</label>

              <input
                v-model="addForm.us_phone"
                type="tel"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addErrors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
                placeholder="กรอกเบอร์โทร"
              />

              <p v-if="addErrors.phone" class="text-red-500 text-sm mt-1">
                {{ addErrors.phone }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1.5">
                หน่วยงาน <span class="text-red-500">*</span>
              </label>

              <input
                v-model="addForm.us_department"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addErrors.department ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
                placeholder="กรอกหน่วยงาน"
              />

              <p v-if="addErrors.department" class="text-red-500 text-sm mt-1">
                {{ addErrors.department }}
              </p>
            </div>
          </div>

          <!-- บทบาท - ตำแหน่งช่าง -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label class="block text-sm font-medium mb-1.5">
                บทบาท <span class="text-red-500">*</span>
              </label>

              <select
                v-model="addForm.us_role_id"
                @change="handleAddRoleChange"
                :class="[
                  'w-full px-3 py-2 border rounded-md bg-white',
                  addErrors.role ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
              >
                <option value="">เลือกบทบาท</option>
                <option value="1">Admin</option>
                <option value="2">Technician</option>
                <option value="3">Stock</option>
                <option value="4">Manager</option>
                <option value="5">User</option>
              </select>

              <p v-if="addErrors.role" class="text-red-500 text-sm mt-1">
                {{ addErrors.role }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1.5">
                ตำแหน่งช่าง
                <span v-if="addForm.us_role_id === '2'" class="text-red-500">*</span>
              </label>

              <select
                v-model="addForm.us_tt_id"
                :disabled="addForm.us_role_id !== '2'"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addForm.us_role_id === '2'
                    ? addErrors.techType
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200',
                ]"
              >
                <option value="">
                  {{ addForm.us_role_id === '2' ? 'เลือกตำแหน่ง' : 'ไม่ระบุ' }}
                </option>
                <option value="1">ไฟฟ้า</option>
                <option value="2">ประปา</option>
              </select>

              <p v-if="addErrors.techType" class="text-red-500 text-sm mt-1">
                {{ addErrors.techType }}
              </p>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              @click="closeAddModal"
              class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors font-medium"
            >
              เพิ่มผู้ใช้
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closeEditModal"
    >
      <div class="bg-white rounded-lg p-8 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <!-- Header with icon -->
        <div class="flex items-center gap-3 mb-6">
          <div class="bg-orange-100 p-3 rounded-full">
            <img src="/icon/alert/edit-user-icon.svg" alt="Edit User" class="w-8 h-8" />
          </div>
          <h2 class="text-xl font-bold text-gray-800">แก้ไขข้อมูลผู้ใช้</h2>
        </div>

        <p class="text-gray-600 text-sm mb-6">คุณต้องการบันทึกการแก้ไขข้อมูลผู้ใช้หรือไม่</p>

        <form @submit.prevent="confirmEditUser">
          <!-- ชื่อผู้ใช้ -->
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              ชื่อผู้ใช้ <span class="text-red-500">*</span>
            </label>
            <input
              v-model="editForm.us_user_name"
              type="text"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          <!-- คำนำหน้า -->
          <div>
            <label class="block text-sm font-medium mb-1.5">
              คำนำหน้าชื่อ <span class="text-red-500">*</span>
            </label>

            <select
              v-model="editForm.us_ttn_id"
              :class="[
                'w-full px-3 py-2 border rounded-md bg-white',
                editErrors.ttn ? 'border-red-500 bg-red-50' : 'border-gray-300',
              ]"
            >
              <option value="">เลือกคำนำหน้า</option>
              <option value="1">นาย</option>
              <option value="2">นาง</option>
              <option value="3">นางสาว</option>
              <option value="4">อื่นๆ</option>
            </select>

            <p v-if="editErrors.ttn" class="text-red-500 text-sm mt-1">
              {{ editErrors.ttn }}
            </p>
          </div>

          <!-- ชื่อ - นามสกุล (ภาษาไทย) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <!-- First Name TH -->
            <div>
              <label class="block text-sm font-medium mb-1.5">
                ชื่อ (ไทย) <span class="text-red-500">*</span>
              </label>

              <input
                v-model="editForm.us_first_name_th"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  editErrors.firstTh ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
                placeholder="กรอกชื่อ"
              />

              <p v-if="editErrors.firstTh" class="text-red-500 text-sm mt-1">
                {{ editErrors.firstTh }}
              </p>
            </div>

            <!-- Last Name TH -->
            <div>
              <label class="block text-sm font-medium mb-1.5">
                นามสกุล (ไทย) <span class="text-red-500">*</span>
              </label>

              <input
                v-model="editForm.us_last_name_th"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  editErrors.lastTh ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
                placeholder="กรอกนามสกุล"
              />

              <p v-if="editErrors.lastTh" class="text-red-500 text-sm mt-1">
                {{ editErrors.lastTh }}
              </p>
            </div>
          </div>

          <!-- ชื่อ - นามสกุล (ภาษาอังกฤษ) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <!-- First Name EN -->
            <div>
              <label class="block text-sm font-medium mb-1.5">ชื่อ (EN)</label>

              <input
                v-model="editForm.us_first_name_en"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  editErrors.firstEn ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
                placeholder="First Name"
              />

              <p v-if="editErrors.firstEn" class="text-red-500 text-sm mt-1">
                {{ editErrors.firstEn }}
              </p>
            </div>

            <!-- Last Name EN -->
            <div>
              <label class="block text-sm font-medium mb-1.5">นามสกุล (EN)</label>

              <input
                v-model="editForm.us_last_name_en"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  editErrors.lastEn ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
                placeholder="Last Name"
              />

              <p v-if="editErrors.lastEn" class="text-red-500 text-sm mt-1">
                {{ editErrors.lastEn }}
              </p>
            </div>
          </div>

          <!-- เบอร์โทร และ หน่วยงาน -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm font-medium mb-1.5">เบอร์โทร</label>

              <input
                v-model="editForm.us_phone"
                type="tel"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  editErrors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
                placeholder="กรอกเบอร์โทร"
              />

              <p v-if="editErrors.phone" class="text-red-500 text-sm mt-1">
                {{ editErrors.phone }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1.5">
                หน่วยงาน <span class="text-red-500">*</span>
              </label>

              <input
                v-model="editForm.us_department"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  editErrors.department ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
                placeholder="กรอกหน่วยงาน"
              />

              <p v-if="editErrors.department" class="text-red-500 text-sm mt-1">
                {{ editErrors.department }}
              </p>
            </div>
          </div>

          <!-- บทบาท - ตำแหน่งช่าง (แถวเดียวกัน) -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label class="block text-sm font-medium mb-1.5">
                บทบาท <span class="text-red-500">*</span>
              </label>

              <select
                v-model="editForm.us_role_id"
                @change="handleAddRoleChange"
                :class="[
                  'w-full px-3 py-2 border rounded-md bg-white',
                  editErrors.role ? 'border-red-500 bg-red-50' : 'border-gray-300',
                ]"
              >
                <option value="">เลือกบทบาท</option>
                <option value="1">Admin</option>
                <option value="2">Technician</option>
                <option value="3">Stock</option>
                <option value="4">Manager</option>
                <option value="5">User</option>
              </select>

              <p v-if="editErrors.role" class="text-red-500 text-sm mt-1">
                {{ editErrors.role }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1.5">
                ตำแหน่งช่าง
                <span v-if="editForm.us_role_id === '2'" class="text-red-500">*</span>
              </label>

              <select
                v-model="editForm.us_tt_id"
                :disabled="editForm.us_role_id !== '2'"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  editForm.us_role_id === '2'
                    ? editErrors.techType
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200',
                ]"
              >
                <option value="">
                  {{ editForm.us_role_id === '2' ? 'เลือกตำแหน่ง' : 'ไม่ระบุ' }}
                </option>
                <option value="1">ไฟฟ้า</option>
                <option value="2">ประปา</option>
              </select>

              <p v-if="editErrors.techType" class="text-red-500 text-sm mt-1">
                {{ editErrors.techType }}
              </p>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3">
            <button
              type="button"
              @click="closeEditModal"
              class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors font-medium"
            >
              บันทึกการแก้ไข
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none;
}
.btn-cancel {
  @apply px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50;
}
.btn-primary {
  @apply px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white;
}
</style>
