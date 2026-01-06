<script setup>
defineOptions({ name: 'TechnicianStockListView' })

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import ProductCardComponent from '@/components/product-card-component.vue'
import ConfirmWithdrawComponent from '@/components/modal/confirm-withdraw-component.vue'
import Swal from 'sweetalert2'

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// --- State Management ---
const stockItems = ref([])
const categoryOptions = ref([])
const isLoading = ref(false)

// --- Filters ---
const searchKeyword = ref('')
const isCategoryFilterVisible = ref(false)
const sortQuantity = ref(null)
const isStatusFilterVisible = ref(false)
const selectedCategories = ref([])
const selectedStatuses = ref([])

import { jwtDecode } from 'jwt-decode'

const currentUserName = ref('')
const currentDepartment = ref('')

const loadTechnicianProfile = () => {
  const user = JSON.parse(
    localStorage.getItem('session_user') || sessionStorage.getItem('session_user'),
  )
  if (!user) return

  currentUserName.value = user.fullName || ''
  currentDepartment.value = user.department || ''
}

const repairJobList = ref([])
const limitWords = (text, maxChars = 20) => {
  if (!text) return ''
  return text.length > maxChars ? text.slice(0, maxChars) + '...' : text
}

const fetchRepairJobs = async () => {
  try {
    const res = await fetch(`${API_BASE}/technician/repairs`, {
      headers: getAuthHeaders(),
    })

    if (!res.ok) throw new Error('โหลดรายการใบแจ้งซ่อมล้มเหลว')

    const data = await res.json()

    repairJobList.value = data.map((r) => ({
      rf_code: r.rf_code,
      rf_title: r.rf_problem ?? r.rf_title ?? 'ไม่ระบุ',
    }))
  } catch (err) {
    console.error(err)
  }
}

// --- Utility ---
function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

const calculateStockStatusKey = (qty) => {
  if (qty <= 0) return 'out_of_stock'
  if (qty < 10) return 'low_stock'
  return 'in_stock'
}

const calculateStockStatusLabel = (qty) => {
  if (qty <= 0) return 'สินค้าหมด'
  if (qty < 10) return 'สินค้าใกล้หมด'
  return 'พร้อมใช้งาน'
}

// --- API ---
const fetchCategoryOptions = async () => {
  try {
    const res = await fetch(`${API_BASE}/category`, { headers: getAuthHeaders() })
    if (!res.ok) throw new Error('Load categories fail')

    const data = await res.json()
    categoryOptions.value = data.map((c) => c.ct_name)
  } catch (err) {
    console.error(err)
  }
}

const fetchInventoryItems = async () => {
  isLoading.value = true
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      Swal.fire('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนใช้งาน', 'warning')
      router.push('/login')
      return
    }

    const res = await fetch(`${API_BASE}/show-stock`, { headers: getAuthHeaders() })

    if (res.status === 401) {
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
      router.push('/login')
      return
    }

    const data = await res.json()
    stockItems.value = data.map((item) => ({
      id: item.pd_id,
      name: item.pd_name,
      serialNumber: item.pd_asset_code || '-',
      category: item.ct_name || 'ไม่ระบุ',
      quantity: item.pd_quantity,
      unit: item.units_name || 'ชิ้น',
      imageUrl: item.pd_upload_image
        ? `${API_BASE}/uploads/${item.pd_upload_image}`
        : 'https://via.placeholder.com/300?text=No+Image',
      status: calculateStockStatusLabel(item.pd_quantity),
      filterStatus: calculateStockStatusKey(item.pd_quantity),
    }))
  } catch (err) {
    console.error(err)
    Swal.fire('ผิดพลาด', 'ไม่สามารถดึงข้อมูลสินค้าได้', 'error')
  } finally {
    isLoading.value = false
  }
}

// --- FILTERS ---
const filteredStockItems = computed(() => {
  let result = stockItems.value.filter((item) => {
    const q = searchKeyword.value.toLowerCase()
    const matchSearch =
      item.name.toLowerCase().includes(q) || item.serialNumber.toLowerCase().includes(q)

    const matchCat =
      selectedCategories.value.length === 0 || selectedCategories.value.includes(item.category)

    const matchStatus =
      selectedStatuses.value.length === 0 || selectedStatuses.value.includes(item.filterStatus)

    return matchSearch && matchCat && matchStatus
  })

  if (sortQuantity.value === 'asc') {
    result = [...result].sort((a, b) => a.quantity - b.quantity)
  } else if (sortQuantity.value === 'desc') {
    result = [...result].sort((a, b) => b.quantity - a.quantity)
  }

  return result
})

const toggleSortQuantity = () => {
  if (sortQuantity.value === null) sortQuantity.value = 'desc'
  else if (sortQuantity.value === 'desc') sortQuantity.value = 'asc'
  else sortQuantity.value = null
}

// --- Repair Code ---
const selectedRepairCode = ref(null)

// --- Lifecycle ---
onMounted(() => {
  try {
    const code = sessionStorage.getItem('selected_rf_code')
    if (code) selectedRepairCode.value = code
  } catch {}
  fetchRepairJobs()
  loadTechnicianProfile()

  fetchCategoryOptions()
  fetchInventoryItems()
})

onBeforeUnmount(() => {
  try {
    sessionStorage.removeItem('selected_rf_code')
  } catch {}
  selectedRepairCode.value = null
})

// --- CART SYSTEM ---
const cartItems = ref([])
const isCartOpen = ref(false)
const cartBtn = ref(null)

// SideBar steps → list | confirm
const cartStep = ref('list')

const addToCart = (product) => {
  const f = cartItems.value.find((i) => i.id === product.id)
  const qtyInCart = f ? f.qty : 0

  if (qtyInCart + 1 > product.quantity) {
    Swal.fire({
      icon: 'warning',
      title: `เพิ่มไม่ได้`,
      text: `คงเหลือ ${product.quantity} ${product.unit}`,
    })
    return
  }

  if (f) {
    f.qty++
  } else {
    cartItems.value.push({ ...product, qty: 1 })
  }

  // 🔥 ลดจำนวนใน stockItems แบบ realtime
  const stockItem = stockItems.value.find((i) => i.id === product.id)
  if (stockItem) stockItem.quantity--

  bounceCart()
}

const removeFromCart = (id) => {
  const removed = cartItems.value.find((i) => i.id === id)

  // 🔥 เพิ่มจำนวนกลับเข้าสต๊อก
  const stockItem = stockItems.value.find((i) => i.id === id)
  if (stockItem) stockItem.quantity += removed.qty

  cartItems.value = cartItems.value.filter((i) => i.id !== id)
}

const bounceCart = () => {
  if (!cartBtn.value) return
  cartBtn.value.classList.add('cart-bounce')
  setTimeout(() => cartBtn.value.classList.remove('cart-bounce'), 300)
}

const totalInCart = computed(() => cartItems.value.reduce((s, i) => s + i.qty, 0))

// --- Confirm withdraw (step 2) ---
const isProcessingWithdraw = ref(false)

const confirmWithdraw = async (formData) => {
  if (cartItems.value.length === 0) return

  const payload = {
    repair_code: formData.repairCode, // อ่านจากฟอร์ม (readonly)
    requester_name: formData.requesterName, // อ่านจากฟอร์ม (readonly)
    department: formData.department, // อ่านจากฟอร์ม (readonly)
    withdraw_date: formData.withdrawDate, // วันที่ที่ user กรอกจริง
    items: cartItems.value.map((i) => ({
      id: i.id,
      qty: i.qty,
    })),
  }

  console.log('PAYLOAD ที่จะส่ง:', payload)

  isProcessingWithdraw.value = true

  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const res = await fetch(`${API_BASE}/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const body = await res.json()
    if (!res.ok) throw new Error(body.message)

    Swal.fire('สำเร็จ', 'เบิกสินค้าเรียบร้อย', 'success')

    cartItems.value = []
    isCartOpen.value = false
    cartStep.value = 'list'

    await fetchInventoryItems()
  } catch (err) {
    Swal.fire('ผิดพลาด', err.message, 'error')
  } finally {
    isProcessingWithdraw.value = false
  }
}
</script>

<template>
  <div
    class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-8xl container px-5 py-6 min-h-screen"
  >
    <!-- HEADER -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-black">รายการคลังสินค้า</h1>

      <button
        @click="fetchInventoryItems"
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

    <!-- FILTER BAR -->
    <div class="mb-6">
      <div class="flex flex-wrap md:flex-nowrap items-start md:items-center justify-between gap-4">
        <!-- SEARCH + FILTERS -->
        <div class="flex flex-wrap items-center gap-3 flex-grow relative">
          <!-- Search -->
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="ค้นหารายการของ (ชื่อ, รหัส)"
            class="text-gray-700 w-full md:w-[400px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          <!-- Category Filter -->
          <div class="relative">
            <button
              @click.stop="isCategoryFilterVisible = !isCategoryFilterVisible"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 hover:bg-gray-50"
            >
              หมวดหมู่
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform"
                :class="{ 'rotate-180': isCategoryFilterVisible }"
              />
            </button>

            <div
              v-if="isCategoryFilterVisible"
              class="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-20 max-h-60 overflow-y-auto"
            >
              <div v-if="categoryOptions.length === 0" class="text-gray-400 text-sm p-2">
                ไม่มีข้อมูล
              </div>

              <label
                v-for="category in categoryOptions"
                :key="category"
                class="flex items-center py-1 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="category"
                  v-model="selectedCategories"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span class="ml-2 text-gray-700">{{ category }}</span>
              </label>
            </div>
          </div>

          <!-- Sort -->
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

          <!-- Status Filter -->
          <div class="relative">
            <button
              @click.stop="isStatusFilterVisible = !isStatusFilterVisible"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 hover:bg-gray-50"
            >
              สถานะ
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
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
                  v-model="selectedStatuses"
                  class="w-4 h-4 text-green-600 border-gray-300 rounded"
                />
                <span class="ml-2 text-gray-700">พร้อมใช้งาน</span>
              </label>

              <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  value="low_stock"
                  v-model="selectedStatuses"
                  class="w-4 h-4 text-orange-500 border-gray-300 rounded"
                />
                <span class="ml-2 text-gray-700">ใกล้หมด</span>
              </label>

              <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  value="out_of_stock"
                  v-model="selectedStatuses"
                  class="w-4 h-4 text-red-600 border-gray-300 rounded"
                />
                <span class="ml-2 text-gray-700">สินค้าหมด</span>
              </label>
            </div>
          </div>
        </div>

        <!-- CART BUTTON -->
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
            🛒 ตระกร้า {{ totalInCart }}
          </button>
        </div>
      </div>
    </div>

    <!-- LOADING -->
    <div v-if="isLoading" class="text-center py-20 text-gray-500">กำลังโหลดข้อมูล...</div>

    <!-- PRODUCT GRID -->
    <div v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <ProductCardComponent
          v-for="item in filteredStockItems"
          :key="item.id"
          :product="item"
          @add="addToCart"
        />
      </div>

      <div
        v-if="filteredStockItems.length === 0"
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

    <!-- ======================= -->
    <!--       CART SIDEBAR      -->
    <!-- ======================= -->
    <div v-if="isCartOpen" class="fixed inset-0 z-50">
      <!-- overlay -->
      <div
        class="absolute inset-0 bg-black/40"
        @click="
          () => {
            isCartOpen = false
            cartStep = 'list'
          }
        "
      ></div>

      <!-- sidebar -->
      <div class="absolute right-0 top-0 h-full w-auto bg-white shadow-2xl flex flex-col">
        <!-- header -->
        <div class="px-5 py-4 border-b flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            <span v-if="cartStep === 'list'">ตะกร้าสินค้า</span>
            <span v-else>ตรวจสอบการเบิก</span>
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

        <!-- content -->
        <div class="flex-1 overflow-y-auto px-5 py-4">
          <!-- STEP 1 -->
          <div v-if="cartStep === 'list'">
            <!-- เลือกใบแจ้งซ่อม -->
            <div class="mb-5">
              <label class="text-sm text-gray-700 mb-1 block">ใบแจ้งซ่อม *</label>

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
            <div v-if="cartItems.length === 0" class="text-gray-400 text-center mt-20">
              ไม่มีสินค้าในตะกร้า
            </div>

            <div
              v-for="item in cartItems"
              :key="item.id"
              class="flex gap-3 p-3 border rounded-xl hover:shadow-sm transition mb-4"
            >
              <img :src="item.imageUrl" class="w-16 h-16 rounded-lg object-cover border" />

              <div class="flex-1">
                <p class="font-medium text-gray-800">{{ item.name }}</p>
                <p class="text-sm text-gray-400">{{ item.category }}</p>

                <!-- qty -->
                <div class="flex items-center gap-2 mt-2">
                  <button
                    @click="
                      () => {
                        if (item.qty > 1) {
                          item.qty--
                          const s = stockItems.find((s) => s.id === item.id)
                          if (s) s.quantity++
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
                        if (item.qty < item.quantity) {
                          item.qty++
                          const s = stockItems.find((s) => s.id === item.id)
                          if (s) s.quantity--
                        }
                      }
                    "
                    :disabled="item.qty >= item.quantity"
                    class="w-8 h-8 flex items-center justify-center border rounded-md hover:bg-gray-100 disabled:opacity-40"
                  >
                    +
                  </button>

                  <span class="text-xs text-gray-400"> (คงเหลือ {{ item.quantity }}) </span>
                </div>
              </div>

              <!-- delete -->
              <button @click="removeFromCart(item.id)" class="text-red-500 hover:text-red-600">
                🗑
              </button>
            </div>
          </div>

          <!-- STEP 2 -->
          <ConfirmWithdrawComponent
            v-if="cartStep === 'confirm'"
            :items="cartItems"
            :total="totalInCart"
            :loading="isProcessingWithdraw"
            :requester-name="currentUserName"
            :department="currentDepartment"
            :repair-code="selectedRepairCode"
            @confirm="confirmWithdraw"
            @back="cartStep = 'list'"
          />
        </div>

        <!-- footer -->
        <div class="p-5 border-t">
          <!-- ไปหน้า confirm -->
          <button
            v-if="cartStep === 'list'"
            class="w-full py-3 rounded-xl transition font-semibold text-white disabled:bg-gray-300 disabled:text-gray-600 bg-blue-600 hover:bg-blue-700"
            :disabled="!selectedRepairCode || cartItems.length === 0"
            @click="cartStep = 'confirm'"
          >
            ดำเนินการต่อ
          </button>
        </div>
      </div>
    </div>

    <!-- Repair code notice -->
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
        กำลังเบิกของสำหรับใบแจ้งซ่อม:
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
