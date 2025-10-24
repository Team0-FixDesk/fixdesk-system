<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header section -->
    <div class="flex justify-end items-center mb-6">
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
    <div class="bg-white rounded-lg shadow p-4 mb-2">
      <div class="flex gap-4">
        <!-- Search input with dropdown -->
        <div class="flex-1 flex gap-0">
          <select
            v-model="searchField"
            class="px-4 py-2 border border-r-0 border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm"
          >
            <option value="all">ทั้งหมด</option>
            <option value="us_name">ชื่อเต็ม</option>
            <option value="us_user_name">ชื่อผู้ใช้</option>
            <option value="role_name">บทบาท</option>
            <option value="us_department">หน่วยงาน</option>
          </select>

          <div class="flex-1 flex">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="ค้นหา..."
              class="flex-1 px-4 py-2 border border-r-0 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              @input="filterUsers"
            />
            <button
              @click="filterUsers"
              class="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Filter button with dropdown -->
        <div class="relative flex-shrink-0">
          <button
            @click="showFilterDropdown = !showFilterDropdown"
            class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            ตัวกรอง
            <span v-if="selectedRoles.length > 0 || selectedTechnicianTypes.length > 0" class="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
              {{ selectedRoles.length + selectedTechnicianTypes.length }}
            </span>
          </button>

          <!-- Filter dropdown -->
          <div
            v-if="showFilterDropdown"
            class="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-10"
            @click.stop
          >
            <div class="p-3">
              <div class="text-sm font-medium text-gray-700 mb-2">บทบาท</div>

              <label class="flex items-center py-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  :value="1"
                  v-model="selectedRoles"
                  @change="filterUsers"
                  class="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700">ADMIN</span>
              </label>

              <label class="flex items-center py-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  :value="2"
                  v-model="selectedRoles"
                  @change="filterUsers"
                  class="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700">TECHNICIAN</span>
              </label>

              <label class="flex items-center py-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  :value="3"
                  v-model="selectedRoles"
                  @change="filterUsers"
                  class="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700">STOCK</span>
              </label>

              <label class="flex items-center py-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  :value="4"
                  v-model="selectedRoles"
                  @change="filterUsers"
                  class="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700">MANAGER</span>
              </label>

              <label class="flex items-center py-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  :value="5"
                  v-model="selectedRoles"
                  @change="filterUsers"
                  class="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700">USER</span>
              </label>

              <!-- ตำแหน่งช่าง (แสดงเมื่อเลือก TECHNICIAN) -->
              <div v-if="selectedRoles.includes(2)" class="mt-3 pt-3 border-t border-gray-200">
                <div class="text-sm font-medium text-gray-700 mb-2">ตำแหน่งช่าง</div>

                <label class="flex items-center py-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    :value="1"
                    v-model="selectedTechnicianTypes"
                    @change="filterUsers"
                    class="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span class="ml-2 text-sm text-gray-700">ไฟฟ้า</span>
                </label>

                <label class="flex items-center py-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    :value="2"
                    v-model="selectedTechnicianTypes"
                    @change="filterUsers"
                    class="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span class="ml-2 text-sm text-gray-700">ประปา</span>
                </label>
              </div>

              <div class="border-t border-gray-200 mt-2 pt-2">
                <button
                  @click="clearFilters"
                  class="w-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  ล้างตัวกรอง
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table section -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <h1 class="text-2xl font-bold text-gray-800 p-4">ข้อมูลผู้ใช้</h1>
      <TableComponent
        ref="tableRef"
        :columns="columns"
        :rows="tableRows"
        :perPage="10"
      >
        <!-- Custom slot สำหรับคอลัมน์ที่ 5 (จัดการ) -->
        <template #cell-5="{ row, rowIndex }">
          <div class="flex gap-2 justify-center">
            <button
              @click="openEditUserModal(filteredUsers[rowIndex]?.us_id)"
              class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              แก้ไข
            </button>
            <button
              @click="deleteUserById(filteredUsers[rowIndex]?.us_id)"
              class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              ลบ
            </button>
          </div>
        </template>
      </TableComponent>
    </div>

    <!-- Add User Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closeAddModal"
    >
      <div class="bg-white rounded-lg p-8 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <!-- Header with icon -->
        <div class="flex items-center gap-3 mb-6">
          <div class="bg-green-100 p-3 rounded-full">
            <img src="/icon/alert/add-user-icon.svg" alt="Add User" class="w-8 h-8">
          </div>
          <h2 class="text-xl font-bold text-gray-800">เพิ่มผู้ใช้งาน</h2>
        </div>

        <p class="text-gray-600 text-sm mb-6">กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้ใหม่ในระบบ</p>

        <form @submit.prevent="confirmAddUser">
          <!-- ชื่อผู้ใช้ และ รหัสผ่าน -->
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                ชื่อผู้ใช้ <span class="text-red-500">*</span>
              </label>
              <input
                v-model="addFormData.us_user_name"
                type="text"
                required
                placeholder="กรอกชื่อผู้ใช้"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                รหัสผ่าน <span class="text-red-500">*</span>
              </label>
              <input
                v-model="addFormData.us_user_pass"
                type="password"
                required
                placeholder="กรอกรหัสผ่าน"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <!-- คำนำหน้า -->
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              คำนำหน้าชื่อ <span class="text-red-500">*</span>
            </label>
            <select
              v-model="addFormData.us_ttn_id"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="" disabled>เลือกคำนำหน้า</option>
              <option value="1">นาย</option>
              <option value="2">นาง</option>
              <option value="3">นางสาว</option>
              <option value="4">อื่นๆ</option>
            </select>
          </div>

          <!-- ชื่อ - นามสกุล (ภาษาไทย) -->
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                ชื่อ (ไทย) <span class="text-red-500">*</span>
              </label>
              <input
                v-model="addFormData.us_first_name_th"
                type="text"
                required
                placeholder="กรอกชื่อ"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                นามสกุล (ไทย) <span class="text-red-500">*</span>
              </label>
              <input
                v-model="addFormData.us_last_name_th"
                type="text"
                required
                placeholder="กรอกนามสกุล"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <!-- ชื่อ - นามสกุล (ภาษาอังกฤษ) -->
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                ชื่อ (EN)
              </label>
              <input
                v-model="addFormData.us_first_name_en"
                type="text"
                placeholder="First Name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                นามสกุล (EN)
              </label>
              <input
                v-model="addFormData.us_last_name_en"
                type="text"
                placeholder="Last Name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <!-- เบอร์โทร และ หน่วยงาน -->
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                เบอร์โทร
              </label>
              <input
                v-model="addFormData.us_phone"
                type="tel"
                placeholder="กรอกเบอร์โทร"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                หน่วยงาน <span class="text-red-500">*</span>
              </label>
              <input
                v-model="addFormData.us_department"
                type="text"
                required
                placeholder="กรอกหน่วยงาน"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <!-- บทบาท - ตำแหน่งช่าง -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                บทบาท <span class="text-red-500">*</span>
              </label>
              <select
                v-model="addFormData.us_role_id"
                @change="handleAddRoleChange"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="" disabled>เลือกบทบาท</option>
                <option value="1">Admin</option>
                <option value="2">Technician</option>
                <option value="3">Stock</option>
                <option value="4">Manager</option>
                <option value="5">User</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                ตำแหน่งช่าง
                <span v-if="addFormData.us_role_id === '2'" class="text-red-500">*</span>
              </label>
              <select
                v-model="addFormData.us_tt_id"
                :disabled="addFormData.us_role_id !== '2'"
                :required="addFormData.us_role_id === '2'"
                :class="[
                  'w-full px-3 py-2 border rounded-md appearance-none',
                  addFormData.us_role_id === '2'
                    ? 'border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                ]"
              >
                <option value="">{{ addFormData.us_role_id === '2' ? 'เลือกตำแหน่ง' : 'ไม่ระบุ' }}</option>
                <option value="1">ไฟฟ้า</option>
                <option value="2">ประปา</option>
              </select>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3">
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
            <img src="/icon/alert/edit-user-icon.svg" alt="Edit User" class="w-8 h-8">
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
              v-model="editFormData.us_user_name"
              type="text"
              required
              placeholder="กรอกชื่อผู้ใช้"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <!-- คำนำหน้า -->
          <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              คำนำหน้าชื่อ <span class="text-red-500">*</span>
            </label>
            <select
              v-model="editFormData.us_ttn_id"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="" disabled>เลือกคำนำหน้า</option>
              <option value="1">นาย</option>
              <option value="2">นาง</option>
              <option value="3">นางสาว</option>
              <option value="4">อื่นๆ</option>
            </select>
          </div>

          <!-- ชื่อ - นามสกุล (ภาษาไทย) -->
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                ชื่อ (ไทย) <span class="text-red-500">*</span>
              </label>
              <input
                v-model="editFormData.us_first_name_th"
                type="text"
                required
                placeholder="กรอกชื่อ"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                นามสกุล (ไทย) <span class="text-red-500">*</span>
              </label>
              <input
                v-model="editFormData.us_last_name_th"
                type="text"
                required
                placeholder="กรอกนามสกุล"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <!-- ชื่อ - นามสกุล (ภาษาอังกฤษ) -->
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                ชื่อ (EN)
              </label>
              <input
                v-model="editFormData.us_first_name_en"
                type="text"
                placeholder="First Name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                นามสกุล (EN)
              </label>
              <input
                v-model="editFormData.us_last_name_en"
                type="text"
                placeholder="Last Name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <!-- เบอร์โทร และ หน่วยงาน -->
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                เบอร์โทร
              </label>
              <input
                v-model="editFormData.us_phone"
                type="tel"
                placeholder="กรอกเบอร์โทร"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                หน่วยงาน <span class="text-red-500">*</span>
              </label>
              <input
                v-model="editFormData.us_department"
                type="text"
                required
                placeholder="กรอกหน่วยงาน"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <!-- บทบาท - ตำแหน่งช่าง (แถวเดียวกัน) -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                บทบาท <span class="text-red-500">*</span>
              </label>
              <select
                v-model="editFormData.us_role_id"
                @change="handleEditRoleChange"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none bg-white"
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
              <label class="block text-sm font-medium text-gray-700 mb-1.5">
                ตำแหน่งช่าง
                <span v-if="editFormData.us_role_id === '2' || editFormData.us_role_id === 2" class="text-red-500">*</span>
              </label>
              <select
                v-model="editFormData.us_tt_id"
                :disabled="editFormData.us_role_id !== '2' && editFormData.us_role_id !== 2"
                :required="editFormData.us_role_id === '2' || editFormData.us_role_id === 2"
                :class="[
                  'w-full px-3 py-2 border rounded-md appearance-none',
                  editFormData.us_role_id === '2' || editFormData.us_role_id === 2
                    ? 'border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                    : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                ]"
              >
                <option value="">{{ (editFormData.us_role_id === '2' || editFormData.us_role_id === 2) ? 'เลือกตำแหน่ง' : 'ไม่ระบุ' }}</option>
                <option value="1">ไฟฟ้า</option>
                <option value="2">ประปา</option>
              </select>
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

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closeDeleteModal"
    >
      <div class="bg-white rounded-lg p-8 w-full max-w-md shadow-xl">
        <!-- Header with icon -->
        <div class="flex flex-col items-center text-center mb-6">
          <div class="bg-red-100 p-4 rounded-full mb-4">
            <img src="/icon/alert/delete-user-icon.svg" alt="Delete User" class="w-12 h-12">
          </div>
          <h2 class="text-xl font-bold text-gray-800 mb-2">ยืนยันการลบบัญชีผู้ใช้</h2>
          <p class="text-gray-600 text-sm">
            การลบข้อมูลนี้จะไม่สามารถกู้คืนได้ คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้
          </p>
        </div>

        <!-- Buttons -->
        <div class="flex gap-3">
          <button
            type="button"
            @click="closeDeleteModal"
            class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
          >
            ยกเลิก
          </button>
          <button
            @click="confirmDelete"
            class="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors font-medium"
          >
            ยืนยันการลบ
          </button>
        </div>
      </div>
    </div>

    <!-- Success Add Alert -->
    <div
      v-if="showSuccessAddAlert"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closeSuccessAddAlert"
    >
      <div class="bg-white rounded-lg p-8 w-full max-w-md shadow-xl">
        <div class="flex flex-col items-center text-center">
          <div class="bg-green-100 p-4 rounded-full mb-4">
            <img src="/icon/alert/add-user-icon.svg" alt="Success" class="w-12 h-12">
          </div>
          <h2 class="text-xl font-bold text-gray-800 mb-2">ยืนยันการเพิ่มผู้ใช้งาน</h2>
          <p class="text-gray-600 text-sm mb-6">
            คุณต้องการบันทึกการเพิ่มผู้ใช้งานหรือไม่
          </p>
          <div class="flex gap-3 w-full">
            <button
              @click="closeSuccessAddAlert"
              class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
            >
              ยกเลิก
            </button>
            <button
              @click="saveAddUser"
              class="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors font-medium"
            >
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Edit Alert -->
    <div
      v-if="showSuccessEditAlert"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closeSuccessEditAlert"
    >
      <div class="bg-white rounded-lg p-8 w-full max-w-md shadow-xl">
        <div class="flex flex-col items-center text-center">
          <div class="bg-orange-100 p-4 rounded-full mb-4">
            <img src="/icon/alert/edit-user-icon.svg" alt="Success" class="w-12 h-12">
          </div>
          <h2 class="text-xl font-bold text-gray-800 mb-2">ยืนยันการแก้ไขข้อมูลผู้ใช้</h2>
          <p class="text-gray-600 text-sm mb-6">
            คุณต้องการบันทึกการแก้ไขข้อมูลหรือไม่
          </p>
          <div class="flex gap-3 w-full">
            <button
              @click="closeSuccessEditAlert"
              class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
            >
              ยกเลิก
            </button>
            <button
              @click="saveEditUser"
              class="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors font-medium"
            >
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import TableComponent from '@/components/table-component.vue'

// API Configuration
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

// Data
const users = ref([])
const filteredUsers = ref([])
const searchQuery = ref('')
const searchField = ref('all')
const selectedRoles = ref([])
const selectedTechnicianTypes = ref([])
const showFilterDropdown = ref(false)
const tableRef = ref(null)

// Modal states
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showSuccessAddAlert = ref(false)
const showSuccessEditAlert = ref(false)
const deleteUserId = ref(null)

// Form data for Add
const addFormData = ref({
  us_ttn_id: '',
  us_first_name_th: '',
  us_last_name_th: '',
  us_first_name_en: '',
  us_last_name_en: '',
  us_user_name: '',
  us_user_pass: '',
  us_phone: '',
  us_role_id: '',
  us_department: '',
  us_tt_id: ''
})

// Form data for Edit
const editFormData = ref({
  us_id: null,
  us_ttn_id: '',
  us_first_name_th: '',
  us_last_name_th: '',
  us_first_name_en: '',
  us_last_name_en: '',
  us_user_name: '',
  us_phone: '',
  us_department: '',
  us_role_id: '',
  us_tt_id: ''
})

// Table columns
const columns = ['ชื่อเต็ม', 'ชื่อผู้ใช้', 'บทบาท', 'หน่วยงาน', 'ตำแหน่ง', 'จัดการ']

// Helper function to get full name from user object
const getFullName = (user) => {
  if (user.full_name) return user.full_name
  if (user.us_name) return user.us_name

  // Construct from parts if available
  const parts = []
  if (user.us_prefix_th) parts.push(user.us_prefix_th)
  if (user.us_first_name_th) parts.push(user.us_first_name_th)
  if (user.us_last_name_th) parts.push(user.us_last_name_th)

  return parts.length > 0 ? parts.join(' ') : '-'
}

// Computed table rows - ส่งข้อมูลเป็น array สำหรับ TableComponent
const tableRows = computed(() => {
  return filteredUsers.value.map(user => [
    getFullName(user),
    user.us_user_name || '-',
    user.role_name || '-',
    user.us_department || '-',
    user.technician_type || user.tt_name || '-',
    '' // คอลัมน์จัดการจะใช้ slot แทน
  ])
})

// Fetch users from API
const fetchUsers = async () => {
  try {
    console.log('🔍 Fetching users with token:', localStorage.getItem('token'))

    const response = await fetch(`${API_BASE}/users`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    console.log('📡 Response status:', response.status)

    if (response.status === 401) {
      console.error('❌ Unauthorized - redirecting to login')
      alert('กรุณาเข้าสู่ระบบใหม่')
      localStorage.removeItem('token')
      window.location.href = '/login'
      return
    }

    if (!response.ok) throw new Error('Failed to fetch users')

    const data = await response.json()
    console.log('✅ Users fetched:', data)
    users.value = data
    filteredUsers.value = data
  } catch (error) {
    console.error('❌ Error fetching users:', error)
    alert('ไม่สามารถดึงข้อมูลผู้ใช้ได้: ' + error.message)
  }
}

// Filter users
const filterUsers = () => {
  console.log('🔍 Filtering - selectedRoles:', selectedRoles.value, 'selectedTechTypes:', selectedTechnicianTypes.value)

  let result = users.value
  console.log('📊 Total users before filter:', result.length)

  // Filter by role IDs (checkbox) - กรองตาม us_role_id
  if (selectedRoles.value.length > 0) {
    result = result.filter(user => {
      const match = selectedRoles.value.includes(user.us_role_id)
      console.log(`User: ${user.us_user_name}, role_id: ${user.us_role_id} (${typeof user.us_role_id}), match: ${match}`)
      return match
    })
    console.log('After role filter:', result.length, 'users')
  }

  // Filter by technician type IDs (checkbox) - กรองตาม us_tt_id
  if (selectedTechnicianTypes.value.length > 0) {
    result = result.filter(user => {
      const match = user.us_tt_id && selectedTechnicianTypes.value.includes(user.us_tt_id)
      console.log(`User: ${user.us_user_name}, tt_id: ${user.us_tt_id} (${typeof user.us_tt_id}), match: ${match}`)
      return match
    })
    console.log('After tech type filter:', result.length, 'users')
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(user => {
      if (searchField.value === 'all') {
        // ค้นหาในทุกฟิลด์
        const fullName = getFullName(user).toLowerCase()
        const userName = (user.us_user_name || '').toLowerCase()
        const roleName = (user.role_name || '').toLowerCase()
        const department = (user.us_department || '').toLowerCase()
        const techType = (user.technician_type || user.tt_name || '').toLowerCase()

        return fullName.includes(query) ||
               userName.includes(query) ||
               roleName.includes(query) ||
               department.includes(query) ||
               techType.includes(query)
      } else if (searchField.value === 'us_name') {
        // ค้นหาจากชื่อเต็ม
        return getFullName(user).toLowerCase().includes(query)
      } else {
        // ค้นหาจากฟิลด์ที่เลือก
        return (user[searchField.value] || '').toLowerCase().includes(query)
      }
    })
    console.log('After search filter:', result.length, 'users')
  }

  filteredUsers.value = result
  console.log('✅ Final filtered users:', result.length)

  // Reset to page 1 when filtering
  if (tableRef.value) {
    tableRef.value.currentPage = 1
  }
}

// Clear all filters
const clearFilters = () => {
  selectedRoles.value = []
  selectedTechnicianTypes.value = []
  filterUsers()
}

// Close filter dropdown when clicking outside
const closeFilterDropdown = (event) => {
  if (!event.target.closest('.relative')) {
    showFilterDropdown.value = false
  }
}

onMounted(() => {
  fetchUsers()
  document.addEventListener('click', closeFilterDropdown)
})

// Clean up event listener
onBeforeUnmount(() => {
  document.removeEventListener('click', closeFilterDropdown)
})

// Modal Functions - ADD USER
const openAddUserModal = () => {
  addFormData.value = {
    us_ttn_id: '',
    us_first_name_th: '',
    us_last_name_th: '',
    us_first_name_en: '',
    us_last_name_en: '',
    us_user_name: '',
    us_user_pass: '',
    us_phone: '',
    us_role_id: '',
    us_department: '',
    us_tt_id: ''
  }
  showAddModal.value = true
}

const closeAddModal = () => {
  showAddModal.value = false
}

// เมื่อกด submit form จะแสดง alert confirmation ก่อน
const confirmAddUser = () => {
  closeAddModal()
  showSuccessAddAlert.value = true
}

// เมื่อกดยืนยันใน alert จึงค่อยบันทึกจริง
const saveAddUser = async () => {
  try {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        us_ttn_id: parseInt(addFormData.value.us_ttn_id),
        us_first_name_th: addFormData.value.us_first_name_th,
        us_last_name_th: addFormData.value.us_last_name_th,
        us_first_name_en: addFormData.value.us_first_name_en || null,
        us_last_name_en: addFormData.value.us_last_name_en || null,
        us_user_name: addFormData.value.us_user_name,
        us_user_pass: addFormData.value.us_user_pass,
        us_phone: addFormData.value.us_phone || '',
        us_department: addFormData.value.us_department,
        us_role_id: parseInt(addFormData.value.us_role_id),
        us_tt_id: addFormData.value.us_tt_id ? parseInt(addFormData.value.us_tt_id) : null
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to add user')
    }

    showSuccessAddAlert.value = false
    await fetchUsers()
    alert('เพิ่มผู้ใช้สำเร็จ!')
  } catch (error) {
    console.error('❌ Error adding user:', error)
    showSuccessAddAlert.value = false
    alert('ไม่สามารถเพิ่มผู้ใช้ได้: ' + error.message)
  }
}

const closeSuccessAddAlert = () => {
  showSuccessAddAlert.value = false
  addFormData.value = {
    us_ttn_id: '',
    us_first_name_th: '',
    us_last_name_th: '',
    us_first_name_en: '',
    us_last_name_en: '',
    us_user_name: '',
    us_user_pass: '',
    us_phone: '',
    us_role_id: '',
    us_department: '',
    us_tt_id: ''
  }
}

// Handle role change for Add form
const handleAddRoleChange = () => {
  // ถ้าไม่ใช่ TECHNICIAN (role_id = 2) ให้เคลียร์ค่า us_tt_id
  if (addFormData.value.us_role_id !== '2') {
    addFormData.value.us_tt_id = ''
  }
}

// Handle role change for Edit form
const handleEditRoleChange = () => {
  // ถ้าไม่ใช่ TECHNICIAN (role_id = 2) ให้เคลียร์ค่า us_tt_id
  if (editFormData.value.us_role_id !== '2' && editFormData.value.us_role_id !== 2) {
    editFormData.value.us_tt_id = ''
  }
}

// Modal Functions - EDIT USER
const openEditUserModal = async (userId) => {
  try {
    // Fetch ข้อมูลจาก API
    const token = localStorage.getItem('token')
    if (!token) {
      alert('กรุณาเข้าสู่ระบบใหม่')
      router.push('/login')
      return
    }

    const response = await fetch(`${API_BASE}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.status === 401) {
      alert('กรุณาเข้าสู่ระบบใหม่')
      router.push('/login')
      return
    }

    if (!response.ok) {
      throw new Error('ไม่สามารถดึงข้อมูลผู้ใช้ได้')
    }

    const user = await response.json()

    // เติมข้อมูลลงในฟอร์ม
    editFormData.value = {
      us_id: user.us_id,
      us_ttn_id: user.us_ttn_id || '',
      us_first_name_th: user.us_first_name_th || '',
      us_last_name_th: user.us_last_name_th || '',
      us_first_name_en: user.us_first_name_en || '',
      us_last_name_en: user.us_last_name_en || '',
      us_user_name: user.us_user_name,
      us_phone: user.us_phone || '',
      us_department: user.us_department || '',
      us_role_id: user.us_role_id || '',
      us_tt_id: user.us_tt_id || ''
    }

    // เปิด Modal Form
    showEditModal.value = true
  } catch (error) {
    console.error('Error fetching user:', error)
    alert('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้')
  }
}

const closeEditModal = () => {
  showEditModal.value = false
}

// เมื่อกด submit form จะแสดง alert confirmation ก่อน
const confirmEditUser = () => {
  closeEditModal()
  showSuccessEditAlert.value = true
}

// เมื่อกดยืนยันใน alert จึงค่อยบันทึกจริง
const saveEditUser = async () => {
  try {
    const response = await fetch(`${API_BASE}/users/${editFormData.value.us_id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        us_ttn_id: parseInt(editFormData.value.us_ttn_id),
        us_first_name_th: editFormData.value.us_first_name_th,
        us_last_name_th: editFormData.value.us_last_name_th,
        us_first_name_en: editFormData.value.us_first_name_en || null,
        us_last_name_en: editFormData.value.us_last_name_en || null,
        us_user_name: editFormData.value.us_user_name,
        us_phone: editFormData.value.us_phone || '',
        us_department: editFormData.value.us_department,
        us_role_id: parseInt(editFormData.value.us_role_id),
        us_tt_id: editFormData.value.us_tt_id ? parseInt(editFormData.value.us_tt_id) : null
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update user')
    }

    showSuccessEditAlert.value = false
    await fetchUsers()
    alert('แก้ไขข้อมูลผู้ใช้สำเร็จ!')
  } catch (error) {
    console.error('❌ Error updating user:', error)
    showSuccessEditAlert.value = false
    alert('ไม่สามารถแก้ไขข้อมูลผู้ใช้ได้: ' + error.message)
  }
}

const closeSuccessEditAlert = () => {
  showSuccessEditAlert.value = false
}

// Modal Functions - DELETE USER
const deleteUserById = (userId) => {
  deleteUserId.value = userId
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deleteUserId.value = null
}

const confirmDelete = async () => {
  if (!deleteUserId.value) return

  try {
    const response = await fetch(`${API_BASE}/users/${deleteUserId.value}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    if (!response.ok) throw new Error('Failed to delete user')

    closeDeleteModal()
    alert('ลบผู้ใช้สำเร็จ')

    // Refresh users list
    await fetchUsers()
  } catch (error) {
    console.error('❌ Error deleting user:', error)
    alert('ไม่สามารถลบผู้ใช้ได้: ' + error.message)
  }
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

defineOptions({ name: 'AdminUserInfoView' })
</script>
