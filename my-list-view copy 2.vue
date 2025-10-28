<script setup>
import { ref, onMounted } from 'vue'
import TableComponent from '@/components/table-component.vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const goToCreate = () => router.push('/main/repair-request')

defineOptions({ name: 'MyListView' })

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

const columns = [
  'วันที่',
  'ใบแจ้งซ่อม',
  'หมายเลขครุภัณฑ์',
  'หน่วยงาน',
  'ความเร่งด่วน',
  'สถานะงาน',
  'ตัวดำเนินการ',
]

const rows = ref([])
const currentPage = ref(1)

/* ฟังก์ชันถอดรหัส token */
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

/* ดึงข้อมูลรายการแจ้งซ่อมของผู้ใช้ */
async function fetchMyRepairs() {
  const token = localStorage.getItem('token')
  if (!token) return console.warn('⚠️ ไม่มี token')

  const payload = parseJwt(token)
  const userId = payload.us_id

  try {
    const res = await fetch(`${API_BASE}/my-repairs/${userId}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')

    // จัดข้อมูลให้ตรงกับตาราง
    rows.value = data.map((r) => {
      // 🟥 ความเร่งด่วน
      let urgencyBadge = ''
      switch (r.rf_urgency) {
        case 'high':
          urgencyBadge = `
            <span class='inline-flex justify-center items-center w-36 h-8 rounded-full bg-red-100 text-red-600 font-semibold'>
              เร่งด่วนมาก
            </span>`
          break
        case 'medium':
          urgencyBadge = `
            <span class='inline-flex justify-center items-center w-36 h-8 rounded-full bg-amber-50 text-amber-500 font-semibold'>
              เร่งด่วน
            </span>`
          break
        case 'low':
          urgencyBadge = `
            <span class='inline-flex justify-center items-center w-36 h-8 rounded-full bg-green-100 text-green-600 font-semibold'>
              ไม่เร่งด่วน
            </span>`
          break
        default:
          urgencyBadge = '-'
      }

      // 🟩 สถานะงาน
      const statusBadge = (() => {
        switch (r.rf_user_status) {
          case 'pending':
            return `
              <span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-amber-50 text-amber-500 font-semibold">
                รอดำเนินการ
              </span>`
          case 'in_progress':
            return `
              <span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                กำลังดำเนินการ
              </span>`
          case 'done':
            return `
              <span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-green-100 text-green-600 font-semibold">
                ดำเนินการเสร็จสิ้น
              </span>`
          default:
            return `
              <span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-gray-100 text-gray-500 font-semibold">
                ยกเลิก
              </span>`
        }
      })()

      return [
        new Date(r.rf_create_at).toLocaleDateString('th-TH'),
        r.rf_code,
        r.rf_prop_number || '-',
        r.department_name || '-',
        urgencyBadge,
        statusBadge, // ✅ ใช้ HTML badge
        'actions',
      ]
    })
  } catch (err) {
    console.error('❌ โหลดข้อมูลรายการแจ้งซ่อมไม่สำเร็จ:', err)
  }
}

import Swal from 'sweetalert2'

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
    rows.value = rows.value.filter((r) => !r.includes(repairCode))
    Swal.fire('สำเร็จ', 'ลบรายการเรียบร้อยแล้ว', 'success')
  } catch (err) { // eslint-disable-line no-unused-vars
    Swal.fire('ผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error')
  }
}

const goToDetail = (repairCode) => {
  router.push(`/main/repair-detail/${repairCode}`)
}

const goToEdit = (repairCode) => {
  router.push(`/main/repair-edit/${repairCode}`)
}

onMounted(fetchMyRepairs)
</script>

<template>
  <div class="bg-gray-50 rounded-xl p-1 mx-auto max-w-7xl">
    <!-- แถบเครื่องมือด้านบน -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <!-- ซ้าย: กล่องค้นหา/ฟิลเตอร์ (วางเพิ่มภายหลังได้) -->
        <div class="flex items-center gap-3">
          <div class="hidden sm:block w-[260px]">
            <input
              type="text"
              placeholder="ค้นหา"
              class="w-full h-10 px-4 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <!-- ตัวอย่างปุ่มฟิลเตอร์ (ใส่ทีหลังได้) -->
          <button
            class="hidden sm:inline-flex h-10 items-center px-3 rounded-lg border border-gray-300 bg-white text-gray-700"
          >
            วันที่
          </button>
          <button
            class="hidden sm:inline-flex h-10 items-center px-3 rounded-lg border border-gray-300 bg-white text-gray-700"
          >
            ความเร่งด่วน
          </button>
          <button
            class="hidden sm:inline-flex h-10 items-center px-3 rounded-lg border border-gray-300 bg-white text-gray-700"
          >
            สถานะงาน
          </button>
        </div>

        <!-- ขวา: ปุ่มแจ้งซ่อม -->
        <button
          @click="goToCreate"
          class="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#1E48D1] hover:bg-[#1539a9] text-white font-medium shadow-sm transition"
        >
          <!-- ไอคอนเครื่องหมาย + สีขาว -->
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
      <TableComponent
        :columns="columns"
        :rows="rows"
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
