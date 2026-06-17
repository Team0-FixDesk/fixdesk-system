/**
 * =====================================================================
 * @file            technician-home.view.vue
 * @module          มอดูลแจ้งซ่อม - การติดตามสถานะ และดูรายละเอียดคำร้องแจ้งซ่อม
 * @layer           View (Presentation Layer)
 * @version         1.0.1
 * @since           2025-10-21
 * @author          เศรษฐพงศ์ หอมชื่น
 * @contributor
 *   - เศรษฐพงศ์ หอมชื่น
 *   - ปฏิพัทธ์ จงนันทพันธ์กุล
 *
 * @lastModified    2026-02-21
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอหลักสำหรับช่างซ่อม
 *   - แสดงสถิติงานซ่อมของช่าง
 *   - แสดงรายการงานที่ได้รับมอบหมายล่าสุด
 *   - แสดงกราฟสัดส่วนสถานะงาน (เสร็จสิ้น / กำลังดำเนินการ / ยกเลิก / อื่นๆ)
 *   - แสดงรายการเบิกของล่าสุดของช่าง
 *
 * @requires
 *  - vue
 *  - vue-router
 *  - @/composables/useAuthToken
 *  - @/composables/useUserProfile
 *  - @/composables/repair/useTechnicianRepairs
 *  - @/composables/repair/useTechnicianRepairTable
 *  - @/composables/repair/useTechnicianStats
 *  - @/composables/stock/useTechnicianStockForms
 *  - @/composables/stock/useTechnicianStockTable
 *  - @/components/card-home-component.vue
 *  - @/components/table-component.vue
 *  - @/components/button/info-button-component.vue
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - เพิ่มชื่อหน้าจอ และแก้ไขคำอธิบายหน้าจอ
       [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล] V1.0.0
 *   - แก้ไขข้อความคำอธิบายสถานะ
       [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล] V1.0.0
 *   - แก้ไขข้อความหัวตาราง และการใช้สัญลักษณ์ :
       [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล] V1.0.0
 *   - ดึงข้อมูลชื่อผู้ใช้ :
 *     [2026-02-21, พิมลพรรณ มามาก] V
 * =====================================================================
 */

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

import { getRepairStatistics, getMyRepairList, getRepairDetailByCode } from '@/services/repair'

import { formatThaiShortDate } from '@/utils/date.util'
import { createRepairTimelineData } from '@/utils/repairTimeline.util'

import CardHomeComponent from '@/components/card-home-component.vue'
import TableComponent from '@/components/table-component.vue'
import RepairButton from '@/components/button/repair-button-component.vue'
import RepairStatusTimeline from '@/components/status-timeline-component.vue'

import { useAuthToken } from '@/composables/useAuthToken'
import { useUserProfile } from '@/composables/useUserProfile'

const { token, userId, isAuthenticated, logout } = useAuthToken()
const { userDisplayName, userDepartmentName, fetchUserProfileData} = useUserProfile()

// ตัวแปรสำหรับ Card สถิติ
const statsItemsList = ref([
  {
    value: 0,
    label: 'จำนวนรายการแจ้งซ่อมทั้งหมด',
    unit: 'รายการ',
    colorClass: 'text-violet-500',
    filterStatus: '',
  },
  {
    value: 0,
    label: 'จำนวนรายการแจ้งซ่อมที่รอดำเนินการ',
    unit: 'รายการ',
    colorClass: 'text-amber-500',
    filterStatus: 'pending',
  },
  {
    value: 0,
    label: 'จำนวนรายการแจ้งซ่อมที่กำลังดำเนินการ',
    unit: 'รายการ',
    colorClass: 'text-blue-600',
    filterStatus: 'in_progress',
  },
  {
    value: 0,
    label: 'จำนวนรายการแจ้งซ่อมที่ดำเนินการเสร็จสิ้น',
    unit: 'รายการ',
    colorClass: 'text-green-600',
    filterStatus: 'done',
  },
])

// แก้ไขฟังก์ชันตอนคลิก Card
const onCardClick = (item) => {
  router.push({
    path: '/main/my-list',
    query: { status: item.filterStatus },
  })
}
const selectedRepairDetail = ref(null)

// ตัวแปรสถานะหลักของหน้า
const router = useRouter()
const allMyRepairsList = ref([])
const recentRepairsList = ref([])
const selectedTrackingCode = ref('')
const selectedTimelineStepsList = ref([])
const isTimelineLoading = ref(false)

async function fetchRepairStats() {
  if (!isAuthenticated.value) {
    logout()
    return
  }

  try {
    const data = await getRepairStatistics(
      userId.value,
      token.value
    )

    statsItemsList.value[0].value = data.total || 0
    statsItemsList.value[1].value = data.pending || 0
    statsItemsList.value[2].value = data.in_progress || 0
    statsItemsList.value[3].value = data.completed || 0

  } catch (err) {
    console.error(err)
  }
}

async function fetchRecentRepairs() {
  if (!isAuthenticated.value) {
    logout()

    return
  }

  try {
    const data = await getMyRepairList(userId.value, token.value)

    const sortedRepairList = data.sort(
      (a, b) => new Date(b.rf_create_at) - new Date(a.rf_create_at),
    )

    allMyRepairsList.value = sortedRepairList
    recentRepairsList.value = sortedRepairList.slice(0, 5)

    const defaultRepair =
      sortedRepairList.find((r) => r.rf_user_status === 'in_progress') || sortedRepairList[0]

    if (defaultRepair) {
      selectedTrackingCode.value = defaultRepair.rf_code
      await loadTimelineForCode(defaultRepair.rf_code)
    }
  } catch (err) {
    console.error('โหลดรายการล่าสุดไม่สำเร็จ:', err)
  }
}

async function loadTimelineForCode(code) {
  if (!code) {
    selectedTimelineStepsList.value = []

    return
  }

  isTimelineLoading.value = true
  try {
    const data = await getRepairDetailByCode(code)

    selectedRepairDetail.value = data
    selectedTimelineStepsList.value = createRepairTimelineData(data)
  } catch (err) {
    console.error('โหลด timeline ไม่สำเร็จ:', err)
    selectedTimelineStepsList.value = []
  } finally {
    isTimelineLoading.value = false
  }
}

// 2. Computed สำหรับ Rows ที่จะแสดง (แปลง recentRepairs ให้เป็น Array ของ Array)
const tableRowsList = computed(() => {
  return allMyRepairsList.value.map((item) => [
    formatThaiShortDate(item.rf_create_at),
    item.rf_code,
    item.tt_name || '-',
    item.rf_urgency,
    item.rf_user_status,
  ])
})

// 3. Computed สำหรับ Raw Rows (เพื่อให้ TableComponent รู้ ID เวลากด)
const tableRawRowsList = computed(() => {
  return allMyRepairsList.value.map((item) => ({
    rf_code: item.rf_code,
  }))
})

/* --- Event Handler เมื่อกด Row --- */
const onRowClick = (idOrItem) => {
  const code = typeof idOrItem === 'object' && idOrItem !== null ? idOrItem.rf_code : idOrItem
  if (code) {
    selectedTrackingCode.value = code // อัปเดต Dropdown
    loadTimelineForCode(code) // โหลดข้อมูลทันที
  }
}
/* Reload */
onMounted(() => {
  fetchRepairStats()
  fetchRecentRepairs()
  fetchUserProfileData()
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-8xl">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-extrabold text-gray-900">สวัสดีคุณ{{ userDisplayName }}</h1>
        <p class="text-lg font-semibold text-gray-700">{{ userDepartmentName }}</p>
      </div>
      <RepairButton />
    </div>

    <div class="mt-8 mb-8">
      <CardHomeComponent :items="statsItemsList" @click="onCardClick" />
    </div>

    <div class="grid grid-cols-12 gap-6">
      <div class="col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div class="border-b border-slate-200 pb-2 mb-4">
          <h2 class="text-xl font-bold mb-1">รายการที่ฉันแจ้งซ่อม</h2>
          <p class="text-xs text-gray-500">
            7 รายการแจ้งซ่อมล่าสุด (เรียงจากวันที่แจ้ง)
            - สามารถเลือกรายการแจ้งซ่อมในตารางเพื่อดูรายละเอียดเพิ่มเติม
          </p>
        </div>

        <TableComponent
          :columns="['วันที่แจ้งซ่อม', 'หมายเลขแจ้งซ่อม', 'ประเภทงาน', 'ความเร่งด่วน', 'สถานะงาน']"
          :rows="tableRowsList"
          :rawRows="tableRawRowsList"
          :perPage="7"
          :columnAlign="['left', 'left', 'left', 'center', 'center']"
          mode="user"
          :idColumnIndex="1"
          :urgencyColumn="3"
          :statusColumn="4"
          :activeId="selectedTrackingCode"
          :action-column-index="5"
          @detail="onRowClick"
        >
          <template #cell-1="{ row }">
            <a
              href="#"
              @click.prevent="router.push(`/main/repair-detail/${row[1]}`)"
              class="text-blue-600 hover:text-blue-800 underline"
            >
              {{ row[1] }}
            </a>
          </template>
        </TableComponent>
      </div>

      <div class="col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div class="border-b border-slate-200 pb-3 mb-4">
          <div class="flex justify-between items-center mb-1">
            <h2 class="text-xl font-bold">ตรวจสอบสถานะ</h2>
          </div>
          <div>
            <p class="text-sm text-gray-500 mt-1">
              หมายเลขแจ้งซ่อม :
              <span v-if="selectedTrackingCode" class="font-semibold text-indigo-600">
                #{{ selectedTrackingCode }}
              </span>
              <span v-else>-</span>
            </p>
            <p class="text-sm text-gray-500">
              <span class="font-medium">ประเภท : </span>
              <span
                v-if="selectedRepairDetail"
                class="text-sm font-semibold text-gray-600 break-words"
                >{{ selectedRepairDetail.repair_type_name }}</span
              >
              <span v-else>-</span>
            </p>

            <p class="text-sm text-gray-500">
              <span class="font-medium">สถานที่ : </span>
              <span
                v-if="selectedRepairDetail"
                class="text-sm font-semibold text-gray-600 break-words"
              >
                อาคาร {{ selectedRepairDetail.building_name }} ห้อง
                {{ selectedRepairDetail.room_name }}
              </span>
              <span v-else>-</span>
            </p>
            <p class="text-sm text-gray-500 mt-1">
              เรื่องที่แจ้ง :
              <span
                v-if="selectedRepairDetail"
                class="text-sm font-semibold text-gray-600 break-words"
              >
                {{ selectedRepairDetail.rf_problem }}
              </span>
              <span v-else class="text-sm font-semibold text-gray-800">-</span>
            </p>

            <p class="text-sm text-gray-500 mt-1">
              สาเหตุ/อาการ :
              <span
                v-if="selectedRepairDetail"
                class="text-sm font-semibold text-gray-600 break-words"
              >
                {{ selectedRepairDetail.rf_detail }}
              </span>
              <span v-else class="text-sm font-semibold text-gray-800">-</span>
            </p>
          </div>
        </div>

        <div>
          <p v-if="isTimelineLoading" class="text-sm text-gray-400 text-center py-4">
            กำลังโหลดสถานะการดำเนินงาน...
          </p>
          <RepairStatusTimeline v-else :timeline-steps="selectedTimelineStepsList" />
        </div>
      </div>
    </div>
  </div>
</template>
