<script setup>
import { ref, computed, onMounted } from 'vue'
import TableComponent from '@/components/table-component.vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'

const router = useRouter()
defineOptions({ name: 'MyListView' })

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

/* ===========================
   📄 Columns & States
   =========================== */
const columns = [
  'วันที่',
  'ใบแจ้งซ่อม',
  'หมายเลขครุภัณฑ์',
  'หน่วยงาน',
  'ความเร่งด่วน',
  'สถานะงาน',
  'ตัวดำเนินการ',
]

const rows = ref([]) // raw data
const currentPage = ref(1)

/* ===========================
   🔍 Filter States
   =========================== */
const searchQuery = ref('')
const selectedUrgency = ref('ทั้งหมด')
const selectedStatus = ref('ทั้งหมด')
const selectedDate = ref('') // YYYY-MM-DD

/* ===========================
   🧩 JWT Decode
   =========================== */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch (err) {
    console.error('decode token error:', err)
    return {}
  }
}

/* ===========================
   📦 Fetch My Repairs
   =========================== */
async function fetchMyRepairs() {
  const token = localStorage.getItem('token')
  if (!token) return console.warn('⚠️ ไม่มี token')

  const payload = parseJwt(token)
  const userId = payload.us_id

  try {
    const res = await fetch(`${API_BASE}/my-repairs/${userId}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')

    rows.value = data.map((r) => ({
      date: new Date(r.rf_create_at).toLocaleDateString('th-TH'),
      code: r.rf_code,
      asset: r.rf_prop_number || '-',
      department: r.department_name || '-',
      urgency: r.rf_urgency || '-',
      status: r.rf_user_status || '-',
    }))
  } catch (err) {
    console.error('❌ โหลดข้อมูลรายการแจ้งซ่อมไม่สำเร็จ:', err)
  }
}

/* ===========================
   🎯 Computed Filter
   =========================== */
const filteredRows = computed(() => {
  return rows.value.filter((r) => {
    const matchSearch =
      r.code.includes(searchQuery.value) ||
      r.asset.includes(searchQuery.value) ||
      r.department.includes(searchQuery.value)

    const matchUrgency = selectedUrgency.value === 'ทั้งหมด' || r.urgency === selectedUrgency.value

    const matchStatus = selectedStatus.value === 'ทั้งหมด' || r.status === selectedStatus.value

    const matchDate =
      !selectedDate.value ||
      new Date(r.date).toLocaleDateString('th-TH') ===
        new Date(selectedDate.value).toLocaleDateString('th-TH')

    return matchSearch && matchUrgency && matchStatus && matchDate
  })
})

/* ===========================
   🗑️ ลบรายการ
   =========================== */
async function handleDelete(repairCode) {
  const result = await Swal.fire({
    title: 'ลบรายการนี้?',
    text: `คุณต้องการลบใบแจ้งซ่อมหมายเลข ${repairCode} หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ลบเลย',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#e53e3e',
  })

  if (!result.isConfirmed) return

  try {
    const res = await fetch(`${API_BASE}/my-repairs/${repairCode}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('ลบไม่สำเร็จ')
    rows.value = rows.value.filter((r) => r.code !== repairCode)
    Swal.fire('สำเร็จ', 'ลบรายการเรียบร้อยแล้ว', 'success')
  } catch {
    Swal.fire('ผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error')
  }
}

/* ===========================
   🔗 Navigation
   =========================== */
const goToCreate = () => router.push('/main/repair-request')
const goToDetail = (code) => router.push(`/main/repair-detail/${code}`)
const goToEdit = (code) => router.push(`/main/repair-edit/${code}`)

/* ===========================
   🚀 Lifecycle
   =========================== */
onMounted(fetchMyRepairs)
</script>

<template>
  <div class="bg-gray-50 rounded-xl p-1 mx-auto max-w-7xl">
    <!-- แถบเครื่องมือด้านบน -->
    <!-- แถบเครื่องมือด้านบน -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <!-- ซ้าย: ฟิลเตอร์ -->
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหา"
            class="w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            v-model="selectedDate"
            type="date"
            class="h-10 px-3 rounded-lg border border-gray-300 bg-white text-gray-700"
          />

          <select
            v-model="selectedUrgency"
            class="h-10 px-3 rounded-lg border border-gray-300 bg-white text-gray-700"
          >
            <option>ทั้งหมด</option>
            <option value="high">เร่งด่วนมาก</option>
            <option value="medium">เร่งด่วน</option>
            <option value="low">ไม่เร่งด่วน</option>
          </select>

          <select
            v-model="selectedStatus"
            class="h-10 px-3 rounded-lg border border-gray-300 bg-white text-gray-700"
          >
            <option>ทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="done">ดำเนินการเสร็จสิ้น</option>
          </select>
        </div>

        <!-- ขวา: ปุ่มแจ้งซ่อม -->
        <button
          @click="goToCreate"
          class="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#1E48D1] hover:bg-[#1539a9] text-white font-medium shadow-sm transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m7-7H5" />
          </svg>
          แจ้งซ่อม
        </button>
      </div>
    </div>
  </div>
  <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-black mb-6">รายการของฉัน</h1>

    <div class="p-5 mx-auto max-w-8xl">
      <!-- ตาราง -->
      <TableComponent
        :columns="columns"
        :rows="
          filteredRows.map((r) => [
            r.date,
            r.code,
            r.asset,
            r.department,
            r.urgency,
            r.status,
            'actions',
          ])
        "
        :perPage="10"
        v-model:currentPage="currentPage"
        @delete="handleDelete"
        @detail="goToDetail"
        @edit="goToEdit"
      />
    </div>
  </div>
</template>

<style scoped>
td,
th {
  white-space: nowrap;
  text-align: center;
  vertical-align: middle;
}

table {
  table-layout: fixed;
  width: 100%;
}
</style>
