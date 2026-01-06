<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import TableComponent from '@/components/table-component.vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
const router = useRouter()

function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    Authorization: `Bearer ${token}`,
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
const categoriesLoaded = ref(false)
const categoryFilter = ref([])

const fetchCategories = async () => {
  try {
    if (categoriesLoaded.value) return

    const res = await fetch(`${API_BASE}/category`, { headers: getAuthHeaders() })
    if (!res.ok) throw new Error(`โหลดหมวดหมู่ไม่สำเร็จ (${res.status})`)

    const data = await res.json()
    // ใช้ชื่อหมวดหมู่ (ct_name) โดยตรง
    typeOptions.value = (data || []).map((cat) => cat.ct_name)

    categoriesLoaded.value = true
  } catch (err) {
    console.error('fetchCategories error:', err)
  }
}

// --- Maps / Table Rows ---
const allRows = ref([])  // เก็บข้อมูลดิบทั้งหมด
const assetToIdMap = ref({})
const pdIdToCategoryIdMap = ref({})
const pdIdToImageMap = ref({})
const stockStatusMap = ref({})  // map: pdId -> 'in_stock' | 'low_stock' | 'out_of_stock'

// --- Computed: Filtered Rows (กรองข้อมูลตามเงื่อนไข) ---
const filteredRows = computed(() => {
  return allRows.value.filter((row) => {
    const pdId = row[0]
    const assetCode = String(row[1] || '').toLowerCase()
    const name = String(row[2] || '').toLowerCase()
    const categoryName = row[3]
    const query = searchQuery.value.toLowerCase()

    // 1. กรองตามคำค้นหา (ชื่อ หรือ รหัสครุภัณฑ์)
    const matchSearch = !query || name.includes(query) || assetCode.includes(query)

    // 2. กรองตามหมวดหมู่ (ใช้ชื่อหมวดหมู่โดยตรง)
    const matchCategory = selectedTypes.value.length === 0 ||
      selectedTypes.value.includes(categoryName)

    // 3. กรองตามสถานะ stock
    const stockStatus = stockStatusMap.value[pdId]
    const matchStatus = selectedStatuses.value.length === 0 ||
      selectedStatuses.value.includes(stockStatus)

    return matchSearch && matchCategory && matchStatus
  })
})

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

    if (!res.ok) throw new Error(`โหลด stock ไม่สำเร็จ (${res.status})`)

    const data = await res.json()

    // reset maps
    pdIdToCategoryIdMap.value = {}
    pdIdToImageMap.value = {}
    stockStatusMap.value = {}

    allRows.value = (data || []).map((item) => {
      const pdId = item.pd_id != null ? String(item.pd_id) : '-'
      const assetCode = item.pd_asset_code ?? '-'
      const quantity = item.pd_quantity ?? 0

      // map: pdId -> categoryId
      const categoryId =
        item.pd_category_id != null && item.pd_category_id !== ''
          ? Number(item.pd_category_id)
          : null
      pdIdToCategoryIdMap.value[pdId] = categoryId

      // map: pdId -> image filename (เก็บแยก ไม่โชว์บนตาราง)
      pdIdToImageMap.value[pdId] = item.pd_upload_image ?? null

      // map: pdId -> stock status (สำหรับ filter) - คำนวณจากจำนวนสินค้า
      let stockStatus = 'in_stock'
      let stockStatusLabel = 'พร้อมใช้งาน'
      if (quantity <= 0) {
        stockStatus = 'out_of_stock'
        stockStatusLabel = 'สินค้าหมด'
      } else if (quantity < 10) {
        stockStatus = 'low_stock'
        stockStatusLabel = 'ใกล้หมด'
      }
      stockStatusMap.value[pdId] = stockStatus

      // rows สำหรับตาราง (ไม่มีชื่อไฟล์)
      return [
        pdId, // [0] PK
        assetCode, // [1]
        item.pd_name ?? '-', // [2]
        item.ct_name ?? '-', // [3]
        quantity, // [4]
        item.units_name ?? '-', // [5]
        stockStatusLabel, // [6]
        'actions', // [7]
      ]
    })

    // อัพเดท summary counts
    itemsCount.value = allRows.value.length
    itemRequestDeclined.value = Object.values(stockStatusMap.value).filter(s => s === 'low_stock' || s === 'out_of_stock').length
  } catch (error) {
    console.error('Error fetching stock data:', error)
    Swal.fire('ผิดพลาด', error.message || 'ไม่สามารถดึงข้อมูลสินค้าได้', 'error')
  }
}



// Load categories เมื่อ component mount
onMounted(() => {
  fetchCategories()
  fetchAllStock()
  document.addEventListener('click', closeDropdown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown)
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
  pd_upload_image: null,
})

// --- Form Validation Errors ---
const addErrors = ref({})

// --- Filter & Search ---
const searchQuery = ref('')
const selectedStatuses = ref([])  // 'in_stock' | 'low_stock' | 'out_of_stock'
const selectedTypes = ref([])
const itemsCount = ref(0)
const itemsNew = ref(0)
const itemRequestWaiting = ref(0)
const itemRequestDeclined = ref(0)
const itemNewToday = ref(0)


// --- Methods ---

// Clear all filters
const clearFilters = () => {
  searchQuery.value = ''
  selectedStatuses.value = []
  selectedTypes.value = []
}

// Close dropdown when clicking outside
const closeDropdown = (e) => {
  if (!e.target.closest('.relative')) {
    showStatusFilter.value = false
    showTypeFilter.value = false
  }
}

// 1. Reset & Close Modal
const closeAddModal = () => {
  showAddModal.value = false
  formdata.value = {
    name: '',
    asset_no: '',
    ct_id: '',
    quantity: '',
    unit: '',
    status: 'active',
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
  filePreview.value = [
    {
      file: file,
      name: file.name,
      size: file.size,
      url: url,
    },
  ]
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
        Authorization: `Bearer ${token}`,
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

    // Toast notification
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
      }
    })
    Toast.fire({
      title: 'สำเร็จ!',
      text: 'บันทึกรายการสำเร็จ!',
      icon: 'success',
      background: '#f0f9ff',
      color: '#1e3a8a'
    })

    closeAddModal()
  } catch (error) {
    console.error('Error adding item:', error)
    // Toast notification
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    })
    Toast.fire({
      title: 'ผิดพลาด!',
      text: error.message || 'เกิดข้อผิดพลาดในการบันทึกรายการ',
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626'
    })
  }
}

// --- Mock Action Methods ---
const handleDelete = async (pdIdFromTable) => {
  const pdId = String(pdIdFromTable ?? '')

  if (!pdId) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: 'ไม่พบรายการสินค้า',
      showConfirmButton: false,
      timer: 3000,
    })
    return
  }

  Swal.fire({
    title: 'ยืนยันการลบ',
    text: 'คุณต้องการลบรายการนี้ใช่หรือไม่?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'ลบ',
    cancelButtonText: 'ยกเลิก',
  }).then(async (result) => {
    if (!result.isConfirmed) return

    try {
      const res = await fetch(`${API_BASE}/delete-stock/${pdId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      let resultData = {}
      const contentType = res.headers.get('content-type')

      if (contentType && contentType.includes('application/json')) {
        resultData = await res.json()
      }

      if (!res.ok) {
        throw new Error(resultData.message || 'ลบไม่สำเร็จ')
      }

      // success toast
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'ลบเรียบร้อย',
        showConfirmButton: false,
        timer: 2000,
      })

      fetchAllStock()
    } catch (error) {
      // error toast (แบบเดียวกับตอนเพิ่ม)
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'ผิดพลาด',
        text: error.message || 'เกิดข้อผิดพลาดในการลบรายการ',
        showConfirmButton: false,
        timer: 3000,
      })
    }
  })
}


const goToDetail = (pdIdFromTable) => {
  const pdId = String(pdIdFromTable ?? '')
  if (!pdId) return
  router.push(`/stock/detail/${pdId}`)
}


const goToEdit = (valueFromTable) => {
  let row = null

  // กรณีส่งมาเป็น index
  if (typeof valueFromTable === 'number' && allRows.value[valueFromTable]) {
    row = allRows.value[valueFromTable]
  }

  // กรณีส่งมาเป็น id หรือ asset_code
  if (!row) {
    row = allRows.value.find(
      (r) => r[0] === valueFromTable || r[1] === valueFromTable
    )
  }

  if (!row) {
    Swal.fire('ผิดพลาด', 'ไม่พบข้อมูลสำหรับแก้ไข', 'error')
    return
  }

  editingPdId.value = row[0]

  editForm.value = {
    name: row[2],
    asset_no: row[1],
    ct_id: pdIdToCategoryIdMap.value[row[0]] !== null
           ? Number(pdIdToCategoryIdMap.value[row[0]])
           : null,  // fallback เป็น null
    quantity: row[4],
    unit: row[5],
    status: row[6] === 'พร้อมใช้งาน' ? 'active' : 'inactive',
    upload_image: row.pd_upload_image || null,
  }

  editFilePreview.value = []
  console.log('editForm.ct_id:', editForm.value.ct_id);
  console.log('typeOptions:', typeOptions.value);
  showEditModal.value = true
}

// edit function
const showEditModal = ref(false)
const editingPdId = ref(null)
const editFilePreview = ref([])
const isEditDragOver = ref(false)
const editErrors = ref({})

const editForm = ref({
  name: '',
  asset_no: '',
  ct_id: '',
  quantity: '',
  unit: '',
  status: 'active',
  upload_image: null,
})

const closeEditModal = () => {
  showEditModal.value = false
  editingPdId.value = null
  editFilePreview.value = []

  editForm.value = {
    name: '',
    asset_no: '',
    ct_id: '',
    quantity: '',
    unit: '',
    status: 'active',
    upload_image: null,
  }
}

const confirmEditItem = async () => {
  try {
    if (!editingPdId.value) {
      throw new Error('ไม่พบรหัสสินค้าที่จะแก้ไข')
    }

    // (Validation อย่างง่ายสำหรับ Edit)
    editErrors.value = {}
    if (!editForm.value.name) editErrors.value.name = 'กรุณากรอกชื่อรายการ'
    if (!editForm.value.quantity) editErrors.value.quantity = 'กรุณากรอกจำนวน'
    if (!editForm.value.unit) editErrors.value.unit = 'กรุณากรอกหน่วยนับ'

    if (Object.keys(editErrors.value).length > 0) return

    const formData = new FormData()

    // ---------- field ปกติ ----------
    formData.append('pd_name', editForm.value.name)
    formData.append('pd_asset_code', editForm.value.asset_no)
    formData.append('pd_quantity', editForm.value.quantity)
    formData.append('pd_unit_id', editForm.value.unit)
    formData.append('status', editForm.value.status)

    // ---------- Category ----------
    if (editForm.value.ct_id) {
      formData.append('pd_category_id', editForm.value.ct_id)
    }

    // ---------- รูปภาพ (แก้ไขใหม่) ----------
    // ต้องเช็คว่ามีไฟล์ใหม่ใน editFilePreview หรือไม่ และต้องดึง .file ออกมา
    if (editFilePreview.value && editFilePreview.value.length > 0) {
      formData.append('pd_upload_image', editFilePreview.value[0].file)
    }

    const res = await fetch(
      `${API_BASE}/update-stock/${editingPdId.value}`,
      {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(), // ห้ามใส่ Content-Type เมื่อส่ง FormData
        },
        body: formData,
      }
    )

    const result = await res.json()

    if (!res.ok) {
      throw new Error(result.message || 'แก้ไขข้อมูลไม่สำเร็จ')
    }

    // ---------- success ----------
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'แก้ไขข้อมูลสำเร็จ',
      showConfirmButton: false,
      timer: 2000,
    })

    closeEditModal()
    fetchAllStock()
  } catch (error) {
    Swal.fire('ผิดพลาด', error.message, 'error')
  }
}

const handleEditDragOver = () => {
  isEditDragOver.value = true
}

const handleEditDragLeave = () => {
  isEditDragOver.value = false
}

const handleEditDrop = (e) => {
  isEditDragOver.value = false
  processEditFile(e.dataTransfer.files)
}

const handleEditFileUpload = (e) => {
  processEditFile(e.target.files)
  e.target.value = ''
}

const processEditFile = (files) => {
  if (!files || files.length === 0) return
  const file = files[0]

  if (!file.type.startsWith('image/')) {
    alert('กรุณาอัปโหลดเฉพาะรูปภาพ')
    return
  }

  editFilePreview.value = [
    {
      file,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
    },
  ]
}

const removeEditFile = () => {
  editFilePreview.value = []
}

const openEditModal = async (pdIdFromTable) => {
  await fetchCategories()
  await nextTick()

  const pdId = String(pdIdFromTable ?? '')
  const row = allRows.value.find((r) => String(r[0]) === pdId)

  if (!row) {
    Swal.fire('ผิดพลาด', 'ไม่พบข้อมูลสำหรับแก้ไข', 'error')
    return
  }

  // category
  let categoryId = pdIdToCategoryIdMap.value[pdId]
  if (categoryId == null) {
    const categoryName = row[3]
    const found = typeOptions.value.find((o) => o.label === categoryName)
    categoryId = found ? found.value : null
  }

  // รูปเก่าจาก map
  const oldImage = pdIdToImageMap.value[pdId] ?? null

  editForm.value = {
    name: row[2],
    asset_no: row[1] === '-' ? '' : row[1],
    ct_id: categoryId != null ? String(categoryId) : '',
    quantity: row[4],
    unit: row[5],
    status: row[6] === 'พร้อมใช้งาน' ? 'active' : 'inactive',
    upload_image: oldImage, // เอามาโชว์ใน edit modal
  }

  editingPdId.value = pdId
  editFilePreview.value = [] // เคลียร์รูปใหม่ที่ค้าง
  showEditModal.value = true
  console.log('pdId:', pdId)
  console.log('image from map:', pdIdToImageMap.value[pdId])
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-8xl container px-5 py-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">รายการคลัง</h1>
      <button
        @click="showAddModal = true"
        class="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md flex items-center shadow-sm transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
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

    <div class="mb-6 relative z-40">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหารายการของ"
            class="text-gray-700 w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          <div class="relative">
            <button
              @click.stop="showStatusFilter = !showStatusFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 hover:bg-gray-50"
            >
              สถานะ
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200"
                :class="{ 'rotate-180': showStatusFilter }"
              />
            </button>

            <div
              v-if="showStatusFilter"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10"
            >
              <label class="flex items-center py-1 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  value="in_stock"
                  v-model="selectedStatuses"
                  class="w-4 h-4 text-green-600 rounded"
                />
                <span class="ml-2">พร้อมใช้งาน (In Stock)</span>
              </label>

              <label class="flex items-center py-1 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  value="low_stock"
                  v-model="selectedStatuses"
                  class="w-4 h-4 text-orange-500 rounded"
                />
                <span class="ml-2">ใกล้หมด (Low Stock)</span>
              </label>

              <label class="flex items-center py-1 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  value="out_of_stock"
                  v-model="selectedStatuses"
                  class="w-4 h-4 text-red-600 rounded"
                />
                <span class="ml-2">สินค้าหมด (Out of Stock)</span>
              </label>
            </div>
          </div>

          <div class="relative">
            <button
              @click.stop="showTypeFilter = !showTypeFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700"
            >
              หมวดหมู่
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200"
                :class="{ 'rotate-180': showTypeFilter }"
                alt="toggle"
              />
            </button>
            <div
              v-if="showTypeFilter"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10 max-h-60 overflow-y-auto"
            >
              <div v-if="typeOptions.length === 0" class="text-gray-400 text-sm p-2">ไม่มีข้อมูล</div>
              <label v-for="category in typeOptions" :key="category" class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  :value="category"
                  v-model="selectedTypes"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span class="ml-2">{{ category }}</span>
              </label>
            </div>
          </div>

          <!-- ปุ่มล้าง filter -->
          <transition name="fade">
            <button
              v-if="searchQuery || selectedStatuses.length || selectedTypes.length"
              @click="clearFilters"
              class="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ล้างตัวกรอง
            </button>
          </transition>
        </div>
      </div>
    </div>
    <!-- Table -->
    <div class="p-3 mx-auto max-w-8xl">
      <TableComponent
        :columns="columns"
        :rows="filteredRows"
        :perPage="10"
        mode="full"
        :idColumnIndex="0"
        @delete="handleDelete"
        @edit="openEditModal"
        @detail="goToDetail"
      />
    </div>

    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-sans"
      @click.self="closeAddModal"
    >
      <div
        class="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto relative animate-fade-in-up"
      >
        <div class="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div class="bg-blue-700 text-white rounded p-1 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="3"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 class="text-lg font-bold text-black">เพิ่มรายการของ</h2>
          </div>
          <button
            @click="closeAddModal"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
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
              <input
                v-model="formdata.name"
                type="text"
                :class="[
                  'text-black placeholder-gray-400 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-700 transition-all]',
                  addErrors.name ? 'border-red-500' : 'border-gray-300',
                ]"
                placeholder="กรุณากรอกชื่อรายการ"
              />
              <p v-if="addErrors.name" class="text-red-500 text-sm mt-1">{{ addErrors.name }}</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-black"> หมายเลขเลขครุภัณฑ์ </label>
                <span class="text-xs text-gray-400 block mb-1">กรอกหมายเลขครุภัณฑ์ (ถ้ามี)</span>
                <input
                  v-model="formdata.asset_no"
                  type="text"
                  class="text-black w-full px-3 py-2 border-gray-400 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 transition-all"
                  placeholder="กรุณากรอกเลขครุภัณฑ์"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-black">
                  หมวดหมู่ <span class="text-red-500">*</span>
                </label>
                <span class="text-xs text-gray-400 block mb-1">โปรดเลือกหมวดหมู่รายการ</span>
                <select
                  v-model="formdata.ct_id"
                  :class="[
                    'text-black placeholder-gray-400 w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all',
                    addErrors.type_id ? 'border-red-500' : 'border-gray-300',
                  ]"
                >
                  <option value="" disabled>กรุณาเลือกหมวดหมู่รายการ</option>
                  <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <p v-if="addErrors.type_id" class="text-red-500 text-sm mt-1">
                  {{ addErrors.type_id }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-black mb-1">
                  จำนวน <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formdata.quantity"
                  type="number"
                  min="1"
                  :class="[
                    'text-black placeholder-gray-400 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all',
                    addErrors.quantity ? 'border-red-500' : 'border-gray-300',
                  ]"
                  placeholder="กรุณากรอกจำนวน"
                />
                <p v-if="addErrors.quantity" class="text-red-500 text-sm mt-1">
                  {{ addErrors.quantity }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-black mb-1">
                  หน่วยนับ <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formdata.unit"
                  type="text"
                  :class="[
                    'text-black placeholder-gray-400 placeholder-gray-400 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all',
                    addErrors.unit ? 'border-red-500' : 'border-gray-300',
                  ]"
                  placeholder="กรุณากรอกหน่วยนับ"
                />
                <p v-if="addErrors.unit" class="text-red-500 text-sm mt-1">{{ addErrors.unit }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 mb-8">
              <div>
                <label class="block text-sm font-medium text-black mb-1">
                  สถานะ <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="formdata.status"
                  class="text-black placeholder-gray-400 w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                >
                  <option value="" disabled>กรุณาเลือกสถานะ</option>
                  <option value="active">พร้อมใช้งาน</option>
                  <option value="inactive">ไม่พร้อมใช้งาน</option>
                </select>
              </div>
            </div>

            <div class="flex flex-col flex-1 mb-6">
              <label
                v-if="filePreview.length === 0"
                for="dropzone-file"
                :class="[
                  'flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition flex-1 min-h-[220px] sm:min-h-[280px] mb-4',
                  isDragOver
                    ? 'border-blue-400 bg-blue-50 scale-105'
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100',
                ]"
                @dragover.prevent="handleDragOver"
                @dragleave.prevent="handleDragLeave"
                @drop.prevent="handleDrop"
              >
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                  <div :class="['transition-all duration-200', isDragOver ? 'scale-110' : '']">
                    <img
                      src="/icon/image-up-icon.svg"
                      :class="['w-10 h-10 mb-2', isDragOver ? 'opacity-80' : 'opacity-70']"
                    />
                  </div>

                  <p
                    :class="[
                      'text-sm mb-1',
                      isDragOver ? 'text-blue-600 font-semibold' : 'text-gray-500',
                    ]"
                  >
                    <span class="font-semibold">
                      {{ isDragOver ? 'วางรูปภาพที่นี่' : 'คลิกเพื่อเลือกรูปภาพ' }}
                    </span>
                  </p>

                  <p class="text-xs text-gray-400 mt-1">รองรับรูปภาพเท่านั้น (สูงสุด 1 รูป)</p>
                  <p class="text-xs text-gray-500 mt-1">สามารถแนบรูปภาพประกอบได้</p>

                  <div class="flex items-center gap-2 mt-2">
                    <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">JPG</span>
                    <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">PNG</span>
                    <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">WEBP</span>
                  </div>
                </div>

                <input
                  id="dropzone-file"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleFileUpload"
                />
              </label>

              <div v-else class="w-full border rounded-lg p-4 bg-gray-50 relative mb-4">
                <div class="flex items-start gap-4">
                  <div
                    class="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0"
                  >
                    <img
                      :src="filePreview[0].url"
                      :alt="filePreview[0].name"
                      class="w-full h-full object-cover"
                    />
                  </div>

                  <div class="flex-1 min-w-0 pt-1">
                    <p class="text-sm font-semibold text-gray-900 truncate">
                      {{ filePreview[0].name }}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                      ขนาด: {{ (filePreview[0].size / 1024 / 1024).toFixed(2) }} MB
                    </p>
                    <p class="text-xs text-green-600 mt-2 flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      อัปโหลดพร้อมบันทึก
                    </p>
                  </div>
                </div>

                <button
                  @click.prevent="removeFile(0)"
                  class="absolute top-2 right-2 p-1 bg-white rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 shadow-sm transition-colors"
                  title="ลบรูปภาพ"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div class="flex justify-end gap-4 pt-4 border-t border-gray-100 border-dashed">
              <button
                type="button"
                @click="closeAddModal"
                class="px-8 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md transition-colors font-medium shadow-sm text-sm"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                @click="confirmAddItem"
                class="px-8 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md transition-colors font-medium shadow-sm text-sm"
              >
                บันทึก
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-sans"
      @click.self="closeEditModal"
    >
      <div
        class="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto relative animate-fade-in-up"
      >
        <div class="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div class="bg-orange-500 text-white rounded p-1 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h2 class="text-lg font-bold text-black">แก้ไขรายการของ</h2>
          </div>
          <button
            @click="closeEditModal"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6">
          <form @submit.prevent="confirmEditItem">
            <div class="mb-4">
              <label class="block text-sm font-medium text-black mb-1">
                ชื่อรายการ <span class="text-red-500">*</span>
              </label>
              <span class="text-xs text-gray-400 block mb-1">กรอกชื่อรายการของที่ต้องการแก้ไข</span>
              <input
                v-model="editForm.name"
                type="text"
                class="text-black placeholder-gray-400 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 transition-all"
                placeholder="กรุณากรอกชื่อรายการ"
              />
              <p v-if="editErrors?.name" class="text-red-500 text-sm mt-1">{{ editErrors.name }}</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-black"> หมายเลขเลขครุภัณฑ์ </label>
                <span class="text-xs text-gray-400 block mb-1">กรอกหมายเลขครุภัณฑ์ (ถ้ามี)</span>
                <input
                  v-model="editForm.asset_no"
                  type="text"
                  class="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 placeholder-gray-400 transition-all"
                  placeholder="กรุณากรอกเลขครุภัณฑ์"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-black">
                  หมวดหมู่ <span class="text-red-500">*</span>
                </label>
                <span class="text-xs text-gray-400 block mb-1">โปรดเลือกหมวดหมู่รายการ</span>
                <select v-model="editForm.ct_id" class="text-black w-full px-3 py-2 border border-gray-300 focus:ring-1 rounded-md bg-white">
                  <option value="" disabled>กรุณาเลือกหมวดหมู่</option>
                  <option v-for="opt in typeOptions" :key="opt.value" :value="String(opt.value)">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-black mb-1">
                  จำนวน <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="editForm.quantity"
                  type="number"
                  min="1"
                  class="text-black placeholder-gray-400 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 transition-all"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-black mb-1">
                  หน่วยนับ <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="editForm.unit"
                  type="text"
                  class="text-black placeholder-gray-400 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 transition-all"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 mb-8">
              <div>
                <label class="block text-sm font-medium text-black mb-1">
                  สถานะ <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="editForm.status"
                  class="text-black placeholder-gray-400 w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 transition-all"
                >
                  <option value="active">พร้อมใช้งาน</option>
                  <option value="inactive">ไม่พร้อมใช้งาน</option>
                </select>
              </div>
            </div>

            <div class="flex flex-col flex-1 mb-6">
              <label class="block text-sm font-medium text-black mb-2">รูปภาพสินค้า</label>

              <label
                v-if="editFilePreview.length === 0 && !editForm.upload_image"
                for="dropzone-file-edit"
                :class="[
                  'flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition flex-1 min-h-[200px] mb-4',
                  isEditDragOver ? 'border-orange-400 bg-orange-50 scale-105' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                ]"
                @dragover.prevent="handleEditDragOver"
                @dragleave.prevent="handleEditDragLeave"
                @drop.prevent="handleEditDrop"
              >
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                  <img src="/icon/image-up-icon.svg" class="w-10 h-10 mb-2 opacity-70" />
                  <p class="text-xs text-gray-400 mt-1">รองรับรูปภาพเท่านั้น (สูงสุด 1 รูป)</p>
                  <p class="text-xs text-gray-500 mt-1">สามารถแนบรูปภาพประกอบได้</p>

                  <div class="flex items-center gap-2 mt-2">
                    <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">JPG</span>
                    <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">PNG</span>
                    <span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">WEBP</span>
                  </div>
                </div>
                <input id="dropzone-file-edit" type="file" accept="image/*" class="hidden" @change="handleEditFileUpload" />
              </label>

              <div v-else-if="editFilePreview.length === 0 && editForm.upload_image" class="mb-4">
                 <div class="relative w-full h-64 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center overflow-hidden group">
                    <img :src="`${API_BASE}/uploads/${editForm.upload_image}`" class="h-full object-contain" alt="Current Image" />

                    <label for="dropzone-file-edit-replace" class="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span class="font-semibold">คลิกเพื่อเปลี่ยนรูปภาพ</span>
                    </label>
                    <input id="dropzone-file-edit-replace" type="file" accept="image/*" class="hidden" @change="handleEditFileUpload" />
                 </div>
                 <p class="text-xs text-gray-500 mt-2 text-center">รูปภาพปัจจุบัน (อัปโหลดใหม่เพื่อแทนที่)</p>
              </div>

              <div v-else class="w-full border rounded-lg p-4 bg-gray-50 relative mb-4">
                <div class="flex items-start gap-4">
                  <div class="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                    <img :src="editFilePreview[0].url" class="w-full h-full object-cover" />
                  </div>
                  <div class="flex-1 min-w-0 pt-1">
                    <p class="text-sm font-semibold text-gray-900 truncate">{{ editFilePreview[0].name }}</p>
                    <p class="text-xs text-green-600 mt-2">กำลังจะบันทึกรูปภาพใหม่...</p>
                  </div>
                  <button
                    @click.prevent="removeEditFile"
                    class="absolute top-2 right-2 p-1 bg-white rounded-full text-gray-400 hover:text-red-500 border shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-4 pt-4 border-t border-gray-100 border-dashed">
              <button
                type="button"
                @click="closeEditModal"
                class="px-8 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md transition-colors font-medium shadow-sm text-sm"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                class="px-8 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors font-medium shadow-sm text-sm"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
