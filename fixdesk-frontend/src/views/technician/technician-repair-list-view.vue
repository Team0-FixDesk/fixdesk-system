<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import TableComponent from '@/components/table-component.vue'
import repairButtonComponent from '@/components/repair-button-component.vue'
import Swal from 'sweetalert2'

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const technicians = ref([])

/* Helper สำหรับแนบ Token */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// เก็บข้อมูลดิบจาก backend (array of objects)
const rowsData = ref([]) // <-- data จาก API จะเก็บที่นี่

/* สร้าง rawRows และ rowsForTable เป็น computed จาก rowsData */
const rawRows = computed(() =>
  rowsData.value.map((r) => ({
    rf_code: r.rf_code,
    code: r.rf_code, // รองรับหลายชื่อตัวแปร
    rf_user_status: r.rf_user_status,
    rf_urgency: r.rf_urgency,
    assigned: !!r.ra_id,
    ra_id: r.ra_id || null,
    ra_is_lead: r.ra_is_lead || 0,
    ra_assigned_at: r.ra_assigned_at || null,
    ra_accepted_at: r.ra_accepted_at || null,
  })),
)

/* ===== แทนที่บล็อก rowsForTable เดิมด้วยอันนี้ ===== */
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

    // สำคัญ: กำหนดช่องสุดท้ายเป็น 'actions' เสมอ
    return [
      dateStr,                 // 0 วันที่
      r.rf_code || '-',        // 1 หมายเลขใบแจ้งซ่อม (code)
      placeText,               // 2 สถานที่
      urgencyBadge,            // 3 ความเร่งด่วน (html)
      statusBadge,             // 4 สถานะ (html)
      'actions',               // 5 การจัดการ -> TableComponent จะอ่าน rawRows เพื่อตัดสินการแสดงปุ่ม
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

/* ป๊อปอัพมอบหมายงาน */
const showAssignPopup = ref(false)
const technicianTypes = ref([])
const selectedType = ref('')
const searchTech = ref('')
const selectedTechnician = ref(null)
const loadingAssign = ref(false)

/* ===============================
 * 📦 ดึงข้อมูลรายการแจ้งซ่อมทั้งหมด (Technician)
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
    // เก็บผลดิบไว้ที่ rowsData (raw objects)
    rowsData.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('❌ โหลดข้อมูลไม่สำเร็จ:', err)
    Swal.fire('เกิดข้อผิดพลาด', err.message || 'โหลดข้อมูลไม่สำเร็จ', 'error')
  }
}

/* ===============================
 * 🔍 FILTER (ใช้ rowsForTable ในการเรนเดอร์ แต่ถ้าต้องการ filter ด้านหน้าให้ปรับได้)
 * =============================== */
const filteredRows = computed(() => {
  const q = (searchQuery.value || '').toLowerCase()
  const selUrg = selectedUrgencies.value || []
  const selSta = selectedStatuses.value || []

  return rowsData.value
    .filter((r) => {
      // search by code / place / type / requester (ปรับตามฟิลด์ที่ต้องการ)
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
      // แปลงเป็น row ที่ TableComponent คาด (เหมือน rowsForTable)
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

/* ปิด dropdown เมื่อคลิกนอกรอบ */
function closeDropdown(e) {
  if (!e.target.closest('.relative')) {
    showStatusFilter.value = false
    showUrgencyFilter.value = false
  }
}

/* ===============================
 * 🧭 ACTION BUTTONS (จาก TableComponent emits)
 * =============================== */
const goToDetail = (code) => router.push(`/main/repair-detail/${code}`)

async function handleAccept(code) {
  try {
    // ดึงรายชื่อช่างมาก่อน (สำหรับกรณีเลือกเป็นทีม)
    await fetchTechnicians()

    // สร้าง html ของ sweetalert: radiobox + รายชื่อช่าง (checkboxes ปิดไว้เริ่มต้น)
    const techListHtml =
      technicians.value
        .map(
          (t) =>
            `<label class="swal2-checkbox" style="display:block; margin:6px 0;">
             <input type="checkbox" class="team-checkbox" value="${t.us_id}" />
             &nbsp;${t.prefix_name || ''}${t.us_first_name || ''} ${t.us_last_name || ''} ${t.tt_name ? ' — ' + t.tt_name : ''}
           </label>`,
        )
        .join('') || '<div style="color:#888">ไม่พบรายชื่อช่าง</div>'

    const { value: result } = await Swal.fire({
      title: 'รับงาน',
      html: `<div style="text-align:left">
           <label style="display:block; margin-bottom:8px;">
             <input type="radio" name="accept_mode" value="alone" checked/> &nbsp;<strong>ทำงานคนเดียว</strong>
           </label>
           <label style="display:block; margin-bottom:8px;">
             <input type="radio" name="accept_mode" value="team" /> &nbsp;<strong>ทำงานเป็นทีม</strong>
           </label>

           <div id="team-list" style="margin-top:10px; display:none; max-height:220px; overflow:auto; padding:6px; border-radius:6px; border:1px solid #eee;">
             ${techListHtml}
           </div>
         </div>`,
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      preConfirm: () => {
        // อ่านค่าจาก DOM: mode + checked techs (ถ้า team)
        const selectedMode = document.querySelector('input[name="accept_mode"]:checked')?.value
        if (!selectedMode) {
          Swal.showValidationMessage('โปรดเลือกโหมดการทำงาน')
          return false
        }
        if (selectedMode === 'team') {
          const checked = Array.from(document.querySelectorAll('.team-checkbox:checked')).map(
            (el) => Number(el.value),
          )
          if (checked.length === 0) {
            Swal.showValidationMessage('โปรดเลือกช่างอย่างน้อย 1 คนสำหรับทีม')
            return false
          }
          return { mode: 'team', techs: checked }
        }
        return { mode: 'alone' }
      },
      didOpen: () => {
        // เมื่อเปิด ให้เพิ่ม listener เปลี่ยนสถานะ show/hide ทีม
        const radios = document.querySelectorAll('input[name="accept_mode"]')
        const teamList = document.getElementById('team-list')
        radios.forEach((r) =>
          r.addEventListener('change', () => {
            if (r.value === 'team' && r.checked) teamList.style.display = 'block'
            if (r.value === 'alone' && r.checked) teamList.style.display = 'none'
          }),
        )
      },
    })

    if (!result) return // user ยกเลิก

    // ถ้าเลือกทำคนเดียว -> เรียก API รับงาน (backend จะเช็คว่าเป็นช่างที่มอบหมายหรือไม่)
    if (result.mode === 'alone') {
      // เรียก endpoint รับงาน (เหมือนเดิม)
      const res = await fetch(`${API_BASE}/technician/accept-job/${encodeURIComponent(code)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.message || `ไม่สามารถรับงานได้ (status ${res.status})`)
      Swal.fire('สำเร็จ', payload.message || 'มอบหมายและรับงานเรียบร้อย', 'success')
      await fetchAllRepairs()
      return
    }

    // ถ้าเลือกเป็นทีม -> พยายามเรียก endpoint สำหรับมอบหมายเป็นทีม
    // --- แทนที่บล็อก team ใน handleAccept ด้วยนี้ ---
    if (result.mode === 'team') {
      const technicianIds = result.techs // array of ids
      try {
        // 1) เรียก /assign-repair-team (ใช้ mode 'merge' เพื่อไม่ล้างคนเก่า)
        const teamRes = await fetch(`${API_BASE}/assign-repair-team`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ rf_code: code, technician_ids: technicianIds, mode: 'merge' }),
        })

        // อ่าน response body เสมอ (รองรับ text / json / html)
        const rawText = await teamRes.text().catch(() => '')
        let teamPayload = {}
        try {
          teamPayload = rawText ? JSON.parse(rawText) : {}
        } catch (e) {
          teamPayload = { message: rawText }
        }

        if (teamRes.ok) {
          Swal.fire('สำเร็จ', teamPayload.message || 'มอบหมายทีมเรียบร้อย', 'success')
          await fetchAllRepairs()
          return
        }

        // ถ้าไม่ ok -> แสดงข้อความจาก backend (ถ้ามี) และ log รายละเอียด
        console.warn('assign-repair-team failed:', teamRes.status, teamPayload)
        const serverMsg = teamPayload.message || `มอบหมายทีมล้มเหลว (HTTP ${teamRes.status})`

        // ถ้าต้องการ fallback แบบเงียบ ๆ ให้ใช้โค้ดด้านล่าง (แต่แนะนำให้ดูข้อผิดพลาดจาก server ก่อน)
        // FALLBACK: พยายามมอบหมายหัวหน้าคนแรกแทน (assign-repair) — แต่ให้แสดงข้อความ server ก่อน
        // ถ้า fallback จะทำ ให้ parse payload ของ fallback และ handle error/ok
        const doFallback = true // เปลี่ยนเป็น false ถ้าไม่ต้องการ fallback อัตโนมัติ
        if (!doFallback) {
          Swal.fire('ไม่สำเร็จ', serverMsg, 'error')
          return
        }

        // --- fallback: assign single (หัวหน้า) ---
        const firstTech = technicianIds[0]
        const fallbackRes = await fetch(`${API_BASE}/assign-repair`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ rf_code: code, technician_id: firstTech }),
        })
        const fbText = await fallbackRes.text().catch(() => '')
        let fbPayload = {}
        try {
          fbPayload = fbText ? JSON.parse(fbText) : {}
        } catch {
          fbPayload = { message: fbText }
        }

        if (fallbackRes.ok) {
          Swal.fire(
            'สำเร็จ (บางส่วน)',
            `มอบหมายหัวหน้าทีมเรียบร้อย — แต่การมอบหมายเป็นทีมเต็มรูปแบบล้มเหลว: ${teamPayload.message || ''}`,
            'success',
          )
          await fetchAllRepairs()
          return
        } else {
          // ทั้ง assign-repair-team และ fallback ล้มเหลว -> แสดง error รวมทั้งข้อความที่ได้จาก backend
          const combinedMsg = `${serverMsg}${fbPayload.message ? '\nFallback: ' + fbPayload.message : ''}`
          console.error('assign team failed + fallback failed', {
            teamStatus: teamRes.status,
            teamPayload,
            fallbackStatus: fallbackRes.status,
            fbPayload,
          })
          Swal.fire('มอบหมายไม่สำเร็จ', combinedMsg, 'error')
          return
        }
      } catch (err) {
        console.error('Error assigning team (exception):', err)
        Swal.fire('เกิดข้อผิดพลาด', err.message || 'มอบหมายทีมไม่สำเร็จ', 'error')
        return
      }
    }
  } catch (err) {
    console.error('Error in accept flow:', err)
    Swal.fire('ไม่สำเร็จ', err.message || 'เกิดข้อผิดพลาด', 'error')
  }
}

/* มอบหมาย / fetchTechnicians / confirmAssign / handleChangeStatus .... */
async function fetchTechnicians() {
  try {
    const res = await fetch(`${API_BASE}/technicians`, { headers: getAuthHeaders() })
    if (!res.ok) throw new Error('ไม่สามารถโหลดรายชื่อช่างได้')
    technicians.value = await res.json()
  } catch (err) {
    console.error('โหลดช่างไม่สำเร็จ:', err)
    technicians.value = []
  }
}
/* คุณสามารถคัดเอาฟังก์ชันที่เหลือจากของเดิมมาใส่ได้ (ผมเว้นไว้เพื่อความกระชับ) */

onMounted(() => {
  fetchAllRepairs()
  document.addEventListener('click', closeDropdown)
})
onBeforeUnmount(() => document.removeEventListener('click', closeDropdown))
</script>

<template>
  <!-- 🧾 ตาราง + ฟิลเตอร์ อยู่ในการ์ดเดียวกัน -->
  <div class="p-8 mx-auto bg-white shadow-md rounded-xl max-w-7xl">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-bold text-back">รายงานการแจ้งซ่อม</h1>

      <repairButtonComponent />
    </div>

    <!-- 🔍 ฟิลเตอร์ (ย้ายจากด้านบน มาอยู่ใต้หัวข้อ) -->
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

      <!-- 🔸 ความเร่งด่วน -->
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

      <!-- 🔸 สถานะ -->
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

      <!-- ปุ่มล้าง -->
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

    <!-- 🧾 ตาราง -->
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

  <!-- 🧑‍🔧 Popup มอบหมายงาน -->
  <div
    v-if="showAssignPopup"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
  >
    <div class="relative w-full max-w-lg p-6 bg-white shadow-lg rounded-xl">
      <h2 class="mb-4 text-xl font-semibold text-blue-700">มอบหมายงานให้ผู้รับผิดชอบหลัก</h2>

      <!-- ปุ่มปิด -->
      <button
        @click="closeAssignPopup"
        class="absolute text-lg text-gray-500 top-4 right-4 hover:text-gray-700"
      >
        ✕
      </button>

      <!-- 🔧 ประเภทช่าง -->
      <select
        v-model="selectedType"
        class="w-full px-3 py-2 mb-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
      >
        <option value="">ประเภทช่างทั้งหมด</option>
        <option v-for="type in technicianTypes" :key="type.tt_id" :value="type.tt_name">
          {{ type.tt_name }}
        </option>
      </select>

      <!-- 🔍 ช่องค้นหา -->
      <input
        v-model="searchTech"
        type="text"
        placeholder="ค้นหาช่าง..."
        class="w-full px-3 py-2 mb-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />

      <!-- รายชื่อช่าง -->
      <div class="space-y-2 overflow-y-auto max-h-60">
        <div
          v-for="tech in filteredTechnicians"
          :key="tech.us_id"
          class="flex items-start justify-between p-3 transition border rounded-lg cursor-pointer hover:bg-gray-50"
          @click="selectedTechnician = tech.us_id"
        >
          <div class="flex flex-col text-sm">
            <p class="font-medium text-gray-800">
              {{ tech.prefix_name || '' }}{{ tech.us_first_name }} {{ tech.us_last_name }}
            </p>
            <p class="text-gray-600">ประเภท: {{ tech.tt_name || '-' }}</p>
            <p class="text-gray-600">โทร: {{ tech.us_phone || '-' }}</p>
            <p class="text-gray-600">หน่วยงาน: {{ tech.us_department || '-' }}</p>
          </div>
          <input
            type="radio"
            name="selectedTech"
            :value="tech.us_id"
            v-model.number="selectedTechnician"
            class="w-5 h-5 mt-2 cursor-pointer accent-blue-600"
          />
        </div>

        <p v-if="filteredTechnicians.length === 0" class="py-4 text-center text-gray-500">
          — ไม่พบช่าง —
        </p>
      </div>

      <!-- ปุ่มล่าง -->
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
