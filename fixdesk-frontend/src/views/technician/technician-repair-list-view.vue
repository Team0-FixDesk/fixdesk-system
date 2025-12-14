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
const acceptMode = ref("alone")

// -----------------------------
// 🔹 เก็บข้อมูล user จาก token
// -----------------------------
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

/* rowsForTable */
const rowsForTable = computed(() =>
  rowsData.value.map((r) => {
    const urgencyBadge =
      {
        low: `<span class="inline-flex items-center justify-center h-8 font-medium text-green-600 bg-green-100 rounded-full w-28">ไม่เร่งด่วน</span>`,
        medium: `<span class="inline-flex items-center justify-center h-8 font-medium text-yellow-600 bg-yellow-100 rounded-full w-28">เร่งด่วน</span>`,
        high: `<span class="inline-flex items-center justify-center h-8 font-medium text-red-600 bg-red-100 rounded-full w-28">เร่งด่วนมาก</span>`,
      }[String(r.rf_urgency || '').toLowerCase()] ||
      `<span class="inline-flex items-center justify-center h-8 font-medium rounded-full w-28">-</span>`

    const statusBadge =
      {
        pending: `<span class="inline-flex items-center justify-center h-8 font-medium rounded-full w-28 bg-amber-100 text-amber-700">รอดำเนินการ</span>`,
        in_progress: `<span class="inline-flex items-center justify-center h-8 font-medium text-blue-700 bg-blue-100 rounded-full w-28">กำลังดำเนินการ</span>`,
        done: `<span class="inline-flex items-center justify-center h-8 font-medium text-green-700 bg-green-100 rounded-full w-28">เสร็จสิ้น</span>`,
        cancel: `<span class="inline-flex items-center justify-center h-8 font-medium text-gray-700 bg-gray-100 rounded-full w-28">ยกเลิก</span>`,
      }[String(r.rf_user_status || '').toLowerCase()] ||
      `<span class="inline-flex items-center justify-center h-8 font-medium rounded-full w-28">-</span>`

    const parts = []
    if (r.bd_name || r.building_name) parts.push(r.bd_name || r.building_name)
    if (r.fl_name || r.floor_name) parts.push(r.fl_name || r.floor_name)
    if (r.room_name) parts.push(r.room_name)
    if (parts.length === 0 && r.tt_name) parts.push(r.tt_name)
    const placeText = parts.join('/') || '-'

    const dateStr = r.rf_create_at ? new Date(r.rf_create_at).toLocaleDateString('th-TH') : '-'

    return [
      dateStr,
      r.rf_code || '-',
      placeText,
      urgencyBadge,
      statusBadge,
      'actions',
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

/* ===============================
 * 📌 STATE สำหรับการรับงาน
 * =============================== */
const currentAcceptCode = ref(null)      // เก็บ rf_code ปัจจุบันที่กดรับ
const showAcceptPopup = ref(false)       // ควบคุม popup รับงาน
const selectedTeam = ref([])             // รายชื่อช่างในทีม (team mode)

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
      text: err.message || 'โหลดข้อมูลไม่สำเร็จ',
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626'
    })
  }
}

/* ===============================
 * 🔍 FILTER
 * =============================== */
const filteredRows = computed(() => {
  const q = (searchQuery.value || '').toLowerCase()
  const selUrg = selectedUrgencies.value || []
  const selSta = selectedStatuses.value || []

  return rowsData.value
    .filter((r) => {
      const code = String(r.rf_code || '').toLowerCase()
      const place = String(r.room_name || r.fl_name || r.bd_name || r.tt_name || '').toLowerCase()
      const type = String(r.tt_name || '').toLowerCase()
      const matchSearch = !q || code.includes(q) || place.includes(q) || type.includes(q)
      const matchUrgency = selUrg.length === 0 || selUrg.includes(String(r.rf_urgency || '').toLowerCase())
      const matchStatus = selSta.length === 0 || selSta.includes(String(r.rf_user_status || '').toLowerCase())
      const matchDate = !selectedDate.value || (r.rf_create_at && new Date(r.rf_create_at).toLocaleDateString('th-TH') === new Date(selectedDate.value).toLocaleDateString('th-TH'))
      return matchSearch && matchUrgency && matchStatus && matchDate
    })
    .map((r) => {
      // แปลงเป็น row สำหรับ TableComponent
      const urgencyBadge =
        {
          low: `<span class="inline-flex items-center justify-center h-8 font-medium text-green-600 bg-green-100 rounded-full w-28">ไม่เร่งด่วน</span>`,
          medium: `<span class="inline-flex items-center justify-center h-8 font-medium text-yellow-600 bg-yellow-100 rounded-full w-28">เร่งด่วน</span>`,
          high: `<span class="inline-flex items-center justify-center h-8 font-medium text-red-600 bg-red-100 rounded-full w-28">เร่งด่วนมาก</span>`,
        }[String(r.rf_urgency || '').toLowerCase()] ||
        `<span class="inline-flex items-center justify-center h-8 font-medium rounded-full w-28">-</span>`

      const statusBadge =
        {
          pending: `<span class="inline-flex items-center justify-center h-8 font-medium rounded-full w-28 bg-amber-100 text-amber-700">รอดำเนินการ</span>`,
          in_progress: `<span class="inline-flex items-center justify-center h-8 font-medium text-blue-700 bg-blue-100 rounded-full w-28">กำลังดำเนินการ</span>`,
          done: `<span class="inline-flex items-center justify-center h-8 font-medium text-green-700 bg-green-100 rounded-full w-28">เสร็จสิ้น</span>`,
          cancel: `<span class="inline-flex items-center justify-center h-8 font-medium text-gray-700 bg-gray-100 rounded-full w-28">ยกเลิก</span>`,
        }[String(r.rf_user_status || '').toLowerCase()] ||
        `<span class="inline-flex items-center justify-center h-8 font-medium rounded-full w-28">-</span>`

      const parts = []
      if (r.bd_name || r.building_name) parts.push(r.bd_name || r.building_name)
      if (r.fl_name || r.floor_name) parts.push(r.fl_name || r.floor_name)
      if (r.room_name) parts.push(r.room_name)
      if (parts.length === 0 && r.tt_name) parts.push(r.tt_name)
      const placeText = parts.join('/') || '-'

      const dateStr = r.rf_create_at ? new Date(r.rf_create_at).toLocaleDateString('th-TH') : '-'

      return [
        dateStr,
        r.rf_code || '-',
        placeText,
        urgencyBadge,
        statusBadge,
        'actions',
      ]
    })
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

/* ===============================
 * 🧭 ACTION BUTTONS
 * =============================== */
const goToDetail = (code) => router.push(`/main/repair-detail/${code}`)

async function handleAccept(code) {
  await fetchTechnicians()
  currentAcceptCode.value = code
  acceptMode.value = "team" // หรือ 'alone' ขึ้นกับปุ่มที่กด
  showAcceptPopup.value = true
}

function closeAcceptPopup() {
  showAcceptPopup.value = false
}

async function checkAssignmentCount(rf_code) {
  try {
    // คาดหวังว่ามี endpoint /repair-assignment/count?rf_code=XXX ที่คืน { count: N }
    const res = await fetch(`${API_BASE}/repair-assignment/count?rf_code=${encodeURIComponent(rf_code)}`, {
      headers: getAuthHeaders(),
    })
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
    const res2 = await fetch(`${API_BASE}/technician/accept-job/${encodeURIComponent(rf_code)}?set_lead=1`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ set_lead: true }),
    })
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
    // Toast notification
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true
    })
    Toast.fire({
      title: 'ไม่พบรหัสใบงาน',
      icon: 'warning',
      background: '#fef3c7',
      color: '#92400e'
    })
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
          title: payload.message || 'ไม่สามารถรับงานได้',
          icon: 'error',
          background: '#fee2e2',
          color: '#dc2626'
        })
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

      // Success toast notification
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        animation: false,
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer)
          toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
      })
      Toast.fire({
        title: 'รับงานสำเร็จ!',
        text: 'คุณได้รับงานเรียบร้อยแล้ว',
        icon: 'success',
        background: '#f0f9ff',
        color: '#1e3a8a'
      })

      closeAcceptPopup()
      fetchAllRepairs()
    } catch (err) {
      console.error('Error accepting job (alone):', err)
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
        text: 'ขณะรับงาน',
        icon: 'error',
        background: '#fee2e2',
        color: '#dc2626'
      })
    }

    return
  }

  // โหมดทำงานเป็นทีม
  if (acceptMode.value === 'team') {
    if (!selectedTeam.value || selectedTeam.value.length === 0) {
      // Toast notification
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        animation: false,
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true
      })
      Toast.fire({
        title: 'โปรดเลือกช่างอย่างน้อย 1 คน',
        icon: 'warning',
        background: '#fef3c7',
        color: '#92400e'
      })
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
          title: payload.message || 'มอบหมายทีมไม่สำเร็จ',
          icon: 'error',
          background: '#fee2e2',
          color: '#dc2626'
        })
        return
      }

      // หลัง assign ทีมแล้ว ให้เรียก accept-job เพื่อเปลี่ยนสถานะเป็น in_progress
      const res2 = await fetch(`${API_BASE}/technician/accept-job/${encodeURIComponent(code)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      })

      if (!res2.ok) {
        const p2 = await res2.json().catch(() => ({}))
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
          title: p2.message || 'รับงานหลังมอบหมายทีมไม่สำเร็จ',
          icon: 'error',
          background: '#fee2e2',
          color: '#dc2626'
        })
        return
      }

      // Success toast notification
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        animation: false,
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer)
          toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
      })
      Toast.fire({
        title: 'มอบหมายทีมสำเร็จ!',
        text: 'รับงานและมอบหมายทีมเรียบร้อยแล้ว',
        icon: 'success',
        background: '#f0f9ff',
        color: '#1e3a8a'
      })

      // team mode โดยปกติจะไม่เซ็ต lead ให้ทุกคน — ถ้าต้องการแยก leader ให้เรียก setLeadForAssignment หากต้องการ
      closeAcceptPopup()
      fetchAllRepairs()
    } catch (err) {
      console.error('Error accepting job (team):', err)
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
        text: 'ขณะมอบหมายทีม/รับงาน',
        icon: 'error',
        background: '#fee2e2',
        color: '#dc2626'
      })
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
  })
)


function confirmAssign() {
    // Logic ปุ่มยืนยันใน Popup (Mockup)
    console.log('Confirm assign technician:', selectedTechnician.value)
    closeAssignPopup()
}
function closeAssignPopup() {
    showAssignPopup.value = false;
    selectedTechnician.value = null;
    searchTech.value = '';
    selectedType.value = '';
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
    selectedTeam.value = selectedTeam.value.filter(t => t !== id)
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
    technicians.value = techs.filter(t => t.us_id !== currentUserId)
    // ตัวเองถูก auto-add
    selectedTeam.value = [currentUserId]
  } catch (err) {
    console.error('❌ โหลดข้อมูลช่างไม่สำเร็จ:', err)
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
      text: 'ไม่สามารถโหลดรายชื่อช่างได้',
      icon: 'error',
      background: '#fee2e2',
      color: '#dc2626'
    })
  }
}


// ดึง user id ของช่างคนปัจจุบัน
const me = technicians.value.find(t => t.us_id === tokenData.value?.us_id)

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
            <input type="checkbox" value="low" v-model="selectedUrgencies" class="w-4 h-4 text-blue-600" />
            <span class="ml-2">ไม่เร่งด่วน</span>
          </label>
          <label class="flex items-center py-1">
            <input type="checkbox" value="medium" v-model="selectedUrgencies" class="w-4 h-4 text-blue-600" />
            <span class="ml-2">เร่งด่วน</span>
          </label>
          <label class="flex items-center py-1">
            <input type="checkbox" value="high" v-model="selectedUrgencies" class="w-4 h-4 text-blue-600" />
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
            <input type="checkbox" value="pending" v-model="selectedStatuses" class="w-4 h-4 text-blue-600" />
            <span class="ml-2">รอดำเนินการ</span>
          </label>
          <label class="flex items-center py-1">
            <input type="checkbox" value="in_progress" v-model="selectedStatuses" class="w-4 h-4 text-blue-600" />
            <span class="ml-2">กำลังดำเนินการ</span>
          </label>
          <label class="flex items-center py-1">
            <input type="checkbox" value="done" v-model="selectedStatuses" class="w-4 h-4 text-blue-600" />
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
      :columns="['วันที่', 'หมายเลขใบแจ้งซ่อม', 'สถานที่', 'ความเร่งด่วน', 'สถานะงาน', 'การจัดการ']"
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
  <!-- ===========================
     📌 Popup รับงานแบบ Custom
     =========================== -->
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
