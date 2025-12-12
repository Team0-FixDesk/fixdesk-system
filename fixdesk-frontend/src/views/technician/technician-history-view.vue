<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-back mb-6">รายการของฉัน
    </h1>
    <!-- ฟิลเตอร์ -->
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <input v-model="searchQuery" type="text" placeholder="ค้นหาใบแจ้งซ่อม / ผู้แจ้ง / ประเภท"
        class="w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500" />
      <input v-model="selectedDate" type="date"
        class="h-10 px-3 rounded-lg border border-gray-300 bg-white text-gray-700" />
      <!-- ปุ่มล้าง -->
      <transition name="fade">
        <button v-if="selectedStatuses.length || selectedUrgencies.length || searchQuery" @click="clearFilters"
          class="text-blue-600 hover:text-blue-700 text-sm font-medium">
          ล้างตัวกรอง
        </button>
      </transition>
    </div>
     <TableComponent :columns="columns" :rows="filteredRows" :perPage="10" mode="stock" @detail="goToDetail"
       />
  </div>
</template>

<script setup>
defineOptions({ name: 'TechnicianHistoryView' })
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import TableComponent from '@/components/table-component.vue'
import Swal from 'sweetalert2'

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

/* Helper สำหรับแนบ Token */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

const columns = [
  'วันที่',
  'รหัสใบแจ้ง',
  'ผู้แจ้ง',
  'หน่วยงาน',
  'เรื่องที่แจ้ง',
  'สถานที่',
  'สถานะ',
  'ตัวดำเนินการ',
]

const rows = ref([])
const searchQuery = ref('')
const selectedStatuses = ref([])
const selectedUrgencies = ref([])
const showStatusFilter = ref(false)
const showUrgencyFilter = ref(false)
const selectedDate = ref('')

// ดึงข้อมูลรายการแจ้งซ่อมทั้งหมด (Admin)
async function fetchAllRepairs() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      Swal.fire('หมดเวลาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบใหม่', 'warning')
      router.push('/login')
      return
    }

    const res = await fetch(`${API_BASE}/technician/history`, { headers: getAuthHeaders() })
    if (res.status === 401) {
      Swal.fire('หมดเวลาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบใหม่', 'warning')
      sessionStorage.removeItem('token')
      localStorage.removeItem('token')
      router.push('/login')
      return
    }

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')

    rows.value = data.map((r) => {
      const urgencyBadge =
        {
          low: `<span class="inline-flex justify-center items-center w-28 h-8 rounded-full bg-green-100 text-green-600 font-medium">ไม่เร่งด่วน</span>`,
          medium: `<span class="inline-flex justify-center items-center w-28 h-8 rounded-full bg-yellow-100 text-yellow-600 font-medium">เร่งด่วน</span>`,
          high: `<span class="inline-flex justify-center items-center w-28 h-8 rounded-full bg-red-100 text-red-600 font-medium">เร่งด่วนมาก</span>`,
        }[r.rf_urgency] || '-'

      const statusBadge =
        {
          pending: `<span class="inline-flex justify-center items-center w-28 h-8 rounded-full bg-amber-100 text-amber-700 font-medium">รอดำเนินการ</span>`,
          in_progress: `<span class="inline-flex justify-center items-center w-28 h-8 rounded-full bg-blue-100 text-blue-700 font-medium">กำลังดำเนินการ</span>`,
          done: `<span class="inline-flex justify-center items-center w-28 h-8 rounded-full bg-green-100 text-green-700 font-medium">เสร็จสิ้น</span>`,
        }[r.rf_user_status] || '-'

      const createdAt = new Date(r.rf_create_at)

      return {
        // raw
        date: createdAt,
        code: r.rf_code || '-',
        problemTopic: truncateThaiText(r.rf_problem || '-', 5),
        department: r.department_name || '-',
        type: r.tt_name || '-',
        location: `${r.building_name || ''} ${r.floor_name || ''} ${r.room_name || ''}`.trim() || '-',
        statusKey: r.rf_user_status,
        requester: (() => {
          const first = r.us_first_name || ''
          const last = r.us_last_name || ''
          const full = `${first} ${last}`.trim()
          return full || (r.rf_requester || '-')
        })(),
        // for display
        dateDisplay: createdAt.toLocaleDateString('th-TH'),
        statusBadge,
      }
    })
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
    // Toast notification
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    })
    Toast.fire({
      title: 'เกิดข้อผิดพลาด',
      text: err.message,
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626'
    })

    // Normal Alert (commented for reference)
    // Swal.fire('เกิดข้อผิดพลาด', err.message, 'error')
  }
}

// ฟังก์ชันช่วยตัดคำภาษาไทย (แสดงประมาณ 8 คำ)
function truncateThaiText(text, wordLimit = 5) {
  if (!text || text === '-') return '-'

  const fullText = String(text) // แปลงเป็น string เพื่อความชัวร์

  try {
    // ใช้ Intl.Segmenter สำหรับตัดคำภาษาไทย
    const segmenter = new Intl.Segmenter('th', { granularity: 'word' })
    const segments = [...segmenter.segment(fullText)]

    if (segments.length > wordLimit) {
      // ตัดเอาแค่ 8 คำแรก + ...
      const shortText = segments
        .slice(0, wordLimit)
        .map((s) => s.segment)
        .join('')
      // ส่งกลับเป็น HTML เพื่อให้เอาเมาส์ชี้แล้วเห็นข้อความเต็ม (Tooltip)
      return `<span title="${fullText}" class="cursor-help">${shortText}...</span>`
    }
  } catch (err) {
    // Fallback: กรณี Browser เก่ามาก ไม่รองรับ Intl ให้ตัดตามจำนวนตัวอักษรแทน (ประมาณ 40 ตัว)
    if (fullText.length > 40) {
      return `<span title="${fullText}" class="cursor-help">${fullText.substring(0, 40)}...</span>`
    }
  }

  return fullText
}

// FILTER
const filteredRows = computed(() => {
  try {
    const q = (searchQuery.value || '').toString().toLowerCase()
    const selectedDateObj = selectedDate.value ? new Date(selectedDate.value) : null

    return (rows.value || [])
      .filter((r) => {
        // ป้องกันค่า undefined ในฟิลด์ต่างๆ
        const code = (r && (r.code || '')).toString()
        const requester = (r && (r.requester || '')).toString()
        const type = (r && (r.type || '')).toString()

        // ค้นหาตาม code / ผู้แจ้ง / ประเภท
        const matchSearch =
          code.toLowerCase().includes(q) ||
          requester.toLowerCase().includes(q) ||
          type.toLowerCase().includes(q)

        // ความเร่งด่วน
        const matchUrgency =
          (selectedUrgencies.value.length === 0) ||
          (r && selectedUrgencies.value.includes(r.urgencyKey))

        // สถานะ
        const matchStatus =
          (selectedStatuses.value.length === 0) ||
          (r && selectedStatuses.value.includes(r.statusKey))

        // วันที่ (เทียบแบบตัดเวลาออก เหลือแค่วัน)
        let matchDate = true
        if (selectedDateObj) {
          try {
            const rDate = r && r.date ? new Date(r.date) : null
            matchDate = rDate && rDate.toDateString() === selectedDateObj.toDateString()
          } catch (e) {
            matchDate = false
          }
        }

        return matchSearch && matchUrgency && matchStatus && matchDate
      })
      .map((r) => {
        const managementBadge = (r && r.statusKey === 'done')
          ? `<span class=" text-l text-[#959595] ">เสร็จสิ้น</span>`
          : '-'

        return [
          (r && r.dateDisplay) || '-', // วันที่
          (r && r.code) || '-', // รหัสใบแจ้ง
          (r && r.requester) || '-', // ผู้แจ้ง
          (r && r.department) || '-', // หน่วยงาน
          (r && r.problemTopic) || '-', // เรื่องที่แจ้ง
          (r && r.location) || '-', // สถานที่
          (r && r.statusBadge) || '-', // สถานะงาน
          'actions', // การดำเนินการ
        ]
      })
  } catch (err) {
    // ถ้าเกิดข้อผิดพลาด ไม่ให้ล่มทั้งคอมโพเนนท์ — log ให้เห็นรายละเอียดเพื่อดีบัก
    try {
      console.error('filteredRows error in TechnicianHistoryView:', err)
      console.error('rows snapshot:', JSON.parse(JSON.stringify(rows.value || [])))
    } catch (e) {
      console.error('Could not stringify rows snapshot', e)
    }
    return []
  }
})


function clearFilters() {
  selectedStatuses.value = []
  selectedUrgencies.value = []
  searchQuery.value = ''
  selectedDate.value = ''
}

function closeDropdown(e) {
  if (!e.target.closest('.relative')) {
    showStatusFilter.value = false
    showUrgencyFilter.value = false
  }
}

const goToDetail = (code) => router.push(`/main/repair-detail/${code}`)

onMounted(() => {
  fetchAllRepairs()
  document.addEventListener('click', closeDropdown)
})

onBeforeUnmount(() => document.removeEventListener('click', closeDropdown))
</script>

้
