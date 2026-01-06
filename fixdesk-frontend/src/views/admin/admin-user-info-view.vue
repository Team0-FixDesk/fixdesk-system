<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import TableComponent from '@/components/table-component.vue'
import TableActions from '@/components/table-actions-component.vue'

import Sweetalert from 'sweetalert2'

import { usePhoneFormat } from '@/composables/usePhoneFormat'
const { toRaw, toDisplay} = usePhoneFormat()

defineOptions({ name: 'AdminUserInfoView' })
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// Build authorization headers for API requests สร้าง Authorization Header สำหรับเรียก API
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

const columns = ['ชื่อ-นามสกุล', 'ชื่อผู้ใช้', 'หน่วยงาน', 'บทบาท', 'ตำแหน่ง', 'ตัวดำเนินการ']
const rows = ref([])
const searchQuery = ref('')
const selectedRoles = ref([])
const selectedTechTypes = ref([])
const showRoleFilter = ref(false)
const showTechFilter = ref(false)
const userIdByUsername = ref({})
const openMenuId = ref(null)

async function fetchUsers() {
  try {
    const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() })
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')
    }

    // map rows หลักจากข้อมูลผู้ใช้
    rows.value = data.map((user) => ({
      fullNameTh: `${user.us_first_name_th || ''} ${user.us_last_name_th || ''}`.trim(),
      fullNameEn: `${user.us_first_name_en || ''} ${user.us_last_name_en || ''}`.trim(),
      username: user.us_user_name || '-',
      department: user.us_department || '-',
      role: user.role_name || '-', // จาก DB
      technicianType: user.technician_type || '-', // จาก DB
      raw: {
        ...user,
        us_phone: toDisplay(user.us_phone),
      },
    }))

    // สร้าง map username → id
    const map = {}
    for (const user of data) {
      if (user.us_user_name && user.us_id != null) {
        map[user.us_user_name] = user.us_id
      }
    }
    userIdByUsername.value = map

    // สร้างตัวเลือกฟิลเตอร์จากข้อมูลจริงใน DB
    const roleSet = new Set()

    for (const user of data) {
      if (user.role_name) roleSet.add(user.role_name)
    }
    roleFilterOptions.value = Array.from(roleSet)
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
    // Toast notification
    const Toast = Sweetalert.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
    Toast.fire({
      title: 'ผิดพลาด',
      text: 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้',
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}

// Global toast ใช้ได้ทุกที่
const toast = Sweetalert.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})


//ฟิลเตอร์
const roleFilterOptions = ref([]) // list บทบาททั้งหมดจาก DB
const technicianFilterOptions = ref([]) // list ตำแหน่งช่างทั้งหมดจาก DB

const filteredRows = computed(() => {
  return rows.value.filter((r) => {
    const keyword = searchQuery.value.toLowerCase()

    const matchSearch =
      r.fullNameTh.toLowerCase().includes(keyword) ||
      r.fullNameEn.toLowerCase().includes(keyword) ||
      r.username.toLowerCase().includes(keyword) ||
      r.department.toLowerCase().includes(keyword)

    const matchesRoleFilter =
      selectedRoles.value.length === 0 || selectedRoles.value.includes(r.role)

    const matchesTechnicianFilter =
      selectedTechTypes.value.length === 0 || selectedTechTypes.value.includes(r.technicianType)

    return matchSearch && matchesRoleFilter && matchesTechnicianFilter
  })
})

function toggleRoleFilter() {
  showRoleFilter.value = !showRoleFilter.value
  if (showRoleFilter.value) {
    showTechFilter.value = false // ปิด Tech ถ้าเปิด Role
  }
}

function toggleTechFilter() {
  showTechFilter.value = !showTechFilter.value
  if (showTechFilter.value) {
    showRoleFilter.value = false // ปิด Role ถ้าเปิด Tech
  }
}

function clearFilters() {
  selectedRoles.value = []
  selectedTechTypes.value = []
}

// function ปิด dropdown เมื่อคลิกรอบนอก
function closeDropdown(event) {
  if (!event.target.closest('.relative')) {
    showRoleFilter.value = false
    showTechFilter.value = false
  }
}

onMounted(() => {
  fetchUsers()
  fetchMasterData()
  document.addEventListener('click', closeDropdown)
})
onBeforeUnmount(() => document.removeEventListener('click', closeDropdown))

// ตัวแปรและฟังก์ชันสำหรับดูข้อมูลผู้ใช้
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

    const data = { ...row.raw }
    data.us_phone = toDisplay(data.us_phone)
    Object.assign(viewForm.value, data)
    showViewModal.value = true
  } catch (err) {
    // Toast notification
    const Toast = Sweetalert.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
    Toast.fire({
      title: 'ผิดพลาด',
      text: err.message,
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}

function closeViewModal() {
  showViewModal.value = false
}

// ตัวแปรและฟังก์ชันสำหรับเพิ่มผู้ใช้
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
  const result = await Sweetalert.fire({
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
        us_phone: toRaw(addForm.value.us_phone),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'เพิ่มผู้ใช้ไม่สำเร็จ')

    const toast = Sweetalert.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
    toast.fire({
      icon: 'success',
      title: 'เพิ่มผู้ใช้เรียบร้อยแล้ว',
      background: '#f0f9ff',
      color: '#1e3a8a',
    })
    showAddModal.value = false
    await fetchUsers()
  } catch (err) {
    toast.fire({
      icon: 'error',
      title: err.message || 'ไม่สามารถเพิ่มผู้ใช้ได้',
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}

// ตัวแปรและฟังก์ชันสำหรับแก้ไขผู้ใช้
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
    const data = { ...row.raw }
    data.us_phone = toDisplay(data.us_phone)
    Object.assign(editForm.value, data)
    showEditModal.value = true
  } catch (err) {
    // Toast notification
    const Toast = Sweetalert.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
    Toast.fire({
      title: 'ผิดพลาด',
      text: err.message,
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}

function closeEditModal() {
  showEditModal.value = false
}

async function confirmEditUser() {
  if (!validateEditForm()) return
  const result = await Sweetalert.fire({
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
        us_phone: toRaw(editForm.value.us_phone),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'อัปเดตไม่สำเร็จ')

    const toast = Sweetalert.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
    toast.fire({
      icon: 'success',
      title: 'แก้ไขข้อมูลผู้ใช้เรียบร้อยแล้ว',
      background: '#f0f9ff',
      color: '#1e3a8a',
    })
    showEditModal.value = false
    await fetchUsers()
  } catch (err) {
    toast.fire({
      icon: 'error',
      title: err.message || 'ไม่สามารถแก้ไขข้อมูลผู้ใช้ได้',
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}

// ตัวแปรและฟังก์ชันสำหรับลบผู้ใช้
async function confirmDelete(username) {
  const result = await Sweetalert.fire({
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
    } catch {
      const txt = await res.text()
      message = txt && txt.trim().startsWith('<') ? 'ปลายทางส่งกลับเป็น HTML' : txt
    }
    if (!res.ok) {
      throw new Error(message || `ลบไม่สำเร็จ (HTTP ${res.status})`)
    }
    const toast = Sweetalert.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
    toast.fire({
      icon: 'success',
      title: 'ลบผู้ใช้เรียบร้อยแล้ว',
      background: '#f0f9ff',
      color: '#1e3a8a',
    })
    await fetchUsers()
  } catch (err) {
    toast.fire({
      icon: 'error',
      title: err.message || 'ไม่สามารถลบผู้ใช้ได้',
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}

function handleAddRoleChange() {
  if (addForm.value.us_role_id !== '2') {
    addForm.value.us_tt_id = ''
  }
}

//function สำหรับ edit form
function handleEditRoleChange() {
  // ถ้าไม่ใช่ช่าง (role_id !== '2') ให้ล้างค่าตำแหน่งช่าง
  if (editForm.value.us_role_id !== '2' && editForm.value.us_role_id !== 2) {
    editForm.value.us_tt_id = ''
  }
}

// ตัวแปรและ validation สำหรับตรวจสอบความถูกต้องของ input ในฟอร์มเพิ่มผู้ใช้
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

  // ชื่อผู้ใช้งาน
  if (!addForm.value.us_user_name.trim()) {
    addErrors.value.username = 'กรุณากรอกชื่อผู้ใช้'
    valid = false
  }
  // รหัสผ่าน
  if (!addForm.value.us_user_pass.trim()) {
    addErrors.value.password = 'กรุณากรอกรหัสผ่าน'
    valid = false
  }
  // คำนำหน้า
  if (!addForm.value.us_ttn_id) {
    addErrors.value.ttn = 'กรุณาเลือกคำนำหน้า'
    valid = false
  }
  // ชื่อภาษาไทย
  if (!addForm.value.us_first_name_th.trim()) {
    addErrors.value.firstTh = 'กรุณากรอกชื่อภาษาไทย'
    valid = false
  } else if (!/^[ก-๙\s]+$/.test(addForm.value.us_first_name_th)) {
    addErrors.value.firstTh = 'กรุณากรอกเป็นภาษาไทยเท่านั้น'
    valid = false
  }
  // นามสกุลภาษาไทย
  if (!addForm.value.us_last_name_th.trim()) {
    addErrors.value.lastTh = 'กรุณากรอกนามสกุลภาษาไทย'
    valid = false
  } else if (!/^[ก-๙\s]+$/.test(addForm.value.us_last_name_th)) {
    addErrors.value.lastTh = 'กรุณากรอกเป็นภาษาไทยเท่านั้น'
    valid = false
  }
  // ชื่อภาษาอังกฤษ
  if (!addForm.value.us_first_name_en.trim()) {
    addErrors.value.firstEn = 'กรุณากรอกชื่อภาษาอังกฤษ'
    valid = false
  } else if (!/^[A-Za-z\s]+$/.test(addForm.value.us_first_name_en)) {
    addErrors.value.firstEn = 'กรุณากรอกเป็นภาษาอังกฤษเท่านั้น'
    valid = false
  }
  // นามสกุลภาษาอังกฤษ
  if (!addForm.value.us_last_name_en.trim()) {
    addErrors.value.lastEn = 'กรุณากรอกนามสกุลภาษาอังกฤษ'
    valid = false
  } else if (!/^[A-Za-z\s]+$/.test(addForm.value.us_last_name_en)) {
    addErrors.value.lastEn = 'กรุณากรอกเป็นภาษาอังกฤษเท่านั้น'
    valid = false
  }
  // เบอร์โทรศัพท์
  if (!addForm.value.us_phone.trim()) {
    addErrors.value.phone = 'กรุณากรอกเบอร์โทร'
    valid = false
  } else if (!/^[0-9]{9,10}$/.test(toRaw(addForm.value.us_phone))) {
    addErrors.value.phone = 'เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก'
    valid = false
  }
  // หน่วยงาน
  if (!addForm.value.us_department.trim()) {
    addErrors.value.department = 'กรุณากรอกหน่วยงาน'
    valid = false
  }
  // บทบาท
  if (!addForm.value.us_role_id) {
    addErrors.value.role = 'กรุณาเลือกบทบาท'
    valid = false
  }
  // ประเภทช่าง (เฉพาะเลือกบทบาทช่าง)
  if (addForm.value.us_role_id === '2' && !addForm.value.us_tt_id) {
    addErrors.value.techType = 'กรุณาเลือกประเภทช่าง'
    valid = false
  }
  return valid
}

// ตัวแปรและ validation สำหรับตรวจสอบความถูกต้องของ input ในฟอร์มแก้ไขข้อมูลผู้ใช้
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
  // คำนำหน้า
  if (!editForm.value.us_ttn_id) {
    editErrors.value.ttn = 'กรุณาเลือกคำนำหน้า'
    valid = false
  }
  // ชื่อภาษาไทย
  if (!editForm.value.us_first_name_th.trim()) {
    editErrors.value.firstTh = 'กรุณากรอกชื่อภาษาไทย'
    valid = false
  } else if (!/^[ก-๙\s]+$/.test(editForm.value.us_first_name_th)) {
    editErrors.value.firstTh = 'กรุณากรอกเป็นภาษาไทยเท่านั้น'
    valid = false
  }
  // นามกสุกลภาษาไทย
  if (!editForm.value.us_last_name_th.trim()) {
    editErrors.value.lastTh = 'กรุณากรอกนามสกุลภาษาไทย'
    valid = false
  } else if (!/^[ก-๙\s]+$/.test(editForm.value.us_last_name_th)) {
    editErrors.value.lastTh = 'กรุณากรอกเป็นภาษาไทยเท่านั้น'
    valid = false
  }
  // ชื่อภาษาอังกฤษ
  if (!editForm.value.us_first_name_en.trim()) {
    editErrors.value.firstEn = 'กรุณากรอกชื่อภาษาอังกฤษ'
    valid = false
  } else if (!/^[A-Za-z\s]+$/.test(editForm.value.us_first_name_en)) {
    editErrors.value.firstEn = 'กรุณากรอกเป็นภาษาอังกฤษเท่านั้น'
    valid = false
  }

  // นามสกุลภาษาอังกฤษ
  if (!editForm.value.us_last_name_en.trim()) {
    editErrors.value.lastEn = 'กรุณากรอกนามสกุลภาษาอังกฤษ'
    valid = false
  } else if (!/^[A-Za-z\s]+$/.test(editForm.value.us_last_name_en)) {
    editErrors.value.lastEn = 'กรุณากรอกเป็นภาษาอังกฤษเท่านั้น'
    valid = false
  }
  // เบอร์โทรศัพท์
  if (!editForm.value.us_phone.trim()) {
    editErrors.value.phone = 'กรุณากรอกเบอร์โทร'
    valid = false
  } else if (!/^[0-9]{9,10}$/.test(toRaw(editForm.value.us_phone))) {
    editErrors.value.phone = 'เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก'
    valid = false
  }
  // หน่วยงาน
  if (!editForm.value.us_department.trim()) {
    editErrors.value.department = 'กรุณากรอกหน่วยงาน'
    valid = false
  }
  // บทบาท
  if (!editForm.value.us_role_id) {
    editErrors.value.role = 'กรุณาเลือกบทบาท'
    valid = false
  }
  // ประเภทช่าง (เมื่อเปลี่ยนมาเลือกบทบาทช่าง)
  if (
    (editForm.value.us_role_id === '2' || editForm.value.us_role_id === 2) &&
    !editForm.value.us_tt_id
  ) {
    editErrors.value.techType = 'กรุณาเลือกประเภทช่าง'
    valid = false
  }
  return valid
}

const titleOptions = ref([]) // คำนำหน้า
const roleOptions = ref([]) // บทบาทผู้ใช้
const technicianOptions = ref([]) // ประเภทช่าง

async function fetchMasterData() {
  try {
    // ดึงพร้อมกัน 3 endpoint เลย (ถ้ามีพร้อม)
    const [resTitles, resRoles, resTechs] = await Promise.all([
      fetch(`${API_BASE}/titles`, { headers: getAuthHeaders() }), // เช่น ตาราง us_title_name
      fetch(`${API_BASE}/roles`, { headers: getAuthHeaders() }), // เช่น ตาราง us_roles
      fetch(`${API_BASE}/technician-types`, { headers: getAuthHeaders() }), // เช่น ตาราง technician_types
    ])

    const [titlesData, rolesData, techData] = await Promise.all([
      resTitles.json(),
      resRoles.json(),
      resTechs.json(),
    ])

    // map titles จาก DB → options
    titleOptions.value = [
      { value: '', label: 'เลือกคำนำหน้า', disabled: true },
      ...titlesData.map((title) => ({
        value: String(title.ttn_id),
        label: title.ttn_name_th,
        disabled: false,
      })),
    ]

    // map roles จาก DB → options
    roleOptions.value = rolesData.map((role) => ({
      value: String(role.role_id), // ใช้กับ us_role_id ใน form
      code: role.role_name, // ใช้โชว์ใน filter เช่น 'ADMIN'
      label: role.role_label_th || role.role_name,
    }))

    // map technician types จาก DB → options
    technicianOptions.value = [
      { value: '', label: 'ไม่ระบุ' },
      ...techData.map((tech) => ({
        value: String(tech.tt_id),
        label: tech.tt_name,
      })),
    ]
    technicianFilterOptions.value = techData.map((tech) => tech.tt_name)
    manageTechList.value = techData.map((t) => ({
      id: t.tt_id,
      name: t.tt_name,
    }))
  } catch (err) {
    console.error('โหลดข้อมูล master data ไม่สำเร็จ:', err)
    // Toast notification
    const Toast = Sweetalert.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
    Toast.fire({
      title: 'ผิดพลาด',
      text: 'ไม่สามารถโหลดข้อมูลคำนำหน้า/บทบาท/ประเภทช่างได้',
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}

const showManageTechModal = ref(false)
const manageTechList = ref([])

function openManageTechModal() {
  showManageTechModal.value = true
}
function closeManageTechModal() {
  showManageTechModal.value = false
}

async function handleAddTechType() {
  const { value: name } = await Sweetalert.fire({
    title: 'เพิ่มตำแหน่งช่าง',
    input: 'text',
    inputLabel: 'ชื่อตำแหน่งช่าง',
    inputPlaceholder: 'เช่น ช่างระบบไฟฟ้า',
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    inputValidator: (value) => {
      if (!value || !value.trim()) return 'กรุณากรอกชื่อตำแหน่งช่าง'
      return null
    },
  })
  if (!name) return

  try {
    const res = await fetch(`${API_BASE}/technician-types`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tt_name: name.trim() }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'เพิ่มตำแหน่งช่างไม่สำเร็จ')

    // Toast notification
    const Toast = Sweetalert.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Sweetalert.stopTimer)
        toast.addEventListener('mouseleave', Sweetalert.resumeTimer)
      },
    })
    await Toast.fire({
      title: 'สำเร็จ',
      text: 'เพิ่มตำแหน่งช่างเรียบร้อยแล้ว',
      icon: 'success',
      background: '#f0f9ff',
      color: '#1e3a8a',
    })
    await fetchMasterData()
    await fetchUsers()
  } catch (err) {
    // Toast notification
    const Toast = Sweetalert.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
    Toast.fire({
      title: 'ผิดพลาด',
      text: err.message || 'ไม่สามารถเพิ่มตำแหน่งช่างได้',
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}

async function handleEditTechType(item) {
  const { value: name } = await Sweetalert.fire({
    title: 'แก้ไขตำแหน่งช่าง',
    input: 'text',
    inputLabel: 'ชื่อตำแหน่งช่าง',
    inputValue: item.name,
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    inputValidator: (value) => {
      if (!value || !value.trim()) return 'กรุณากรอกชื่อตำแหน่งช่าง'
      return null
    },
  })
  if (!name) return

  try {
    const res = await fetch(`${API_BASE}/technician-types/${item.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tt_name: name.trim() }),
      us_phone: toRaw(addForm.value.us_phone),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'แก้ไขตำแหน่งช่างไม่สำเร็จ')

    // Toast notification
    const Toast = Sweetalert.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Sweetalert.stopTimer)
        toast.addEventListener('mouseleave', Sweetalert.resumeTimer)
      },
    })
    await Toast.fire({
      title: 'สำเร็จ',
      text: 'แก้ไขตำแหน่งช่างเรียบร้อยแล้ว',
      icon: 'success',
      background: '#f0f9ff',
      color: '#1e3a8a',
    })
    await fetchMasterData()
    await fetchUsers()
  } catch (err) {
    // Toast notification
    const Toast = Sweetalert.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
    Toast.fire({
      title: 'ผิดพลาด',
      text: err.message || 'ไม่สามารถแก้ไขตำแหน่งช่างได้',
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}

async function handleDeleteTechType(item) {
  const result = await Sweetalert.fire({
    title: 'ยืนยันการลบ?',
    text: `ต้องการลบ "${item.name}" หรือไม่`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ลบ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#dc2626',
  })
  if (!result.isConfirmed) return

  try {
    const res = await fetch(`${API_BASE}/technician-types/${item.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'ลบตำแหน่งช่างไม่สำเร็จ')

    // Toast notification
    const Toast = Sweetalert.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Sweetalert.stopTimer)
        toast.addEventListener('mouseleave', Sweetalert.resumeTimer)
      },
    })
    await Toast.fire({
      title: 'สำเร็จ',
      text: 'ลบตำแหน่งช่างเรียบร้อยแล้ว',
      icon: 'success',
      background: '#f0f9ff',
      color: '#1e3a8a',
    })
    await fetchMasterData()
    await fetchUsers()
  } catch (err) {
    // Toast notification
    const Toast = Sweetalert.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
    Toast.fire({
      title: 'ผิดพลาด',
      text: err.message || 'ไม่สามารถลบตำแหน่งช่างได้',
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}
</script>

<template>
  <!-- ตาราง -->
  <div class="bg-white bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-lg sm:text-xl font-bold text-black mb-6">จัดการผู้ใช้งานระบบ</h1>
    <!-- ฟิลเตอร์ -->
    <div class="mb-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
        <div class="flex flex-wrap items-center gap-3">
          <!-- ค้นหา -->
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาชื่อผู้ใช้ / หน่วยงาน / บทบาท"
            class="w-full sm:w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 text-gray-700"
          />
          <!-- ฟิลเตอร์บทบาท -->
          <div class="relative">
            <button
              @click.stop="toggleRoleFilter"
              class="h-10 flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700"
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
              <label v-for="role in roleFilterOptions" :key="role" class="flex items-center py-1">
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
              @click.stop="toggleTechFilter"
              class="h-10 flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700"
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
              class="absolute mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10"
            >
              <div class="max-h-56 overflow-y-auto">
                <label v-for="t in technicianFilterOptions" :key="t" class="flex items-center py-1">
                  <input
                    type="checkbox"
                    :value="t"
                    v-model="selectedTechTypes"
                    class="w-4 h-4 text-blue-600 border-gray-300"
                  />
                  <span class="ml-2">{{ t }}</span>
                </label>
              </div>

              <div class="mt-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  @click.stop="openManageTechModal"
                  class="w-full flex items-center justify-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <img src="/icon/plus-icon.svg" class="w-3 h-3" />
                  จัดการตำแหน่งช่าง
                </button>
              </div>
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
          <img src="/icon/plus-icon.svg" class="w-4 h-4" />
          เพิ่มผู้ใช้
        </button>
      </div>
      <div class="-mx-2 sm:mx-0 overflow-x-auto">
        <TableComponent
          :columns="columns"
          :rows="
            filteredRows.map((u) => [
              u.fullNameTh,
              u.username,
              u.department,
              u.role,
              u.technicianType,
              '',
            ])
          "
          :perPage="10"
          :columnAlign="['left','left','left','left','left','center']"
        >
          <!-- ใส่ SLOT ให้ column ตัวดำเนินการ -->
          <template #cell-5="{ row }">
            <TableActions
              :row-id="row[1]"
              :row="row"
              role="admin"
              :open-menu-id="openMenuId"
              @toggle-menu="openMenuId = $event"
              @detail="openViewModal(row[1])"
              @edit="openEditModal(row[1])"
              @delete="confirmDelete(row[1])"
            />
          </template>
        </TableComponent>
      </div>
    </div>

    <!-- View User Modal (เหมือน Edit เป๊ะ แต่ disabled ทั้งหมด) -->
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
              <option
                v-for="opt in titleOptions"
                :key="opt.value"
                :value="opt.value"
                :disabled="opt.disabled"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
          <!-- ชื่อ - นามสกุล (ภาษาไทย) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 mt-3">
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
              <label class="block text-sm font-medium text-gray-700 mb-1.5"
                >ชื่อ (ภาษาอังกฤษ)</label
              >
              <input
                v-model="viewForm.us_first_name_en"
                type="text"
                disabled
                class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5"
                >นามสกุล (ภาษาอังกฤษ)</label
              >
              <input
                v-model="viewForm.us_last_name_en"
                type="text"
                disabled
                class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>
          <!-- เบอร์โทรศัพท์ -->
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">เบอร์โทร</label>
            <input
              v-model="viewForm.us_phone"
              type="tel"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>
          <!-- หน่วยงาน -->
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">หน่วยงาน</label>
            <input
              v-model="viewForm.us_department"
              type="text"
              disabled
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
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
                <option v-for="role in roleOptions" :key="role.value" :value="role.value">
                  {{ role.code }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">ตำแหน่งช่าง</label>
              <select
                v-model="viewForm.us_tt_id"
                disabled
                class="w-full px-3 py-2 border rounded-md appearance-none bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300"
              >
                <option value="">
                  {{ addForm.us_role_id === '2' ? 'เลือกตำแหน่ง' : 'ไม่ระบุ' }}
                </option>
                <option v-for="opt in technicianOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
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

    <!-- Modal เพิ่มผู้ใช้งาน -->
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
            <div>
              <label class="block text-sm font-medium mb-1.5">
                ชื่อผู้ใช้ <span class="text-red-500">*</span>
              </label>
              <input
                v-model="addForm.us_user_name"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addErrors.username ? 'border-red-500' : 'border-gray-300',
                ]"
                placeholder="กรอกชื่อผู้ใช้"
              />
              <p v-if="addErrors.username" class="text-red-500 text-sm mt-1">
                {{ addErrors.username }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">
                รหัสผ่าน <span class="text-red-500">*</span>
              </label>
              <input
                v-model="addForm.us_user_pass"
                type="password"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addErrors.password ? 'border-red-500' : 'border-gray-300',
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
                addErrors.ttn ? 'border-red-500' : 'border-gray-300',
              ]"
            >
              <option
                v-for="opt in titleOptions"
                :key="opt.value"
                :value="opt.value"
                :disabled="opt.disabled"
              >
                {{ opt.label }}
              </option>
            </select>
            <p v-if="addErrors.ttn" class="text-red-500 text-sm mt-1">
              {{ addErrors.ttn }}
            </p>
          </div>
          <!-- ชื่อ - นามสกุล (ภาษาไทย) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 mt-3">
            <div>
              <label class="block text-sm font-medium mb-1.5">
                ชื่อ (ไทย) <span class="text-red-500">*</span>
              </label>
              <input
                v-model="addForm.us_first_name_th"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addErrors.firstTh ? 'border-red-500' : 'border-gray-300',
                ]"
                placeholder="กรอกชื่อ"
              />
              <p v-if="addErrors.firstTh" class="text-red-500 text-sm mt-1">
                {{ addErrors.firstTh }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">
                นามสกุล (ไทย) <span class="text-red-500">*</span>
              </label>
              <input
                v-model="addForm.us_last_name_th"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addErrors.lastTh ? 'border-red-500' : 'border-gray-300',
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
            <div>
              <label class="block text-sm font-medium mb-1.5"
                >ชื่อ (ภาษาอังกฤษ) <span class="text-red-500">*</span></label
              >
              <input
                v-model="addForm.us_first_name_en"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addErrors.firstEn ? 'border-red-500 ' : 'border-gray-300',
                ]"
                placeholder="First Name"
              />
              <p v-if="addErrors.firstEn" class="text-red-500 text-sm mt-1">
                {{ addErrors.firstEn }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5"
                >นามสกุล (ภาษาอังกฤษ) <span class="text-red-500">*</span></label
              >
              <input
                v-model="addForm.us_last_name_en"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addErrors.lastEn ? 'border-red-500' : 'border-gray-300',
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
              <label class="block text-sm font-medium mb-1.5"
                >เบอร์โทร <span class="text-red-500">*</span></label
              >
              <input
                v-model="addForm.us_phone"
                @input="addForm.us_phone = toDisplay(addForm.us_phone)"
                type="tel"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  addErrors.phone ? 'border-red-500' : 'border-gray-300',
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
                  addErrors.department ? 'border-red-500' : 'border-gray-300',
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
                  addErrors.role ? 'border-red-500' : 'border-gray-300',
                ]"
              >
                <option value="">เลือกบทบาท</option>
                <option v-for="role in roleOptions" :key="role.value" :value="role.value">
                  {{ role.label }}
                </option>
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
                      ? 'border-red-500'
                      : 'border-gray-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200',
                ]"
              >
                <option value="">
                  {{ addForm.us_role_id === '2' ? 'เลือกตำแหน่ง' : 'ไม่ระบุ' }}
                </option>
                <option v-for="opt in technicianOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <p v-if="addErrors.techType" class="text-red-500 text-sm mt-1">
                {{ addErrors.techType }}
              </p>
            </div>
          </div>

          <!-- ปุ่มต่าง ๆ -->
          <div class="flex flex-col sm:flex-row gap-3 mt-6">
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
                editErrors.ttn ? 'border-red-500' : 'border-gray-300',
              ]"
            >
              <option
                v-for="opt in titleOptions"
                :key="opt.value"
                :value="opt.value"
                :disabled="opt.disabled"
              >
                {{ opt.label }}
              </option>
            </select>
            <p v-if="editErrors.ttn" class="text-red-500 text-sm mt-1">
              {{ editErrors.ttn }}
            </p>
          </div>
          <!-- ชื่อ - นามสกุล (ภาษาไทย) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 mt-3">
            <div>
              <label class="block text-sm font-medium mb-1.5">
                ชื่อ (ไทย) <span class="text-red-500">*</span>
              </label>
              <input
                v-model="editForm.us_first_name_th"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  editErrors.firstTh ? 'border-red-500' : 'border-gray-300',
                ]"
                placeholder="กรอกชื่อ"
              />
              <p v-if="editErrors.firstTh" class="text-red-500 text-sm mt-1">
                {{ editErrors.firstTh }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">
                นามสกุล (ไทย) <span class="text-red-500">*</span>
              </label>
              <input
                v-model="editForm.us_last_name_th"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  editErrors.lastTh ? 'border-red-500' : 'border-gray-300',
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
            <div>
              <label class="block text-sm font-medium mb-1.5">ชื่อ (ภาษาอังกฤษ)</label>
              <input
                v-model="editForm.us_first_name_en"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  editErrors.firstEn ? 'border-red-500' : 'border-gray-300',
                ]"
                placeholder="First Name"
              />
              <p v-if="editErrors.firstEn" class="text-red-500 text-sm mt-1">
                {{ editErrors.firstEn }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">นามสกุล (ภาษาอังกฤษ)</label>
              <input
                v-model="editForm.us_last_name_en"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  editErrors.lastEn ? 'border-red-500' : 'border-gray-300',
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
                @input="editForm.us_phone = toDisplay(editForm.us_phone)"
                type="tel"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  editErrors.phone ? 'border-red-500' : 'border-gray-300',
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
                  editErrors.department ? 'border-red-500' : 'border-gray-300',
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
                @change="handleEditRoleChange"
                :class="[
                  'w-full px-3 py-2 border rounded-md bg-white',
                  editErrors.role ? 'border-red-500' : 'border-gray-300',
                ]"
              >
                <option value="">เลือกบทบาท</option>
                <option v-for="role in roleOptions" :key="role.value" :value="role.value">
                  {{ role.label }}
                </option>
              </select>
              <p v-if="editErrors.role" class="text-red-500 text-sm mt-1">
                {{ editErrors.role }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">
                ตำแหน่งช่าง
                <span
                  v-if="editForm.us_role_id === '2' || editForm.us_role_id === 2"
                  class="text-red-500"
                  >*</span
                >
              </label>
              <select
                v-model="editForm.us_tt_id"
                :disabled="editForm.us_role_id !== '2' && editForm.us_role_id !== 2"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  editForm.us_role_id === '2' || editForm.us_role_id === 2
                    ? editErrors.techType
                      ? 'border-red-500'
                      : 'border-gray-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200',
                ]"
              >
                <option value="">
                  {{
                    editForm.us_role_id === '2' || editForm.us_role_id === 2
                      ? 'เลือกตำแหน่ง'
                      : 'ไม่ระบุ'
                  }}
                </option>
                <option v-for="opt in technicianOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <p v-if="editErrors.techType" class="text-red-500 text-sm mt-1">
                {{ editErrors.techType }}
              </p>
            </div>
          </div>
          <!-- ปุ่มต่าง ๆ -->
          <div class="flex gap-3 flex-col sm:flex-row mt-6">
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

    <!-- Manage Technician Types Modal -->
    <div
      v-if="showManageTechModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-0"
      @click.self="closeManageTechModal"
    >
      <div class="bg-white rounded-lg p-8 w-full max-w-lg max-h-[100vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="bg-blue-100 p-2 rounded-full">
              <img src="/icon/user-info.svg" alt="Tech Type" class="w-6 h-6" />
            </div>
            <h2 class="text-lg font-bold text-black">จัดการตำแหน่งช่าง</h2>
          </div>
          <button
            type="button"
            @click="handleAddTechType"
            class="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md bg-blue-700 text-white hover:bg-blue-900"
          >
            <img src="/icon/plus-icon.svg" class="w-3 h-3" />
            เพิ่มตำแหน่ง
          </button>
        </div>
        <p class="text-gray-600 text-xs mb-3">เพิ่ม / แก้ไข / ลบชื่อตำแหน่งช่างในระบบ</p>
        <div class="space-y-1 max-h-72 overflow-y-auto">
          <div
            v-for="item in manageTechList"
            :key="item.id"
            class="flex items-center justify-between border rounded-md px-4 py-2 text-sm"
          >
            <span class="text-gray-800">{{ item.name }}</span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="handleEditTechType(item)"
                class="w-8 h-8 sm:w-9 sm:h-8 flex items-center justify-center justify-center bg-yellow-400 hover:bg-yellow-500 text-white rounded-md transition cursor-pointer"
                title="แก้ไข"
              >
                <img src="/icon/edit-icon.svg" class="w-4 h-4" />
              </button>
              <button
                type="button"
                @click="handleDeleteTechType(item)"
                class="w-8 h-8 sm:w-9 sm:h-8 flex items-center justify-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-md transition cursor-pointer"
                title="ลบ"
              >
                <img src="/icon/bin-icon.svg" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <p v-if="!manageTechList.length" class="text-sm text-gray-500">
            ยังไม่มีตำแหน่งช่างในระบบ
          </p>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            type="button"
            @click="closeManageTechModal"
            class="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
