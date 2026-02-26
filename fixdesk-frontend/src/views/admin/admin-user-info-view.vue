/**
 * =====================================================================
 * @file            admin-user-info-view.vue
 * @module          มอดูลการจัดการผู้ใช้ - การจัดการข้อมูลผู้ใข้งาน
 * @layer           View (Presentation Layer)
 * @version         1.0.2
 * @since           2025-10-21
 * @author          เศรษฐพงศ์ หอมชื่น
 * @lastModified    2026-02-23
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอสำหรับใช้จัดการข้อมูลผู้ใช้งานในระบบของผู้ดูแลระบบ
 *  แสดงรายการของผู้ใช้งานระบบทั้งหมด
 *   รองรับการค้นหาด้วย
 *    - ชื่อ-นามสกุล (ภาษาไทย / ภาษาอังกฤษ)
 *    - ชื่อผู้ใช้ (Username)
 *    - หน่วยงาน
 *    - กรองตาม:
 *      - บทบาท (Role)
 *      - ตำแหน่งช่าง (Technician Type)
 *   - เพิ่มผู้ใช้งานใหม่
 *   - แก้ไขข้อมูลผู้ใช้งาน
 *   - ดูรายละเอียดของผู้ใช้งาน
 *   - ลบผู้ใช้งาน
 *   - นำเข้าข้อมูลผู้ใช้งานจากไฟล์ Excel
 *   - จัดการตำแหน่งช่าง (เพิ่ม / แก้ไข / ลบ)
 *
 * @requires
 *   - vue
 *   - vue-router
 *   - sweetalert2
 *   - @iconify/vue
 *   - @/components/table-component.vue
 *   - @/components/table-actions-component.vue
 *   - @/components/modal/import-user-excel-component.vue
 *   - @/components/button/import-button-component.vue
 *   - @/components/button/base/base-button-component.vue
 *   - @/composables/usePhoneFormat
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - ปรับปรุงข้อความที่ใช้ให้เหมาะสม                  [2026-02-18, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - แก้ไขตำแหน่งของปุ่มยืินยันการแก้ไข/ลบ             [2026-02-18, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - แก้ไขข้อความคำอธิบายรายละเอียดผู้ใช้/แก้ไขข้อมูลผู้ใช้ [2026-02-20, ปฏิพัทธ์ จงนันทพันธกุล]
 *   - แก้ไขชื่อบทบาท "ผู้ใช้งาน"                      [2026-02-20, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - แก้ไขการสร้างบัญชีผู้ใช้ และ import จากไฟล์ ให้รองรับการสร้าง default รหัสผ่าน                      [2026-02-25, พชร ไพศรีสกุล]
 * =====================================================================
 */
 
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import TableComponent from '@/components/table-component.vue'
import TableActions from '@/components/table-actions-component.vue'
import ImportUserModal from '@/components/modal/import-user-excel-component.vue'
import ImportButtonComponent from '@/components/button/import-button-component.vue'
import BaseButtonComponent from '@/components/button/base/base-button-component.vue'

import { Icon } from '@iconify/vue'
import BaseButton from '@/components/button/base/base-button-component.vue'

import Sweetalert from 'sweetalert2'

import { usePhoneNumberFormatter } from '@/composables/usePhoneFormat'
const { toRaw, toDisplay, maskInput } = usePhoneNumberFormatter()

defineOptions({ name: 'AdminUserInfoView' })
const API_BASE = import.meta.env.VITE_API_BASE

// --- Shared State for Unified Modal ---
const showUserModal = ref(false)
const userModalMode = ref('add') // 'add' | 'edit' | 'view'
const userModalForm = ref({
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
  us_job_title: '',
  role_name: '',
  technician_type: '',
})
const userModalErrors = ref({
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
  jobTitle: '',
})

// Helper Computed Properties
const isViewMode = computed(() => userModalMode.value === 'view')
const isEditMode = computed(() => userModalMode.value === 'edit')
const isAddMode = computed(() => userModalMode.value === 'add')

const modalTitle = computed(() => {
  if (isAddMode.value) return 'เพิ่มผู้ใช้งานใหม่'
  if (isEditMode.value) return 'แก้ไขข้อมูลผู้ใช้ (สามารถแก้ไขได้)'
  return 'รายละเอียดผู้ใช้งาน (ไม่สามารถแก้ไขได้)'
})

const modalIconClass = computed(() => {
  if (isAddMode.value) return 'bg-green-100'
  if (isEditMode.value) return 'bg-orange-100'
  return 'bg-blue-100'
})

// --- Authorization & Data Fetching ---
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
const showImportModal = ref(false)

async function fetchUsers() {
  try {
    const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() })
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')
    }

    rows.value = data.map((user) => ({
      fullNameTh: `${user.us_first_name_th || ''} ${user.us_last_name_th || ''}`.trim(),
      fullNameEn: `${user.us_first_name_en || ''} ${user.us_last_name_en || ''}`.trim(),
      username: user.us_user_name || '-',
      department: user.us_department || '-',
      role: user.role_name || '-',
      technicianType: user.technician_type || '-',
      jobTitle: user.us_job_title || '-',
      raw: {
        ...user,
        us_phone: toDisplay(user.us_phone),
      },
    }))

    const map = {}
    for (const user of data) {
      if (user.us_user_name && user.us_id != null) {
        map[user.us_user_name] = user.us_id
      }
    }
    userIdByUsername.value = map

    const roleSet = new Set()
    for (const user of data) {
      if (user.role_name) roleSet.add(user.role_name)
    }
    roleFilterOptions.value = Array.from(roleSet)
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
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

const toast = Sweetalert.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})

const roleFilterOptions = ref([])
const technicianFilterOptions = ref([])

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
  if (showRoleFilter.value) showTechFilter.value = false
}

function toggleTechFilter() {
  showTechFilter.value = !showTechFilter.value
  if (showTechFilter.value) showRoleFilter.value = false
}

function clearFilters() {
  selectedRoles.value = []
  selectedTechTypes.value = []
}

function closeDropdown(event) {
  if (!event.target.closest('.relative')) {
    showRoleFilter.value = false
    showTechFilter.value = false
  }
}

function renderThaiRole(role) {
  switch (role) {
    case 'Admin':
      return 'ผู้ดูแลระบบ'
    case 'Technician':
      return 'ช่างซ่อม'
    case 'Manager':
      return 'ผู้บริหาร'
    case 'User':
      return 'ผู้ใช้งาน'
    case 'Stock':
      return 'ผู้ดูแลคลัง'
    default:
      return role
  }
}

onMounted(() => {
  fetchUsers()
  fetchMasterData()
  document.addEventListener('click', closeDropdown)
})
onBeforeUnmount(() => document.removeEventListener('click', closeDropdown))

// --- Unified Modal Logic ---

function resetModalForm() {
  userModalForm.value = {
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
    us_job_title: '',
    role_name: '',
    technician_type: '',
  }
  userModalErrors.value = {
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
    jobTitle: '',
  }
}

// Function: Open Add
function openAddModal() {
  resetModalForm()
  userModalMode.value = 'add'
  showUserModal.value = true
}

// Function: Open Edit
function openEditModal(username) {
  try {
    const row = rows.value.find((r) => r.username === username)
    if (!row) throw new Error('ไม่พบผู้ใช้ในข้อมูลที่โหลดไว้')

    resetModalForm()
    userModalMode.value = 'edit'
    const data = { ...row.raw }
    data.us_phone = toDisplay(data.us_phone)
    Object.assign(userModalForm.value, data)
    userModalForm.value.us_user_pass = ''
    showUserModal.value = true
  } catch (err) {
    toast.fire({
      title: 'ผิดพลาด',
      text: err.message,
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}

// Function: Open View
function openViewModal(username) {
  try {
    const row = rows.value.find((r) => r.username === username)
    if (!row) throw new Error('ไม่พบผู้ใช้ในข้อมูลที่โหลดไว้')

    resetModalForm()
    userModalMode.value = 'view'
    const data = { ...row.raw }
    data.us_phone = toDisplay(data.us_phone)
    Object.assign(userModalForm.value, data)
    showUserModal.value = true
  } catch (err) {
    toast.fire({
      title: 'ผิดพลาด',
      text: err.message,
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}

// Function: Close
function closeUserModal() {
  showUserModal.value = false
}

// Function: Unified Handle Submit
function handleUserModalSubmit() {
  if (isAddMode.value) confirmAddUser()
  else if (isEditMode.value) confirmEditUser()
  else closeUserModal()
}

// Function: Confirm Add
async function confirmAddUser() {
  if (!validateUserForm()) return
  const result = await Sweetalert.fire({
    title: 'ยืนยันการเพิ่มผู้ใช้งาน?',
    text: 'คุณต้องการเพิ่มผู้ใช้งานใหม่หรือไม่?',
    icon: 'question',
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#16a34a',
  })
  if (!result.isConfirmed) return

  try {
    // สร้าง payload ก่อน
    const payload = {
      ...userModalForm.value,
      us_ttn_id: parseInt(userModalForm.value.us_ttn_id),
      us_role_id: parseInt(userModalForm.value.us_role_id),
      us_tt_id: userModalForm.value.us_tt_id ? parseInt(userModalForm.value.us_tt_id) : null,
      us_phone: toRaw(userModalForm.value.us_phone),
    }

    // ลบ password ออกจาก payload
    delete payload.us_user_pass

    // ส่ง payload ไป backend
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'เพิ่มผู้ใช้ไม่สำเร็จ')

    toast.fire({
      icon: 'success',
      title: 'เพิ่มผู้ใช้เรียบร้อยแล้ว',
    })
    showUserModal.value = false
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

// Function: Confirm Edit
async function confirmEditUser() {
  if (!validateUserForm()) return
  const result = await Sweetalert.fire({
    title: 'ยืนยันการแก้ไขข้อมูล?',
    text: 'คุณต้องการบันทึกการแก้ไขหรือไม่?',
    icon: 'question',
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#2563eb',
  })
  if (!result.isConfirmed) return
  try {
    const payload = {
      ...userModalForm.value,
      us_ttn_id: parseInt(userModalForm.value.us_ttn_id),
      us_role_id: parseInt(userModalForm.value.us_role_id),
      us_tt_id: userModalForm.value.us_tt_id ? parseInt(userModalForm.value.us_tt_id) : null,
      us_phone: toRaw(userModalForm.value.us_phone),
    }

    // *สำคัญ* ถ้าช่องรหัสผ่านว่าง ให้ลบ Key ทิ้ง (Backend จะได้ไม่เซ็ตเป็นค่าว่าง)
    if (!payload.us_user_pass) {
      delete payload.us_user_pass
    }

    const res = await fetch(`${API_BASE}/users/${userModalForm.value.us_id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'อัปเดตไม่สำเร็จ')

    toast.fire({
      icon: 'success',
      title: 'แก้ไขข้อมูลผู้ใช้เรียบร้อยแล้ว',
    })
    showUserModal.value = false
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

// Function: Confirm Delete
async function confirmDelete(username) {
  const result = await Sweetalert.fire({
    title: 'ยืนยันการลบข้อมูล?',
    text: `คุณแน่ใจหรือไม่ว่าต้องการลบ "${username}"?`,
    icon: 'warning',
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: 'ลบ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#dc2626',
  })
  if (!result.isConfirmed) return
  try {
    let id = userIdByUsername.value[username]
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
    if (!id && id !== 0) throw new Error('ไม่พบผู้ใช้จากชื่อผู้ใช้ (username) นี้')

    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    let payload,
      message = ''
    try {
      payload = await res.json()
      message = payload?.message || ''
    } catch {
      const txt = await res.text()
      message = txt && txt.trim().startsWith('<') ? 'ปลายทางส่งกลับเป็น HTML' : txt
    }
    if (!res.ok) throw new Error(message || `ลบไม่สำเร็จ (HTTP ${res.status})`)

    toast.fire({
      icon: 'success',
      title: 'ลบผู้ใช้เรียบร้อยแล้ว',
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

function handleRoleChange() {
  if (userModalForm.value.us_role_id !== '2' && userModalForm.value.us_role_id !== 2) {
    userModalForm.value.us_tt_id = ''
  }
}

// Function: Unified Validation
function validateUserForm() {
  let valid = true
  // Reset Errors
  Object.keys(userModalErrors.value).forEach((k) => (userModalErrors.value[k] = ''))

  const f = userModalForm.value

  // Common Fields
  if (!f.us_ttn_id) {
    userModalErrors.value.ttn = 'กรุณาเลือกคำนำหน้า'
    valid = false
  }

  // Job Title Check
  if (!f.us_job_title || !f.us_job_title.trim()) {
    if (!f.us_job_title.trim()) {
      userModalErrors.value.jobTitle = 'กรุณากรอกตำแหน่งบุคลากร'
      valid = false
    }
  }

  // Names Th
  if (!f.us_first_name_th.trim()) {
    userModalErrors.value.firstTh = 'กรุณากรอกชื่อภาษาไทย'
    valid = false
  } else if (!/^[ก-๙\s]+$/.test(f.us_first_name_th)) {
    userModalErrors.value.firstTh = 'กรุณากรอกเป็นภาษาไทยเท่านั้น'
    valid = false
  }

  if (!f.us_last_name_th.trim()) {
    userModalErrors.value.lastTh = 'กรุณากรอกนามสกุลภาษาไทย'
    valid = false
  } else if (!/^[ก-๙\s]+$/.test(f.us_last_name_th)) {
    userModalErrors.value.lastTh = 'กรุณากรอกเป็นภาษาไทยเท่านั้น'
    valid = false
  }

  // Names En
  if (!f.us_first_name_en.trim()) {
    userModalErrors.value.firstEn = 'กรุณากรอกชื่อภาษาอังกฤษ'
    valid = false
  } else if (!/^[A-Za-z\s]+$/.test(f.us_first_name_en)) {
    userModalErrors.value.firstEn = 'กรุณากรอกเป็นภาษาอังกฤษเท่านั้น'
    valid = false
  }

  if (!f.us_last_name_en.trim()) {
    userModalErrors.value.lastEn = 'กรุณากรอกนามสกุลภาษาอังกฤษ'
    valid = false
  } else if (!/^[A-Za-z\s]+$/.test(f.us_last_name_en)) {
    userModalErrors.value.lastEn = 'กรุณากรอกเป็นภาษาอังกฤษเท่านั้น'
    valid = false
  }

  // Phone
  if (!f.us_phone.trim()) {
    userModalErrors.value.phone = 'กรุณากรอกเบอร์โทรศัพท์'
    valid = false
  } else if (!/^[0-9]{9,10}$/.test(toRaw(f.us_phone))) {
    userModalErrors.value.phone = 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9–10 หลัก'
    valid = false
  }

  // Dept & Role
  if (!f.us_department.trim()) {
    userModalErrors.value.department = 'กรุณากรอกชื่อหน่วยงาน'
    valid = false
  }
  if (!f.us_role_id) {
    userModalErrors.value.role = 'กรุณาเลือกบทบาท'
    valid = false
  }

  // Tech Type
  if ((f.us_role_id === '2' || f.us_role_id === 2) && !f.us_tt_id) {
    userModalErrors.value.techType = 'กรุณาเลือกประเภทช่าง'
    valid = false
  }

  // Add Mode Specifics
  if (isAddMode.value) {
    if (!f.us_user_name.trim()) {
      userModalErrors.value.username = 'กรุณากรอกชื่อผู้ใช้'
      valid = false
    }
  }

  return valid
}

function clearError(field) {
  if (userModalErrors.value[field]) userModalErrors.value[field] = ''
}

const titleOptions = ref([])
const roleOptions = ref([])
const technicianOptions = ref([])

async function fetchMasterData() {
  try {
    const [resTitles, resRoles, resTechs] = await Promise.all([
      fetch(`${API_BASE}/titles`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/roles`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/technician-types`, { headers: getAuthHeaders() }),
    ])

    const [titlesData, rolesData, techData] = await Promise.all([
      resTitles.json(),
      resRoles.json(),
      resTechs.json(),
    ])

    titleOptions.value = [
      { value: '', label: 'เลือกคำนำหน้า', disabled: true },
      ...titlesData.map((title) => ({
        value: String(title.ttn_id),
        label: title.ttn_name_th,
        disabled: false,
      })),
    ]

    roleOptions.value = rolesData.map((role) => ({
      value: String(role.role_id),
      code: role.role_name,
      label: role.role_label_th || role.role_name,
    }))

    technicianOptions.value = [
      { value: '', label: 'ไม่ระบุ' },
      ...techData.map((tech) => ({ value: String(tech.tt_id), label: tech.tt_name })),
    ]
    technicianFilterOptions.value = techData.map((tech) => tech.tt_name)
    manageTechList.value = techData.map((t) => ({ id: t.tt_id, name: t.tt_name }))
  } catch (err) {
    console.error('โหลดข้อมูล master data ไม่สำเร็จ:', err)
    toast.fire({
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
    confirmButtonColor: '#2563eb',
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

    toast.fire({
      icon: 'success',
      title: 'เพิ่มตำแหน่งช่างเรียบร้อยแล้ว',
    })
    await fetchMasterData()
    await fetchUsers()
  } catch (err) {
    toast.fire({
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
    confirmButtonColor: '#2563eb',
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
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'แก้ไขตำแหน่งช่างไม่สำเร็จ')

    toast.fire({
      icon: 'success',
      title: 'แก้ไขตำแหน่งช่างเรียบร้อยแล้ว',
    })
    await fetchMasterData()
    await fetchUsers()
  } catch (err) {
    toast.fire({
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

    toast.fire({
      icon: 'success',
      title: 'ลบตำแหน่งช่างเรียบร้อยแล้ว',
    })
    await fetchMasterData()
    await fetchUsers()
  } catch (err) {
    toast.fire({
      title: 'ผิดพลาด',
      text: err.message || 'ไม่สามารถลบตำแหน่งช่างได้',
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}

function handleImportSuccess() {
  toast.fire({
    icon: 'success',
    title: 'นำเข้าผู้ใช้งานเรียบร้อยแล้ว',
  })
  showImportModal.value = false
}

function handleImportError(message) {
  toast.fire({
    icon: 'error',
    title: message || 'นำเข้าผู้ใช้งานไม่สำเร็จ',
    background: '#fee2e2',
    color: '#dc2626',
  })
}

async function handleResetPassword(userId) {
  const result = await Sweetalert.fire({
    title: 'รีเซ็ตรหัสผ่าน?',
    text: 'ระบบจะสร้างรหัสผ่านใหม่โดยอัตโนมัติ',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'รีเซ็ต',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#dc2626',
  })

  if (!result.isConfirmed) return

  try {
    const res = await fetch(`${API_BASE}/users/${userId}/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'รีเซ็ตไม่สำเร็จ')
    }

    toast.fire({
      icon: 'success',
      title: 'รีเซ็ตรหัสผ่านเรียบร้อย',
    })
  } catch (err) {
    toast.fire({
      icon: 'error',
      title: err.message,
    })
  }
}
</script>

<template>
  <div class="p-8 mx-auto bg-white shadow-md rounded-xl max-w-7xl">
    <h1 class="mb-6 text-lg font-bold text-black sm:text-xl">จัดการข้อมูลผู้ใช้งานระบบ</h1>
    <div class="mb-6">
      <div class="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
        <div class="relative z-40 flex flex-wrap items-center gap-3">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหารายการผู้ใช้"
            class="w-full sm:w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 text-gray-500"
          />
          <div class="relative">
            <button
              @click.stop="toggleRoleFilter"
              class="flex items-center h-10 gap-2 px-4 py-2 text-gray-500 bg-white border border-gray-300 rounded-lg"
            >
              บทบาท
              <Icon
                icon="meteor-icons:chevron-down"
                style="color: gray"
                class="w-4 h-4 transition-transform duration-200 opacity-70"
                :class="{ 'rotate-180': showRoleFilter }"
              />
            </button>

            <div
              v-if="showRoleFilter"
              class="absolute z-10 w-48 p-3 mt-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg"
            >
              <label v-for="role in roleFilterOptions" :key="role" class="flex items-center py-1">
                <input
                  type="checkbox"
                  :value="role"
                  v-model="selectedRoles"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">{{ renderThaiRole(role) }}</span>
              </label>
            </div>
          </div>
          <div class="relative">
            <button
              @click.stop="toggleTechFilter"
              class="flex items-center h-10 gap-2 px-4 py-2 text-gray-500 bg-white border border-gray-300 rounded-lg"
            >
              ตำแหน่ง
              <Icon
                icon="meteor-icons:chevron-down"
                style="color: gray"
                class="w-4 h-4 transition-transform duration-200 opacity-70"
                :class="{ 'rotate-180': showTechFilter }"
              />
            </button>

            <div
              v-if="showTechFilter"
              class="absolute z-10 w-56 p-3 mt-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg"
            >
              <div class="overflow-y-auto max-h-56">
                <label v-for="t in technicianFilterOptions" :key="t" class="flex items-center py-1">
                  <input
                    type="checkbox"
                    v-model="allSelected"
                    class="text-blue-600 cursor-pointer"
                  />

                  <span class="ml-2">{{ t }}</span>
                </label>
              </div>

              <div class="pt-2 mt-2 border-t border-gray-200">
                <BaseButton
                  class="flex items-center justify-center w-full gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                  @click.stop="openManageTechModal"
                >
                  <Icon icon="fluent:add-12-filled" width="20" height="20" />
                  จัดการตำแหน่งช่าง
                </BaseButton>
              </div>
            </div>
          </div>
          <button
            v-if="selectedRoles.length || selectedTechTypes.length"
            @click="clearFilters"
            class="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ล้างตัวกรอง
          </button>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <ImportButtonComponent @click="showImportModal = true" />
          <BaseButtonComponent
            class="h-10 px-4 rounded-lg bg-[#1E48D1] hover:bg-[#1539a9] text-white font-medium shadow-sm"
            @click="openAddModal"
          >
            <Icon icon="fluent:add-12-filled" width="20" height="20" />
            เพิ่มผู้ใช้
          </BaseButtonComponent>
        </div>
      </div>
      <div class="-mx-2 overflow-x-auto sm:mx-0">
        <TableComponent
          :columns="columns"
          :rows="
            filteredRows.map((u) => [
              u.fullNameTh,
              u.username,
              u.department,
              renderThaiRole(u.role),
              u.jobTitle,
              '',
            ])
          "
          :perPage="10"
          :columnAlign="['left', 'left', 'left', 'left', 'left', 'center']"
          :id-column-as-link="false"
          @detail="openViewModal"
        >
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

    <div
      v-if="showUserModal"
      class="fixed inset-0 z-50 flex items-center justify-center px-2 bg-black bg-opacity-50 sm:px-0"
      @click.self="closeUserModal"
    >
      <div
        class="bg-white rounded-lg p-4 sm:p-6 md:p-8 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center gap-3 mb-6">
          <div class="p-3 rounded-full" :class="modalIconClass">
            <Icon
              icon="fluent:person-12-filled"
              width="35"
              height="35"
              style="color: #8e8e8e"
              v-if="isAddMode || isEditMode"
            />
          </div>
          <h2 class="text-xl font-bold p-1 text-gray-800">{{ modalTitle }}</h2>
        </div>

        <p v-if="isAddMode" class="mb-6 text-sm text-gray-600">
          กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้ใหม่ในระบบ
        </p>

        <form @submit.prevent="handleUserModalSubmit">
          <div v-if="isViewMode" class="mb-3">
            <div>
              <label class="block text-sm font-medium mb-1.5">ชื่อผู้ใช้</label>
              <input
                :value="userModalForm.us_user_name"
                type="text"
                disabled
                class="w-full px-3 py-2 border rounded-md bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>
          <div v-else class="grid grid-cols-1 gap-3 mb-3 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium mb-1.5"
                >ชื่อผู้ใช้ <span class="text-red-500">*</span></label
              >
              <input
                v-model="userModalForm.us_user_name"
                @input="clearError('username')"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  userModalErrors.username ? 'border-red-500' : 'border-gray-300',
                  ' placeholder-gray-400',
                ]"
                placeholder="กรอกชื่อผู้ใช้"
              />
              <p v-if="userModalErrors.username" class="mt-1 text-sm text-red-500">
                {{ userModalErrors.username }}
              </p>
            </div>
            <div v-if="isEditMode">
              <label class="block text-sm font-medium mb-1.5"> รหัสผ่าน </label>

              <button
                type="button"
                @click="handleResetPassword(userModalForm.us_id)"
                class="w-full px-3 py-2 text-white bg-red-500 rounded-md hover:bg-red-600"
              >
                รีเซ็ตรหัสผ่าน
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 mb-3 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium mb-1.5"
                >คำนำหน้าชื่อ <span v-if="!isViewMode" class="text-red-500">*</span></label
              >
              <select
                v-model="userModalForm.us_ttn_id"
                @change="clearError('ttn')"
                :disabled="isViewMode"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  isViewMode ? 'text-gray-500 bg-gray-100 cursor-not-allowed' : 'bg-white',
                  userModalErrors.ttn ? 'border-red-500' : 'border-gray-300',
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
              <p v-if="userModalErrors.ttn" class="mt-1 text-sm text-red-500">
                {{ userModalErrors.ttn }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5"
                >ตำแหน่งบุคลากร <span v-if="!isViewMode" class="text-red-500">*</span></label
              >

              <input
                v-if="isAddMode"
                v-model="userModalForm.us_job_title"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  userModalErrors.jobTitle ? 'border-red-500' : 'border-gray-300',
                  ' placeholder-gray-400',
                ]"
                placeholder="กรอกตำแหน่งบุคลากร"
                @input="clearError('jobTitle')"
              />

              <input
                v-else-if="isEditMode"
                v-model="userModalForm.us_job_title"
                type="text"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  userModalErrors.jobTitle ? 'border-red-500' : 'border-gray-300',
                  ' placeholder-gray-400',
                ]"
                placeholder="กรอกตำแหน่งบุคลากร"
                @input="clearError('jobTitle')"
              />

              <input
                v-else
                :value="
                  isViewMode &&
                  (userModalForm.us_job_title === null ||
                    userModalForm.us_job_title === undefined ||
                    userModalForm.us_job_title === '')
                    ? '-'
                    : userModalForm.us_job_title
                "
                type="text"
                :disabled="isViewMode"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  isViewMode ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : '',
                  userModalErrors.jobTitle ? 'border-red-500' : 'border-gray-300',
                ]"
                placeholder="กรอกตำแหน่งบุคลากร"
                @input="clearError('jobTitle')"
              />

              <p v-if="isAddMode && userModalErrors.jobTitle" class="mt-1 text-sm text-red-500">
                {{ userModalErrors.jobTitle }}
              </p>
              <p v-if="!isAddMode && userModalErrors.jobTitle" class="mt-1 text-sm text-red-500">
                {{ userModalErrors.jobTitle }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 mt-3 mb-3 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium mb-1.5"
                >ชื่อ (ภาษาไทย) <span v-if="!isViewMode" class="text-red-500">*</span></label
              >
              <input
                v-model="userModalForm.us_first_name_th"
                @input="clearError('firstTh')"
                type="text"
                :disabled="isViewMode"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  isViewMode ? 'bg-gray-100 cursor-not-allowed' : '',
                  userModalErrors.firstTh ? 'border-red-500' : 'border-gray-300',
                  ' placeholder-gray-400',
                ]"
                placeholder="กรอกชื่อ"
              />
              <p v-if="userModalErrors.firstTh" class="mt-1 text-sm text-red-500">
                {{ userModalErrors.firstTh }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5"
                >นามสกุล (ภาษาไทย) <span v-if="!isViewMode" class="text-red-500">*</span></label
              >
              <input
                v-model="userModalForm.us_last_name_th"
                @input="clearError('lastTh')"
                type="text"
                :disabled="isViewMode"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  isViewMode ? 'bg-gray-100 cursor-not-allowed' : '',
                  userModalErrors.lastTh ? 'border-red-500' : 'border-gray-300',
                  ' placeholder-gray-400',
                ]"
                placeholder="กรอกนามสกุล"
              />
              <p v-if="userModalErrors.lastTh" class="mt-1 text-sm text-red-500">
                {{ userModalErrors.lastTh }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 mb-3 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium mb-1.5"
                >ชื่อ (ภาษาอังกฤษ) <span v-if="!isViewMode" class="text-red-500">*</span></label
              >
              <input
                v-model="userModalForm.us_first_name_en"
                @input="clearError('firstEn')"
                type="text"
                :disabled="isViewMode"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  isViewMode ? 'bg-gray-100 cursor-not-allowed' : '',
                  userModalErrors.firstEn ? 'border-red-500' : 'border-gray-300',
                  ' placeholder-gray-400',
                ]"
                placeholder="First Name"
              />
              <p v-if="userModalErrors.firstEn" class="mt-1 text-sm text-red-500">
                {{ userModalErrors.firstEn }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5"
                >นามสกุล (ภาษาอังกฤษ) <span v-if="!isViewMode" class="text-red-500">*</span></label
              >
              <input
                v-model="userModalForm.us_last_name_en"
                @input="clearError('lastEn')"
                type="text"
                :disabled="isViewMode"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  isViewMode ? 'bg-gray-100 cursor-not-allowed' : '',
                  userModalErrors.lastEn ? 'border-red-500' : 'border-gray-300',
                  ' placeholder-gray-400',
                ]"
                placeholder="Last Name"
              />
              <p v-if="userModalErrors.lastEn" class="mt-1 text-sm text-red-500">
                {{ userModalErrors.lastEn }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 mb-3 sm:grid-cols-2">
            <div :class="isViewMode ? 'col-span-2 sm:col-span-2' : ''">
              <label class="block text-sm font-medium mb-1.5"
                >เบอร์โทรศัพท์ <span v-if="!isViewMode" class="text-red-500">*</span></label
              >
              <input
                v-model="userModalForm.us_phone"
                @input="(maskInput($event.target), clearError('phone'))"
                type="tel"
                :disabled="isViewMode"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  isViewMode ? 'bg-gray-100 cursor-not-allowed' : '',
                  userModalErrors.phone ? 'border-red-500' : 'border-gray-300',
                  ' placeholder-gray-400',
                ]"
                placeholder="กรอกเบอร์โทรศัพท์"
              />
              <p v-if="userModalErrors.phone" class="mt-1 text-sm text-red-500">
                {{ userModalErrors.phone }}
              </p>
            </div>
            <div :class="isViewMode ? 'col-span-2 sm:col-span-2' : ''">
              <label class="block text-sm font-medium mb-1.5"
                >ชื่อหน่วยงาน <span v-if="!isViewMode" class="text-red-500">*</span></label
              >
              <input
                v-model="userModalForm.us_department"
                type="text"
                @input="clearError('department')"
                :disabled="isViewMode"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  isViewMode ? 'bg-gray-100 cursor-not-allowed' : '',
                  userModalErrors.department ? 'border-red-500' : 'border-gray-300',
                  ' placeholder-gray-400',
                ]"
                placeholder="กรอกชื่อหน่วยงาน"
              />
              <p v-if="userModalErrors.department" class="mt-1 text-sm text-red-500">
                {{ userModalErrors.department }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label class="block text-sm font-medium mb-1.5"
                >บทบาท <span v-if="!isViewMode" class="text-red-500">*</span></label
              >
              <select
                v-model="userModalForm.us_role_id"
                @change="(handleRoleChange(), clearError('role'))"
                :disabled="isViewMode"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  isViewMode ? 'text-gray-500 bg-gray-100 cursor-not-allowed' : 'bg-white',
                  userModalErrors.role ? 'border-red-500' : 'border-gray-300',
                ]"
              >
                <option value="" disabled>เลือกบทบาท</option>
                <option v-for="role in roleOptions" :key="role.value" :value="role.value">
                  {{ renderThaiRole(role.label) }}
                </option>
              </select>
              <p v-if="userModalErrors.role" class="mt-1 text-sm text-red-500">
                {{ userModalErrors.role }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5"
                >ตำแหน่งช่าง
                <span
                  v-if="
                    (userModalForm.us_role_id === '2' || userModalForm.us_role_id === 2) &&
                    !isViewMode
                  "
                  class="text-red-500"
                  >*</span
                ></label
              >
              <select
                v-model="userModalForm.us_tt_id"
                :disabled="
                  isViewMode || (userModalForm.us_role_id !== '2' && userModalForm.us_role_id !== 2)
                "
                @change="clearError('techType')"
                :class="[
                  'w-full px-3 py-2 border rounded-md',
                  (userModalForm.us_role_id === '2' || userModalForm.us_role_id === 2) &&
                  !isViewMode
                    ? userModalErrors.techType
                      ? 'border-red-500'
                      : 'border-gray-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200',
                ]"
              >
                <option value="">
                  {{
                    userModalForm.us_role_id === '2' || userModalForm.us_role_id === 2
                      ? 'เลือกตำแหน่ง'
                      : 'ไม่ระบุ'
                  }}
                </option>
                <option v-for="opt in technicianOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <p v-if="userModalErrors.techType" class="mt-1 text-sm text-red-500">
                {{ userModalErrors.techType }}
              </p>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button
              v-if="isViewMode"
              type="button"
              @click="closeUserModal"
              class="px-5 py-2 font-medium text-gray-700 transition bg-gray-200 rounded-md hover:bg-gray-300"
            >
              ปิด
            </button>
            <template v-else>
              <button
                type="button"
                @click="closeUserModal"
                class="px-4 py-2 text-gray-700 border border-gray-300 rounded-md"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                :class="[
                  'px-4 py-2 text-white rounded-md',
                  isAddMode ? 'bg-green-500' : 'bg-orange-500',
                ]"
              >
                {{ isAddMode ? 'ยืนยันเพิ่ม' : 'บันทึกการแก้ไข' }}
              </button>
            </template>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="showManageTechModal"
      class="fixed inset-0 z-50 flex items-center justify-center px-2 bg-black bg-opacity-50 sm:px-0"
      @click.self="closeManageTechModal"
    >
      <div class="bg-white rounded-lg p-8 w-full max-w-lg max-h-[100vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-100 rounded-full">
              <Icon icon="fluent:person-12-filled" width="35" height="35" style="color: #8e8e8e" />
            </div>
            <h2 class="text-lg font-bold text-black">จัดการตำแหน่งช่าง</h2>
          </div>
          <BaseButtonComponent
            to="/main/repair-request"
            @click="handleAddTechType"
            class="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-900"
          >
            <Icon icon="fluent:add-12-filled" width="20" height="20" />
            เพิ่มตำแหน่ง
          </BaseButtonComponent>
        </div>
        <p class="mb-3 text-xs text-gray-600">เพิ่ม / แก้ไข / ลบชื่อตำแหน่งช่างในระบบ</p>
        <div class="space-y-1 overflow-y-auto max-h-72">
          <div
            v-for="item in manageTechList"
            :key="item.id"
            class="flex items-center justify-between px-4 py-2 text-sm border rounded-md"
          >
            <span class="text-gray-800">{{ item.name }}</span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="handleEditTechType(item)"
                class="flex items-center justify-center w-8 h-8 text-white transition bg-yellow-400 rounded-md cursor-pointer sm:w-9 sm:h-8 hover:bg-yellow-500"
                title="แก้ไข"
              >
                <Icon icon="fluent:edit-24-regular" width="24" height="24" style="color: #ffffff" />
              </button>
              <button
                type="button"
                @click="handleDeleteTechType(item)"
                class="flex items-center justify-center w-8 h-8 text-white transition bg-red-500 rounded-md cursor-pointer sm:w-9 sm:h-8 hover:bg-red-600"
                title="ลบ"
              >
                <Icon icon="mdi:bin-outline" width="24" height="24" style="color: #ffffff" />
              </button>
            </div>
          </div>

          <p v-if="!manageTechList.length" class="text-sm text-gray-500">
            ยังไม่มีตำแหน่งช่างในระบบ
          </p>
        </div>

        <div class="flex justify-end mt-4">
          <button
            type="button"
            @click="closeManageTechModal"
            class="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  </div>
  <ImportUserModal
    v-if="showImportModal"
    @close="showImportModal = false"
    @refresh="fetchUsers()"
    @success="handleImportSuccess"
    @error="handleImportError"
  />
</template>
