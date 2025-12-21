<script setup>
// ตั้งชื่อ Component ให้ Debug ง่ายขึ้น
defineOptions({ name: 'TechnicianStockListView' })

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import ProductCardComponent from '@/components/product-card-component.vue'
import Swal from 'sweetalert2'
import { Modal } from 'flowbite'

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// --- State Management (ตัวแปรเก็บข้อมูล) ---
const stockItems = ref([])          // เก็บรายการสินค้าทั้งหมดที่ดึงมาจาก API
const categoryOptions = ref([])     // เก็บรายชื่อหมวดหมู่สำหรับใช้ในตัวกรอง
const isLoading = ref(false)        // สถานะการโหลดข้อมูล (หมุนๆ)

// --- Filter Variables (ตัวแปรสำหรับระบบกรอง) ---
const searchKeyword = ref('')           // คำค้นหา (ชื่อสินค้า หรือ รหัส)
const isCategoryFilterVisible = ref(false) // สถานะเปิด/ปิด Dropdown หมวดหมู่
const sortQuantity = ref(null)             // null = ไม่เรียง, 'asc' = น้อยไปมาก, 'desc' = มากไปน้อย
const isStatusFilterVisible = ref(false)   // สถานะเปิด/ปิด Dropdown สถานะสินค้า
const selectedCategories = ref([])      // รายการหมวดหมู่ที่ถูกติ๊กเลือก
const selectedStatuses = ref([])        // รายการสถานะที่ถูกติ๊กเลือก (เช่น 'in_stock')

// --- Helper Functions (ฟังก์ชันช่วยทำงานทั่วไป) ---

// สร้าง HTTP Header พร้อมแนบ Token สำหรับยืนยันตัวตน
function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

// คำนวณ Key สถานะจากจำนวนสินค้า (ใช้สำหรับ Logic การกรอง)
const calculateStockStatusKey = (qty) => {
  if (qty <= 0) return 'out_of_stock'
  if (qty < 10) return 'low_stock'
  return 'in_stock'
}

// แปลงจำนวนสินค้าเป็นข้อความแสดงผลหน้าจอ (UI Label)
const calculateStockStatusLabel = (qty) => {
  if (qty <= 0) return 'สินค้าหมด'
  if (qty < 10) return 'สินค้าใกล้หมด'
  return 'พร้อมใช้งาน'
}

// --- API Actions (ฟังก์ชันดึงข้อมูลจาก Server) ---

// ดึงรายชื่อหมวดหมู่ทั้งหมดมาแสดงในตัวกรอง
const fetchCategoryOptions = async () => {
  try {
    const res = await fetch(`${API_BASE}/category`, { headers: getAuthHeaders() })
    if (!res.ok) throw new Error('Failed to fetch categories')
    const data = await res.json()

    // ดึงเฉพาะชื่อหมวดหมู่มาเก็บใส่ Array
    categoryOptions.value = data.map(c => c.ct_name)
  } catch (error) {
    console.error('Error fetching categories:', error)
  }
}

// ดึงรายการสต็อกสินค้าทั้งหมดจากฐานข้อมูล
const fetchInventoryItems = async () => {
  isLoading.value = true
  try {
    // ตรวจสอบ Token ก่อนเริ่มดึงข้อมูล
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      Swal.fire('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนใช้งาน', 'warning')
      router.push('/login')
      return
    }

    const res = await fetch(`${API_BASE}/show-stock`, { headers: getAuthHeaders() })

    // กรณี Token หมดอายุ ให้ดีดกลับหน้า Login
    if (res.status === 401) {
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
      router.push('/login')
      return
    }

    if (!res.ok) throw new Error('Failed to fetch stock')

    const data = await res.json()

    // แปลงข้อมูลจาก Database ให้ตรงกับ Format ที่ Frontend ใช้งาน
    stockItems.value = data.map(item => ({
      id: item.pd_id,
      name: item.pd_name,
      serialNumber: item.pd_asset_code || '-',
      category: item.ct_name || 'ไม่ระบุ',
      quantity: item.pd_quantity,
      unit: item.units_name || 'ชิ้น',
      // สร้าง URL รูปภาพ (ถ้าไม่มีให้ใช้รูป Placeholder)
      imageUrl: item.pd_upload_image
        ? `${API_BASE}/uploads/${item.pd_upload_image}`
        : 'https://via.placeholder.com/300?text=No+Image',
      // กำหนดข้อความสถานะสำหรับแสดงผล
      status: calculateStockStatusLabel(item.pd_quantity),
      // กำหนด Key สถานะสำหรับระบบกรอง
      filterStatus: calculateStockStatusKey(item.pd_quantity)
    }))

  } catch (error) {
    console.error('Error fetching stock:', error)
    Swal.fire('ผิดพลาด', 'ไม่สามารถดึงข้อมูลสินค้าได้', 'error')
  } finally {
    isLoading.value = false // ปิดสถานะโหลดเสมอไม่ว่าจะสำเร็จหรือไม่
  }
}

// --- Computed Logic (ระบบกรองข้อมูลอัตโนมัติ) ---

// กรองรายการสินค้าตามเงื่อนไข (ค้นหา + หมวดหมู่ + สถานะ)
const filteredStockItems = computed(() => {
  let result = stockItems.value.filter(item => {
    // 1. กรองตามคำค้นหา (ชื่อ หรือ รหัสครุภัณฑ์)
    const query = searchKeyword.value.toLowerCase()
    const matchesSearch = item.name.toLowerCase().includes(query) ||
      item.serialNumber.toLowerCase().includes(query)

    // 2. กรองตามหมวดหมู่ (ถ้ามีการเลือก)
    const matchesCategory = selectedCategories.value.length === 0 ||
      selectedCategories.value.includes(item.category)

    // 3. กรองตามสถานะ (ถ้ามีการเลือก)
    const matchesStatus = selectedStatuses.value.length === 0 ||
      selectedStatuses.value.includes(item.filterStatus)

    // ต้องตรงตามเงื่อนไขทั้งหมดถึงจะแสดงผล
    return matchesSearch && matchesCategory && matchesStatus
  })

  // 4. เรียงลำดับตามจำนวนคงเหลือ (ถ้ามีการเลือก)
  if (sortQuantity.value === 'asc') {
    result = [...result].sort((a, b) => a.quantity - b.quantity)
  } else if (sortQuantity.value === 'desc') {
    result = [...result].sort((a, b) => b.quantity - a.quantity)
  }

  return result
})

// ฟังก์ชันสลับการเรียงลำดับ
const toggleSortQuantity = () => {
  if (sortQuantity.value === null) {
    sortQuantity.value = 'desc' // มากไปน้อย
  } else if (sortQuantity.value === 'desc') {
    sortQuantity.value = 'asc' // น้อยไปมาก
  } else {
    sortQuantity.value = null // ไม่เรียง
  }
}

// selected repair code (จากหน้าแจ้งซ่อม เมื่อต้องการเบิกของ)
const selectedRepairCode = ref(null)

// --- Lifecycle Hook (เริ่มทำงานเมื่อหน้าเว็บโหลดเสร็จ) ---
onMounted(() => {
  // อ่านรหัสใบแจ้งซ่อมที่ถูกเก็บไว้ (ถ้ามี)
  try {
    const code = sessionStorage.getItem('selected_rf_code')
    if (code) selectedRepairCode.value = code
  } catch (e) {
    console.warn('Cannot read selected_rf_code from sessionStorage', e)
  }

  fetchCategoryOptions()  // โหลดตัวเลือกหมวดหมู่
  fetchInventoryItems()   // โหลดรายการสินค้า
})

onBeforeUnmount(() => {
  // เมื่อออกจากหน้านี้ ให้ลบรหัสใบแจ้งซ่อมที่เก็บไว้ใน sessionStorage
  try {
    sessionStorage.removeItem('selected_rf_code')
  } catch (e) {
    console.warn('Cannot remove selected_rf_code from sessionStorage', e)
  }
  selectedRepairCode.value = null
})

// --- CART STATE ---
const cartItems = ref([])
const isCartOpen = ref(false)
const cartBtn = ref(null)

// ฟังก์ชันเพิ่มสินค้าลงตะกร้า + animation
const addToCart = (product) => {
  const found = cartItems.value.find(i => i.id === product.id)
  const currentQtyInCart = found ? found.qty : 0

  // ตรวจสอบว่าจำนวนในตะกร้า + 1 เกินจำนวนคงเหลือหรือไม่
  if (currentQtyInCart + 1 > product.quantity) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      animation: false,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
      }
    })
    Toast.fire({
      icon: 'warning',
      title: `ไม่สามารถเพิ่มสินค้า "${product.name}" ได้`,
      text: `เนื่องจากมีจำนวนคงเหลือ ${product.quantity} ${product.unit}`,
      background: '#fef3c7',
      color: '#92400e'
    })
    return
  }

  if (found) {
    found.qty++
  } else {
    cartItems.value.push({
      ...product,
      qty: 1
    })
  }

  // 👉 เด้งตะกร้าแทน
  bounceCart()
}
// ฟังก์ชันลบสินค้าออกจากตะกร้า
const removeFromCart = (id) => {
  cartItems.value = cartItems.value.filter(i => i.id !== id)
}


// CART ANIMATION
const bounceCart = () => {
  if (!cartBtn.value) return

  cartBtn.value.classList.add('cart-bounce')

  setTimeout(() => {
    cartBtn.value.classList.remove('cart-bounce')
  }, 300)
}

// Confirm withdraw: show confirmation modal and POST cart to backend
const isProcessingWithdraw = ref(false)
const confirmWithdraw = async () => {
  if (cartItems.value.length === 0) return

  const totalCount = cartItems.value.reduce((s, i) => s + i.qty, 0)
  const htmlList = cartItems.value
    .map(i => `<div class="text-sm">${i.name} — จำนวน: <strong>${i.qty}</strong></div>`)
    .join('')

  const result = await Swal.fire({
    title: 'ยืนยันการเบิก',
    html: `<div class="text-left">คุณต้องการเบิก ${totalCount} รายการ?<div class="mt-2">${htmlList}</div></div>`,
    showCancelButton: true,
    confirmButtonText: 'ยืนยันการเบิก',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#1E48D1',
    width: 600,
  })

  if (!result.isConfirmed) return

  // prepare payload
  const payload = {
    repair_code: selectedRepairCode.value || null,
    items: cartItems.value.map(i => ({ id: i.id, qty: i.qty })),
  }

  isProcessingWithdraw.value = true
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      Swal.fire('หมดเวลาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบใหม่', 'warning')
      router.push('/login')
      return
    }

    const res = await fetch(`${API_BASE}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })

    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(body.message || `การเบิกล้มเหลว (status ${res.status})`)
    }

    Swal.fire({
      title: 'เบิกสินค้าเรียบร้อย',
      text: body.message || 'ดำเนินการสำเร็จ',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
    })

    // clear cart and refresh inventory
    cartItems.value = []
    isCartOpen.value = false
    await fetchInventoryItems()
  } catch (err) {
    console.error('Withdraw error:', err)
    Swal.fire('ผิดพลาด', err.message || 'ไม่สามารถเบิกสินค้าได้', 'error')
  } finally {
    isProcessingWithdraw.value = false
  }
}


</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-8xl container px-5 py-6 min-h-screen">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-black">รายการคลังสินค้า</h1>
      <button @click="fetchInventoryItems" class="text-gray-500 hover:text-blue-600 transition" title="รีเฟรชข้อมูล">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>

    <div class="mb-6">
      <div class="flex flex-wrap md:flex-nowrap items-start md:items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3 flex-grow relative">

          <input v-model="searchKeyword" type="text" placeholder="ค้นหารายการของ (ชื่อ, รหัส)"
            class="text-gray-700 w-full md:w-[400px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />

          <div class="relative">
            <button @click.stop="isCategoryFilterVisible = !isCategoryFilterVisible"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 hover:bg-gray-50">
              หมวดหมู่
              <img src="/icon/sidebar/chevron-down-icon.svg" class="w-4 h-4 opacity-70 transition-transform"
                :class="{ 'rotate-180': isCategoryFilterVisible }" />
            </button>
            <div v-if="isCategoryFilterVisible"
              class="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-20 max-h-60 overflow-y-auto">

              <div v-if="categoryOptions.length === 0" class="text-gray-400 text-sm p-2">ไม่มีข้อมูล</div>

              <label v-for="category in categoryOptions" :key="category"
                class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" :value="category" v-model="selectedCategories"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                <span class="ml-2 text-gray-700">{{ category }}</span>
              </label>
            </div>
          </div>

          <button @click="toggleSortQuantity"
            class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 hover:bg-gray-50"
            :class="{ 'bg-blue-50 border-blue-300 text-blue-700': sortQuantity !== null }">
            จำนวนคงเหลือ
            <svg v-if="sortQuantity === 'desc'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
            <svg v-else-if="sortQuantity === 'asc'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>

          <div class="relative">
            <button @click.stop="isStatusFilterVisible = !isStatusFilterVisible"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 hover:bg-gray-50">
              สถานะ
              <img src="/icon/sidebar/chevron-down-icon.svg" class="w-4 h-4 opacity-70 transition-transform"
                :class="{ 'rotate-180': isStatusFilterVisible }" />
            </button>

            <div v-if="isStatusFilterVisible"
              class="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-20">
              <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" value="in_stock" v-model="selectedStatuses"
                  class="w-4 h-4 text-green-600 border-gray-300 rounded" />
                <span class="ml-2 text-gray-700">พร้อมใช้งาน (In Stock)</span>
              </label>
              <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" value="low_stock" v-model="selectedStatuses"
                  class="w-4 h-4 text-orange-500 border-gray-300 rounded" />
                <span class="ml-2 text-gray-700">ใกล้หมด (Low Stock)</span>
              </label>
              <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" value="out_of_stock" v-model="selectedStatuses"
                  class="w-4 h-4 text-red-600 border-gray-300 rounded" />
                <span class="ml-2 text-gray-700">สินค้าหมด (Out of Stock)</span>
              </label>
            </div>
          </div>

        </div>
        <div class="flex-none">
          <button ref="cartBtn" @click="isCartOpen = true"
            class="inline-flex items-center h-10 px-4 bg-blue-600 text-white rounded-lg">
            🛒 ตระกร้า {{cartItems.reduce((s, i) => s + i.qty, 0)}}
          </button>

        </div>

      </div>
    </div>

    <div v-if="isLoading" class="text-center py-20 text-gray-500">
      กำลังโหลดข้อมูล...
    </div>

    <div v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <ProductCardComponent v-for="item in filteredStockItems" :key="item.id" :product="item" @add="addToCart" />
      </div>

      <div v-if="filteredStockItems.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p>ไม่พบรายการสินค้า</p>
      </div>
    </div>

    <div v-if="isCartOpen" class="fixed inset-0 z-50">
      <!-- overlay -->
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="isCartOpen = false"></div>

      <!-- sidebar -->
      <div class="absolute right-0 top-0 h-full w-96 bg-white shadow-2xl flex flex-col">
        <!-- header -->
        <div class="px-5 py-4 border-b flex items-center justify-between">
          <h2 class="text-lg font-semibold">🛒 ตะกร้าสินค้า</h2>
          <button @click="isCartOpen = false" class="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <!-- content -->
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div v-if="cartItems.length === 0" class="text-gray-400 text-center mt-20">
            ไม่มีสินค้าในตะกร้า
          </div>

          <!-- Side bar รายการของในตระกร้า -->
          <div v-for="item in cartItems" :key="item.id"
            class="flex gap-3 p-3 border rounded-xl hover:shadow-sm transition">
            <img :src="item.imageUrl" class="w-16 h-16 rounded-lg object-cover border" />

            <div class="flex-1">
              <p class="font-medium text-gray-800 leading-tight">
                {{ item.name }}
              </p>
              <p class="text-sm text-gray-400">
                {{ item.category }}
              </p>

              <!-- qty control เพิ่ม ลด จำนวน -->
              <div class="flex items-center gap-2 mt-2">
                <button @click="item.qty--" :disabled="item.qty <= 1"
                  class="w-8 h-8 flex items-center justify-center border rounded-md hover:bg-gray-100 disabled:opacity-40">
                  −
                </button>

                <span class="w-6 text-center font-medium">
                  {{ item.qty }}
                </span>

                <button @click="item.qty < item.quantity ? item.qty++ : null" :disabled="item.qty >= item.quantity"
                  class="w-8 h-8 flex items-center justify-center border rounded-md hover:bg-gray-100 disabled:opacity-40">
                  +
                </button>
                <span class="text-xs text-gray-400">(คงเหลือ {{ item.quantity }})</span>
              </div>
            </div>

            <!-- ลบของ -->
            <button @click="removeFromCart(item.id)" class="text-red-500 hover:text-red-600" title="ลบสินค้า">
              🗑
            </button>
          </div>
        </div>

        <!-- footer -->
        <div class="p-5 border-t">
          <button class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition"
            :disabled="cartItems.length === 0 || isProcessingWithdraw" @click="confirmWithdraw">
            <span v-if="!isProcessingWithdraw">ยืนยันการเบิก</span>
            <span v-else>กำลังประมวลผล...</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="selectedRepairCode"
      class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg shadow-md flex items-center gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        กำลังเบิกของสำหรับใบแจ้งซ่อม: <strong>{{ selectedRepairCode }}</strong>
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
