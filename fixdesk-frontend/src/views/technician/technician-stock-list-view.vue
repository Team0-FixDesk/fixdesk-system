/**
 * =====================================================================
 * @file            technician-stock-list.view.vue
 * @module          มอดูลการจัดการงานของช่าง - การเบิกของ และดูรายละเอียดการเบิก
 * @layer           View (Presentation Layer)
 * @version         1.0.1
 * @since           2025-10-21
 * @author          เศรษฐพงศ์ หอมชื่น
 * @contributor
 *   - เศรษฐพงศ์ หอมชื่น
 *   - ธนภันทร จันทร์งาม
 *   - ปฏิพัทธ์ จงนันทพันธ์กุล
 *                       
 * @lastModified    2026-02-21
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอรายการคลังสินค้าสำหรับช่างซ่อม
 *   - แสดงรายการสินค้าทั้งหมดจากคลัง (/show-stock)
 *   - ค้นหาสินค้าตามชื่อ หรือรหัสครุภัณฑ์
 *   - กรองตามหมวดหมู่สินค้า
 *   - กรองตามสถานะสินค้า (พร้อมใช้งาน / ใกล้หมด / สินค้าหมด)
 *   - เรียงลำดับตามจำนวนคงเหลือ (มาก → น้อย / น้อย → มาก)
 *   - แสดงสินค้าในรูปแบบการ์ดผ่าน ProductCardComponent
 *   - จัดการตะกร้าสินค้า (เพิ่ม / ลด / ลบ)
 *   - ผูกรายการแจ้งซ่อมกับการเบิกสินค้า
 *   - ยืนยันการเบิกสินค้า และส่งข้อมูลไปยัง API (/withdraw)
 *   - โหลดหมวดหมู่สินค้า (/category)
 *   - โหลดรายการแจ้งซ่อมของช่าง (/technician/repairs)
 *
 * @requires
 *  - vue
 *  - vue-router
 *  - sweetalert2
 *  - @iconify/vue
 *  - @/components/product-card-component.vue
 *  - @/components/modal/confirm-withdraw-component.vue
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - แก้ไขขนาดช่องของสินค้า
       [2569-02-17, ธนภัทร จันทร์งาม] V1.0.0       
 *   - แก้ไขชื่อหน้าจอ   
       [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล] V1.0.1
 * =====================================================================
 */

<script setup>
defineOptions({ name: 'TechnicianStockListView' }) //

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { Icon } from '@iconify/vue'

// Components
import ProductCardComponent from '@/components/product-card-component.vue'
import ConfirmWithdrawComponent from '@/components/modal/confirm-withdraw-component.vue'

const router = useRouter()
const API_BASE_URL = import.meta.env.VITE_API_BASE //

// --- State Management ---
const stockItemList = ref([]) //
const categoryOptionList = ref([]) //
const isLoading = ref(false)

// --- Filters ---
const searchKeyword = ref('')
const isCategoryFilterVisible = ref(false)
const sortQuantity = ref(null)
const isStatusFilterVisible = ref(false)
const selectedCategoryList = ref([]) //
const selectedStatusList = ref([]) //

// --- User Profile ---
const currentUserName = ref('')
const currentDepartment = ref('')

/**
 * ดึงข้อมูลโปรไฟล์จาก Session
 */
const loadTechnicianProfile = () => {
  const user = JSON.parse(
    sessionStorage.getItem('session_user') || localStorage.getItem('session_user'),
  ) //

  if (!user) {
    return
  }

  currentUserName.value = user.fullName || ''
  currentDepartment.value = user.department || ''
}

// --- Repair Jobs ---
const repairJobList = ref([]) //
const selectedRepairCode = ref(null)

/**
 * จำกัดจำนวนตัวอักษรเพื่อการแสดงผล
 */
const limitWords = (text, maxChars = 20) => {
  if (!text) {
    return ''
  }

  return text.length > maxChars ? text.slice(0, maxChars) + '...' : text
}

/**
 * ดึงรายการใบแจ้งซ่อมจาก API
 */
const fetchRepairJobList = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/technician/repairs`, {
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('โหลดรายการแจ้งซ่อมไม่สำเร็จ')
    }

    const data = await response.json()
    repairJobList.value = data.map((item) => ({
      rf_code: item.rf_code,
      rf_title: item.rf_problem ?? item.rf_title ?? 'ไม่ระบุ',
    }))
  } catch (error) {
    console.error(error)
  }
}

// --- Utility Functions ---
/**
 * จัดการ Auth Headers
 */
function getAuthHeaders() {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')

  return { Authorization: `Bearer ${token}` } //
}

const calculateStockStatusKey = (quantity) => {
  if (quantity <= 0) {
    return 'out_of_stock'
  }

  if (quantity < 10) {
    return 'low_stock'
  }

  return 'in_stock'
}

const calculateStockStatusLabel = (quantity) => {
  if (quantity <= 0) {
    return 'สินค้าหมด'
  }

  if (quantity < 10) {
    return 'สินค้าใกล้หมด'
  }

  return 'พร้อมใช้งาน'
}

// --- API Inventory ---
/**
 * ดึงข้อมูลหมวดหมู่สินค้า
 */
const fetchCategoryOptionList = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/category`, { headers: getAuthHeaders() })

    if (!response.ok) {
      throw new Error('Load categories fail')
    }

    const data = await response.json()
    categoryOptionList.value = data.map((item) => item.ct_name)
  } catch (error) {
    console.error(error)
  }
}

/**
 * ดึงข้อมูลรายการสินค้าทั้งหมดในคลัง
 */
const fetchStockItemList = async () => {
  isLoading.value = true

  try {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token')

    if (!token) {
      Swal.fire('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนใช้งาน', 'warning')
      router.push('/login')
      return
    }

    const response = await fetch(`${API_BASE_URL}/show-stock`, { headers: getAuthHeaders() })

    if (response.status === 401) {
      sessionStorage.removeItem('token')
      localStorage.removeItem('token')
      router.push('/login')
      return
    }

    const data = await response.json()
    stockItemList.value = data.map((item) => ({
      id: item.pd_id,
      name: item.pd_name,
      serialNumber: item.pd_asset_code || '-',
      category: item.ct_name || 'ไม่ระบุ',
      quantity: item.pd_quantity,
      unit: item.units_name || 'ชิ้น',
      imageUrl: item.pd_upload_image
        ? `${API_BASE_URL}/uploads/${item.pd_upload_image}`
        : 'https://via.placeholder.com/300?text=No+Image',
      status: calculateStockStatusLabel(item.pd_quantity),
      filterStatus: calculateStockStatusKey(item.pd_quantity),
    }))
  } catch (error) {
    console.error(error)
    Swal.fire('ผิดพลาด', 'ไม่สามารถดึงข้อมูลสินค้าได้', 'error')
  } finally {
    isLoading.value = false
  }
}

// --- Filter Logic ---
const filteredStockItemList = computed(() => {
  let result = stockItemList.value.filter((item) => {
    const query = searchKeyword.value.toLowerCase()
    const matchSearch =
      item.name.toLowerCase().includes(query) || item.serialNumber.toLowerCase().includes(query)

    const matchCategory =
      selectedCategoryList.value.length === 0 || selectedCategoryList.value.includes(item.category)

    const matchStatus =
      selectedStatusList.value.length === 0 || selectedStatusList.value.includes(item.filterStatus)

    return matchSearch && matchCategory && matchStatus
  })

  if (sortQuantity.value === 'asc') {
    result = [...result].sort((a, b) => a.quantity - b.quantity)
  } else if (sortQuantity.value === 'desc') {
    result = [...result].sort((a, b) => b.quantity - a.quantity)
  }

  return result
})

const toggleSortQuantity = () => {
  if (sortQuantity.value === null) {
    sortQuantity.value = 'desc'
  } else if (sortQuantity.value === 'desc') {
    sortQuantity.value = 'asc'
  } else {
    sortQuantity.value = null
  }
}

// --- Cart System ---
const cartItemList = ref([]) //
const isCartOpen = ref(false)
const cartBtn = ref(null)
const cartStep = ref('list')

const cartQtyById = computed(() => {
  const quantityMap = new Map()

  for (const item of cartItemList.value) {
    quantityMap.set(item.id, (quantityMap.get(item.id) || 0) + item.qty)
  }

  return quantityMap
})

const getBaseQty = (id) => {
  const stockItem = stockItemList.value.find((item) => item.id === id)

  return stockItem ? Number(stockItem.quantity || 0) : 0
}

const getAvailableQty = (id) => {
  const baseQty = getBaseQty(id)
  const inCartQty = cartQtyById.value.get(id) || 0

  return Math.max(0, baseQty - inCartQty)
}

const bounceCart = () => {
  if (!cartBtn.value) {
    return
  }

  cartBtn.value.classList.add('cart-bounce')
  setTimeout(() => cartBtn.value.classList.remove('cart-bounce'), 300)
}

const addToCart = (payload) => {
  let product = null

  if (payload && typeof payload === 'object') {
    product = payload
  } else if (typeof payload === 'number' || typeof payload === 'string') {
    const id = Number(payload)
    product = stockItemList.value.find((item) => item.id === id) || null
  }

  if (!product) {
    return
  }

  const available = getAvailableQty(product.id)

  if (available <= 0) {
    Swal.fire({
      icon: 'warning',
      title: 'เพิ่มไม่ได้',
      text: `คงเหลือ 0 ${product.unit}`,
    })
    return
  }

  const foundItem = cartItemList.value.find((item) => item.id === product.id)

  if (foundItem) {
    foundItem.qty++
  } else {
    cartItemList.value.push({ ...product, qty: 1 })
  }

  bounceCart()
}

const removeFromCart = (id) => {
  cartItemList.value = cartItemList.value.filter((item) => item.id !== id)
}

const totalInCart = computed(() => cartItemList.value.reduce((sum, item) => sum + item.qty, 0))

// --- Withdrawal Process ---
const isProcessingWithdraw = ref(false)

const confirmWithdraw = async (formData) => {
  if (cartItemList.value.length === 0) {
    return
  }

  const payload = {
    repair_code: formData.repairCode,
    requester_name: formData.requesterName,
    department: formData.department,
    withdraw_date: formData.withdrawDate,
    items: cartItemList.value.map((item) => ({
      id: item.id,
      qty: item.qty,
    })),
  }

  isProcessingWithdraw.value = true

  try {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const responseBody = await response.json()

    if (!response.ok) {
      throw new Error(responseBody.message)
    }

    Swal.fire('ส่งแบบฟอร์มขอเบิกสำเร็จ', 'เบิกสินค้าเรียบร้อย', 'success')

    cartItemList.value = []
    isCartOpen.value = false
    cartStep.value = 'list'
    selectedRepairCode.value = null

    try {
      sessionStorage.removeItem('selected_rf_code')
    } catch {}

    await fetchStockItemList()
    router.push({ name: 'technician-requisition-list' })
  } catch (error) {
    Swal.fire('ผิดพลาด', error.message, 'error')
  } finally {
    isProcessingWithdraw.value = false
  }
}

// --- Lifecycle Hooks ---
onMounted(() => {
  try {
    const code = sessionStorage.getItem('selected_rf_code')
    if (code) {
      selectedRepairCode.value = code
    }
  } catch {}

  fetchRepairJobList()
  loadTechnicianProfile()
  fetchCategoryOptionList()
  fetchStockItemList()
})

onBeforeUnmount(() => {
  try {
    sessionStorage.removeItem('selected_rf_code')
  } catch {}

  selectedRepairCode.value = null
})
</script>

<template>
  <div
    class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-8xl container px-5 py-6 min-h-screen"
  >
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-black">รายการในคลัง</h1>

      <button
        @click="fetchStockItemList"
        class="text-gray-500 hover:text-blue-600 transition"
        title="รีเฟรชข้อมูล"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>

    <div class="mb-6">
      <div class="flex flex-wrap md:flex-nowrap items-start md:items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3 flex-grow relative">
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="ค้นหารายการวัสดุ/อุปกรณ์"
            class="text-gray-700 w-full md:w-[400px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          <div class="relative">
            <button
              @click.stop="isCategoryFilterVisible = !isCategoryFilterVisible"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 hover:bg-gray-50"
            >
              หมวดหมู่
              <Icon
                icon="meteor-icons:chevron-down"
                style="color: gray"
                class="w-4 h-4 opacity-70 transition-transform"
                :class="{ 'rotate-180': isCategoryFilterVisible }"
              />
            </button>

            <div
              v-if="isCategoryFilterVisible"
              class="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-20 max-h-60 overflow-y-auto"
            >
              <div v-if="categoryOptionList.length === 0" class="text-gray-400 text-sm p-2">
                ไม่มีข้อมูล
              </div>

              <label
                v-for="category in categoryOptionList"
                :key="category"
                class="flex items-center py-1 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="category"
                  v-model="selectedCategoryList"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span class="ml-2 text-gray-700">{{ category }}</span>
              </label>
            </div>
          </div>

          <button
            @click="toggleSortQuantity"
            class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 hover:bg-gray-50"
            :class="{ 'bg-blue-50 border-blue-300 text-blue-700': sortQuantity !== null }"
          >
            จำนวนคงเหลือ

            <svg
              v-if="sortQuantity === 'desc'"
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
                d="M19 9l-7 7-7-7"
              />
            </svg>

            <svg
              v-else-if="sortQuantity === 'asc'"
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
                d="M5 15l7-7 7 7"
              />
            </svg>

            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>

          <div class="relative">
            <button
              @click.stop="isStatusFilterVisible = !isStatusFilterVisible"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 hover:bg-gray-50"
            >
              สถานะ
              <Icon
                icon="meteor-icons:chevron-down"
                style="color: gray"
                class="w-4 h-4 opacity-70 transition-transform"
                :class="{ 'rotate-180': isStatusFilterVisible }"
              />
            </button>

            <div
              v-if="isStatusFilterVisible"
              class="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-20"
            >
              <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  value="in_stock"
                  v-model="selectedStatusList"
                  class="w-4 h-4 text-green-600 border-gray-300 rounded"
                />
                <span class="ml-2 text-gray-700">พร้อมใช้งาน</span>
              </label>

              <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  value="low_stock"
                  v-model="selectedStatusList"
                  class="w-4 h-4 text-orange-500 border-gray-300 rounded"
                />
                <span class="ml-2 text-gray-700">ใกล้หมด</span>
              </label>

              <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  value="out_of_stock"
                  v-model="selectedStatusList"
                  class="w-4 h-4 text-red-600 border-gray-300 rounded"
                />
                <span class="ml-2 text-gray-700">สินค้าหมด</span>
              </label>
            </div>
          </div>
        </div>

        <div class="flex-none">
          <button
            ref="cartBtn"
            @click="
              () => {
                isCartOpen = true
                cartStep = 'list'
              }
            "
            class="inline-flex items-center h-10 px-4 bg-blue-600 text-white rounded-lg"
          >
            <Icon icon="typcn:shopping-cart" width="24" height="24" style="color: #ffffff" /> ตะกร้า
            {{ totalInCart }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-20 text-gray-500">กำลังโหลดข้อมูล...</div>

    <div v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <ProductCardComponent
          v-for="item in filteredStockItemList"
          :key="item.id"
          :product="{ ...item, quantity: getAvailableQty(item.id) }"
          @add="($event) => addToCart($event ?? item)"
        />
      </div>

      <div
        v-if="filteredStockItemList.length === 0"
        class="flex flex-col items-center justify-center py-20 text-gray-400"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-16 w-16 mb-4 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p>ไม่พบรายการสินค้า</p>
      </div>
    </div>

    <div v-if="isCartOpen" class="fixed inset-0 z-50">
      <div
        class="absolute inset-0 bg-black/40"
        @click="
          () => {
            isCartOpen = false
            cartStep = 'list'
          }
        "
      ></div>

      <div class="absolute right-0 top-0 h-full w-auto bg-white shadow-2xl flex flex-col">
        <div class="px-5 py-4 border-b flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            <span v-if="cartStep === 'list'">รายการวัสดุ/อุปกรณ์ในตะกร้า</span>
            <span v-else>ตรวจสอบรายละเอียดการเบิก</span>
          </h2>

          <button
            @click="
              () => {
                isCartOpen = false
                cartStep = 'list'
              }
            "
            class="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-4">
          <div v-if="cartStep === 'list'">
            <div class="mb-5">
              <label class="text-sm text-gray-700 mb-1 block">รายการแจ้งซ่อม <span class="text-red-500">*</span></label>

              <select
                v-model="selectedRepairCode"
                class="w-full h-10 px-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option disabled value="">กรุณาเลือกใบแจ้งซ่อม</option>
                <option
                  v-for="job in repairJobList"
                  :key="job.rf_code"
                  :value="job.rf_code"
                  :title="job.rf_title"
                >
                  {{ job.rf_code }} — {{ limitWords(job.rf_title) }}
                </option>
              </select>
            </div>
            <div v-if="cartItemList.length === 0" class="text-gray-400 text-center mt-20">
              ไม่มีวัสดุ/อุปกรณ์ในตะกร้า
            </div>

            <div
              v-for="item in cartItemList"
              :key="item.id"
              class="flex gap-3 p-3 border rounded-xl hover:shadow-sm transition mb-4"
            >
              <img :src="item.imageUrl" class="w-16 h-16 rounded-lg object-cover border" />

              <div class="flex-1">
                <p class="font-medium text-gray-800">{{ item.name }}</p>
                <p class="text-sm text-gray-400">{{ item.category }}</p>

                <div class="flex items-center gap-2 mt-2">
                  <button
                    @click="
                      () => {
                        if (item.qty > 1) {
                          item.qty--
                        }
                      }
                    "
                    :disabled="item.qty <= 1"
                    class="w-8 h-8 flex items-center justify-center border rounded-md hover:bg-gray-100 disabled:opacity-40"
                  >
                    −
                  </button>

                  <span class="w-6 text-center font-medium">
                    {{ item.qty }}
                  </span>

                  <button
                    @click="
                      () => {
                        if (getAvailableQty(item.id) > 0) {
                          item.qty++
                        }
                      }
                    "
                    :disabled="getAvailableQty(item.id) <= 0"
                    class="w-8 h-8 flex items-center justify-center border rounded-md hover:bg-gray-100 disabled:opacity-40"
                  >
                    +
                  </button>

                  <span class="text-xs text-gray-400">
                    (คงเหลือ {{ getAvailableQty(item.id) }})
                  </span>
                </div>
              </div>

              <button
                @click="removeFromCart(item.id)"
                class="flex items-center justify-center w-8 h-8 text-white transition bg-red-500 rounded-md cursor-pointer sm:w-9 sm:h-8 hover:bg-red-600"
              >
                <Icon icon="mdi:bin-outline" width="24" height="24" style="color: #ffffff" />
              </button>
            </div>
          </div>

          <ConfirmWithdrawComponent
            v-if="cartStep === 'confirm'"
            :items="cartItemList"
            :total="totalInCart"
            :loading="isProcessingWithdraw"
            :requester-name="currentUserName"
            :department="currentDepartment"
            :repair-code="selectedRepairCode"
            @confirm="confirmWithdraw"
            @back="cartStep = 'list'"
          />
        </div>

        <div class="p-5 border-t">
          <button
            v-if="cartStep === 'list'"
            class="w-full py-3 rounded-xl transition font-semibold text-white disabled:bg-gray-300 disabled:text-gray-600 bg-blue-600 hover:bg-blue-700"
            :disabled="!selectedRepairCode || cartItemList.length === 0"
            @click="cartStep = 'confirm'"
          >
            ดำเนินการต่อ
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="selectedRepairCode"
      class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-blue-100 border border-blue-300 text-blue-800 px-4 py-3 rounded-lg shadow-md flex items-center gap-3"
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
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      <div>
        กำลังเบิกวัสดุ/อุปกรณ์สำหรับรายการแจ้งซ่อม :
        <strong>{{ selectedRepairCode }}</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-bounce {
  animation: cartPop 0.3s ease;
}

@keyframes cartPop {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>
