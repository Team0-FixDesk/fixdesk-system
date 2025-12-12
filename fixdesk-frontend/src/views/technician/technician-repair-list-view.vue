<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import TableComponent from '@/components/table-component.vue'
import repairButtonComponent from '@/components/repair-button-component.vue'
import Swal from 'sweetalert2'
import { jwtDecode } from 'jwt-decode'

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const technicians = ref([])
const acceptMode = ref('alone')

const tokenData = ref(null)

function loadTokenData() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (token) {
    try {
      tokenData.value = jwtDecode(token)
    } catch (err) {
      console.warn('ไม่สามารถ decode token:', err)
      tokenData.value = null
    }
  }
}

/* Helper สำหรับแนบ Token */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// เก็บข้อมูลดิบจาก backend (array of objects)
const rowsData = ref([])

/* สร้าง rawRows และ rowsForTable เป็น computed จาก rowsData */
const rawRows = computed(() =>
  rowsData.value.map((r) => ({
    rf_code: r.rf_code,
    code: r.rf_code,
    rf_user_status: r.rf_user_status,
    rf_urgency: r.rf_urgency,
    assigned: !!r.ra_id,
    ra_id: r.ra_id || null,
    ra_is_lead: r.ra_is_lead || 0,
    ra_assigned_at: r.ra_assigned_at || null,
    ra_accepted_at: r.ra_accepted_at || null,
  })),
)

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

/* rowsForTable */
const rowsForTable = computed(() =>
  rowsData.value.map((r) => {
    // เตรียมข้อมูล
    const dateStr = r.rf_create_at ? new Date(r.rf_create_at).toLocaleDateString('th-TH') : '-'
    const reporterName = `${r.us_first_name || ''} ${r.us_last_name || ''}`.trim() || '-'
    const department = r.department_name || '-'
    const problem = truncateThaiText(r.rf_problem || '-', 5)
    const parts = []
    if (r.bd_name) parts.push(r.bd_name)
    if (r.fl_name) parts.push(r.fl_name)
    if (r.room_name) parts.push(r.room_name)
    const placeText = parts.join(' / ') || '-'

    // Logic Badge สถานะ (เหมือนเดิม)
    const statusBadge =
      {
        pending: `<span class="inline-flex items-center justify-center h-8 font-medium rounded-full w-28 bg-amber-100 text-amber-700">รอดำเนินการ</span>`,
        in_progress: `<span class="inline-flex items-center justify-center h-8 font-medium text-blue-700 bg-blue-100 rounded-full w-28">กำลังดำเนินการ</span>`,
        done: `<span class="inline-flex items-center justify-center h-8 font-medium text-green-700 bg-green-100 rounded-full w-28">เสร็จสิ้น</span>`,
        cancel: `<span class="inline-flex items-center justify-center h-8 font-medium text-gray-700 bg-gray-100 rounded-full w-28">ยกเลิก</span>`,
      }[String(r.rf_user_status || '').toLowerCase()] ||
      `<span class="inline-flex items-center justify-center h-8 font-medium rounded-full w-28">-</span>`

    // Return Array ตามลำดับใหม่ (10 ช่อง)
    return [
      dateStr, // 0. วันที่
      r.rf_code, // 1. รหัสใบแจ้ง
      reporterName, // 2. ผู้แจ้ง
      department, // 3. หน่วยงาน
      problem, // 4. เรื่องที่แจ้ง
      placeText, // 6. สถานที่
      statusBadge, // 7. สถานะ
      'actions', // 8. ตัวดำเนินการ
    ]
  }),
)

/* filter / UI state */
const searchQuery = ref('')
const selectedStatuses = ref([])
const selectedUrgencies = ref([])
const showStatusFilter = ref(false)
const showUrgencyFilter = ref(false)
const selectedDate = ref('')

const currentAcceptCode = ref(null) // เก็บ rf_code ปัจจุบันที่กดรับ
const showAcceptPopup = ref(false) // ควบคุม popup รับงาน
const selectedTeam = ref([]) // รายชื่อช่างในทีม (team mode)

/* ป๊อปอัพมอบหมายงาน */
const showAssignPopup = ref(false)
const technicianTypes = ref([])
const selectedType = ref('')
const searchTech = ref('')
const selectedTechnician = ref(null)
const loadingAssign = ref(false)

/* ===============================
 * 📦 ดึงข้อมูลรายการแจ้งซ่อมทั้งหมด
 * =============================== */
async function fetchAllRepairs() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      Swal.fire('หมดเวลาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบใหม่', 'warning')
      router.push('/login')
      return
    }

    const res = await fetch(`${API_BASE}/technician/repairs`, { headers: getAuthHeaders() })
    if (res.status === 401) {
      Swal.fire('หมดเวลาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบใหม่', 'warning')
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
      router.push('/login')
      return
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `โหลดข้อมูลไม่สำเร็จ (status ${res.status})`)
    }

    const data = await res.json()
    rowsData.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('❌ โหลดข้อมูลไม่สำเร็จ:', err)
    Swal.fire('เกิดข้อผิดพลาด', err.message || 'โหลดข้อมูลไม่สำเร็จ', 'error')
  }
}

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

async function handleAccept(code) {
  await fetchTechnicians()
  currentAcceptCode.value = code
  acceptMode.value = 'team' // หรือ 'alone' ขึ้นกับปุ่มที่กด
  showAcceptPopup.value = true
}

function closeAcceptPopup() {
  showAcceptPopup.value = false
}

async function checkAssignmentCount(rf_code) {
  try {
    // คาดหวังว่ามี endpoint /repair-assignment/count?rf_code=XXX ที่คืน { count: N }
    const res = await fetch(
      `${API_BASE}/repair-assignment/count?rf_code=${encodeURIComponent(rf_code)}`,
      {
        headers: getAuthHeaders(),
      },
    )
    if (!res.ok) {
      // ถ้าไม่มี endpoint นี้ backend อาจคืน 404 -> ให้ fallback เป็น null
      return null
    }
    const payload = await res.json()
    return Number(payload.count || 0)
  } catch (err) {
    console.warn('checkAssignmentCount error:', err)
    return null
  }
}

/**
 * พยายามเซ็ต ra_is_lead = 1 สำหรับ assignment ที่เป็นของผู้ใช้ปัจจุบัน
 * จะลองหลายวิธี (เรียก endpoint เฉพาะ, หรือส่ง body ไปที่ accept-job)
 * คืนค่า true ถ้าสำเร็จ หรือ false ถ้าล้มเหลว
 */
async function setLeadForAssignment(rf_code) {
  try {
    // 1) ถ้ามี endpoint /repair-assignment/set-lead ให้เรียกแบบ POST
    const res1 = await fetch(`${API_BASE}/repair-assignment/set-lead`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rf_code }),
    })
    if (res1.ok) return true
    // ถ้า server ตอบ 404/405/ไม่รองรับ ให้ fallback ไปวิธีถัดไป
  } catch (err) {
    console.warn('setLeadForAssignment (method 1) failed:', err)
  }

  try {
    // 2) บาง backend อาจรองรับการส่ง flag ใน accept-job endpoint
    // ส่ง body { set_lead: true } ด้วยแบบ PUT
    const res2 = await fetch(
      `${API_BASE}/technician/accept-job/${encodeURIComponent(rf_code)}?set_lead=1`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ set_lead: true }),
      },
    )
    if (res2.ok) return true
  } catch (err) {
    console.warn('setLeadForAssignment (method 2) failed:', err)
  }

  try {
    // 3) ถ้าไม่มี endpoint ใด ๆ เลย — ลองเรียก endpoint มอบหมายทีม (assign-repair-team)
    // โดยส่ง mode 'solo' เพื่อให้ backend อัปเดต ra_is_lead (ถ้ามี logic นั้น)
    const res3 = await fetch(`${API_BASE}/assign-repair-team`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        rf_code,
        technician_ids: [], // server อาจใช้ rf_code + current user token
        mode: 'solo',
      }),
    })
    if (res3.ok) return true
  } catch (err) {
    console.warn('setLeadForAssignment (method 3) failed:', err)
  }

  // ทุกวิธีล้มเหลว
  return false
}

async function confirmAccept() {
  const code = currentAcceptCode.value
  if (!code) {
    alert('ไม่พบรหัสใบงาน')
    return
  }

  // โหมดทำงานคนเดียว
  if (acceptMode.value === 'alone') {
    try {
      // 1) เรียก accept-job ตามปกติ
      const res = await fetch(`${API_BASE}/technician/accept-job/${encodeURIComponent(code)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(payload.message || 'ไม่สามารถรับงานได้')
        return
      }

      // 2) ตรวจจำนวน assignment ว่าเป็นงานเดี่ยวหรือไม่
      const count = await checkAssignmentCount(code)

      // ถ้าทราบว่ามีแค่ 1 คน => พยายามเซ็ต lead
      if (count === 1) {
        const okLead = await setLeadForAssignment(code)
        if (!okLead) {
          // ไม่สำเร็จในการเซ็ต lead — แจ้ง log / user แต่ไม่ขวางการใช้งาน
          console.warn('Failed to mark ra_is_lead for solo assignment', code)
          // ถ้าต้องการแจ้ง user ให้รู้:
          // Swal.fire('สังเกต', 'ตั้งค่าผู้รับผิดชอบหลักในระบบไม่สำเร็จ โปรดแจ้งผู้ดูแลระบบ', 'warning')
        }
      } else if (count === null) {
        // ไม่สามารถตรวจสอบจำนวนได้ — พยายามเซ็ต lead เฉพาะกรณีที่ backend รับ flag
        // (ปลอดภัยที่จะลอง)
        await setLeadForAssignment(code) // ignore result
      }

      closeAcceptPopup()
      fetchAllRepairs()
    } catch (err) {
      console.error('Error accepting job (alone):', err)
      alert('เกิดข้อผิดพลาด ขณะรับงาน')
    }

    return
  }

  // โหมดทำงานเป็นทีม
  if (acceptMode.value === 'team') {
    if (!selectedTeam.value || selectedTeam.value.length === 0) {
      alert('โปรดเลือกช่างอย่างน้อย 1 คน')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/assign-repair-team`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          rf_code: code,
          technician_ids: selectedTeam.value, // ต้องมีตัวเอง
          mode: 'merge',
        }),
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(payload.message || 'มอบหมายทีมไม่สำเร็จ')
        return
      }

      // หลัง assign ทีมแล้ว ให้เรียก accept-job เพื่อเปลี่ยนสถานะเป็น in_progress
      const res2 = await fetch(`${API_BASE}/technician/accept-job/${encodeURIComponent(code)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      })

      if (!res2.ok) {
        const p2 = await res2.json().catch(() => ({}))
        alert(p2.message || 'รับงานหลังมอบหมายทีมไม่สำเร็จ')
        return
      }

      // team mode โดยปกติจะไม่เซ็ต lead ให้ทุกคน — ถ้าต้องการแยก leader ให้เรียก setLeadForAssignment หากต้องการ
      closeAcceptPopup()
      fetchAllRepairs()
    } catch (err) {
      console.error('Error accepting job (team):', err)
      alert('เกิดข้อผิดพลาด ขณะมอบหมายทีม/รับงาน')
    }
  }
}

/* --- Placeholder Functions for Missing Logic --- */
// (ฟังก์ชันเหล่านี้จำเป็นต้องมีเพื่อให้ Template ทำงานได้
// หากคุณมีโค้ดส่วนนี้อยู่แล้ว ให้ใช้ของเดิมของคุณแทนส่วนนี้)
/* กรองรายชื่อช่างตามประเภทและชื่อ */
const filteredTechnicians = computed(() =>
  technicians.value.filter((t) => {
    // ⭐ ซ่อนตัวเอง
    if (t.us_id === tokenData.value?.us_id) return false

    const matchType = !selectedType.value || t.tt_name === selectedType.value
    const matchSearch =
      !searchTech.value ||
      `${t.us_first_name} ${t.us_last_name}`.toLowerCase().includes(searchTech.value.toLowerCase())

    return matchType && matchSearch
  }),
)

function confirmAssign() {
  // Logic ปุ่มยืนยันใน Popup (Mockup)
  console.log('Confirm assign technician:', selectedTechnician.value)
  closeAssignPopup()
}
function closeAssignPopup() {
  showAssignPopup.value = false
  selectedTechnician.value = null
  searchTech.value = ''
  selectedType.value = ''
}
function handleChangeStatus(item) {
  // Logic เปลี่ยนสถานะ (Mockup)
  console.log('Change status requested', item)
}

onMounted(() => {
  fetchAllRepairs()
  document.addEventListener('click', closeDropdown)
})
onBeforeUnmount(() => document.removeEventListener('click', closeDropdown))

const showAssignTypeFilter = ref(false)
function selectAssignType(type) {
  selectedType.value = type
  showAssignTypeFilter.value = false
}
function toggleSelectTeam(id) {
  if (selectedTeam.value.includes(id)) {
    selectedTeam.value = selectedTeam.value.filter((t) => t !== id)
  } else {
    selectedTeam.value.push(id)
  }
}

async function fetchTechnicians() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) throw new Error('ไม่พบ token')

    const decoded = jwtDecode(token)
    const currentUserId = decoded.us_id

    const res = await fetch(`${API_BASE}/technicians`, { headers: getAuthHeaders() })
    const typesRes = await fetch(`${API_BASE}/technician-types`)

    const techs = await res.json()
    technicianTypes.value = await typesRes.json()

    // Auto-select ตัวเอง + ซ่อน
    technicians.value = techs.filter((t) => t.us_id !== currentUserId)
    // ตัวเองถูก auto-add
    selectedTeam.value = [currentUserId]
  } catch (err) {
    console.error('❌ โหลดข้อมูลช่างไม่สำเร็จ:', err)
    Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดรายชื่อช่างได้', 'error')
  }
}

// ดึง user id ของช่างคนปัจจุบัน
const me = technicians.value.find((t) => t.us_id === tokenData.value?.us_id)

// auto select ตัวเอง
if (me) {
  selectedTeam.value = [me.us_id]
}
</script>

<template>
  <div class="p-8 mx-auto bg-white shadow-md rounded-xl max-w-7xl">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-back">รายงานการแจ้งซ่อม</h1>

      <repairButtonComponent />
    </div>

    <div class="flex flex-wrap items-center gap-3 mb-6">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="ค้นหา"
        class="w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
      />
      <input
        v-model="selectedDate"
        type="date"
        class="h-10 px-3 text-gray-700 bg-white border border-gray-300 rounded-lg"
      />

      <div class="relative">
        <button
          @click.stop="showUrgencyFilter = !showUrgencyFilter"
          class="flex items-center gap-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg"
        >
          ความเร่งด่วน
          <img
            src="/icon/sidebar/chevron-down-icon.svg"
            class="w-4 h-4 opacity-70"
            :class="{ 'rotate-180': showUrgencyFilter }"
          />
        </button>
        <div
          v-if="showUrgencyFilter"
          class="absolute z-10 w-48 p-3 mt-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg"
        >
          <label class="flex items-center py-1">
            <input
              type="checkbox"
              value="low"
              v-model="selectedUrgencies"
              class="w-4 h-4 text-blue-600"
            />
            <span class="ml-2">ไม่เร่งด่วน</span>
          </label>
          <label class="flex items-center py-1">
            <input
              type="checkbox"
              value="medium"
              v-model="selectedUrgencies"
              class="w-4 h-4 text-blue-600"
            />
            <span class="ml-2">เร่งด่วน</span>
          </label>
          <label class="flex items-center py-1">
            <input
              type="checkbox"
              value="high"
              v-model="selectedUrgencies"
              class="w-4 h-4 text-blue-600"
            />
            <span class="ml-2">เร่งด่วนมาก</span>
          </label>
        </div>
      </div>

      <div class="relative">
        <button
          @click.stop="showStatusFilter = !showStatusFilter"
          class="flex items-center gap-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg"
        >
          สถานะ
          <img
            src="/icon/sidebar/chevron-down-icon.svg"
            class="w-4 h-4 opacity-70"
            :class="{ 'rotate-180': showStatusFilter }"
          />
        </button>
        <div
          v-if="showStatusFilter"
          class="absolute z-10 w-48 p-3 mt-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg"
        >
          <label class="flex items-center py-1">
            <input
              type="checkbox"
              value="pending"
              v-model="selectedStatuses"
              class="w-4 h-4 text-blue-600"
            />
            <span class="ml-2">รอดำเนินการ</span>
          </label>
          <label class="flex items-center py-1">
            <input
              type="checkbox"
              value="in_progress"
              v-model="selectedStatuses"
              class="w-4 h-4 text-blue-600"
            />
            <span class="ml-2">กำลังดำเนินการ</span>
          </label>
          <label class="flex items-center py-1">
            <input
              type="checkbox"
              value="done"
              v-model="selectedStatuses"
              class="w-4 h-4 text-blue-600"
            />
            <span class="ml-2">เสร็จสิ้น</span>
          </label>
        </div>
      </div>

      <transition name="fade">
        <button
          v-if="selectedStatuses.length || selectedUrgencies.length || searchQuery"
          @click="clearFilters"
          class="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ล้างตัวกรอง
        </button>
      </transition>
    </div>

    <TableComponent
      :columns="[
        'วันที่',
        'รหัสใบแจ้ง',
        'ผู้แจ้ง',
        'หน่วยงาน',
        'เรื่องที่แจ้ง',
        'สถานที่',
        'สถานะ',
        'ตัวดำเนินการ',
      ]"
      :rows="rowsForTable"
      :rawRows="rawRows"
      :perPage="10"
      mode="technician"
      @detail="goToDetail"
      @accept="handleAccept"
      @change-status="handleChangeStatus"
    />
  </div>

  <div
    v-if="showAssignPopup"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
  >
    <div class="relative w-full max-w-lg p-6 bg-white shadow-lg rounded-xl">
      <h2 class="mb-4 text-xl font-semibold text-blue-700">มอบหมายงานให้ผู้รับผิดชอบหลัก</h2>
      <button
        @click="closeAssignPopup"
        class="absolute text-lg text-gray-500 top-4 right-4 hover:text-gray-700"
      >
        ✕
      </button>

      <select
        v-model="selectedType"
        class="w-full px-3 py-2 mb-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
      >
        <option value="">ประเภทช่างทั้งหมด</option>
        <option v-for="type in technicianTypes" :key="type.tt_id" :value="type.tt_name">
          {{ type.tt_name }}
        </option>
      </select>

      <input
        v-model="searchTech"
        type="text"
        placeholder="ค้นหาช่าง..."
        class="w-full px-3 py-2 mb-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />

      <div class="space-y-2 overflow-y-auto max-h-60">
        <div
          v-for="tech in filteredTechnicians"
          :key="tech.us_id"
          class="flex items-start justify-between p-3 transition border rounded-lg cursor-pointer hover:bg-gray-50"
          @click="selectedTechnician = tech.us_id"
        >
          <div class="flex flex-col text-sm">
            <p class="font-medium text-gray-900 text-base">
              {{ tech.prefix_name || '' }}{{ tech.us_first_name }} {{ tech.us_last_name }}
            </p>
            <p class="text-gray-700 text-sm">ประเภท: {{ tech.tt_name || '-' }}</p>
            <p class="text-gray-700 text-sm">โทร: {{ tech.us_phone || '-' }}</p>
          </div>
          <input
            type="radio"
            name="selectedTech"
            :value="tech.us_id"
            v-model.number="selectedTechnician"
            class="w-5 h-5 mt-5 cursor-pointer border-2 border-[#1E48D1] accent-[#1E48D1]"
          />
        </div>

        <p v-if="filteredTechnicians.length === 0" class="py-4 text-center text-gray-500">
          — ไม่พบช่าง —
        </p>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button
          @click="closeAssignPopup"
          class="px-5 py-2 font-medium text-gray-700 transition bg-gray-200 rounded-md hover:bg-gray-300"
        >
          ยกเลิก
        </button>
        <button
          @click="confirmAssign"
          :disabled="!selectedTechnician || loadingAssign"
          class="px-5 py-2 font-medium text-white transition bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {{ loadingAssign ? 'กำลังมอบหมาย...' : 'ยืนยัน' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Popup รับงาน -->
  <div
    v-if="showAcceptPopup"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
  >
    <div class="bg-white rounded-lg shadow-lg w-full max-w-xl p-8 relative">
      <h2 class="text-lg sm:text-xl font-bold text-black mb-6">รับงาน / มอบหมายทีม</h2>

      <button
        @click="closeAcceptPopup"
        class="absolute text-lg text-gray-500 top-4 right-4 hover:text-gray-700"
      >
        ✕
      </button>

      <!-- โหมดรับงาน -->
      <div class="mb-4 flex gap-6">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" value="alone" v-model="acceptMode" />
          ทำงานคนเดียว
        </label>

        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" value="team" v-model="acceptMode" />
          ทำงานเป็นทีม
        </label>
      </div>

      <!-- TEAM MODE -->
      <div v-if="acceptMode === 'team'">
        <div class="flex flex-col sm:flex-row gap-3 mb-4">
          <!-- Dropdown ประเภทช่าง -->
          <div class="relative w-full sm:w-1/2">
            <button
              @click.stop="showAssignTypeFilter = !showAssignTypeFilter"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none flex justify-between items-center bg-white text-gray-700 h-10"
            >
              <span class="truncate">{{ selectedType || 'ประเภทช่างทั้งหมด' }}</span>
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200 flex-shrink-0"
                :class="{ 'rotate-180': showAssignTypeFilter }"
              />
            </button>

            <div
              v-if="showAssignTypeFilter"
              class="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1"
            >
              <div
                @click="selectAssignType('')"
                class="px-4 py-2 cursor-pointer hover:bg-gray-100 text-gray-700 text-sm"
                :class="{ 'bg-blue-50 text-blue-700': selectedType === '' }"
              >
                ประเภทช่างทั้งหมด
              </div>

              <div
                v-for="type in technicianTypes"
                :key="type.tt_id"
                @click="selectAssignType(type.tt_name)"
                class="px-4 py-2 cursor-pointer hover:bg-gray-100 text-gray-700 text-sm"
                :class="{ 'bg-blue-50 text-blue-700': selectedType === type.tt_name }"
              >
                {{ type.tt_name }}
              </div>
            </div>
          </div>

          <!-- Search -->
          <div class="w-full sm:w-1/2">
            <input
              v-model="searchTech"
              type="text"
              placeholder="ค้นหา"
              class="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none h-10"
            />
          </div>
        </div>

        <!-- รายชื่อช่าง -->
        <div class="space-y-2 overflow-y-auto max-h-60">
          <div
            v-for="tech in filteredTechnicians"
            :key="tech.us_id"
            class="flex items-start justify-between p-3 transition border rounded-lg cursor-pointer hover:bg-gray-50"
            @click="toggleSelectTeam(tech.us_id)"
          >
            <div class="flex flex-col text-sm">
              <p class="font-medium text-gray-900 text-base">
                {{ tech.prefix_name || '' }}{{ tech.us_first_name }} {{ tech.us_last_name }}
              </p>
              <p class="text-gray-700 text-sm">ประเภท: {{ tech.tt_name || '-' }}</p>
              <p class="text-gray-700 text-sm">โทร: {{ tech.us_phone || '-' }}</p>
            </div>

            <input
              type="checkbox"
              :value="tech.us_id"
              v-model="selectedTeam"
              class="w-5 h-5 mt-5 cursor-pointer border-2 border-[#1E48D1] accent-[#1E48D1]"
            />
          </div>

          <p v-if="filteredTechnicians.length === 0" class="py-4 text-center text-gray-500">
            — ไม่พบช่าง —
          </p>
        </div>
      </div>

      <!-- ปุ่ม -->
      <div class="flex justify-end gap-3 mt-6">
        <button
          @click="closeAcceptPopup"
          class="px-5 py-2 font-medium text-gray-700 transition bg-gray-200 rounded-md hover:bg-gray-300"
        >
          ยกเลิก
        </button>
        <button
          @click="confirmAccept"
          class="px-5 py-2 font-medium text-white transition bg-[#1E48D1] rounded-md hover:bg-blue-900"
        >
          ยืนยัน
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
