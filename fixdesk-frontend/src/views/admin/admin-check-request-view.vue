<script setup>
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
  'ใบแจ้งซ่อม',
  'ชื่อผู้แจ้ง',
  'ประเภท',
  'หน่วยงาน',
  'ความเร่งด่วน',
  'สถานะงาน',
  'การดำเนินการ',
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

    const res = await fetch(`${API_BASE}/admin/repairs`, { headers: getAuthHeaders() })
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
          low: `<span class="inline-flex items-center justify-center h-8 font-medium text-green-600 bg-green-100 rounded-full w-28">ไม่เร่งด่วน</span>`,
          medium: `<span class="inline-flex items-center justify-center h-8 font-medium text-yellow-600 bg-yellow-100 rounded-full w-28">เร่งด่วน</span>`,
          high: `<span class="inline-flex items-center justify-center h-8 font-medium text-red-600 bg-red-100 rounded-full w-28">เร่งด่วนมาก</span>`,
        }[r.rf_urgency] || '-'

      const statusBadge =
        {
          pending: `<span class="inline-flex items-center justify-center h-8 font-medium rounded-full w-28 bg-amber-100 text-amber-700">รอดำเนินการ</span>`,
          in_progress: `<span class="inline-flex items-center justify-center h-8 font-medium text-blue-700 bg-blue-100 rounded-full w-28">กำลังดำเนินการ</span>`,
          done: `<span class="inline-flex items-center justify-center h-8 font-medium text-green-700 bg-green-100 rounded-full w-28">เสร็จสิ้น</span>`,
        }[r.rf_user_status] || '-'

      const createdAt = new Date(r.rf_create_at)

      return {
        // raw
        date: createdAt,
        code: r.rf_code,
        requester: `${r.us_first_name} ${r.us_last_name}`,
        department: r.department_name || '-',
        type: r.tt_name || '-',
        urgencyKey: r.rf_urgency,      // 'low' | 'medium' | 'high'
        statusKey: r.rf_user_status,   // 'pending' | 'in_progress' | 'done'

        // for display
        dateDisplay: createdAt.toLocaleDateString('th-TH'),
        urgencyBadge,
        statusBadge,
      }
    })
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
    Swal.fire('เกิดข้อผิดพลาด', err.message, 'error')
  }
}

// FILTER
const filteredRows = computed(() => {
  const q = searchQuery.value.toLowerCase()
  const selectedDateObj = selectedDate.value ? new Date(selectedDate.value) : null

  return rows.value
    .filter((r) => {
      // ค้นหาตาม code / ผู้แจ้ง / ประเภท
      const matchSearch =
        r.code.toLowerCase().includes(q) ||
        r.requester.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)

      // ความเร่งด่วน
      const matchUrgency =
        selectedUrgencies.value.length === 0 ||
        selectedUrgencies.value.includes(r.urgencyKey)

      // สถานะ
      const matchStatus =
        selectedStatuses.value.length === 0 ||
        selectedStatuses.value.includes(r.statusKey)

      // วันที่ (เทียบแบบตัดเวลาออก เหลือแค่วัน)
      const matchDate =
        !selectedDateObj ||
        r.date.toDateString() === selectedDateObj.toDateString()

      return matchSearch && matchUrgency && matchStatus && matchDate
    })
    .map((r) => [
      r.dateDisplay,     // วันที่
      r.code,            // ใบแจ้งซ่อม
      r.requester,       // ชื่อผู้แจ้ง
      r.type,            // ประเภท
      r.department,      // หน่วยงาน
      r.urgencyBadge,    // ความเร่งด่วน
      r.statusBadge,     // สถานะงาน
      'actions',         // การดำเนินการ
    ])
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

// ACTION BUTTONS
const goToDetail = (code) => router.push(`/main/repair-detail/${code}`)

async function handleAssign(code) {
  const result = await Swal.fire({
    title: 'มอบหมายงาน',
    text: `ต้องการมอบหมายใบแจ้งซ่อม ${code} หรือไม่?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
  })
  if (result.isConfirmed) {
    Swal.fire('สำเร็จ', 'มอบหมายงานเรียบร้อยแล้ว', 'success')
  }
}

//🧩 Popup มอบหมายงาน
const showAssignPopup = ref(false)
const technicians = ref([])
const technicianTypes = ref([])
const selectedType = ref('')
const searchTech = ref('')
const selectedTechnician = ref(null)
const selectedRepairId = ref(null)
const loadingAssign = ref(false)

/* เปิด popup */
function openAssignPopup(repairId) {
  selectedRepairId.value = repairId
  showAssignPopup.value = true
  fetchTechnicians()
}

/* ปิด popup */
function closeAssignPopup() {
  showAssignPopup.value = false
  selectedTechnician.value = null
  selectedType.value = ''
  searchTech.value = ''
}

/* ดึงข้อมูลช่างทั้งหมด */
async function fetchTechnicians() {
  try {
    const res = await fetch(`${API_BASE}/technicians`, { headers: getAuthHeaders() })
    const typesRes = await fetch(`${API_BASE}/technician-types`)
    technicians.value = await res.json()
    technicianTypes.value = await typesRes.json()
  } catch (err) {
    console.error('❌ โหลดข้อมูลช่างไม่สำเร็จ:', err)
    Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดรายชื่อช่างได้', 'error')
  }
}

/* กรองรายชื่อช่างตามประเภทและคำค้น */
const filteredTechnicians = computed(() =>
  technicians.value.filter((t) => {
    const matchType = !selectedType.value || t.tt_name === selectedType.value
    const matchSearch =
      !searchTech.value ||
      `${t.us_first_name} ${t.us_last_name}`.toLowerCase().includes(searchTech.value.toLowerCase())
    return matchType && matchSearch
  }),
)

/* ยืนยันมอบหมาย */
async function confirmAssign() {
  if (!selectedTechnician.value) {
    Swal.fire('กรุณาเลือกช่าง', '', 'warning')
    return
  }
  loadingAssign.value = true
  try {
    const res = await fetch(`${API_BASE}/assign-repair`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        rf_code: selectedRepairId.value,
        technician_id: selectedTechnician.value,
      }),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.message || 'มอบหมายงานไม่สำเร็จ')
    }

    await fetchAllRepairs()
    Swal.fire('สำเร็จ', 'มอบหมายงานเรียบร้อยแล้ว', 'success')
    closeAssignPopup()
  } catch (err) {
    Swal.fire('เกิดข้อผิดพลาด', err.message, 'error')
  } finally {
    loadingAssign.value = false
  }
}

onMounted(() => {
  fetchAllRepairs()
  document.addEventListener('click', closeDropdown)
})
onBeforeUnmount(() => document.removeEventListener('click', closeDropdown))
</script>

<template>
  <!-- ตาราง -->
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-back mb-6">ตรวจสอบคำร้องแจ้งซ่อมทั้งหมด</h1>
     <!-- ฟิลเตอร์ -->
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="ค้นหาใบแจ้งซ่อม / ผู้แจ้ง / ประเภท"
        class="w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
      />
      <input
        v-model="selectedDate"
        type="date"
        class="h-10 px-3 text-gray-700 bg-white border border-gray-300 rounded-lg"
      />
      <!-- สถานะ -->
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
      <!-- ความเร่งด่วน -->
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
    <TableComponent
      :columns="columns"
      :rows="filteredRows"
      :perPage="10"
      mode="assign"
      @detail="goToDetail"
      @assign="openAssignPopup"
    />
  </div>
  <!-- Popup มอบหมายงาน -->
  <div
    v-if="showAssignPopup"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
  >
    <div class="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 relative">
      <h2 class="text-xl font-semibold mb-4 text-blue-700">มอบหมายงานให้ผู้รับผิดชอบหลัก</h2>
      <!-- ปุ่มปิด -->
      <button
        @click="closeAssignPopup"
        class="absolute text-lg text-gray-500 top-4 right-4 hover:text-gray-700"
      >
        ✕
      </button>

      <!-- ประเภทช่าง -->
      <select
        v-model="selectedType"
        class="w-full px-3 py-2 mb-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
      >
        <option value="">ประเภทช่างทั้งหมด</option>
        <option v-for="type in technicianTypes" :key="type.tt_id" :value="type.tt_name">
          {{ type.tt_name }}
        </option>
      </select>
      <!-- ช่องค้นหา -->
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
