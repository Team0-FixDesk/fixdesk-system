<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header section -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">ข้อมูลผู้ใช้</h1>
      <button
        @click="openAddUserModal"
        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        เพิ่มผู้ใช้งาน
      </button>
    </div>

    <!-- Search and Filter section -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="flex gap-4">
        <!-- Dropdown: ค้นหาตาม -->
        <div class="flex-shrink-0">
          <select
            v-model="searchField"
            class="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">หมวดหมู่</option>
            <option value="us_name">ชื่อเต็ม</option>
            <option value="us_user_name">ชื่อผู้ใช้</option>
            <option value="role_name">บทบาท</option>
            <option value="us_department">หน่วยงาน</option>
          </select>
        </div>

        <!-- Search input -->
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหา"
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            @input="filterUsers"
          />
        </div>

        <!-- Search button -->
        <button
          @click="filterUsers"
          class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        <!-- Filter dropdown -->
        <div class="flex-shrink-0">
          <select
            v-model="roleFilter"
            @change="filterUsers"
            class="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">ฟิลเตอร์</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="TECHNICIAN">TECHNICIAN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="STOCK">STOCK</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Table section -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <TableComponent
        :columns="columns"
        :rows="tableRows"
        :perPage="10"
      />
    </div>

    <!-- Modal สำหรับเพิ่ม/แก้ไขผู้ใช้ -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">{{ isEditMode ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้งาน' }}</h2>

        <form @submit.prevent="saveUser">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">ชื่อผู้ใช้</label>
            <input
              v-model="formData.us_user_name"
              type="text"
              required
              :disabled="isEditMode"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div v-if="!isEditMode" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">รหัสผ่าน</label>
            <input
              v-model="formData.us_user_pass"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">ชื่อเต็ม</label>
            <input
              v-model="formData.us_name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">บทบาท</label>
            <select
              v-model="formData.us_role_id"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">เลือกบทบาท</option>
              <option value="1">ADMIN</option>
              <option value="2">TECHNICIAN</option>
              <option value="3">USER</option>
              <option value="4">MANAGER</option>
              <option value="5">STOCK</option>
            </select>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">หน่วยงาน</label>
            <input
              v-model="formData.us_department"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">เบอร์โทร</label>
            <input
              v-model="formData.us_phone"
              type="tel"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div v-if="formData.us_role_id == 2" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">ประเภทช่าง</label>
            <select
              v-model="formData.us_tt_id"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">เลือกประเภท</option>
              <option value="1">ไฟฟ้า</option>
              <option value="2">แอร์</option>
              <option value="3">อื่นๆ</option>
            </select>
          </div>

          <div class="flex gap-2 justify-end">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              {{ isEditMode ? 'บันทึก' : 'เพิ่ม' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import TableComponent from '@/components/table-component.vue'

// API Configuration
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// Data
const users = ref([])
const filteredUsers = ref([])
const showModal = ref(false)
const isEditMode = ref(false)
const searchQuery = ref('')
const searchField = ref('all')
const roleFilter = ref('')

// Form data
const formData = ref({
  us_id: null,
  us_user_name: '',
  us_user_pass: '',
  us_name: '',
  us_phone: '',
  us_department: '',
  us_role_id: '',
  us_tt_id: null
})

// Table columns
const columns = ['ชื่อเต็ม', 'ชื่อผู้ใช้', 'บทบาท', 'หน่วยงาน', 'ตำแหน่ง', 'จัดการ']

// Computed table rows
const tableRows = computed(() => {
  return filteredUsers.value.map(user => {
    return [
      user.us_name || '-',
      user.us_user_name || '-',
      user.role_name || '-',
      user.us_department || '-',
      user.tt_name || '-',
      createActionButtons(user)
    ]
  })
})

// Create action buttons HTML
const createActionButtons = (user) => {
  return `
    <div class="flex gap-2">
      <button
        onclick="window.editUser(${user.us_id})"
        class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
      >
        แก้ไข
      </button>
      <button
        onclick="window.deleteUser(${user.us_id})"
        class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
      >
        ลบ
      </button>
    </div>
  `
}

// Fetch users from API
const fetchUsers = async () => {
  try {
    const response = await fetch(`${API_BASE}/users`)
    if (!response.ok) throw new Error('Failed to fetch users')
    const data = await response.json()
    users.value = data
    filteredUsers.value = data
  } catch (error) {
    console.error('Error fetching users:', error)
    alert('ไม่สามารถดึงข้อมูลผู้ใช้ได้')
  }
}

// Filter users
const filterUsers = () => {
  let result = users.value

  // Filter by role
  if (roleFilter.value) {
    result = result.filter(user => user.role_name === roleFilter.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(user => {
      if (searchField.value === 'all') {
        return (
          user.us_name?.toLowerCase().includes(query) ||
          user.us_user_name?.toLowerCase().includes(query) ||
          user.role_name?.toLowerCase().includes(query) ||
          user.us_department?.toLowerCase().includes(query)
        )
      } else {
        return user[searchField.value]?.toLowerCase().includes(query)
      }
    })
  }

  filteredUsers.value = result
}

// Open add user modal
const openAddUserModal = () => {
  isEditMode.value = false
  formData.value = {
    us_id: null,
    us_user_name: '',
    us_user_pass: '',
    us_name: '',
    us_phone: '',
    us_department: '',
    us_role_id: '',
    us_tt_id: null
  }
  showModal.value = true
}

// Open edit user modal
const openEditUserModal = (userId) => {
  const user = users.value.find(u => u.us_id === userId)
  if (!user) return

  isEditMode.value = true
  formData.value = {
    us_id: user.us_id,
    us_user_name: user.us_user_name,
    us_user_pass: '',
    us_name: user.us_name,
    us_phone: user.us_phone,
    us_department: user.us_department,
    us_role_id: user.us_role_id || getRoleIdByName(user.role_name),
    us_tt_id: user.us_tt_id
  }
  showModal.value = true
}

// Get role ID by role name
const getRoleIdByName = (roleName) => {
  const roleMap = {
    'ADMIN': 1,
    'TECHNICIAN': 2,
    'USER': 3,
    'MANAGER': 4,
    'STOCK': 5
  }
  return roleMap[roleName] || ''
}

// Close modal
const closeModal = () => {
  showModal.value = false
  formData.value = {
    us_id: null,
    us_user_name: '',
    us_user_pass: '',
    us_name: '',
    us_phone: '',
    us_department: '',
    us_role_id: '',
    us_tt_id: null
  }
}

// Save user (add or update)
const saveUser = async () => {
  try {
    if (isEditMode.value) {
      // Update user
      const response = await fetch(`${API_BASE}/users/${formData.value.us_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          us_name: formData.value.us_name,
          us_phone: formData.value.us_phone,
          us_department: formData.value.us_department,
          us_role_id: formData.value.us_role_id,
          us_tt_id: formData.value.us_tt_id
        })
      })
      if (!response.ok) throw new Error('Failed to update user')
      alert('อัปเดตผู้ใช้สำเร็จ')
    } else {
      // Add new user
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.value)
      })
      if (!response.ok) throw new Error('Failed to add user')
      alert('เพิ่มผู้ใช้สำเร็จ')
    }

    closeModal()
    await fetchUsers()
  } catch (error) {
    console.error('Error saving user:', error)
    alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
  }
}

// Delete user
const deleteUserById = async (userId) => {
  if (!confirm('คุณต้องการลบผู้ใช้นี้หรือไม่?')) return

  try {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete user')
    alert('ลบผู้ใช้สำเร็จ')
    await fetchUsers()
  } catch (error) {
    console.error('Error deleting user:', error)
    alert('ไม่สามารถลบผู้ใช้ได้')
  }
}

// Expose functions to window for onclick handlers
if (typeof window !== 'undefined') {
  window.editUser = openEditUserModal
  window.deleteUser = deleteUserById
}

// Fetch users on mount
onMounted(() => {
  fetchUsers()
})

defineOptions({ name: 'AdminUserInfoView' })
</script>
