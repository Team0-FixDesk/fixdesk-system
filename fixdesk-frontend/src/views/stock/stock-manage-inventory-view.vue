<script setup>
import { ref, onMounted } from 'vue'
import TableComponent from '@/components/table-component.vue'
import { useRouter } from 'vue-router'
import Sweetalert from 'sweetalert2'
const router = useRouter()


function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    'Authorization': `Bearer ${token}`,
  }
} 

// JWT Decode
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch (err) {
    console.error('ไม่สามารถ decode token ได้:', err)
    return {}
  }
}


defineOptions({ name: 'StockManageInventoryView' })

// --- Table Columns หัวตาราง ---
const columns = [
  'ID',
  'หมายเลขครุภัณฑ์',
  'ชื่อรายการ',
  'หมวดหมู่',
  'จำนวน',
  'หน่วยนับ',
  'สถานะ',
  'ตัวดำเนินการ',
]

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// --- Dropdown หมวดหมู่ ---
const typeOptions = ref([])
const categoryFilter = ref([])

const fetchCategories = async () => {
  try {
    const response = await fetch(`${API_BASE}/category`)
    if (!response.ok) throw new Error('Failed to fetch categories')
    const data = await response.json()
    categoryFilter.value = data

    // Map ข้อมูลสำหรับ dropdown
    typeOptions.value = data.map(cat => ({
      value: cat.ct_id,
      label: cat.ct_name
    }))
    console.log('Categories loaded:', typeOptions.value)
  } catch (error) {
    console.error("Error fetching categories:", error)
  }
}

// Load categories เมื่อ component mount
onMounted(() => {
  fetchCategories()
  fetchAllStock()
})

// --- Modal State ---
const showAddModal = ref(false)
const showStatusFilter = ref(false)
const showTypeFilter = ref(false)

// --- File Upload State ---
const filePreview = ref([])
const isDragOver = ref(false)

// --- Form Data ---
const formdata = ref({
  name: '',
  asset_no: '',
  ct_id: '',
  quantity: '',
  unit: '',
  status: 'active',
  pd_upload_image: null
})



// --- Form Validation Errors ---
const addErrors = ref({})

// --- Filter & Search ---
const searchQuery = ref('')
const selectedUrgencies = ref([])
const selectedTypes = ref([])
const itemsCount = ref(0)
const itemsNew = ref(0)
const itemRequestWaiting = ref(0)
const itemRequestDeclined = ref(0)
const itemNewToday = ref(0)

// --- ดึงข้อมูล Table มาแสดง filteredRows ---
const filteredRows = ref([])
async function fetchAllStock() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      Swal.fire('หมดเวลาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบใหม่', 'warning')
      router.push('/login')
      return
    }

    const res = await fetch(`${API_BASE}/show-stock`, { headers: getAuthHeaders() })

    if (res.status === 401) {
      Swal.fire('หมดเวลาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบใหม่', 'warning')
      sessionStorage.removeItem('token')
      localStorage.removeItem('token')
      router.push('/login')
      return
    }

    const data = await res.json()
    filteredRows.value = data.map(item => ([
      item.pd_id,
      item.pd_asset_code || '-',   // ← กันข้อมูลหาย
      item.pd_name,
      item.ct_name,
      item.pd_quantity,
      item.units_name,
      item.status === 'active' ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน',
      ''
    ]))
    return
  } catch (error) {
    console.error('Error fetching stock data:', error)
  }
}

// --- Methods ---

// 1. Reset & Close Modal
const closeAddModal = () => {
  showAddModal.value = false
  formdata.value = {
    name: '',
    asset_no: '',
    ct_id: '',
    quantity: '',
    unit: '',
    status: 'active'
  }
  filePreview.value = []
  addErrors.value = {}
}

// 2. Validate Form
const validateForm = () => {
  const errors = {}

  if (!formdata.value.name) errors.name = 'กรุณากรอกชื่อรายการ'
  if (!formdata.value.ct_id) errors.type_id = 'กรุณาเลือกหมวดหมู่'
  if (!formdata.value.quantity || formdata.value.quantity <= 0)
    errors.quantity = 'กรุณากรอกจำนวนที่ถูกต้อง'
  if (!formdata.value.unit) errors.unit = 'กรุณากรอกหน่วยนับ'

  addErrors.value = errors
  return Object.keys(errors).length === 0
}


// 3. File Handling Methods (เพิ่มใหม่)
const handleDragOver = () => {
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = (e) => {
  isDragOver.value = false
  const files = e.dataTransfer.files
  processFile(files)
}

const handleFileUpload = (e) => {
  const files = e.target.files
  processFile(files)
  e.target.value = '' // Reset input เพื่อให้เลือกไฟล์เดิมซ้ำได้ถ้าลบไปแล้ว
}

const processFile = (files) => {
  if (!files || files.length === 0) return

  const file = files[0] // รับแค่ไฟล์แรก (1 รูป)

  // ตรวจสอบว่าเป็นรูปภาพ
  if (!file.type.startsWith('image/')) {
    alert('กรุณาอัปโหลดเฉพาะไฟล์รูปภาพเท่านั้น')
    return
  }

  // สร้าง URL สำหรับ Preview
  const url = URL.createObjectURL(file)

  // แทนที่รูปเก่าทันที (เพราะรับแค่ 1 รูป)
  filePreview.value = [{
    file: file,
    name: file.name,
    size: file.size,
    url: url
  }]
}

// 4. Submit Form
const confirmAddItem = async () => {
  if (!validateForm()) {
    return
  }

  const formDataToSubmit = new FormData()
  formDataToSubmit.append('pd_name', formdata.value.name)
  formDataToSubmit.append('pd_asset_code', formdata.value.asset_no)
  formDataToSubmit.append('pd_category_id', formdata.value.ct_id)
  formDataToSubmit.append('pd_quantity', formdata.value.quantity)
  formDataToSubmit.append('pd_unit_id', formdata.value.unit)
  formDataToSubmit.append('status', formdata.value.status)

  if (filePreview.value.length > 0) {
    formDataToSubmit.append('pd_upload_image', filePreview.value[0].file)
  }

  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) throw new Error('ไม่พบ token')

    const res = await fetch(`${API_BASE}/add-stock`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formDataToSubmit,
    })

    const contentType = res.headers.get('content-type')
    let responseData

    if (contentType && contentType.includes('application/json')) {
      responseData = await res.json()
    } else {
      responseData = await res.text()
      console.error('Server returned HTML instead of JSON:', responseData)
      throw new Error('Server error - received HTML response')
    }

    if (!res.ok) throw new Error(responseData.message || 'บันทึกข้อมูลไม่สำเร็จ')

    Sweetalert.fire({
      icon: 'success',
      title: 'สำเร็จ!',
      text: 'บันทึกรายการสำเร็จ!'
    })

    closeAddModal()
  } catch (error) {
    console.error('Error adding item:', error)
    Sweetalert.fire({
      icon: 'error',
      title: 'ผิดพลาด!',
      text: error.message || 'เกิดข้อผิดพลาดในการบันทึกรายการ'
    })
  }
}

// --- Mock Action Methods ---
const handleDelete = (id) => console.log('Delete', id)
const goToDetail = (id) => console.log('Detail', id)
const goToEdit = (id) => console.log('Edit', id)

</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-8xl container px-5 py-6">

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">รายการคลัง</h1>
      <button @click="showAddModal = true"
        class="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md flex items-center shadow-sm transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        เพิ่มรายการ
      </button>
    </div>

    <div class="flex flex-wrap justify-center gap-6 mb-8">
      <div class="bg-white rounded-lg border p-6 w-60 text-center shadow-sm">
        <h2 class="text-2xl font-bold text-blue-600">{{ itemsCount }} รายการ</h2>
        <p class="text-gray-600 text-sm">รายการของทั้งหมด</p>
      </div>

      <div class="bg-white rounded-lg border p-6 w-60 text-center shadow-sm">
        <h2 class="text-2xl font-bold text-orange-500">{{ itemsNew }} รายการ</h2>
        <p class="text-gray-600 text-sm">คำขอเบิกของ</p>
      </div>

      <div class="bg-white rounded-lg border p-6 w-60 text-center shadow-sm">
        <h2 class="text-2xl font-bold text-green-600">{{ itemRequestWaiting }} รายการ</h2>
        <p class="text-gray-600 text-sm">คำขอเบิกรออนุมัติ</p>
      </div>

      <div class="bg-white rounded-lg border p-6 w-60 text-center shadow-sm">
        <h2 class="text-2xl font-bold text-red-600">{{ itemRequestDeclined }} รายการ</h2>
        <p class="text-gray-600 text-sm">ใกล้หมด Stock</p>
      </div>

      <div class="bg-white rounded-lg border p-6 w-60 text-center shadow-sm">
        <h2 class="text-2xl font-bold text-purple-600">{{ itemNewToday }} รายการ</h2>
        <p class="text-gray-600 text-sm">ของเข้าใหม่วันนี้</p>
      </div>
    </div>

    <div class="mb-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <input v-model="searchQuery" type="text" placeholder="ค้นหารายการของ"
            class="text-gray-700 w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />

          <div class="relative">
            <button @click.stop="showStatusFilter = !showStatusFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 hover:bg-gray-50">
              สถานะ
              <img src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200"
                :class="{ 'rotate-180': showStatusFilter }" />
            </button>

            <div v-if="showStatusFilter"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10">
              <label class="flex items-center py-1 cursor-pointer">
                <input type="checkbox" value="low" v-model="selectedUrgencies" class="w-4 h-4 text-blue-600 rounded" />
                <span class="ml-2">In Stock</span>
              </label>

              <label class="flex items-center py-1 cursor-pointer">
                <input type="checkbox" value="medium" v-model="selectedUrgencies"
                  class="w-4 h-4 text-blue-600 rounded" />
                <span class="ml-2">Low Stock</span>
              </label>

              <label class="flex items-center py-1 cursor-pointer">
                <input type="checkbox" value="high" v-model="selectedUrgencies" class="w-4 h-4 text-blue-600 rounded" />
                <span class="ml-2">Out of Stock</span>
              </label>
            </div>
          </div>

          <div class="relative">
            <button @click.stop="showTypeFilter = !showTypeFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700">
              หมวดหมู่
              <img src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200" :class="{ 'rotate-180': showTypeFilter }"
                alt="toggle" />
            </button>
            <div v-if="showTypeFilter"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10">
              <label v-for="opt in typeOptions" :key="opt.value" class="flex items-center py-1">
                <input type="checkbox" :value="opt.value" v-model="selectedTypes"
                  class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">{{ opt.label }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Table -->
    <div class="p-3 mx-auto max-w-8xl">
      <TableComponent :columns="columns" :rows="filteredRows" :perPage="10" mode="user" @delete="handleDelete"
        @detail="goToDetail" @edit="goToEdit" />
    </div>

    <div v-if="showAddModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-sans"
      @click.self="closeAddModal">
      <div
        class="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto relative animate-fade-in-up">

        <div class="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div class="bg-blue-700 text-white rounded p-1 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 class="text-lg font-bold text-black">เพิ่มรายการของ</h2>
          </div>
          <button @click="closeAddModal" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6">
          <form @submit.prevent="confirmAddItem">

            <div class="mb-4">
              <label class="block text-sm font-medium text-black mb-1">
                ชื่อรายการ <span class="text-red-500">*</span>
              </label>
              <span class="text-xs text-gray-400 block mb-1">กรอกชื่อรายการของที่ต้องการเพิ่ม</span>
              <input v-model="formdata.name" type="text" :class="[
                'text-black placeholder-gray-400 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-700 transition-all]',
                addErrors.name ? 'border-red-500' : 'border-gray-300'
              ]" placeholder="กรุณากรอกชื่อรายการ" />
              <p v-if="addErrors.name" class="text-red-500 text-sm mt-1">{{ addErrors.name }}</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-black ">
                  หมายเลขเลขครุภัณฑ์
                </label>
                <span class="text-xs text-gray-400 block mb-1">กรอกหมายเลขครุภัณฑ์ (ถ้ามี)</span>
                <input v-model="formdata.asset_no" type="text"
                  class="text-black w-full px-3 py-2 border-gray-400 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 transition-all"
                  placeholder="กรุณากรอกเลขครุภัณฑ์" />
              </div>

              <div>
                <label class="block text-sm font-medium text-black">
                  หมวดหมู่ <span class="text-red-500">*</span>
                </label>
                <span class="text-xs text-gray-400 block mb-1">โปรดเลือกหมวดหมู่รายการ</span>
                <select v-model="formdata.ct_id" :class="[
                  'text-black placeholder-gray-400 w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all',
                  addErrors.type_id ? 'border-red-500' : 'border-gray-300'
                ]">
                  <option value="" disabled selected>กรุณาเลือกหมวดหมู่รายการ</option>
                  <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <p v-if="addErrors.type_id" class="text-red-500 text-sm mt-1">{{ addErrors.type_id }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-black mb-1">
                  จำนวน <span class="text-red-500">*</span>
                </label>
                <input v-model="formdata.quantity" type="number" min="1" :class="[
                  'text-black placeholder-gray-400 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all',
                  addErrors.quantity ? 'border-red-500' : 'border-gray-300'
                ]" placeholder="กรุณากรอกจำนวน" />
                <p v-if="addErrors.quantity" class="text-red-500 text-sm mt-1">{{ addErrors.quantity }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-black mb-1">
                  หน่วยนับ <span class="text-red-500">*</span>
                </label>
                <input v-model="formdata.unit" type="text" :class="[
                  'text-black placeholder-gray-400 placeholder-gray-400 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all',
                  addErrors.unit ? 'border-red-500' : 'border-gray-300'
                ]" placeholder="กรุณากรอกหน่วยนับ" />
                <p v-if="addErrors.unit" class="text-red-500 text-sm mt-1">{{ addErrors.unit }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 mb-8">
              <div>
                <label class="block text-sm font-medium text-black mb-1">
                  สถานะ <span class="text-red-500">*</span>
                </label>
                <select v-model="formdata.status"
                  class="text-black placeholder-gray-400 w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all">
                  <option value="" disabled selected>กรุณาเลือกสถานะ</option>
                  <option value="active">พร้อมใช้งาน</option>
                  <option value="inactive">ไม่พร้อมใช้งาน</option>
                </select>
              </div>
            </div>

            <div class="flex flex-col flex-1 mb-6">
              <label v-if="filePreview.length === 0" for="dropzone-file" :class="[
                'flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition flex-1 min-h-[220px] sm:min-h-[280px] mb-4',
                isDragOver
                  ? 'border-blue-400 bg-blue-50 scale-105'
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100',
              ]" @dragover.prevent="handleDragOver" @dragleave.prevent="handleDragLeave" @drop.prevent="handleDrop">

                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                  <div :class="['transition-all duration-200', isDragOver ? 'scale-110' : '']">
                    <img src="/icon/image-up-icon.svg"
                      :class="['w-10 h-10 mb-2', isDragOver ? 'opacity-80' : 'opacity-70']" />
                  </div>

                  <p :class="[
                    'text-sm mb-1',
                    isDragOver ? 'text-blue-600 font-semibold' : 'text-gray-500',
                  ]">
                    <span class="font-semibold">
                      {{ isDragOver ? 'วางรูปภาพที่นี่' : 'คลิกเพื่อเลือกรูปภาพ' }}
                    </span>
                  </p>

                  <p class="text-xs text-gray-400 mt-1">
                    รองรับรูปภาพเท่านั้น (สูงสุด 1 รูป)
                  </p>
                  <p class="text-xs text-gray-500 mt-1">สามารถแนบรูปภาพประกอบได้</p>

                  <div class="flex items-center gap-2 mt-2">
                    <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">JPG</span>
                    <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">PNG</span>
                    <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">WEBP</span>
                  </div>
                </div>

                <input id="dropzone-file" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
              </label>

              <div v-else class="w-full border rounded-lg p-4 bg-gray-50 relative mb-4">
                <div class="flex items-start gap-4">
                  <div class="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                    <img :src="filePreview[0].url" :alt="filePreview[0].name" class="w-full h-full object-cover" />
                  </div>

                  <div class="flex-1 min-w-0 pt-1">
                    <p class="text-sm font-semibold text-gray-900 truncate">{{ filePreview[0].name }}</p>
                    <p class="text-xs text-gray-500 mt-1">
                      ขนาด: {{ (filePreview[0].size / 1024 / 1024).toFixed(2) }} MB
                    </p>
                    <p class="text-xs text-green-600 mt-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20"
                        fill="currentColor">
                        <path fill-rule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clip-rule="evenodd" />
                      </svg>
                      อัปโหลดพร้อมบันทึก
                    </p>
                  </div>
                </div>

                <button @click.prevent="removeFile(0)"
                  class="absolute top-2 right-2 p-1 bg-white rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 shadow-sm transition-colors"
                  title="ลบรูปภาพ">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="flex justify-end gap-4 pt-4 border-t border-gray-100 border-dashed">
              <button type="button" @click="closeAddModal"
                class="px-8 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md transition-colors font-medium shadow-sm text-sm">
                ยกเลิก
              </button>

              <button type="button" @click="confirmAddItem"
                class="px-8 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md transition-colors font-medium shadow-sm text-sm">
                บันทึก
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  </div>
</template>
