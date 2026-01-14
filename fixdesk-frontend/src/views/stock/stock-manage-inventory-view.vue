<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import TableComponent from '@/components/table-component.vue'
import TableActions from '@/components/table-actions-component.vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'

defineOptions({ name: 'StockManageInventoryView' })

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE

const openMenuId = ref(null)

function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    Authorization: `Bearer ${token}`,
  }
}

// --- Table Columns ---
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

// --- State Variables ---
const typeOptions = ref([])
const categoriesLoaded = ref(false)
const allRows = ref([])
const pdIdToCategoryIdMap = ref({})
const pdIdToImageMap = ref({})
const stockStatusMap = ref({})

// --- Unified Form State ---
const showItemModal = ref(false)
const isEditMode = ref(false)
const editingPdId = ref(null)
const filePreview = ref([]) // Unified file preview for both add/edit
const isDragOver = ref(false)
const formErrors = ref({}) // Unified error state

const itemForm = ref({
  name: '',
  asset_no: '',
  ct_id: '',
  quantity: '',
  unit: '',
  status: 'active',
  upload_image: null,
})

// --- Watchers for Validation ---
watch(() => itemForm.value.name, (val) => {
  if (formErrors.value.name && val) formErrors.value.name = ''
})
watch(() => itemForm.value.ct_id, (val) => {
  if (formErrors.value.type_id && val) formErrors.value.type_id = ''
})
watch(() => itemForm.value.quantity, (val) => {
  if (formErrors.value.quantity && val && val > 0) formErrors.value.quantity = ''
})
watch(() => itemForm.value.unit, (val) => {
  if (formErrors.value.unit && val) formErrors.value.unit = ''
})

// --- Filter State ---
const searchQuery = ref('')
const selectedStatuses = ref([])
const selectedTypes = ref([])
const showStatusFilter = ref(false)
const showTypeFilter = ref(false)

// --- Summary Counts ---
const itemsCount = ref(0)
const itemsNew = ref(0)
const itemRequestWaiting = ref(0)
const itemRequestDeclined = ref(0)
const itemNewToday = ref(0)

// --- Category Management State ---
const showManageCategoryModal = ref(false)
const manageCategoryList = ref([])

// --- Computed: Filtered Rows ---
const filteredRows = computed(() => {
  return allRows.value.filter((row) => {
    const pdId = row[0]
    const assetCode = String(row[1] || '').toLowerCase()
    const name = String(row[2] || '').toLowerCase()
    const categoryName = row[3]
    const query = searchQuery.value.toLowerCase()

    // 1. Filter by Search
    const matchSearch = !query || name.includes(query) || assetCode.includes(query)

    // 2. Filter by Category
    const matchCategory =
      selectedTypes.value.length === 0 || selectedTypes.value.includes(categoryName)

    // 3. Filter by Status
    const stockStatus = stockStatusMap.value[pdId]
    const matchStatus =
      selectedStatuses.value.length === 0 || selectedStatuses.value.includes(stockStatus)

    return matchSearch && matchCategory && matchStatus
  })
})

// --- API Functions ---

const fetchCategories = async () => {
  try {
    // Always fetch to ensure updated list
    const res = await fetch(`${API_BASE}/category`, { headers: getAuthHeaders() })
    if (!res.ok) throw new Error(`โหลดหมวดหมู่ไม่สำเร็จ (${res.status})`)

    const data = await res.json()
    typeOptions.value = (data || []).map((cat) => ({
      value: String(cat.ct_id),
      label: cat.ct_name
    }))
    categoriesLoaded.value = true
  } catch (err) {
    console.error('fetchCategories error:', err)
  }
}

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

      // map: pdId -> image filename
      pdIdToImageMap.value[pdId] = item.pd_upload_image ?? null

      // map: pdId -> stock status
      let stockStatus = 'in_stock'
      if (quantity <= 0) {
        stockStatus = 'out_of_stock'
      } else if (quantity < 10) {
        stockStatus = 'low_stock'
      }

      stockStatusMap.value[pdId] = stockStatus

      return [
        pdId, // 0
        assetCode, // 1
        item.pd_name ?? '-', // 2
        item.ct_name ?? '-', // 3
        quantity, // 4
        item.units_name ?? '-', // 5
        stockStatus, // 6 (Used for status color logic in TableComponent if needed)
        'actions', // 7
      ]
    })

    // Update counts
    itemsCount.value = allRows.value.length
    itemRequestDeclined.value = Object.values(stockStatusMap.value).filter(
      (s) => s === 'low_stock' || s === 'out_of_stock',
    ).length
    // Note: itemsNew, itemRequestWaiting, itemNewToday logic would need backend support or filtering logic
  } catch (error) {
    console.error('Error fetching stock data:', error)
    Swal.fire('ผิดพลาด', error.message || 'ไม่สามารถดึงข้อมูลสินค้าได้', 'error')
  }
}

// --- Modal Logic (Add & Edit) ---

const openAddModal = () => {
  isEditMode.value = false
  editingPdId.value = null
  itemForm.value = {
    name: '',
    asset_no: '',
    ct_id: '',
    quantity: '',
    unit: '',
    status: 'active',
    upload_image: null,
  }
  filePreview.value = []
  formErrors.value = {}
  showItemModal.value = true
}

const openEditModal = async (pdIdFromTable) => {
  await fetchCategories() // Ensure categories are loaded
  await nextTick()

  const pdId = String(pdIdFromTable ?? '')
  const row = allRows.value.find((r) => String(r[0]) === pdId)

  if (!row) {
    Swal.fire('ผิดพลาด', 'ไม่พบข้อมูลสำหรับแก้ไข', 'error')
    return
  }

  isEditMode.value = true
  editingPdId.value = pdId

  // Find category ID
  let categoryId = pdIdToCategoryIdMap.value[pdId]
  // Fallback: search by name if map fails
  if (categoryId == null) {
    const categoryName = row[3]
    const found = typeOptions.value.find((o) => o.label === categoryName)
    categoryId = found ? found.value : ''
  }

  // Load old image for preview if exists (logic can be improved to show existing image)
  const oldImage = pdIdToImageMap.value[pdId]
  // Note: Currently filePreview handles NEW files. Showing existing image would require logic change in template.
  // For now, we clear it so user sees empty upload unless they add a NEW file.
  filePreview.value = []

  itemForm.value = {
    name: row[2],
    asset_no: row[1] === '-' ? '' : row[1],
    ct_id: categoryId != null ? String(categoryId) : '',
    quantity: row[4],
    unit: row[5],
    status: 'active', // Default to active as status logic is derived
    upload_image: null,
  }

  formErrors.value = {}
  showItemModal.value = true
}

const closeItemModal = () => {
  showItemModal.value = false
  filePreview.value = []
  formErrors.value = {}
}

const validateForm = () => {
  const errors = {}
  if (!itemForm.value.name) errors.name = 'กรุณากรอกชื่อรายการ'
  if (!itemForm.value.ct_id) errors.type_id = 'กรุณาเลือกหมวดหมู่'
  if (!itemForm.value.quantity || itemForm.value.quantity <= 0) errors.quantity = 'กรุณากรอกจำนวนที่ถูกต้อง'
  if (!itemForm.value.unit) errors.unit = 'กรุณากรอกหน่วยนับ'

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const submitItemForm = async () => {
  if (!validateForm()) return

  const formData = new FormData()
  formData.append('pd_name', itemForm.value.name)
  formData.append('pd_asset_code', itemForm.value.asset_no)
  formData.append('pd_category_id', itemForm.value.ct_id)
  formData.append('pd_quantity', itemForm.value.quantity)
  formData.append('pd_unit_id', itemForm.value.unit)
  formData.append('status', itemForm.value.status)

  if (filePreview.value.length > 0) {
    formData.append('pd_upload_image', filePreview.value[0].file)
  }

  const url = isEditMode.value
    ? `${API_BASE}/update-stock/${editingPdId.value}`
    : `${API_BASE}/add-stock`

  const method = isEditMode.value ? 'PUT' : 'POST'

  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const res = await fetch(url, {
      method: method,
      headers: { Authorization: `Bearer ${token}` }, // Do NOT set Content-Type for FormData
      body: formData,
    })

    const result = await res.json()

    if (!res.ok) throw new Error(result.message || (isEditMode.value ? 'แก้ไขไม่สำเร็จ' : 'เพิ่มไม่สำเร็จ'))

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: isEditMode.value ? 'แก้ไขข้อมูลสำเร็จ' : 'บันทึกรายการสำเร็จ',
      showConfirmButton: false,
      timer: 2000,
    })

    closeItemModal()
    fetchAllStock()
  } catch (error) {
    console.error('Submit error:', error)
    Swal.fire('ผิดพลาด', error.message, 'error')
  }
}

// --- File Handling ---
const handleDragOver = () => { isDragOver.value = true }
const handleDragLeave = () => { isDragOver.value = false }
const handleDrop = (e) => {
  isDragOver.value = false
  processFile(e.dataTransfer.files)
}
const handleFileUpload = (e) => {
  processFile(e.target.files)
  e.target.value = ''
}
const processFile = (files) => {
  if (!files || files.length === 0) return
  const file = files[0]
  if (!file.type.startsWith('image/')) {
    alert('กรุณาอัปโหลดเฉพาะไฟล์รูปภาพเท่านั้น')
    return
  }
  filePreview.value = [{
    file: file,
    name: file.name,
    size: file.size,
    url: URL.createObjectURL(file),
  }]
}
const removeFile = (idx) => {
  if (filePreview.value.length > idx) filePreview.value.splice(idx, 1)
}

// --- Category Management ---
function openManageCategoryModal() {
  manageCategoryList.value = typeOptions.value.map(opt => ({
    id: opt.value,
    name: opt.label
  }))
  showManageCategoryModal.value = true
  showTypeFilter.value = false
}
function closeManageCategoryModal() { showManageCategoryModal.value = false }

async function handleAddCategory() {
  const { value: name } = await Swal.fire({
    title: 'เพิ่มหมวดหมู่ใหม่',
    input: 'text',
    inputLabel: 'ชื่อหมวดหมู่',
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#2563eb',
    inputValidator: (value) => !value?.trim() ? 'กรุณากรอกชื่อหมวดหมู่' : null
  })
  if (!name) return

  try {
    const res = await fetch(`${API_BASE}/category`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ct_name: name.trim() }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'เพิ่มหมวดหมู่ไม่สำเร็จ')

    categoriesLoaded.value = false
    await fetchCategories()
    manageCategoryList.value = typeOptions.value.map(opt => ({ id: opt.value, name: opt.label }))
    Swal.fire({ icon: 'success', title: 'สำเร็จ', timer: 1500, showConfirmButton: false })
  } catch (err) {
    Swal.fire('ผิดพลาด', err.message, 'error')
  }
}

async function handleEditCategory(cat) {
  const { value: name } = await Swal.fire({
    title: 'แก้ไขหมวดหมู่',
    input: 'text',
    inputValue: cat.name,
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    confirmButtonColor: '#2563eb',
    inputValidator: (value) => !value?.trim() ? 'กรุณากรอกชื่อหมวดหมู่' : null
  })
  if (!name || name.trim() === cat.name) return

  try {
    const res = await fetch(`${API_BASE}/category/${cat.id}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ct_name: name.trim() }),
    })
    if (!res.ok) throw new Error('แก้ไขหมวดหมู่ไม่สำเร็จ')

    categoriesLoaded.value = false
    await fetchCategories()
    await fetchAllStock() // Refresh table as category name might change
    manageCategoryList.value = typeOptions.value.map(opt => ({ id: opt.value, name: opt.label }))
    Swal.fire({ icon: 'success', title: 'สำเร็จ', timer: 1500, showConfirmButton: false })
  } catch (err) {
    Swal.fire('ผิดพลาด', err.message, 'error')
  }
}

async function handleDeleteCategory(cat) {
  const result = await Swal.fire({
    title: 'ยืนยันการลบ',
    text: `ต้องการลบหมวดหมู่ "${cat.name}" หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ลบ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#dc2626',
  })
  if (!result.isConfirmed) return

  try {
    const res = await fetch(`${API_BASE}/category/${cat.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    if (!res.ok) throw new Error('ลบหมวดหมู่ไม่สำเร็จ')

    categoriesLoaded.value = false
    await fetchCategories()
    manageCategoryList.value = typeOptions.value.map(opt => ({ id: opt.value, name: opt.label }))
    Swal.fire({ icon: 'success', title: 'สำเร็จ', timer: 1500, showConfirmButton: false })
  } catch (err) {
    Swal.fire('ผิดพลาด', err.message, 'error')
  }
}

// --- Deletion Logic ---
const handleDelete = async (pdIdFromTable) => {
  const pdId = String(pdIdFromTable ?? '')
  if (!pdId) return

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
      if (!res.ok) throw new Error('ลบไม่สำเร็จ')

      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'ลบเรียบร้อย', showConfirmButton: false, timer: 2000 })
      fetchAllStock()
    } catch (error) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'ผิดพลาด', text: error.message, showConfirmButton: false, timer: 3000 })
    }
  })
}

const goToDetail = (pdId) => {
  if (pdId) router.push(`/stock/detail/${pdId}`)
}

// --- Dropdown Management ---
const closeDropdown = (e) => {
  if (!e.target.closest('.relative')) {
    showStatusFilter.value = false
    showTypeFilter.value = false
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedStatuses.value = []
  selectedTypes.value = []
}

// --- Lifecycle ---
onMounted(() => {
  fetchCategories()
  fetchAllStock()
  document.addEventListener('click', closeDropdown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4 pt-4">
    <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-8xl container px-5 py-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-800">รายการคลัง</h1>
        <button
          @click="openAddModal"
          class="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md flex items-center shadow-sm transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          เพิ่มรายการ
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        <div class="bg-white rounded-lg border p-6 text-center shadow-sm">
          <h2 class="text-2xl font-bold text-blue-600">{{ itemsCount }} รายการ</h2>
          <p class="text-gray-600 text-sm">รายการของทั้งหมด</p>
        </div>
        <div class="bg-white rounded-lg border p-6 text-center shadow-sm">
          <h2 class="text-2xl font-bold text-orange-500">{{ itemsNew }} รายการ</h2>
          <p class="text-gray-600 text-sm">คำขอเบิกของ</p>
        </div>
        <div class="bg-white rounded-lg border p-6 text-center shadow-sm">
          <h2 class="text-2xl font-bold text-green-600">{{ itemRequestWaiting }} รายการ</h2>
          <p class="text-gray-600 text-sm">คำขอเบิกรออนุมัติ</p>
        </div>
        <div class="bg-white rounded-lg border p-6 text-center shadow-sm">
          <h2 class="text-2xl font-bold text-red-600">{{ itemRequestDeclined }} รายการ</h2>
          <p class="text-gray-600 text-sm">ใกล้หมด Stock</p>
        </div>
        <div class="bg-white rounded-lg border p-6 text-center shadow-sm">
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
              <div v-if="showStatusFilter" class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10">
                <label class="flex items-center py-1 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" value="in_stock" v-model="selectedStatuses" class="w-4 h-4 text-green-600 rounded" />
                  <span class="ml-2">พร้อมใช้งาน (In Stock)</span>
                </label>
                <label class="flex items-center py-1 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" value="low_stock" v-model="selectedStatuses" class="w-4 h-4 text-orange-500 rounded" />
                  <span class="ml-2">ใกล้หมด (Low Stock)</span>
                </label>
                <label class="flex items-center py-1 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" value="out_of_stock" v-model="selectedStatuses" class="w-4 h-4 text-red-600 rounded" />
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
              <div v-if="showTypeFilter" class="absolute mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10 max-h-72 overflow-y-auto">
                <button
                  @click="openManageCategoryModal"
                  class="w-full flex items-center gap-2 px-2 py-2 mb-2 text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  จัดการหมวดหมู่
                </button>
                <hr class="my-2">
                <div v-if="typeOptions.length === 0" class="text-gray-400 text-sm p-2">ไม่มีข้อมูล</div>
                <label v-for="category in typeOptions" :key="category.value" class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" :value="category.label" v-model="selectedTypes" class="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                  <span class="ml-2">{{ category.label }}</span>
                </label>
              </div>
            </div>

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

      <div class="p-3 mx-auto max-w-8xl">
        <TableComponent
          :columns="columns"
          :rows="filteredRows"
          :perPage="10"
          :idColumnIndex="0"
          :statusStockinventoryColumn="6"
          :columnAlign="['left', 'left', 'left', 'center', 'center']"
        >
          <template #cell-7="{ row }">
            <TableActions
              :row-id="row[0]"
              :open-menu-id="openMenuId"
              role="stock"
              :row="row"
              :status="row[6]"
              @toggle-menu="openMenuId = $event"
              @detail="goToDetail(row[0])"
              @edit="openEditModal(row[0])"
              @delete="handleDelete(row[0])"
            />
          </template>
        </TableComponent>
      </div>
    </div>

    <div
      v-if="showItemModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-sans"
      @click.self="closeItemModal"
    >
      <div class="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto relative animate-fade-in-up">
        <div class="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div :class="isEditMode ? 'bg-orange-500' : 'bg-blue-700'" class="text-white rounded p-1 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path v-if="!isEditMode" stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h2 class="text-lg font-bold text-black">{{ isEditMode ? 'แก้ไขรายการของ' : 'เพิ่มรายการของ' }}</h2>
          </div>
          <button @click="closeItemModal" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6">
          <form @submit.prevent="submitItemForm">
            <div class="mb-4">
              <label class="block text-sm font-medium text-black mb-1">
                ชื่อรายการ <span class="text-red-500">*</span>
              </label>
              <span class="text-xs text-gray-400 block mb-1">กรอกชื่อรายการของที่ต้องการ{{ isEditMode ? 'แก้ไข' : 'เพิ่ม' }}</span>
              <input
                v-model="itemForm.name"
                type="text"
                :class="['text-black placeholder-gray-400 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-700 transition-all', formErrors.name ? 'border-red-500' : 'border-gray-300']"
                placeholder="กรุณากรอกชื่อรายการ"
              />
              <p v-if="formErrors.name" class="text-red-500 text-sm mt-1">{{ formErrors.name }}</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-black"> หมายเลขเลขครุภัณฑ์ </label>
                <span class="text-xs text-gray-400 block mb-1">กรอกหมายเลขครุภัณฑ์ (ถ้ามี)</span>
                <input
                  v-model="itemForm.asset_no"
                  type="text"
                  class="text-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 transition-all"
                  placeholder="กรุณากรอกเลขครุภัณฑ์"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-black">
                  หมวดหมู่ <span class="text-red-500">*</span>
                </label>
                <span class="text-xs text-gray-400 block mb-1">โปรดเลือกหมวดหมู่รายการ</span>
                <select
                  v-model="itemForm.ct_id"
                  :class="['text-black placeholder-gray-400 w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all', formErrors.type_id ? 'border-red-500' : 'border-gray-300']"
                >
                  <option value="" disabled>กรุณาเลือกหมวดหมู่รายการ</option>
                  <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <p v-if="formErrors.type_id" class="text-red-500 text-sm mt-1">{{ formErrors.type_id }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-black mb-1">
                  จำนวน <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="itemForm.quantity"
                  type="number"
                  min="1"
                  :class="['text-black placeholder-gray-400 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all', formErrors.quantity ? 'border-red-500' : 'border-gray-300']"
                  placeholder="กรุณากรอกจำนวน"
                />
                <p v-if="formErrors.quantity" class="text-red-500 text-sm mt-1">{{ formErrors.quantity }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-black mb-1">
                  หน่วยนับ <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="itemForm.unit"
                  type="text"
                  :class="['text-black placeholder-gray-400 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all', formErrors.unit ? 'border-red-500' : 'border-gray-300']"
                  placeholder="กรุณากรอกหน่วยนับ"
                />
                <p v-if="formErrors.unit" class="text-red-500 text-sm mt-1">{{ formErrors.unit }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 mb-8">
              <div>
                <label class="block text-sm font-medium text-black mb-1">
                  สถานะ <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="itemForm.status"
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
                :class="['flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition flex-1 min-h-[220px] sm:min-h-[280px] mb-4', isDragOver ? 'border-blue-400 bg-blue-50 scale-105' : 'border-gray-300 bg-gray-50 hover:bg-gray-100']"
                @dragover.prevent="handleDragOver"
                @dragleave.prevent="handleDragLeave"
                @drop.prevent="handleDrop"
              >
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                  <div :class="['transition-all duration-200', isDragOver ? 'scale-110' : '']">
                    <img src="/icon/image-up-icon.svg" :class="['w-10 h-10 mb-2', isDragOver ? 'opacity-80' : 'opacity-70']" />
                  </div>
                  <p :class="['text-sm mb-1', isDragOver ? 'text-blue-600 font-semibold' : 'text-gray-500']">
                    <span class="font-semibold">{{ isDragOver ? 'วางรูปภาพที่นี่' : 'คลิกเพื่อเลือกรูปภาพ' }}</span>
                  </p>
                  <p class="text-xs text-gray-400 mt-1">รองรับรูปภาพเท่านั้น (สูงสุด 1 รูป)</p>
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
                    <p class="text-xs text-gray-500 mt-1">ขนาด: {{ (filePreview[0].size / 1024 / 1024).toFixed(2) }} MB</p>
                    <p class="text-xs text-green-600 mt-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                      อัปโหลดพร้อมบันทึก
                    </p>
                  </div>
                </div>
                <button @click.prevent="removeFile(0)" class="absolute top-2 right-2 p-1 bg-white rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 shadow-sm transition-colors" title="ลบรูปภาพ">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="flex justify-end gap-4 pt-4 border-t border-gray-100 border-dashed">
              <button
                type="button"
                @click="closeItemModal"
                class="px-8 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-md transition-colors font-medium shadow-sm text-sm"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                :class="isEditMode ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-700 hover:bg-blue-800'"
                class="px-8 py-2 text-white rounded-md transition-colors font-medium shadow-sm text-sm"
              >
                {{ isEditMode ? 'บันทึกการแก้ไข' : 'บันทึก' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div
      v-if="showManageCategoryModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="closeManageCategoryModal"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-bold text-gray-800">จัดการหมวดหมู่</h2>
          <button @click="closeManageCategoryModal" class="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="p-4 overflow-y-auto flex-1">
          <button
            @click="handleAddCategory"
            class="w-full flex items-center justify-center gap-2 px-4 py-2 mb-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            เพิ่มหมวดหมู่ใหม่
          </button>
          <div v-if="manageCategoryList.length === 0" class="text-center text-gray-400 py-8">ไม่มีข้อมูลหมวดหมู่</div>
          <ul v-else class="space-y-2">
            <li v-for="cat in manageCategoryList" :key="cat.id" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
              <span class="text-gray-700">{{ cat.name }}</span>
              <div class="flex gap-2">
                <button @click="handleEditCategory(cat)" class="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="แก้ไข">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button @click="handleDeleteCategory(cat)" class="p-1.5 text-red-600 hover:bg-red-100 rounded" title="ลบ">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          </ul>
        </div>
        <div class="p-4 border-t">
          <button @click="closeManageCategoryModal" class="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            ปิด
          </button>
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
