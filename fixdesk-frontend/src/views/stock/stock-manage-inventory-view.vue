<script setup>
/**
 * =====================================================================
 * @file            stock-manage-inventory-view.vue
 * @module          มอดูลการจัดการคลัง - การจัดการสินค้าคงคลัง
 * @layer           View (Presentation Layer)
 * @version         1.0.2
 * @since           2025-10-21
 * @author          เศรษฐพงศ์ หอมชื่น
 * @contributors
 * - เศรษฐพงศ์ หอมชื่น
 * - ปฏิพัทธ์ จงนันทพันธ์กุล
 * - อาจอนนต์ ภคนันทานนท์
 * - พชร ไพศรีสกุล
 *
 * @lastModified    2026-03-21
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอสำหรับจัดการข้อมูลสินค้าคงคลัง
 *  รองรับฟีเจอร์:
 *    - แสดงรายการสินค้าทั้งหมด
 *    - เพิ่ม แก้ไข ลบสินค้า
 *    - นำเข้าข้อมูลสินค้าจากไฟล์ Excel
 *    - ตรวจสอบความถูกต้องของไฟล์ภาพ
 *---------------------------------------------------------------------
 * @changelog
 *  [2025-10-21, เศรษฐพงศ์ หอมชื่น] V 1.0.0
 *  - Initial implementation Stock Manage Inventory View
 *  [2026-03-06, อาจอนนต์ ภคนันทานนท์] V 1.0.1
 *   - เพิ่ม validation border แดงในฟอร์มแก้ไขรายการ
 *  [2026-03-13, ปฏิพัทธ์ จงนันทพันธ์กุล] V 1.0.2
 *   - แก้ไขคำ alert
 *  [2026-03-21, พชร ไพศรีสกุล] V 1.0.3
 *  - ปรับปรุงโครงสร้างข้อมูลและการจัดการ State ใน View ให้รองรับการแสดงข้อมูลที่ถูกต้องตามโครงสร้างใหม่ของ API
 *  - ปรับปรุงการ import และการดาวน์โหลด Template Excel ให้รองรับประเภท Locations โดยใช้ Universal Import Modal และ Download Template Button Component ใหม่ที่รองรับหลายประเภท
 *  - เปลี่ยนมาใช้ handleUnauthorized จาก auth.util แทนการเขียน Swal เอง
 *    เพื่อให้ Alert token หมดอายุเหมือนกันทุกหน้า
 *
 * =====================================================================
 */
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { handleUnauthorized } from '@/utils/auth.util'
import TableComponent from '@/components/table-component.vue'
import TableActions from '@/components/table-actions-component.vue'
import CardSummaryComponent from '@/components/card-home-component.vue'
import ImportButtonComponent from '@/components/button/import-button-component.vue'
import UniversalImportModal from '@/components/modal/universal-import-modal.vue'
import { Icon } from '@iconify/vue'

const showImportModal = ref(false)

function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    Authorization: `Bearer ${token}`,
  }
}

defineOptions({ name: 'StockManageInventoryView' })

const router = useRouter()

const API_BASE = import.meta.env.VITE_API_BASE

const columnList = [
  'ID',
  'ชื่อรายการ',
  'หมวดหมู่',
  'หมายเลขครุภัณฑ์',
  'จำนวน',
  'หน่วยนับ',
  'สถานะ',
  'ตัวดำเนินการ',
]

const openMenuId = ref(null)
const categoriesLoaded = ref(false)
const itemsCount = ref(0)
const itemsNew = ref(0)
const itemRequestWaiting = ref(0)
const itemRequestDeclined = ref(0)
const searchQuery = ref('')
const isDragOver = ref(false)

// Modals State
const showAddModal = ref(false)
const showStatusFilter = ref(false)
const showTypeFilter = ref(false)
const showManageCategoryModal = ref(false)
const showEditModal = ref(false)
const isEditDragOver = ref(false)

// Data Lists & Maps
const typeOptionList = ref([]) //
const allRowList = ref([]) //
const manageCategoryList = ref([]) //
const filePreviewList = ref([]) //
const selectedStatusList = ref([]) //
const selectedTypeList = ref([]) //
const editFilePreviewList = ref([]) //

const productIdToCategoryIdMap = ref({})
const productIdToImageMap = ref({})
const stockStatusMap = ref({})

// Forms & Errors
const editingProductId = ref(null)
const addErrors = ref({})
const editErrors = ref({})

const formData = ref({
  name: '',
  assetCode: '',
  categoryId: '',
  quantity: '',
  unit: '',
  status: 'active',
  uploadImage: null,
})

const editForm = ref({
  name: '',
  assetCode: '',
  categoryId: '',
  quantity: '',
  unit: '',
  status: 'active',
  uploadImage: null,
})

const filteredRowList = computed(() => {
  return allRowList.value.filter((row) => {
    const productId = row[0]
    const assetCode = String(row[1] || '').toLowerCase()
    const name = String(row[2] || '').toLowerCase()
    const categoryName = row[3]
    const query = searchQuery.value.toLowerCase()

    // 1. กรองตามคำค้นหา
    const matchSearch = !query || name.includes(query) || assetCode.includes(query)

    // 2. กรองตามหมวดหมู่
    const matchCategory =
      selectedTypeList.value.length === 0 || selectedTypeList.value.includes(categoryName)

    // 3. กรองตามสถานะ stock
    const stockStatus = stockStatusMap.value[productId]
    const matchStatus =
      selectedStatusList.value.length === 0 || selectedStatusList.value.includes(stockStatus)

    return matchSearch && matchCategory && matchStatus
  })
})

const fetchCategories = async () => {
  try {
    if (categoriesLoaded.value) return

    const response = await fetch(`${API_BASE}/category`, { headers: getAuthHeaders() })
    if (!response.ok) throw new Error(`โหลดหมวดหมู่ไม่สำเร็จ (${response.status})`)

    const categoryData = await response.json()
    // เก็บทั้ง value (ct_id) และ label (ct_name)
    typeOptionList.value = (categoryData || []).map((category) => ({
      value: String(category.ct_id),
      label: category.ct_name,
    }))

    categoriesLoaded.value = true
  } catch (error) {
    console.error('fetchCategories error:', error)
  }
}

async function fetchAllStock() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      handleUnauthorized(router)
      return
    }

    const response = await fetch(`${API_BASE}/show-stock`, { headers: getAuthHeaders() })

    if (response.status === 401) {
      handleUnauthorized(router)
      return
    }

    if (!response.ok) throw new Error(`โหลด stock ไม่สำเร็จ (${response.status})`)

    const data = await response.json()

    // reset maps
    productIdToCategoryIdMap.value = {}
    productIdToImageMap.value = {}
    stockStatusMap.value = {}

    allRowList.value = (data || []).map((item) => {
      const productId = item.pd_id != null ? String(item.pd_id) : '-'
      const assetCode = item.pd_asset_code ?? '-'
      const quantity = item.pd_quantity ?? 0

      // map: productId -> categoryId
      const categoryId =
        item.pd_category_id != null && item.pd_category_id !== ''
          ? Number(item.pd_category_id)
          : null
      productIdToCategoryIdMap.value[productId] = categoryId

      // map: productId -> image filename
      productIdToImageMap.value[productId] = item.pd_upload_image ?? null

      // map: productId -> stock status
      let stockStatus = 'in_stock'
      if (quantity <= 0) {
        stockStatus = 'out_of_stock'
      } else if (quantity < 10) {
        stockStatus = 'low_stock'
      }

      stockStatusMap.value[productId] = stockStatus

      return [
        productId, // 0
        item.pd_name ?? '-', // 1
        item.ct_name ?? '-', // 2
        item.pd_asset_code ? `${item.pd_asset_code}` : '-', // 3
        quantity, // 4
        item.units_name ?? '-', // 5
        stockStatus, // 6
        'actions', // 7
      ]
    })

    // อัพเดท summary counts
    itemsCount.value = allRowList.value.length
    itemRequestDeclined.value = Object.values(stockStatusMap.value).filter(
      (s) => s === 'low_stock' || s === 'out_of_stock',
    ).length
  } catch (error) {
    console.error('Error fetching stock data:', error)
    Swal.fire('ผิดพลาด', error.message || 'ไม่สามารถดึงข้อมูลสินค้าได้', 'error')
  }
}

// --- Category Management Functions ---
function openManageCategoryModal() {
  manageCategoryList.value = typeOptionList.value.map((option) => ({
    id: option.value,
    name: option.label,
  }))
  showManageCategoryModal.value = true
  showTypeFilter.value = false
}

function closeManageCategoryModal() {
  showManageCategoryModal.value = false
}

async function handleAddCategory() {
  const { value: name } = await Swal.fire({
    title: 'เพิ่มหมวดหมู่ใหม่',
    input: 'text',
    inputLabel: 'ชื่อหมวดหมู่',
    inputPlaceholder: 'เช่น อุปกรณ์ไฟฟ้า',
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#2563eb',
    inputValidator: (value) => {
      if (!value || !value.trim()) return 'กรุณากรอกชื่อหมวดหมู่'
      return null
    },
  })
  if (!name) return

  try {
    const response = await fetch(`${API_BASE}/category`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ct_name: name.trim() }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'เพิ่มหมวดหมู่ไม่สำเร็จ')

    // รีโหลดข้อมูล
    categoriesLoaded.value = false
    await fetchCategories()
    manageCategoryList.value = typeOptionList.value.map((option) => ({
      id: option.value,
      name: option.label,
    }))

    Swal.fire({
      icon: 'success',
      title: 'สำเร็จ',
      text: 'เพิ่มหมวดหมู่เรียบร้อยแล้ว',
      timer: 2000,
      showConfirmButton: false,
    })
  } catch (error) {
    console.error('Add category error:', error)
    Swal.fire('ผิดพลาด', error.message, 'error')
  }
}

async function handleEditCategory(category) {
  const { value: name } = await Swal.fire({
    title: 'แก้ไขหมวดหมู่',
    input: 'text',
    inputLabel: 'ชื่อหมวดหมู่',
    inputValue: category.name,
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#2563eb',
    inputValidator: (value) => {
      if (!value || !value.trim()) return 'กรุณากรอกชื่อหมวดหมู่'
      return null
    },
  })
  if (!name || name.trim() === category.name) return

  try {
    const response = await fetch(`${API_BASE}/category/${category.id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ct_name: name.trim() }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'แก้ไขหมวดหมู่ไม่สำเร็จ')

    // รีโหลดข้อมูล
    categoriesLoaded.value = false
    await fetchCategories()
    await fetchAllStock()
    manageCategoryList.value = typeOptionList.value.map((option) => ({
      id: option.value,
      name: option.label,
    }))

    Swal.fire({
      icon: 'success',
      title: 'สำเร็จ',
      text: 'แก้ไขหมวดหมู่เรียบร้อยแล้ว',
      timer: 2000,
      showConfirmButton: false,
    })
  } catch (error) {
    console.error('Edit category error:', error)
    Swal.fire('ผิดพลาด', error.message, 'error')
  }
}

async function handleDeleteCategory(category) {
  const result = await Swal.fire({
    title: 'ยืนยันการลบ',
    text: `ต้องการลบหมวดหมู่ "${category.name}" หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ยืนยันการลบ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#a3a3a3',
  })
  if (!result.isConfirmed) return

  try {
    const response = await fetch(`${API_BASE}/category/${category.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'ลบหมวดหมู่ไม่สำเร็จ')

    // รีโหลดข้อมูล
    categoriesLoaded.value = false
    await fetchCategories()
    manageCategoryList.value = typeOptionList.value.map((option) => ({
      id: option.value,
      name: option.label,
    }))

    Swal.fire({
      icon: 'success',
      title: 'สำเร็จ',
      text: 'ลบหมวดหมู่เรียบร้อยแล้ว',
      timer: 2000,
      showConfirmButton: false,
    })
  } catch (error) {
    console.error('Delete category error:', error)
    Swal.fire('ผิดพลาด', error.message, 'error')
  }
}

// --- General UI Methods ---
const clearFilters = () => {
  searchQuery.value = ''
  selectedStatusList.value = []
  selectedTypeList.value = []
}

const closeDropdown = (e) => {
  if (!e.target.closest('.relative')) {
    showStatusFilter.value = false
    showTypeFilter.value = false
  }
}

const closeAddModal = () => {
  showAddModal.value = false
  formData.value = {
    name: '',
    assetCode: '',
    categoryId: '',
    quantity: '',
    unit: '',
    status: 'active',
  }
  filePreviewList.value = []
  addErrors.value = {}
}

const validateForm = () => {
  const errors = {}

  if (!formData.value.name) errors.name = 'กรุณากรอกชื่อรายการ'
  if (!formData.value.categoryId) errors.type_id = 'กรุณาเลือกหมวดหมู่'
  if (!formData.value.quantity || formData.value.quantity <= 0)
    errors.quantity = 'กรุณากรอกจำนวนที่ถูกต้อง'
  if (!formData.value.unit) errors.unit = 'กรุณากรอกหน่วยนับ'

  addErrors.value = errors
  return Object.keys(errors).length === 0
}

// --- File Handling Methods ---
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
  e.target.value = ''
}

const processFile = (files) => {
  if (!files || files.length === 0) return

  const file = files[0]
  if (!file.type.startsWith('image/')) {
    alert('กรุณาอัปโหลดเฉพาะไฟล์รูปภาพเท่านั้น')
    return
  }

  const url = URL.createObjectURL(file)
  filePreviewList.value = [
    {
      file: file,
      name: file.name,
      size: file.size,
      url: url,
    },
  ]
}

// --- Actions Methods ---
const confirmAddItem = async () => {
  if (!validateForm()) {
    return
  }

  const formDataToSubmit = new FormData()
  formDataToSubmit.append('pd_name', formData.value.name)
  formDataToSubmit.append('pd_asset_code', formData.value.assetCode)
  formDataToSubmit.append('pd_category_id', formData.value.categoryId)
  formDataToSubmit.append('pd_quantity', formData.value.quantity)
  formDataToSubmit.append('pd_unit_id', formData.value.unit)
  formDataToSubmit.append('status', formData.value.status)

  if (filePreviewList.value.length > 0) {
    formDataToSubmit.append('pd_upload_image', filePreviewList.value[0].file)
  }

  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) throw new Error('ไม่พบ token')

    const response = await fetch(`${API_BASE}/add-stock`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formDataToSubmit,
    })

    const contentType = response.headers.get('content-type')
    let responseData

    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json()
    } else {
      responseData = await response.text()
      console.error('Server returned HTML instead of JSON:', responseData)
      throw new Error('Server error - received HTML response')
    }

    if (!response.ok) throw new Error(responseData.message || 'บันทึกรายการสำเร็จ!')

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
      },
    })
    Toast.fire({
      title: 'สำเร็จ!',
      text: 'บันทึกรายการสำเร็จ!',
      icon: 'success',
      background: '#ffffff',
      color: '#1e3a8a',
    })

    closeAddModal()
  } catch (error) {
    console.error('Error adding item:', error)
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
    Toast.fire({
      title: 'ผิดพลาด!',
      text: error.message || 'เกิดข้อผิดพลาดในการบันทึกรายการ',
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626',
    })
  }
}

const handleDelete = async (productIdFromTable) => {
  const productId = String(productIdFromTable ?? '')

  if (!productId) {
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
    cancelButtonColor: '#a3a3a3',
    confirmButtonText: 'ยืนยันการลบ',
    cancelButtonText: 'ยกเลิก',
  }).then(async (result) => {
    if (!result.isConfirmed) return

    try {
      const response = await fetch(`${API_BASE}/delete-stock/${productId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      let resultData = {}
      const contentType = response.headers.get('content-type')

      if (contentType && contentType.includes('application/json')) {
        resultData = await response.json()
      }

      if (!response.ok) {
        throw new Error(resultData.message || 'ลบไม่สำเร็จ')
      }

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

const goToDetail = (productIdFromTable) => {
  const productId = String(productIdFromTable ?? '')
  if (!productId) return
  router.push(`/stock/detail/${productId}`)
}

const closeEditModal = () => {
  showEditModal.value = false
  editingProductId.value = null
  editFilePreviewList.value = []

  editForm.value = {
    name: '',
    assetCode: '',
    categoryId: '',
    quantity: '',
    unit: '',
    status: 'active',
    uploadImage: null,
  }
}

const confirmEditItem = async () => {
  try {
    if (!editingProductId.value) {
      throw new Error('ไม่พบรหัสสินค้าที่จะแก้ไข')
    }

    editErrors.value = {}
    if (!editForm.value.name) editErrors.value.name = 'กรุณากรอกชื่อรายการ'
    if (!editForm.value.categoryId) editErrors.value.type_id = 'กรุณาเลือกหมวดหมู่'
    if (!editForm.value.quantity) editErrors.value.quantity = 'กรุณากรอกจำนวน'
    if (!editForm.value.unit) editErrors.value.unit = 'กรุณากรอกหน่วยนับ'

    if (Object.keys(editErrors.value).length > 0) return

    const formDataToSubmit = new FormData()

    formDataToSubmit.append('pd_name', editForm.value.name)
    formDataToSubmit.append('pd_asset_code', editForm.value.assetCode)
    formDataToSubmit.append('pd_quantity', editForm.value.quantity)
    formDataToSubmit.append('pd_unit_id', editForm.value.unit)
    formDataToSubmit.append('status', editForm.value.status)

    if (editForm.value.categoryId) {
      formDataToSubmit.append('pd_category_id', editForm.value.categoryId)
    }

    if (editFilePreviewList.value && editFilePreviewList.value.length > 0) {
      formDataToSubmit.append('pd_upload_image', editFilePreviewList.value[0].file)
    }

    const response = await fetch(`${API_BASE}/update-stock/${editingProductId.value}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
      },
      body: formDataToSubmit,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'แก้ไขข้อมูลไม่สำเร็จ')
    }

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

  editFilePreviewList.value = [
    {
      file,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
    },
  ]
}

const removeEditFile = () => {
  editFilePreviewList.value = []
}

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
})

function handleImportSuccess() {
  toast.fire({
    icon: 'success',
    title: 'นำเข้ารายการเรียบร้อยแล้ว',
    background: '#FFFFFF',
    color: '#1e3a8a',
  })
  showImportModal.value = false
}

function handleImportError(message) {
  toast.fire({
    icon: 'error',
    title: message || 'นำเข้ารายการไม่สำเร็จ',
    background: '#FFFFFF',
    color: '#dc2626',
  })
}

const openEditModal = async (productIdFromTable) => {
  await fetchCategories()
  await nextTick()

  const productId = String(productIdFromTable ?? '')
  const row = allRowList.value.find((r) => String(r[0]) === productId)

  if (!row) {
    Swal.fire('ผิดพลาด', 'ไม่พบข้อมูลสำหรับแก้ไข', 'error')
    return
  }

  // category
  let categoryId = productIdToCategoryIdMap.value[productId]

  if (categoryId == null) {
    const categoryName = row[2]
    const found = typeOptionList.value.find((o) => o.label === categoryName)
    categoryId = found ? found.value : null
  }

  // รูปเก่าจาก map
  const oldImage = productIdToImageMap.value[productId] ?? null

  editForm.value = {
    name: row[1],
    assetCode: row[3] !== '-' ? row[3] : '',
    categoryId: categoryId != null ? String(categoryId) : '',
    quantity: row[4],
    unit: row[5],
    status: row[6] === 'active' ? 'active' : 'inactive',
    uploadImage: oldImage,
  }

  editingProductId.value = productId
  editFilePreviewList.value = []
  showEditModal.value = true
}
//cart summary items
const statItems = computed(() => [
  {
    label: 'รายการของทั้งหมด',
    value: itemsCount.value,
    colorClass: 'text-blue-600',
  },
  {
    label: 'คำขอเบิกของ',
    value: itemsNew.value,
    colorClass: 'text-green-600',
  },
  {
    label: 'คำขอรออนุมัติ',
    value: itemRequestWaiting.value,
    colorClass: 'text-yellow-600',
  },
  {
    label: 'ของใกล้หมด',
    value: itemRequestDeclined.value,
    colorClass: 'text-red-600',
  },
])

watch(
  () => formData.value.assetCode,
  (newVal) => {
    if (newVal && newVal.trim() !== '') {
      formData.value.quantity = 1
    }
  },
)
watch(
  () => editForm.value.assetCode,
  (newVal) => {
    if (newVal && newVal.trim() !== '') {
      editForm.value.quantity = 1
    }
  },
)
// 1.1.7. lifecycle hooks หรือ logic ขั้นตอนสุดท้าย [cite: 520]
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
  <div class="container p-4 mx-auto bg-white shadow-md rounded-xl max-w-8xl sm:p-6 lg:p-8">
    <div class="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-xl font-bold text-gray-800 sm:text-2xl">รายการคลัง</h1>
      <div class="flex flex-row gap-2 sm:flex-row">
        <ImportButtonComponent class="w-[20%] sm:w-auto" @click="showImportModal = true" />

        <button
          @click="showAddModal = true"
          class="flex items-center justify-center w-[100%] px-4 py-2 text-white transition-colors bg-blue-700 rounded-lg shadow-sm sm:w-auto hover:bg-blue-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5 mr-1"
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
    </div>
    <!-- Cards -->
    <div class="mb-8">
      <CardSummaryComponent :items="statItems" :item-unit="'รายการ'" />
    </div>

    <div class="z-20 mb-6">
      <div class="flex flex-wrap items-center gap-3">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหารายการของ"
          class="text-gray-700 w-full sm:w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />

        <div class="">
          <button
            @click.stop="showStatusFilter = !showStatusFilter"
            class="flex items-center gap-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            สถานะ
            <Icon
              icon="meteor-icons:chevron-down"
              style="color: gray"
              class="w-4 h-4 transition-transform duration-200 opacity-70"
              :class="{ 'rotate-180': showStatusFilter }"
            />
          </button>

          <div
            v-if="showStatusFilter"
            class="absolute z-10 w-48 max-w-[90vw] p-3 mt-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg"
          >
            <label class="flex items-center py-1 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                value="in_stock"
                v-model="selectedStatusList"
                class="w-4 h-4 text-green-600 rounded"
              />
              <span class="ml-2">พร้อมใช้งาน</span>
            </label>

            <label class="flex items-center py-1 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                value="low_stock"
                v-model="selectedStatusList"
                class="w-4 h-4 text-orange-500 rounded"
              />
              <span class="ml-2">ใกล้หมด</span>
            </label>

            <label class="flex items-center py-1 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                value="out_of_stock"
                v-model="selectedStatusList"
                class="w-4 h-4 text-red-600 rounded"
              />
              <span class="ml-2">สินค้าหมด</span>
            </label>
          </div>
        </div>

        <div class="relative">
          <button
            @click.stop="showTypeFilter = !showTypeFilter"
            class="flex items-center gap-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg"
          >
            หมวดหมู่
            <Icon
              icon="meteor-icons:chevron-down"
              style="color: gray"
              class="w-4 h-4 transition-transform duration-200 opacity-70"
              :class="{ 'rotate-180': showTypeFilter }"
              alt="toggle"
            />
          </button>
          <div
            v-if="showTypeFilter"
            class="absolute z-10 w-56 max-w-[90vw] p-3 mt-2 overflow-y-auto text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg max-h-72"
          >
            <button
              @click="openManageCategoryModal"
              class="flex items-center w-full gap-2 px-2 py-2 mb-2 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              จัดการหมวดหมู่
            </button>
            <hr class="my-2" />
            <div v-if="typeOptionList.length === 0" class="text-gray-400 text-sm p-2">
              ไม่มีข้อมูล
            </div>
            <label
              v-for="category in typeOptionList"
              :key="category.value"
              class="flex items-center py-1 cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                :value="category.label"
                v-model="selectedTypeList"
                class="w-4 h-4 text-blue-600 border-gray-300 rounded"
              />
              <span class="ml-2">{{ category.label }}</span>
            </label>
          </div>
        </div>

        <transition name="fade">
          <button
            v-if="searchQuery || selectedStatusList.length || selectedTypeList.length"
            @click="clearFilters"
            class="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ล้างตัวกรอง
          </button>
        </transition>
      </div>
    </div>
    <div class="mx-auto -mx-4 overflow-x-auto max-w-8xl sm:mx-auto sm:p-3">
      <TableComponent
        :columns="columnList"
        :rows="filteredRowList"
        :perPage="10"
        :idColumnIndex="1"
        :hiddenColumns="[0, 3]"
        :statusStockinventoryColumn="6"
        :action-column-index="7"
        :columnAlign="['left', 'left', 'center', 'center']"
      >
        <template #cell-7="{ row }">
          <TableActions
            :row-id="row[0]"
            :open-menu-id="openMenuId"
            role="stock"
            :row="row"
            :status="row[5]"
            @toggle-menu="openMenuId = $event"
            @detail="goToDetail(row[0])"
            @edit="openEditModal(row[0])"
            @delete="handleDelete(row[0])"
          />
        </template>
      </TableComponent>
    </div>

    <div
      v-if="showAddModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans bg-black bg-opacity-50"
      @click.self="closeAddModal"
    >
      <div
        class="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto relative animate-fade-in-up"
      >
        <div class="flex items-center justify-between px-4 py-4 border-b border-gray-100 sm:px-6">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center p-1 text-white bg-blue-700 rounded">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
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
            class="text-gray-400 transition-colors hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-6 h-6"
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

        <div class="p-4 sm:p-6">
          <form @submit.prevent="confirmAddItem">
            <div class="mb-4">
              <label class="block mb-1 text-sm font-medium text-black">
                ชื่อรายการ <span class="text-red-500">*</span>
              </label>
              <span class="block mb-1 text-xs text-gray-400">กรอกชื่อรายการของที่ต้องการเพิ่ม</span>
              <input
                v-model="formData.name"
                type="text"
                :class="[
                  'text-black placeholder-gray-400 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-700 transition-all',
                  addErrors.name ? 'border-red-500' : 'border-gray-300',
                ]"
                placeholder="กรุณากรอกชื่อรายการ"
              />
              <p v-if="addErrors.name" class="mt-1 text-sm text-red-500">{{ addErrors.name }}</p>
            </div>

            <div class="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-black"> หมายเลขเลขครุภัณฑ์ </label>
                <span class="block mb-1 text-xs text-gray-400">กรอกหมายเลขครุภัณฑ์ (ถ้ามี)</span>
                <input
                  v-model="formData.assetCode"
                  type="text"
                  class="w-full px-3 py-2 text-black placeholder-gray-400 transition-all border-gray-400 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="กรุณากรอกเลขครุภัณฑ์"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-black">
                  หมวดหมู่ <span class="text-red-500">*</span>
                </label>
                <span class="block mb-1 text-xs text-gray-400">โปรดเลือกหมวดหมู่รายการ</span>
                <select
                  v-model="formData.categoryId"
                  :class="[
                    'text-black placeholder-gray-400 w-full px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all',
                    addErrors.type_id ? 'border-red-500' : 'border-gray-300',
                  ]"
                >
                  <option value="" disabled>กรุณาเลือกหมวดหมู่รายการ</option>
                  <option
                    v-for="option in typeOptionList"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <p v-if="addErrors.type_id" class="mt-1 text-sm text-red-500">
                  {{ addErrors.type_id }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
              <div>
                <label class="block mb-1 text-sm font-medium text-black">
                  จำนวน <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.quantity"
                  type="number"
                  min="1"
                  :disabled="!!formData.assetCode"
                  :class="[
                    'text-black placeholder-gray-400 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all',
                    addErrors.quantity ? 'border-red-500' : 'border-gray-300',
                    formData.assetCode
                      ? 'bg-gray-100 cursor-not-allowed'
                      : '' /* เพิ่ม class แต่งสีตอนปิด */,
                  ]"
                  placeholder="กรุณากรอกจำนวน"
                />
                <p v-if="addErrors.quantity" class="mt-1 text-sm text-red-500">
                  {{ addErrors.quantity }}
                </p>
              </div>

              <div>
                <label class="block mb-1 text-sm font-medium text-black">
                  หน่วยนับ <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.unit"
                  type="text"
                  :class="[
                    'text-black placeholder-gray-400 placeholder-gray-400 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all',
                    addErrors.unit ? 'border-red-500' : 'border-gray-300',
                  ]"
                  placeholder="กรุณากรอกหน่วยนับ"
                />
                <p v-if="addErrors.unit" class="mt-1 text-sm text-red-500">{{ addErrors.unit }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 mb-8">
              <div>
                <label class="block mb-1 text-sm font-medium text-black">
                  สถานะ <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="formData.status"
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
                v-if="filePreviewList.length === 0"
                for="dropzone-file"
                :class="[
                  'flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition flex-1 min-h-[200px] sm:min-h-[280px] mb-4 px-2 text-center',
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
                    <Icon icon="ri:image-upload-line" width="60" height="60" style="color: gray" />
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

                  <p class="mt-1 text-xs text-gray-400">รองรับรูปภาพเท่านั้น (สูงสุด 1 รูป)</p>
                  <p class="mt-1 text-xs text-gray-500">สามารถแนบรูปภาพประกอบได้</p>

                  <div class="flex flex-wrap items-center justify-center gap-2 mt-2">
                    <span class="px-2 py-1 text-xs text-green-700 bg-green-100 rounded">JPG</span>
                    <span class="px-2 py-1 text-xs text-green-700 bg-green-100 rounded">PNG</span>
                    <span class="px-2 py-1 text-xs text-green-700 bg-green-100 rounded">WEBP</span>
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

              <div v-else class="relative w-full p-4 mb-4 border rounded-lg bg-gray-50">
                <div class="flex flex-col items-start gap-4 sm:flex-row">
                  <div
                    class="flex-shrink-0 w-20 h-20 mx-auto overflow-hidden bg-white border border-gray-200 rounded-lg sm:w-24 sm:h-24 sm:mx-0"
                  >
                    <img
                      :src="filePreviewList[0].url"
                      :alt="filePreviewList[0].name"
                      class="w-full h-full object-cover"
                    />
                  </div>

                  <div class="flex-1 min-w-0 pt-1 text-center sm:text-left">
                    <p class="text-sm font-semibold text-gray-900 truncate">
                      {{ filePreviewList[0].name }}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                      ขนาด: {{ (filePreviewList[0].size / 1024 / 1024).toFixed(2) }} MB
                    </p>
                    <p class="flex items-center justify-center mt-2 text-xs text-green-600 sm:justify-start">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="w-4 h-4 mr-1"
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
                  class="absolute p-1 text-gray-400 transition-colors bg-white border border-gray-200 rounded-full shadow-sm top-2 right-2 hover:text-red-500 hover:bg-red-50"
                  title="ลบรูปภาพ"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-5 h-5"
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

            <div class="flex flex-col-reverse gap-3 pt-4 border-t border-gray-100 border-dashed sm:flex-row sm:justify-end sm:gap-4">
              <button
                type="button"
                @click="closeAddModal"
                class="w-full px-8 py-2 text-sm font-medium text-white transition-colors bg-neutral-300 border border-gray-300 rounded-lg shadow-sm sm:w-auto hover:bg-neutral-400"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                @click="confirmAddItem"
                class="w-full px-8 py-2 text-sm font-medium text-white transition-colors bg-blue-700 rounded-lg shadow-sm sm:w-auto hover:bg-blue-800"
              >
                บันทึก
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div
      v-if="showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans bg-black bg-opacity-50"
      @click.self="closeEditModal"
    >
      <div
        class="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto relative animate-fade-in-up"
      >
        <div class="flex items-center justify-between px-4 py-4 border-b border-gray-100 sm:px-6">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center p-1 text-white bg-orange-500 rounded">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="3"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </div>
            <h2 class="text-lg font-bold text-black">แก้ไขรายการของ</h2>
          </div>
          <button
            @click="closeEditModal"
            class="text-gray-400 transition-colors hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-6 h-6"
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

        <div class="p-4 sm:p-6">
          <form @submit.prevent="confirmEditItem">
            <div class="mb-4">
              <label class="block mb-1 text-sm font-medium text-black">
                ชื่อรายการ <span class="text-red-500">*</span>
              </label>
              <span class="block mb-1 text-xs text-gray-400">กรอกชื่อรายการของที่ต้องการแก้ไข</span>
              <input
                v-model="editForm.name"
                type="text"
                :class="[
                  'w-full px-3 py-2 text-black placeholder-gray-400 transition-all border rounded-md focus:outline-none focus:ring-1 focus:ring-orange-400',
                  editErrors.name ? 'border-red-500' : 'border-gray-300',
                ]"
                placeholder="กรุณากรอกชื่อรายการ"
              />
              <p v-if="editErrors?.name" class="mt-1 text-sm text-red-500">{{ editErrors.name }}</p>
            </div>

            <div class="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-black"> หมายเลขเลขครุภัณฑ์ </label>
                <span class="block mb-1 text-xs text-gray-400">กรอกหมายเลขครุภัณฑ์ (ถ้ามี)</span>
                <input
                  v-model="editForm.assetCode"
                  type="text"
                  class="w-full px-3 py-2 text-black placeholder-gray-400 transition-all border border-gray-300 rounded-md focus:outline-none focus:ring-1"
                  placeholder="กรุณากรอกเลขครุภัณฑ์"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-black">
                  หมวดหมู่ <span class="text-red-500">*</span>
                </label>
                <span class="block mb-1 text-xs text-gray-400">โปรดเลือกหมวดหมู่รายการ</span>
                <select
                  v-model="editForm.categoryId"
                  :class="[
                    'text-black w-full px-3 py-2 border focus:ring-1 focus:ring-orange-400 rounded-md bg-white transition-all',
                    editErrors.type_id ? 'border-red-500' : 'border-gray-300',
                  ]"
                >
                  <option value="" disabled>กรุณาเลือกหมวดหมู่</option>
                  <option
                    v-for="option in typeOptionList"
                    :key="option.value"
                    :value="String(option.value)"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <p v-if="editErrors.type_id" class="mt-1 text-sm text-red-500">
                  {{ editErrors.type_id }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
              <div>
                <label class="block mb-1 text-sm font-medium text-black">
                  จำนวน <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="editForm.quantity"
                  type="number"
                  min="1"
                  :disabled="!!editForm.assetCode"
                  :class="[
                    'w-full px-3 py-2 text-black placeholder-gray-400 transition-all border rounded-md focus:outline-none focus:ring-1 focus:ring-orange-400',
                    editErrors.quantity ? 'border-red-500' : 'border-gray-300',
                    editForm.assetCode
                      ? 'bg-gray-100 cursor-not-allowed'
                      : '' /* เพิ่ม class แต่งสีตอนปิด */,
                  ]"
                />
                <p v-if="editErrors.quantity" class="mt-1 text-sm text-red-500">
                  {{ editErrors.quantity }}
                </p>
              </div>

              <div>
                <label class="block mb-1 text-sm font-medium text-black">
                  หน่วยนับ <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="editForm.unit"
                  type="text"
                  :class="[
                    'w-full px-3 py-2 text-black placeholder-gray-400 transition-all border rounded-md focus:outline-none focus:ring-1 focus:ring-orange-400',
                    editErrors.unit ? 'border-red-500' : 'border-gray-300',
                  ]"
                />
                <p v-if="editErrors.unit" class="mt-1 text-sm text-red-500">
                  {{ editErrors.unit }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 mb-8">
              <div>
                <label class="block mb-1 text-sm font-medium text-black">
                  สถานะ <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="editForm.status"
                  class="w-full px-3 py-2 text-black placeholder-gray-400 transition-all bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1"
                >
                  <option value="active">พร้อมใช้งาน</option>
                  <option value="inactive">ไม่พร้อมใช้งาน</option>
                </select>
              </div>
            </div>

            <div class="flex flex-col flex-1 mb-6">
              <label class="block mb-2 text-sm font-medium text-black">รูปภาพสินค้า</label>

              <label
                v-if="editFilePreviewList.length === 0 && !editForm.uploadImage"
                for="dropzone-file-edit"
                :class="[
                  'flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition flex-1 min-h-[200px] mb-4 px-2 text-center',
                  isEditDragOver
                    ? 'border-orange-400 bg-orange-50 scale-105'
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100',
                ]"
                @dragover.prevent="handleEditDragOver"
                @dragleave.prevent="handleEditDragLeave"
                @drop.prevent="handleEditDrop"
              >
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                  รองรับรูปภาพเท่านั้น
                  <p class="mt-1 text-xs text-gray-400">รองรับรูปภาพเท่านั้น (สูงสุด 1 รูป)</p>
                  <p class="mt-1 text-xs text-gray-500">สามารถแนบรูปภาพประกอบได้</p>

                  <div class="flex flex-wrap items-center justify-center gap-2 mt-2">
                    <span class="px-2 py-1 text-xs text-green-700 bg-green-100 rounded">JPG</span>
                    <span class="px-2 py-1 text-xs text-green-700 bg-green-100 rounded">PNG</span>
                    <span class="px-2 py-1 text-xs text-green-700 bg-green-100 rounded">WEBP</span>
                  </div>
                </div>
                <input
                  id="dropzone-file-edit"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleEditFileUpload"
                />
              </label>

              <div
                v-else-if="editFilePreviewList.length === 0 && editForm.uploadImage"
                class="mb-4"
              >
                <div
                  class="relative flex items-center justify-center w-full h-48 overflow-hidden bg-gray-100 border border-gray-300 rounded-lg sm:h-64 group"
                >
                  <img
                    :src="`${API_BASE}/uploads/${editForm.uploadImage}`"
                    class="h-full object-contain"
                    alt="Current Image"
                  />

                  <label
                    for="dropzone-file-edit-replace"
                    class="absolute inset-0 flex flex-col items-center justify-center text-center text-white transition-opacity bg-black bg-opacity-50 opacity-0 cursor-pointer group-hover:opacity-100"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-10 h-10 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span class="px-2 font-semibold">คลิกเพื่อเปลี่ยนรูปภาพ</span>
                  </label>
                  <input
                    id="dropzone-file-edit-replace"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleEditFileUpload"
                  />
                </div>
                <p class="mt-2 text-xs text-center text-gray-500">
                  รูปภาพปัจจุบัน (อัปโหลดใหม่เพื่อแทนที่)
                </p>
              </div>

              <div v-else class="relative w-full p-4 mb-4 border rounded-lg bg-gray-50">
                <div class="flex flex-col items-start gap-4 sm:flex-row">
                  <div
                    class="flex-shrink-0 w-20 h-20 mx-auto overflow-hidden bg-white border border-gray-200 rounded-lg sm:w-24 sm:h-24 sm:mx-0"
                  >
                    <img :src="editFilePreviewList[0].url" class="w-full h-full object-cover" />
                  </div>
                  <div class="flex-1 min-w-0 pt-1 text-center sm:text-left">
                    <p class="text-sm font-semibold text-gray-900 truncate">
                      {{ editFilePreviewList[0].name }}
                    </p>
                    <p class="mt-2 text-xs text-green-600">กำลังจะบันทึกรูปภาพใหม่...</p>
                  </div>
                  <button
                    @click.prevent="removeEditFile"
                    class="absolute p-1 text-gray-400 bg-white border rounded-full shadow-sm top-2 right-2 hover:text-red-500"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-5 h-5"
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
            </div>

            <div class="flex flex-col-reverse gap-3 pt-4 border-t border-gray-100 border-dashed sm:flex-row sm:justify-end sm:gap-4">
              <button
                type="button"
                @click="closeEditModal"
                class="w-full px-8 py-2 text-sm font-medium text-white transition-colors bg-neutral-300 border border-gray-300 rounded-lg shadow-sm sm:w-auto hover:bg-neutral-400"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                class="w-full px-8 py-2 text-sm font-medium text-white transition-colors bg-orange-400 rounded-lg shadow-sm sm:w-auto hover:bg-orange-500"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div
      v-if="showManageCategoryModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="closeManageCategoryModal"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-bold text-gray-800">จัดการหมวดหมู่</h2>
          <button @click="closeManageCategoryModal" class="text-gray-400 hover:text-gray-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-6 h-6"
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

        <div class="p-4 overflow-y-auto flex-1">
          <button
            @click="handleAddCategory"
            class="flex items-center justify-center w-full gap-2 px-4 py-2 mb-4 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            เพิ่มหมวดหมู่ใหม่
          </button>

          <div v-if="manageCategoryList.length === 0" class="text-center text-gray-400 py-8">
            ไม่มีข้อมูลหมวดหมู่
          </div>
          <ul v-else class="space-y-2">
            <li
              v-for="category in manageCategoryList"
              :key="category.id"
              class="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <span class="text-gray-700 truncate">{{ category.name }}</span>
              <div class="flex flex-shrink-0 gap-2">
                <button
                  @click="handleEditCategory(category)"
                  class="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                  title="แก้ไข"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  @click="handleDeleteCategory(category)"
                  class="p-1.5 text-red-600 hover:bg-red-100 rounded"
                  title="ลบ"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </li>
          </ul>
        </div>

        <div class="p-4 border-t">
          <button
            @click="closeManageCategoryModal"
            class="w-full px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  </div>
  <UniversalImportModal
    v-if="showImportModal"
    type="stocks"
    title="พัสดุ"
    templateFileName="Template_Stock_Import.xlsx"
    @close="showImportModal = false"
    @refresh="fetchAllStock()"
    @success="handleImportSuccess"
    @error="handleImportError"
  />
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