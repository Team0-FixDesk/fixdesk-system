<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import TableComponent from '@/components/table-component.vue'
import Swal from 'sweetalert2'

defineOptions({ name: 'AdminUserInfoView' })

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// 🧩 Auth header
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

// Modal states
const showAddModal = ref(false)
const showEditModal = ref(false)
const deleteUserId = ref(null)

// form data
const addForm = ref({
  us_user_name: '',
  us_user_pass: '',
  us_first_name_th: '',
  us_last_name_th: '',
  us_department: '',
  us_role_id: '',
  us_tt_id: null,
})

const editForm = ref({
  us_id: '',
  us_user_name: '',
  us_first_name_th: '',
  us_last_name_th: '',
  us_department: '',
  us_role_id: '',
  us_tt_id: null,
})

/* ===============================
 * 📦 ดึงข้อมูลผู้ใช้
 * =============================== */
async function fetchUsers() {
  try {
    const res = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders(),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')

    rows.value = data.map((u) => [
      `${u.us_first_name_th || ''} ${u.us_last_name_th || ''}`,
      u.us_user_name || '-',
      u.role_name || '-',
      u.us_department || '-',
      u.tt_name || '-', // ✅ แสดงตำแหน่ง
      'actions',
    ])
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
    const matchSearch =
      r[0].toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      r[1].toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      r[3].toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchRole =
      selectedRoles.value.length === 0 || selectedRoles.value.includes(r[2])
    const matchTech =
      selectedTechTypes.value.length === 0 || selectedTechTypes.value.includes(r[4])

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
 * 🧭 ฟังก์ชันเพิ่ม / แก้ไข / ลบ
 * =============================== */
function openAddModal() {
  Object.assign(addForm.value, {
    us_user_name: '',
    us_user_pass: '',
    us_first_name_th: '',
    us_last_name_th: '',
    us_department: '',
    us_role_id: '',
    us_tt_id: null,
  })
  showAddModal.value = true
}

async function confirmAdd() {
  try {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(addForm.value),
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

async function openEditModal(username) {
  try {
    const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() })
    const data = await res.json()
    const user = data.find((u) => u.us_user_name === username)
    if (!user) throw new Error('ไม่พบผู้ใช้')

    Object.assign(editForm.value, {
      us_id: user.us_id,
      us_user_name: user.us_user_name,
      us_first_name_th: user.us_first_name_th,
      us_last_name_th: user.us_last_name_th,
      us_department: user.us_department,
      us_role_id: user.us_role_id,
      us_tt_id: user.us_tt_id,
    })
    showEditModal.value = true
  } catch (err) {
    Swal.fire('ผิดพลาด', err.message, 'error')
  }
}

async function confirmEdit() {
  try {
    const res = await fetch(`${API_BASE}/users/${editForm.value.us_id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(editForm.value),
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

async function handleDelete(username) {
  const result = await Swal.fire({
    title: 'ลบผู้ใช้นี้?',
    text: `คุณแน่ใจหรือไม่ว่าต้องการลบ "${username}"`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ลบเลย',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#e53e3e',
  })
  if (!result.isConfirmed) return

  try {
    const res = await fetch(`${API_BASE}/users/by-username/${username}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'ลบผู้ใช้ไม่สำเร็จ')

    Swal.fire('สำเร็จ', 'ลบผู้ใช้เรียบร้อยแล้ว', 'success')
    await fetchUsers()
  } catch (err) {
    Swal.fire('ผิดพลาด', err.message, 'error')
  }
}
</script>

<template>
  <div class="bg-gray-50 rounded-xl p-1 mx-auto max-w-7xl">
    <!-- ฟิลเตอร์ -->
    <div class="mb-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <!-- ค้นหา -->
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาชื่อผู้ใช้ / หน่วยงาน / บทบาท"
            class="w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
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
          class="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#1E48D1] hover:bg-[#1539a9] text-white font-medium shadow-sm transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m7-7H5" />
          </svg>
          เพิ่มผู้ใช้
        </button>
      </div>
    </div>

    <!-- ตาราง -->
    <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
      <h1 class="text-xl font-bold text-black mb-2">จัดการผู้ใช้งานระบบ</h1>
      <TableComponent
        :columns="columns"
        :rows="filteredRows"
        :perPage="10"
        mode="full"
        @edit="openEditModal"
        @delete="handleDelete"
      />
    </div>

    <!-- Modal เพิ่ม -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showAddModal = false"
    >
      <div class="bg-white rounded-lg p-8 w-full max-w-lg shadow-xl">
        <h2 class="text-lg font-bold mb-4 text-gray-800">เพิ่มผู้ใช้ใหม่</h2>
        <div class="space-y-3">
          <input v-model="addForm.us_user_name" placeholder="ชื่อผู้ใช้" class="input" />
          <input v-model="addForm.us_user_pass" placeholder="รหัสผ่าน" type="password" class="input" />
          <input v-model="addForm.us_first_name_th" placeholder="ชื่อจริง" class="input" />
          <input v-model="addForm.us_last_name_th" placeholder="นามสกุล" class="input" />
          <input v-model="addForm.us_department" placeholder="หน่วยงาน" class="input" />
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="showAddModal = false" class="btn-cancel">ยกเลิก</button>
          <button @click="confirmAdd" class="btn-primary">บันทึก</button>
        </div>
      </div>
    </div>

    <!-- Modal แก้ไข -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showEditModal = false"
    >
      <div class="bg-white rounded-lg p-8 w-full max-w-lg shadow-xl">
        <h2 class="text-lg font-bold mb-4 text-gray-800">แก้ไขข้อมูลผู้ใช้</h2>
        <div class="space-y-3">
          <input v-model="editForm.us_user_name" placeholder="ชื่อผู้ใช้" class="input" />
          <input v-model="editForm.us_first_name_th" placeholder="ชื่อจริง" class="input" />
          <input v-model="editForm.us_last_name_th" placeholder="นามสกุล" class="input" />
          <input v-model="editForm.us_department" placeholder="หน่วยงาน" class="input" />
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="showEditModal = false" class="btn-cancel">ยกเลิก</button>
          <button @click="confirmEdit" class="btn-primary">บันทึก</button>
        </div>
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
