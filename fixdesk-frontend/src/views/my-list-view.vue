<script setup>
import { ref, onMounted } from 'vue'
import TableComponent from '@/components/table-component.vue'

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
        r.building_name || '-',
        urgencyBadge,
        statusBadge, // ✅ ใช้ HTML badge
        'actions',
      ]
    })
  } catch (err) {
    console.error('❌ โหลดข้อมูลรายการแจ้งซ่อมไม่สำเร็จ:', err)
  }
}

/* ฟังก์ชันลบใบแจ้งซ่อม */
async function handleDelete(repairCode) {
  if (!confirm(`คุณต้องการลบใบแจ้งซ่อมหมายเลข ${repairCode} ใช่หรือไม่?`)) return

  try {
    const res = await fetch(`${API_BASE}/my-repairs/${repairCode}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) throw new Error('ลบข้อมูลไม่สำเร็จ')

    // ✅ ลบออกจากตารางทันทีโดยไม่ต้อง refresh
    rows.value = rows.value.filter((r) => !r.includes(repairCode))
    alert('✅ ลบข้อมูลสำเร็จ!')
  } catch (err) {
    console.error('❌ ลบข้อมูลไม่สำเร็จ:', err)
    alert('เกิดข้อผิดพลาดในการลบข้อมูล')
  }
}



onMounted(fetchMyRepairs)
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-black mb-6">รายการของฉัน</h1>

    <div class="p-5 mx-auto max-w-8xl">
      <TableComponent
        :columns="columns"
        :rows="rows"
        :perPage="10"
        v-model:currentPage="currentPage"
        @delete="handleDelete"
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
