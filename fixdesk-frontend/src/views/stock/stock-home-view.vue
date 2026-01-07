<template>
  <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-8xl container mx-auto px-5 py-6">

    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">หน้าแรก</h1>
      </div>
      <button @click="$router.push('/main/repair-request')" class="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        แจ้งซ่อม
      </button>
    </div>


    <!-- Stats cards -->
    <div class="flex justify-center items-center gap-6 mb-6 flex-wrap">
      <!-- Card 1 (click -> manage inventory) -->
      <div
        class="bg-white rounded-lg border p-6 text-center shadow-sm hover:shadow-md cursor-pointer flex flex-col items-center justify-center w-[20%]"
        role="button"
        tabindex="0"
        @click="$router.push('/main/stock-manage-inventory')"
        @keyup.enter="$router.push('/main/stock-manage-inventory')"
      >
          <h2 class="text-2xl font-bold text-blue-600">{{ itemsCount }} รายการ</h2>
        <p class="text-gray-600 text-sm">จำนวนรายการ</p>
      </div>

      <!-- Card 2 (click -> manage inventory) -->
      <div
        class="bg-white rounded-lg border p-6 text-center shadow-sm hover:shadow-md cursor-pointer flex flex-col items-center justify-center w-[20%]"
        role="button"
        tabindex="0"
        @click="$router.push('/main/stock-manage-inventory')"
        @keyup.enter="$router.push('/main/stock-manage-inventory')"
      >
          <h2 class="text-2xl font-bold text-orange-500">{{ itemsNew }} รายการ</h2>
        <p class="text-gray-600 text-sm">ของเข้าใหม่วันนี้</p>
      </div>

      <!-- Card 3 (click -> withdraw list) -->
      <div
        class="bg-white rounded-lg border p-6 text-center shadow-sm hover:shadow-md cursor-pointer flex flex-col items-center justify-center w-[20%]"
        role="button"
        tabindex="0"
        @click="$router.push('/main/stock-withdraw-list')"
        @keyup.enter="$router.push('/main/stock-withdraw-list')"
      >
          <h2 class="text-2xl font-bold text-green-600">{{ itemRequestWaiting }} รายการ</h2>
        <p class="text-gray-600 text-sm">คำขอเบิกรออนุมัติ</p>
      </div>

      <!-- Card 4 (click -> withdraw list) -->
      <div
        class="bg-white rounded-lg border p-6 text-center shadow-sm hover:shadow-md cursor-pointer flex flex-col items-center justify-center w-[20%]"
        role="button"
        tabindex="0"
        @click="$router.push('/main/stock-withdraw-list')"
        @keyup.enter="$router.push('/main/stock-withdraw-list')"
      >
          <h2 class="text-2xl font-bold text-red-600">{{ itemRequestDeclined }} รายการ</h2>
        <p class="text-gray-600 text-sm">คำขอเบิกไม่อนุมัติ</p>
      </div>
    </div>

    <!-- Charts box -->
    <div class="flex gap-4">
      <div class="bg-white rounded-xl border pt-4 px-6 flex-[1.4]">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-800">ภาพรวมสต็อก (กราฟ)</h1>
            <p class="text-gray-600">รายการของที่เบิก</p>
          </div>
        </div>
        <!-- Charts -->



      </div>

      <!-- x5 Recent Requests -->
      <div class="bg-white rounded-xl border pt-4 px-6 flex-[1]">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">คำขอเบิก (รออนุมัติ)</h1>
          <p class="text-gray-600">รายการของที่เบิก (5 รายการล่าสุด)</p>
        </div>
        <hr class="border-t-2 border-gray-300 my-4 -mx-6" />
        <div v-for="(item, index) in recentRequests" :key="item.sf_id || index" class="mb-4">
          <span class="inline-block px-3 py-1 rounded-full" style="background-color:#D9EFFF; color:#0072C3; font-size:0.875rem; font-weight:500;">{{ item.sf_code || "SF-0000-000" }}</span>
          <p class="text-gray-600 text-sm text-xl"><b>{{ item.related_rf_code ? `RF: ${item.related_rf_code}` : (item.building_name || '[สถานที่]') }}</b></p>
          <p class="text-[16px] text-[#A1A1A1]">สถานะ: {{ item.sf_status || '[สถานะ]' }} • {{ item.building_name || '[อาคาร]' }}</p>
          <p class="text-[16px] text-[#A1A1A1]">ขอเมื่อ {{ item.displayDate || "00/00/0000" }} {{ item.displayTime || "00:00:00"}}</p>
        </div>
      </div>
    </div>

    <!-- End Page -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// Pull With Auth
function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    Authorization: `Bearer ${token}`,
  }
}

// For Display
const itemsCount = ref(0)
const itemsNew = ref(0)
const itemRequestWaiting = ref(0)
const itemRequestDeclined = ref(0)
const recentRequests = ref([])

// Dropdown state (moved into script-setup)
const open = ref(false)
const selected = ref('7 วัน')

defineOptions({ name: 'StockHomeView' })

async function fetchCounts() {
  // Try-Catch Update Auth +Error
  try {
    const res = await fetch(`${API_BASE}/show-stock`, { headers: getAuthHeaders() })
    if (res.ok) {
      const products = await res.json()
      if (Array.isArray(products)) {
        itemsCount.value = products.length

        const today = new Date().toISOString().slice(0, 10)
        itemsNew.value = products.filter((p) => p.pd_updated_at && p.pd_updated_at.slice(0, 10) === today).length
      }
    }
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการค้นหาข้อมูล:', err)
  }

  try {
    // Keep counts for current user
    const res2 = await fetch(`${API_BASE}/technician/my-stock-forms`, { headers: getAuthHeaders() })
    if (res2.ok) {
      const forms = await res2.json()
      if (Array.isArray(forms)) {
        itemRequestWaiting.value = forms.filter((f) => f.sf_status === 'waiting').length
        itemRequestDeclined.value = forms.filter((f) => f.sf_status === 'rejected').length
      }
    }

    // Fetch ข้อมูล Stock ใหม่สุดจากทั้งหมด
    const allRes = await fetch(`${API_BASE}/stock-forms`, { headers: getAuthHeaders() })
    if (allRes.ok) {
      const allForms = await allRes.json()
      if (Array.isArray(allForms)) {
        recentRequests.value = allForms
          .slice()
          .sort((a, b) => new Date(b.sf_create_at) - new Date(a.sf_create_at))
          .slice(0, 5)
          .map((f) => ({
            // normalize fields used by template
            sf_id: f.sf_id,
            sf_code: f.sf_code,
            sf_status: f.sf_status,
            sf_create_at: f.sf_create_at,
            building_name: f.bd_name || f.building_name || null,
            floor_name: f.fl_name || null,
            room_name: f.room_name || null,
            requester: f.requester || null,
            displayDate: f.sf_create_at ? new Date(f.sf_create_at).toLocaleDateString() : null,
            displayTime: f.sf_create_at ? new Date(f.sf_create_at).toLocaleTimeString() : null,
          }))
      }
    }
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการค้นหาข้อมูล:', err)
  }
}

onMounted(() => {
  fetchCounts()
})

function choose(option) {
  selected.value = option
  open.value = false
}
</script>
