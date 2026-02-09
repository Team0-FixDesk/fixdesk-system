<script setup>
defineOptions({ name: 'TechnicianHomeView' })
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthToken } from '@/composables/useAuthToken'
import { useUserProfile } from '@/composables/useUserProfile'

import CardHomeComponent from '@/components/card-home-component.vue'
import TableComponent from '@/components/table-component.vue'
import InfoButtonComponent from '@/components/button/info-button-component.vue'

import { useTechnicianRepairs } from '@/composables/repair/useTechnicianRepairs'
import { useTechnicianStockForms } from '@/composables/stock/useTechnicianStockForms'
import { useTechnicianRepairTable } from '@/composables/repair/useTechnicianRepairTable'
import { useTechnicianStockTable } from '@/composables/stock/useTechnicianStockTable'
import { useTechnicianStats } from '@/composables/repair/useTechnicianStats'

const router = useRouter()

const { token, userId, isAuthenticated, logout } = useAuthToken()
const { repairRequests, fetchRepairRequests } = useTechnicianRepairs(token, isAuthenticated, logout)
const { statItems } = useTechnicianStats(repairRequests)
const { repairTableRows, repairTableRaw, onRepairRowClick } = useTechnicianRepairTable(
  repairRequests,
  router,
)
const { stockForms, fetchStockForms } = useTechnicianStockForms(
  token,
  userId,
  isAuthenticated,
  logout,
)
const { stockTableRows, truncateItem, extractQuantity, openDetail } = useTechnicianStockTable(
  stockForms,
  router,
)
const { displayName, fetchUserProfile } = useUserProfile()

// --- Chart Data ---
const donutChart = computed(() => {
  const total = repairRequests.value.length || 1
  const done = repairRequests.value.filter((r) => r.rf_user_status === 'done').length
  const prog = repairRequests.value.filter((r) => r.rf_user_status === 'in_progress').length
  const cancel = repairRequests.value.filter((r) => r.rf_user_status === 'cancel').length

  const p1 = Math.round((done / total) * 100)
  const p2 = p1 + Math.round((prog / total) * 100)
  const p3 = p2 + Math.round((cancel / total) * 100)

  return {
    backgroundImage: `conic-gradient(#16a34a 0% ${p1}%, #f97316 ${p1}% ${p2}%, #dc2626 ${p2}% ${p3}%, #1d4ed8 ${p3}% 100%)`,
  }
})

const onCardClick = (item) =>
  router.push({ path: '/main/technician-repair-list', query: { status: item.filterStatus } })

onMounted(() => {
  fetchRepairRequests()
  fetchStockForms()
  fetchUserProfile()
})
</script>

<template>
  <div class="p-8 mx-auto bg-white shadow-md rounded-xl max-w-8xl">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">{{ displayName }}</h1>
      <p class="mt-1 text-sm text-gray-600">
        ตรวจสอบสถานะงานซ่อมและจัดการรายการเบิกจ่ายวัสดุอุปกรณ์
      </p>
    </div>

    <div class="mt-4 mb-8">
      <CardHomeComponent :items="statItems" @click="onCardClick" />
    </div>

    <div class="grid grid-cols-1 gap-3 mb-8 lg:grid-cols-3">
      <div class="p-5 bg-white border border-gray-200 shadow-sm rounded-2xl lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-bold text-gray-900">งานที่ได้รับมอบหมายล่าสุด</h2>
            <p class="text-sm text-gray-500">5 รายการล่าสุด</p>
          </div>
          <button
            @click="router.push('/main/technician-repair-list')"
            class="text-sm text-blue-600 hover:underline"
          >
            ดูทั้งหมด
          </button>
        </div>

        <TableComponent
          :columns="['เลขใบงาน', 'หัวข้อ', 'หน่วยงาน', 'สถานที่', 'ความเร่งด่วน', 'สถานะ']"
          :rows="repairTableRows"
          :rawRows="repairTableRaw"
          :perPage="5"
          mode="view-only"
          :idColumnIndex="0"
          :id-column-as-link="true"
          @detail="(id) => onRepairRowClick(id)"
          :columnAlign="['left', 'left', 'left', 'left', 'center', 'center']"
        />
      </div>

      <div
        class="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 shadow-sm rounded-2xl"
      >
        <h2 class="self-start mb-6 text-lg font-bold text-gray-800">สัดส่วนงานทั้งหมด</h2>
        <div class="relative w-48 h-48">
          <div class="w-full h-full rounded-full" :style="donutChart"></div>
          <div
            class="absolute flex items-center justify-center w-32 h-32 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full top-1/2 left-1/2"
          >
            <span class="text-xs text-gray-400">ภาพรวม</span>
          </div>
        </div>
        <div class="grid w-full grid-cols-2 mt-6 text-xs gap-x-4 gap-y-2">
          <div class="flex items-center">
            <span class="w-3 h-3 mr-2 bg-green-600 rounded"></span>เสร็จสิ้น
          </div>
          <div class="flex items-center">
            <span class="w-3 h-3 mr-2 bg-orange-500 rounded"></span>กำลังทำ
          </div>
          <div class="flex items-center">
            <span class="w-3 h-3 mr-2 bg-red-600 rounded"></span>ยกเลิก
          </div>
          <div class="flex items-center">
            <span class="w-3 h-3 mr-2 bg-blue-700 rounded"></span>อื่นๆ
          </div>
        </div>
      </div>
    </div>

    <div class="p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
      <div class="mb-4">
        <h2 class="text-xl font-bold text-gray-900">รายการเบิกของล่าสุด</h2>
        <p class="text-sm text-gray-500">5 รายการล่าสุด</p>
      </div>

      <TableComponent
        :columns="['รหัสรายการเบิกของ', 'รายละเอียด', 'รายการของเบิก', 'สถานะงาน', 'ตัวดำเนินการ']"
        :rows="stockTableRows"
        :perPage="5"
        :statusStockColumn="3"
        :columnAlign="['left', 'left', 'left', 'center']"
        @detail="(row) => openDetail(row.rf_code)"
      >
        <template #cell-0="{ row }">
          <a
            href="#"
            @click.prevent="openDetail(row[1].rf_code)"
            class="text-blue-600 hover:text-blue-800 underline"
          >
            {{ row[0] }}
          </a>
        </template>
        <!-- รายการของ -->
        <template #cell-2="{ row }">
          <div class="space-y-1 text-sm">
            <div v-for="(item, i) in row[2]" :key="i" class="flex justify-between">
              <span class="truncate">{{ truncateItem(item) }}</span>
              <span class="text-gray-500">x{{ extractQuantity(item) }}</span>
            </div>
          </div>
        </template>

        <!-- รายละเอียด -->
        <template #cell-1="{ row }">
          <div class="space-y-1 text-sm">
            <div>วันที่เบิก: {{ row[1].date }}</div>
            <div>รหัสใบแจ้งซ่อม: {{ row[1].rf_code }}</div>
          </div>
        </template>

        <!-- ปุ่ม -->
        <template #cell-4="{ row }">
          <InfoButtonComponent @click="openDetail(row[1].rf_code)" />
        </template>
      </TableComponent>
    </div>
  </div>
</template>
