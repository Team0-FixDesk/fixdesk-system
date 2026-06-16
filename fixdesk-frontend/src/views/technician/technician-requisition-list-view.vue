/**
 * =====================================================================
 * @file technician-requisition-list.view.vue
 * @module มอดูลการจัดการงานของช่าง - การเบิกของ และดูรายละเอียดการเบิก
 * @layer View (Presentation Layer)
 * @version 1.0.1
 * @since 2025-12-23
 * @author ปฏิพัทธ์ จงนันทพันธ์กุล
 * @lastModified 2026-02-21
 * @lastModifiedBy ธนภัทร จันทร์งาม
 * ---------------------------------------------------------------------
 * @description
 * หน้าจอรายการเบิกวัสดุ/อุปกรณ์ของช่างเทคนิค
 * - เรียก API เพื่อโหลดใบเบิกของตนเอง (/stock-forms/:userId)
 * - ค้นหาข้อมูลตามหมายเลขรายการเบิก หรือสถานที่
 * - กรองข้อมูลตามสถานะ (รออนุมัติ / อนุมัติแล้ว / ไม่อนุมัติ)
 * - กรองข้อมูลตามวันที่เบิก
 * - เปิดดูรายละเอียดใบแจ้งซ่อมที่เกี่ยวข้อง
 * - แสดงผลข้อมูลในรูปแบบตารางผ่าน TableComponent
 *
 * @requires
 * - vue
 * - vue-router
 * - sweetalert2
 * - @/components/table-component.vue
 * - @/components/button/info-button-component.vue
 *
 * ---------------------------------------------------------------------
 * @changelog
 * - สร้างไฟล์ครั้งแรก
 *   [2025-12-23, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * - แก้ไขข้อความหัวตาราง
 *   [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * - แก้ไขการใช้สัญลักษณ์ :
 *   [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * - เพิ่ม Toast แจ้งเตือนเมื่อกลับจากหน้าดำเนินการ
 *   โดยใช้ sessionStorage และป้องกันการแสดงซ้ำ
 *   [2026-02-21, ธนภัทร จันทร์งาม]
 * =====================================================================
 */

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TableComponent from '@/components/table-component.vue'
import InfoButtonComponent from '@/components/button/info-button-component.vue'
import Swal from 'sweetalert2'

defineOptions({ name: 'TechnicianRequisitionListView' })

// ===================== Router & Config =====================
const router = useRouter()
const route = useRoute()
const API_BASE_URL = import.meta.env.VITE_API_BASE

// ===================== Table Structure =====================
const TABLE_COLUMNS = [
  'หมายเลขรายการเบิก',
  'รายละเอียดโดยย่อ',
  'รายการเบิก',
  'สถานะงาน',
  'ตัวดำเนินการ',
]

const tableRowsList = ref([])

// ===================== Filters & Search =====================
const searchKeyword = ref('')
const selectedStatusList = ref([])
const selectedDate = ref('')

const isStatusDropdownOpen = ref(false)

// ===================== Utils =====================
function decodeJwt(token) {
  try {
    const payloadBase64 = token.split('.')[1]
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decodeURIComponent(escape(payloadJson)))
  } catch {
    return {}
  }
}

function truncateItemName(text, maxWords = 5) {
  if (!text) return ''
  const [itemName] = text.split(' x')
  const words = itemName.split(' ')
  return words.length > maxWords ? `${words.slice(0, maxWords).join(' ')}...` : itemName
}

function extractItemQuantity(itemText) {
  if (!itemText) return 1
  const match = itemText.match(/x\s*(\d+)/i)
  return match ? Number(match[1]) : 1
}

// ===================== API =====================
async function fetchMyRequisitions() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) return

    const { us_id: userId } = decodeJwt(token)

    const response = await fetch(`${API_BASE_URL}/stock-forms/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    const responseData = await response.json()
    if (!response.ok) throw new Error(responseData.message || 'โหลดข้อมูลล้มเหลว')

    tableRowsList.value = responseData.map((form) => {
      const locationName =
        [form.bd_name, form.fl_name, form.room_name].filter(Boolean).join(' ') || '-'
      const itemList = form.items ? form.items.split('\n') : []

      return [
        form.sf_code,
        {
          date: new Date(form.sf_create_at).toLocaleString('th-TH', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          location: locationName,
          repairFormCode: form.rf_code,
        },
        itemList,
        form.sf_status,
        '',
      ]
    })
  } catch (error) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', error)
  }
}

// ===================== Navigation =====================
function goToRepairDetail(repairFormCode) {
  router.push(`/main/repair-detail/${repairFormCode}`)
}

// ===================== Computed =====================
const filteredRows = computed(() => {
  const keyword = searchKeyword.value.toLowerCase()
  const dateFilter = selectedDate.value

  return tableRowsList.value.filter((row) => {
    const requisitionCode = String(row[0]).toLowerCase()
    const requisitionDateText = String(row[1].date)
    const locationText = String(row[1].location).toLowerCase()
    const status = row[3]

    const isKeywordMatched = requisitionCode.includes(keyword) || locationText.includes(keyword)

    const isStatusMatched =
      selectedStatusList.value.length === 0 || selectedStatusList.value.includes(status)

    const isDateMatched =
      !dateFilter ||
      new Date(requisitionDateText).toLocaleDateString('th-TH') ===
      new Date(dateFilter).toLocaleDateString('th-TH')

    return isKeywordMatched && isStatusMatched && isDateMatched
  })
})

// ===================== UI Handlers =====================
function toggleStatusDropdown() {
  isStatusDropdownOpen.value = !isStatusDropdownOpen.value
}

function resetAllFilters() {
  searchKeyword.value = ''
  selectedStatusList.value = []
  selectedDate.value = ''
}

function handleClickOutside(event) {
  if (!event.target.closest('.relative')) {
    isStatusDropdownOpen.value = false
  }
}

// ===================== Lifecycle =====================
onMounted(() => {
  fetchMyRequisitions()
  document.addEventListener('click', handleClickOutside)

  // ✅ Toast จากหน้าก่อนหน้า
  const toastMsg = sessionStorage.getItem('withdrawSuccessToast')

  if (toastMsg) {
    sessionStorage.removeItem('withdrawSuccessToast')

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: toastMsg,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    })
  }
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-black mb-6">รายการเบิกของฉัน</h1>

    <!-- Filters -->
    <div class="z-40 mb-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <input v-model="searchKeyword" type="text" placeholder="ค้นหารายการเบิก"
            class="w-[260px] h-10 px-4 rounded-lg border border-gray-300" />

          <input v-model="selectedDate" type="date" class="h-10 px-3 rounded-lg border border-gray-300" />

          <div class="relative">
            <button @click.stop="toggleStatusDropdown"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white">
              สถานะ
            </button>

            <div v-if="isStatusDropdownOpen"
              class="absolute mt-2 w-48 bg-white border rounded-md shadow-lg p-3 text-sm">
              <label class="flex items-center py-1">
                <input type="checkbox" value="waiting" v-model="selectedStatusList" />
                <span class="ml-2">รออนุมัติ</span>
              </label>
              <label class="flex items-center py-1">
                <input type="checkbox" value="rejected" v-model="selectedStatusList" />
                <span class="ml-2">ไม่อนุมัติ</span>
              </label>
              <label class="flex items-center py-1">
                <input type="checkbox" value="approved" v-model="selectedStatusList" />
                <span class="ml-2">อนุมัติแล้ว</span>
              </label>
            </div>
          </div>

          <button v-if="selectedStatusList.length || searchKeyword" @click="resetAllFilters"
            class="text-blue-600 text-sm">
            ล้างตัวกรอง
          </button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <TableComponent :columns="TABLE_COLUMNS" :rows="filteredRows" :perPage="10" :statusStockColumn="3"
      :columnAlign="['left', 'left', 'left', 'center']" @detail="(row) => goToRepairDetail(row.repairFormCode)">
      <template #cell-0="{ row }">
        <a href="#" @click.prevent="goToRepairDetail(row[1].repairFormCode)"
          class="text-blue-600 hover:text-blue-800 underline">
          {{ row[0] }}
        </a>
      </template>
      <template #cell-2="{ row }">
        <div class="space-y-1 text-sm">
          <div v-for="(item, index) in row[2]" :key="index" class="flex items-center">
            <span class="flex-1 truncate">{{ truncateItemName(item) }}</span>
            <span class="shrink-0 text-gray-500 w-8 text-right">x{{ extractItemQuantity(item) }}</span>
          </div>
        </div>
      </template>

      <template #cell-1="{ row }">
        <div class="text-sm space-y-1">
          <div>วันที่เบิก : {{ row[1].date }}</div>
          <div>หมายเลขแจ้งซ่อม : {{ row[1].repairFormCode }}</div>
          <div>สถานที่ : {{ row[1].location }}</div>
        </div>
      </template>

      <template #cell-4="{ row }">
        <InfoButtonComponent @click="goToRepairDetail(row[1].repairFormCode)" />
      </template>
    </TableComponent>
  </div>
</template>
