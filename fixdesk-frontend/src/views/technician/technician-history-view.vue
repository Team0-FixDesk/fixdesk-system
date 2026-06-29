/**
 * =====================================================================
 * @file            technician-repair-history.view.vue
 * @module          -
 * @layer           View (Presentation Layer)
 * @version         1.0.1
 * @since           2025-10-21
 * @author          เศรษฐพงศ์ หอมชื่น
 * @lastModified    2026-06-17
 * @lastModifiedBy  บุณยกร จันประภาส
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอประวัติการแจ้งซ่อมของช่างซ่อม
 *   - เรียก API เพื่อโหลดประวัติงานซ่อม (/technician/history)
 *   - แสดงเฉพาะงานที่มีสถานะเสร็จสิ้น (done)
 *   - ค้นหาข้อมูลตามหมายเลขแจ้งซ่อม หรือข้อความรายละเอียด
 *   - เปิดดูรายละเอียดใบแจ้งซ่อม
 *   - แสดงผลข้อมูลในรูปแบบตารางผ่าน TableComponent
 *
 *
 * @requires
 *  - vue
 *  - vue-router
 *  - @/components/table-component.vue
 *  - @/components/button/info-button-component.vue
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - แก้ไขชื่อหน้าจอ           [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - แก้ไขข้อความหัวตาราง     [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - แก้ไขข้อความในช่องค้นหา   [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - เปลี่ยนมาใช้ handleUnauthorized จาก auth.util
 *     เพื่อให้ Alert token หมดอายุเหมือนกันทุกหน้า  [2026-06-26, พชร ไพศรีสกุล]
 *
 * =====================================================================
 */

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { handleUnauthorized } from '@/utils/auth.util'
import TableComponent from '@/components/table-component.vue'
import InfoButtonComponent from '@/components/button/info-button-component.vue'

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE

// Columns ของตาราง
const tableColumnsList = ['หมายเลขแจ้งซ่อม', 'รายละเอียดโดยย่อ', 'สถานะงานซ่อม', 'ตัวดำเนินการ']

const tableRowsList = ref([])
const searchInput = ref('')

// --- Responsive Table/Card Switching ---
const screenSize = ref('lg')

function handleResize() {
  screenSize.value = window.innerWidth < 768 ? 'sm' : 'lg'
}

// "รายละเอียดโดยย่อ" เก็บมาเป็น string ต่อกันด้วย <br /> เช่น
// "วันที่แจ้งซ่อม : ... <br /> ชื่อผู้แจ้ง : ... <br /> หน่วยงาน : ..."
// ฟังก์ชันนี้แยกออกเป็น label/value ทีละฟิลด์ เพื่อแสดงผลบน Card ให้อ่านง่าย
function parseRepairDetail(text) {
  if (!text) return []
  return text
    .split(/<\s*\/?\s*br\s*\/?\s*>/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf(':')
      if (idx === -1) return { label: '', value: part }
      return {
        label: part.slice(0, idx).trim(),
        value: part.slice(idx + 1).trim(),
      }
    })
}

// ดึงค่าของฟิลด์ที่ต้องการจาก "รายละเอียดโดยย่อ" มาแสดงเป็นหัวข้อย่อยบน Card
function getRepairField(text, label) {
  const found = parseRepairDetail(text).find((p) => p.label === label)
  return found ? found.value : ''
}

// แปลง "รายละเอียดโดยย่อ" ทั้งสตริง เป็น object ที่มีฟิลด์ชัดเจน สำหรับแสดงผลบน Card
function getRepairDetailObject(text) {
  return {
    date: getRepairField(text, 'วันที่แจ้งซ่อม') || '-',
    reporter: getRepairField(text, 'ชื่อผู้แจ้ง') || '-',
    department: getRepairField(text, 'หน่วยงาน') || '-',
    problem: getRepairField(text, 'เรื่องที่แจ้ง') || '-',
    location: getRepairField(text, 'สถานที่') || '-',
  }
}

// แปลงรหัสสถานะ เป็นข้อความภาษาไทย (เก็บไว้ใช้เฉพาะมุมมอง Card บนมือถือ)
function statusLabel(status) {
  switch (status) {
    case 'done':
      return 'เสร็จสิ้น'
    case 'in_progress':
      return 'กำลังดำเนินการ'
    case 'pending':
      return 'รอดำเนินการ'
    default:
      return status || '-'
  }
}

// สีของ badge สถานะงาน (ใช้เฉพาะมุมมอง Card บนมือถือ)
function statusClass(status) {
  switch (status) {
    case 'done':
      return 'bg-green-100 text-green-700'
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-700'
    case 'pending':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

// โหลดข้อมูล
async function loadRepairHistory() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    const res = await fetch(`${API_BASE}/technician/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 401) {
      handleUnauthorized(router)
      return
    }

    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    tableRowsList.value = data.map((item) => {
      const fullName = `${item.us_first_name || ''} ${item.us_last_name || ''}`.trim()

      return [
        item.rf_code, // 1 หมายเลขแจ้งซ่อม
        'วันที่แจ้งซ่อม : ' +
          new Date(item.rf_create_at).toLocaleDateString('th-TH') +
          '<br />' +
          'ชื่อผู้แจ้ง : ' +
          fullName +
          '<br />' +
          'หน่วยงาน : ' +
          item.department_name +
          '<br />' +
          'เรื่องที่แจ้ง : ' +
          item.rf_problem +
          '<br />' +
          'สถานที่ : ' +
          `${item.building_name} ${item.floor_name} ${item.room_name}`.trim(),
        item.rf_user_status,
        '', // 7 actions
      ]
    })
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
  }
}

// Filter เฉพาะ status = done + search
const filteredRows = computed(() => {
  const search = searchInput.value.toLowerCase()

  return tableRowsList.value
    .filter((row) => row[2] === 'done') // ✔ แสดงเฉพาะงานที่เสร็จสิ้น
    .filter((row) => {
      const code = String(row[0]).toLowerCase()
      const text = String(row[1]).toLowerCase()

      return code.includes(search) || text.includes(search)
    })
})

/**
 * ข้อมูลสำหรับมุมมอง Card บนมือถือ: row เดิม + detail ที่แยกฟิลด์ไว้ล่วงหน้า
 */
const cardItems = computed(() =>
  filteredRows.value.map((row) => ({
    row,
    detail: getRepairDetailObject(row[1]),
  }))
)

// ไปหน้า detail
function goToDetail(code) {
  router.push(`/main/repair-detail/${code}`)
}

onMounted(() => {
  loadRepairHistory()
  window.addEventListener('resize', handleResize)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="p-8 mx-auto bg-white shadow-md rounded-xl max-w-8xl">
    <h1 class="mb-6 text-xl font-bold text-black">ประวัติการซ่อมของฉัน</h1>

    <!-- Search -->
    <div class="flex flex-wrap gap-3 mb-6">
      <input
        v-model="searchInput"
        type="text"
        placeholder="ค้นหารายการงานซ่อม"
        class="w-[260px] h-10 px-4 rounded-lg border border-gray-300 focus:ring-blue-500"
      />
    </div>

    <!-- Desktop Table View -->
    <div  class="-mx-2 overflow-x-auto sm:mx-0">
      <TableComponent
        :columns="tableColumnsList"
        :rows="filteredRows"
        :perPage="10"
        :statusColumn="2"
        :columnAlign="['left', 'left', 'center', 'center']"
        :id-column-index="0"
        :id-column-as-link="true"
        :action-column-index="3"
        @detail="goToDetail"
      >
        <!-- Actions -->
        <template #cell-3="{ row }">
          <InfoButtonComponent @click="goToDetail(row[0])" />
        </template>
      </TableComponent>
    </div>
  </div>
</template>