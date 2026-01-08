<script setup>
import { ref, computed, onMounted } from 'vue'
import TableComponent from '@/components/table-component.vue'
import repairButton from '@/components/repair-button-component.vue'
import CardHomeComponent from '@/components/card-home-component.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

defineOptions({ name: 'StockHomeView' })

// ==================== API ====================
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    Authorization: `Bearer ${token}`,
  }
}

// ==================== State ====================
const products = ref([])
const stockForms = ref([])
const tableRows = ref([])
const loading = ref(false)

function openDetail(code) {
  router.push(`/main/stock-requisition/${code}`)
}

// ==================== Table ====================
const columns = ['รหัสใบเบิก', 'รายละเอียด', 'ตัวจัดการ']

// ==================== Load Dashboard ====================
async function fetchDashboard() {
  loading.value = true
  try {
    // ---------- Products ----------
    const resProducts = await fetch(`${API_BASE}/show-stock`, {
      headers: getAuthHeaders(),
    })
    if (resProducts.ok) {
      products.value = await resProducts.json()
    }

    // ---------- Stock Forms ----------
    const resForms = await fetch(`${API_BASE}/stock-forms`, {
      headers: getAuthHeaders(),
    })
    if (resForms.ok) {
      const data = await resForms.json()
      stockForms.value = Array.isArray(data) ? data : []

      // ใช้เฉพาะ 5 รายการล่าสุด
      tableRows.value = stockForms.value
        .slice()
        .filter((item) => item.sf_status === 'waiting')
        .sort((a, b) => new Date(b.sf_create_at) - new Date(a.sf_create_at))
        .slice(0, 5)
        .map((item) => ({
          row: [
            item.sf_code, // 0 รหัสใบเบิก
            'วันที่: ' +
              new Date(item.sf_create_at).toLocaleDateString('th-TH') +
              '<br>' +
              'ผู้ขอเบิก: ' +
              item.requester +
              '<br>' +
              'หน่วยงาน: ' +
              item.us_department,

            '', // 4 ตัวจัดการ (เว้นไว้)
          ],
          meta: {
            createdDate: new Date(item.sf_create_at),
            raw: item,
          },
        }))
    }
  } catch (err) {
    console.error('โหลด Dashboard ไม่สำเร็จ:', err)
  } finally {
    loading.value = false
  }
}

// ==================== Cards ====================
const today = new Date()

const itemsCount = computed(() => products.value.length)

const itemsNewToday = computed(
  () =>
    products.value.filter((p) => {
      if (!p.pd_updated_at) return false
      return new Date(p.pd_updated_at).toDateString() === today.toDateString()
    }).length,
)

const requestWaiting = computed(
  () => stockForms.value.filter((f) => f.sf_status === 'waiting').length,
)

const requestRejected = computed(
  () => stockForms.value.filter((f) => f.sf_status === 'rejected').length,
)

const statItems = computed(() => [
  { value: itemsCount.value, label: 'จำนวนรายการ', colorClass: 'text-blue-600' },
  { value: itemsNewToday.value, label: 'ของเข้าใหม่วันนี้', colorClass: 'text-green-600' },
  { value: requestWaiting.value, label: 'รออนุมัติ', colorClass: 'text-amber-500' },
  { value: requestRejected.value, label: 'ไม่อนุมัติ', colorClass: 'text-red-600' },
])

// ==================== Lifecycle ====================
onMounted(() => {
  fetchDashboard()
})
</script>
<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-8xl">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">ภาพรวมการเบิก และการคลังในระบบ</h1>
        <p class="text-sm text-gray-500 mt-1">สำหรับเจ้าหน้าที่จัดการคลัง</p>
      </div>
      <repairButton />
    </div>

    <!-- Cards -->
    <div class="mt-4 mb-8">
      <CardHomeComponent :items="statItems" />
    </div>

    <div class="flex gap-4">
      <!-- Charts -->
      <div class="bg-white rounded-lg border pt-4 px-6 flex-[1.4]">
        <h1 class="text-xl font-bold text-gray-800">ภาพรวมสต็อก (กราฟ)</h1>
        <p class="text-base text-gray-600">รายการของที่เบิก</p>
      </div>

      <!-- Recent Stock Requests -->
      <div class="bg-white rounded-lg border pt-4 px-6 flex-[1]">
        <h1 class="text-xl font-bold text-gray-800">รายการคำขอเบิกของที่รออนุมัติ</h1>
        <p class="text-base text-gray-600">5 รายการล่าสุด นับจากวันที่ส่งคำขอ</p>

        <hr class="border-t my-4 -mx-6" />

        <TableComponent
          :columns="columns"
          :rows="tableRows.map((i) => i.row)"
          :perPage="5"
          :statusStockColumn="3"
          :columnAlign="['left', 'left', 'center']"
        >
          <!-- ช่องตัวจัดการ (คุณจะมาใส่เองทีหลัง) -->
          <template #cell-2="{ row }">
            <div class="flex justify-center">
              <button
                @click="openDetail(row[0])"
                class="flex items-center gap-2 px-2 py-2 rounded-md bg-[#1E48D1] text-white hover:bg-[#163A9B]"
              >
                <img src="/icon/info-icon.svg" class="h-4 w-4" />
              </button>
            </div>
          </template>
        </TableComponent>
      </div>
    </div>
  </div>
</template>
