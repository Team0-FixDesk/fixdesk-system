<script setup>
// ============================================
// การกำหนดชื่อคอมโพเนนต์และการนำเข้า
// ============================================
defineOptions({ name: 'MyListView' })  // กำหนดชื่อของ component สำหรับการ debug
import { ref, computed, onMounted } from 'vue'  // นำเข้าฟังก์ชันโปรแกรมจาก Vue
import { useRouter, useRoute } from 'vue-router'  // นำเข้า router และ route สำหรับการนำทาง
import Sweetalert from 'sweetalert2'  // นำเข้า SweetAlert2 สำหรับแจ้งเตือน

// นำเข้าฟังก์ชันยูทิลิตี้
import { extractDateFromCellContent } from '@/utils/date.util'  // ฟังก์ชันสำหรับแยกวันที่จากเซลล์
import { createRepairDescriptionHtml } from '@/utils/repairRow.util'  // ฟังก์ชันสำหรับสร้าง HTML รายละเอียดการซ่อม

// นำเข้าคอมโพเนนต์
import TableComponent from '@/components/table-component.vue'  // คอมโพเนนต์ตาราง
import TableActions from '@/components/table-actions-component.vue'  // คอมโพเนนต์ปุ่มการกระทำของแถว
import RepairButton from '@/components/button/repair-button-component.vue'  // ปุ่มสำหรับเพิ่มการซ่อมใหม่
import RepairFilterBar from '@/components/filters/repair-filter-bar-component.vue'  // แถบกรองสำหรับการซ่อม

// นำเข้า composable สำหรับการยืนยันตัวตน
import { useAuthToken } from '@/composables/useAuthToken'

// ============================================
// การกำหนดค่า Router และ API
// ============================================
const router = useRouter()  // สร้างอินสแตนซ์เราเตอร์
const route = useRoute()  // สร้างอินสแตนซ์เส้นทาง
const API_BASE = import.meta.env.VITE_API_BASE  // URL ที่ใช้เรียก API

// ============================================
// โครงสร้างตาราง - ชื่อแต่ละคอลัมน์
// ============================================
const tableColumns = [
  'หมายเลขแจ้งซ่อม',
  'ประเภทงาน',
  'รายละเอียด',
  'ความเร่งด่วน',
  'สถานะงาน',
  'ตัวดำเนินการ',
]

// ============================================
// ข้อมูลตาราง และสถานะ UI
// ============================================
const tableRowsList = ref([])  // รายการแถวของตาราง (ข้อมูลการซ่อม)
const openMenuId = ref(null)  // ID ของแถวที่มีเมนูการกระทำเปิดอยู่

// ============================================
// ดึงข้อมูลผู้ใช้จาก composable
// ============================================
const { token, userId, isAuthenticated, logout } = useAuthToken()

// ============================================
// สถานะตัวกรอง (Filter)
// ============================================
const searchInput = ref('')  // ค่าการค้นหา
const selectedStatuses = ref([])  // สถานะที่เลือก
const selectedUrgencies = ref([])  // ความเร่งด่วนที่เลือก
const selectedDate = ref('')  // วันที่ที่เลือก

// ============================================
// ฟังก์ชันโหลดข้อมูล
// ============================================
/**
 * โหลดรายการการซ่อมของผู้ใช้ปัจจุบัน
 * ตรวจสอบการยืนยันตัวตน จากนั้นดึงข้อมูลจาก API
 * แปลงข้อมูลให้เป็นรูปแบบตาราง
 */
async function loadMyRepairs() {
  if (!isAuthenticated.value) {
    logout()
    return
  }

  try {
    const response = await fetch(`${API_BASE}/my-repairs/${userId.value}`, {
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'LOAD_FAILED')
    }

    tableRowsList.value = data.map((repair) => {

      return [
        repair.rf_code,  // หมายเลขแจ้งซ่อม
        repair.tt_name,  // ประเภทงาน
        createRepairDescriptionHtml(repair),  // รายละเอียด
        repair.rf_urgency,  // ความเร่งด่วน
        repair.rf_user_status,  // สถานะงาน
        '',  // คอลัมน์การกระทำ (จะเทมเพลตต่อไป)
      ]
    })
  } catch (error) {
    console.error('Load my repairs failed:', error.message)
  }
}

// ============================================
// คอมพิวเต็ด: การกรองข้อมูล
// ============================================
/**
 * กรองแถวตาราง ตามเงื่อนไข:
 * 1. ค้นหาตามชื่อ ประเภท หรือสถานที่
 * 2. กรองตามความเร่งด่วน
 * 3. กรองตามสถานะ
 * 4. กรองตามวันที่
 */
const filteredRows = computed(() => {
  const search = searchInput.value.toLowerCase()
  const dateFilter = selectedDate.value

  return tableRowsList.value.filter((row) => {
    const dateFromRow = extractDateFromCellContent(row[2])  // แยกวันที่จากเซลล์รายละเอียด
    const code = String(row[0]).toLowerCase()  // หมายเลขแจ้งซ่อม
    const type = String(row[1]).toLowerCase()  // ประเภทงาน
    const location = String(row[2]).toLowerCase()  // สถานที่
    const urgency = row[3]  // ความเร่งด่วน
    const status = row[4]  // สถานะงาน

    // ตรวจสอบการค้นหา - ค้นหาในหมายเลข ประเภท และสถานที่
    const matchesSearch =
      code.includes(search) || type.includes(search) || location.includes(search)

    // ตรวจสอบความเร่งด่วน - หากไม่มีตัวกรอง จะแสดงทั้งหมด
    const matchesUrgency =
      selectedUrgencies.value.length === 0 || selectedUrgencies.value.includes(urgency)

    // ตรวจสอบสถานะ - หากไม่มีตัวกรอง จะแสดงทั้งหมด
    const matchesStatus =
      selectedStatuses.value.length === 0 || selectedStatuses.value.includes(status)

    // ตรวจสอบวันที่ - หากไม่มีตัวกรอง จะแสดงทั้งหมด
    const matchesDate =
      !dateFilter || dateFromRow === new Date(dateFilter).toLocaleDateString('th-TH')

    return matchesSearch && matchesUrgency && matchesStatus && matchesDate
  })
})

// ============================================
// ฟังก์ชันการกระทำ (Actions)
// ============================================
/**
 * รีเซ็ตตัวกรองทั้งหมด
 */
function resetFilters() {
  selectedUrgencies.value = []  // รีเซ็ตความเร่งด่วน
  selectedStatuses.value = []  // รีเซ็ตสถานะ
  searchInput.value = ''  // รีเซ็ตค้นหา
  selectedDate.value = ''  // รีเซ็ตวันที่
}

// ============================================
// ตัวจัดการการนำทาง
// ============================================
// นำทางไปยังหน้ารายละเอียดการซ่อม
const openDetail = (code) => router.push(`/main/repair-detail/${code}`)
// นำทางไปยังหน้าแก้ไขการซ่อม
const openEdit = (code) => router.push(`/main/repair-edit/${code}`)

// ============================================
// ฟังก์ชันลบการซ่อม
// ============================================
/**
 * ลบรายการการซ่อม
 * แสดง Sweetalert เพื่อขอการยืนยัน
 * หากยืนยัน จะส่ง DELETE request ไปยัง API
 */
async function deleteRepair(repairCode) {
  if (!isAuthenticated.value) {  // ตรวจสอบการยืนยันตัวตน
    logout()  // ออกจากระบบหากไม่ได้รับการยืนยัน
    return
  }

  // แสดงกล่องยืนยันรูปแบบ SweetAlert
  const confirm = await Sweetalert.fire({
    title: 'ลบรายการนี้?',  // หัวเรื่อง
    text: `คุณต้องการลบใบแจ้งซ่อมหมายเลข ${repairCode} หรือไม่?`,  // ข้อความพร้อมหมายเลขการซ่อม
    icon: 'warning',  // ไอคอนเตือน
    showCancelButton: true,  // แสดงปุ่มยกเลิก
    confirmButtonText: 'ลบเลย',  // ข้อความปุ่มยืนยัน
    cancelButtonText: 'ยกเลิก',  // ข้อความปุ่มยกเลิก
    confirmButtonColor: '#e53e3e',  // สีปุ่มยืนยัน (แดง)
  })

  // ตรวจสอบว่าผู้ใช้ยืนยันหรือไม่
  if (!confirm.isConfirmed) return

  try {
    // ดึง token จาก localStorage หรือ sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    // ส่ง DELETE request ไปยัง API
    const response = await fetch(`${API_BASE}/my-repairs/${repairCode}`, {
      method: 'DELETE',  // ใช้ HTTP method DELETE
      headers: {
        'Content-Type': 'application/json',  // ระบุ content type
        Authorization: `Bearer ${token}`  // ส่ง token สำหรับการยืนยันตัวตน
      },
    })

    const data = await response.json()  // แปลงการตอบสนองเป็น JSON
    if (!response.ok) throw new Error(data.message)  // ตรวจสอบข้อผิดพลาด

    // อัปเดตรายการแถวโดยลบแถวที่ลบ
    tableRowsList.value = tableRowsList.value.filter((row) => row[0] !== repairCode)

    // แสดงข้อความสำเร็จ
    Sweetalert.fire({
      toast: true,  // แสดงเป็น toast (มุมบนขวา)
      position: 'top-end',  // ตำแหน่ง
      title: 'ลบสำเร็จ',  // หัวเรื่อง
      text: `ลบใบแจ้งซ่อมหมายเลข ${repairCode} แล้ว`,  // ข้อความ
      icon: 'success',  // ไอคอนสำเร็จ
      timer: 2500,  // แสดงเป็นเวลา 2.5 วินาที
      showConfirmButton: false,  // ไม่แสดงปุ่มยืนยัน
    })
  } catch (err) {
    // แสดงข้อความข้อผิดพลาด
    Sweetalert.fire({
      toast: true,  // แสดงเป็น toast
      position: 'top-end',  // ตำแหน่ง
      title: 'เกิดข้อผิดพลาด',  // หัวเรื่อง
      text: err.message,  // ข้อความข้อผิดพลาด
      icon: 'error',  // ไอคอนข้อผิดพลาด
      timer: 2500,  // แสดงเป็นเวลา 2.5 วินาที
      showConfirmButton: false,  // ไม่แสดงปุ่มยืนยัน
    })
  }
}

// ============================================
// ลักษณะ Lifecycle
// ============================================
/**
 * ทำงานเมื่อคอมโพเนนต์โหลด
 * โหลดข้อมูลการซ่อม
 * ตั้งค่าตัวกรองจาก query parameters (ถ้ามี)
 */
onMounted(() => {
  loadMyRepairs()  // โหลดข้อมูลการซ่อมของผู้ใช้
  // ตั้งค่าตัวกรองจาก query เช่น ?status=pending
  if (route.query.status && ['pending', 'in_progress', 'done'].includes(route.query.status)) {
    selectedStatuses.value = [route.query.status]  // ตั้งค่าสถานะตัวกรอง
  }
})
</script>

<template>
  <!-- ============================================  -->
  <!-- หลัก: คอนเทนเนอร์หลัก -->
  <!-- ============================================  -->
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <!-- หัวข้อหลัก -->
    <h1 class="text-xl font-bold text-black mb-6">รายการของฉัน</h1>

    <!-- ============================================  -->
    <!-- แถบตัวกรอง - ค้นหา, กรองสถานะ, ความเร่งด่วน, วันที่ -->
    <!-- ============================================  -->
    <RepairFilterBar
      mode="repair"  <!-- โหมดแผนกซ่อมแซม -->
      v-model:search="searchInput"  <!-- ข้อมูล v-model สำหรับค้นหา -->
      v-model:statuses="selectedStatuses"  <!-- ข้อมูล v-model สำหรับสถานะ -->
      v-model:urgencies="selectedUrgencies"  <!-- ข้อมูล v-model สำหรับความเร่งด่วน -->
      v-model:date="selectedDate"  <!-- ข้อมูล v-model สำหรับวันที่ -->
      @reset="resetFilters"  <!-- ตัวจัดการเหตุการณ์รีเซ็ตตัวกรอง -->
    >
      <!-- ส่วนขวา: ปุ่มเพิ่มการซ่อมใหม่ -->
      <template #right>
        <RepairButton />
      </template>
    </RepairFilterBar>

    <!-- ============================================  -->
    <!-- ตาราง - แสดงรายการการซ่อมของผู้ใช้ -->
    <!-- ============================================  -->
    <div class="p-3 mx-auto max-w-8xl">
      <TableComponent
        :columns="tableColumns"  <!-- ชื่อคอลัมน์ -->
        :rows="filteredRows"  <!-- ข้อมูลแถวที่กรองแล้ว -->
        :perPage="10"  <!-- จำนวนแถวต่อหน้า -->
        :urgencyColumn="3"  <!-- ดัชนีคอลัมน์ความเร่งด่วน -->
        :statusColumn="4"  <!-- ดัชนีคอลัมน์สถานะ -->
        :columnAlign="['left', 'left', 'left', 'center', 'center', 'center']"  <!-- การจัดแนวคอลัมน์ -->
        :id-column-index="0"  <!-- ดัชนีคอลัมน์ ID -->
        :id-column-as-link="true"  <!-- แสดง ID เป็นลิงก์ -->
        @detail="openDetail"  <!-- ตัวจัดการเหตุการณ์คลิกรายละเอียด -->
      >
        <!-- ============================================  -->
        <!-- เทมเพลต: คอลัมน์การกระทำ (ปุ่มแก้ไข/ลบ) -->
        <!-- ============================================  -->
        <!-- คอลัมน์ Action (ดัชนี 5) -->
        <template #cell-5="{ row }">
          <TableActions
            :row-id="row[0]"  
            :open-menu-id="openMenuId"  
            @toggle-menu="openMenuId = $event"  
            role="user"  
            :row="row"  
            :status="row[4]"  
            @detail="openDetail(row[0])"  
            @edit="openEdit(row[0])"  
            @delete="deleteRepair(row[0])"  
          />
        </template>
      </TableComponent>
    </div>
  </div>
</template>
