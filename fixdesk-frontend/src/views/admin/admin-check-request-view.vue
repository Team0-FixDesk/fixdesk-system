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

    // แปลง object → array (ไม่ใส่หมายเลขครุภัณฑ์)
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

      return [
        new Date(r.rf_create_at).toLocaleDateString('th-TH'), // วันที่
        r.rf_code, // ใบแจ้งซ่อม
        `${r.us_first_name} ${r.us_last_name}`, // ชื่อผู้แจ้ง
        r.department_name || '-', // แสดงหน่วยงาน
        r.tt_name || '-', // ประเภทงาน
        urgencyBadge, // ความเร่งด่วน
        statusBadge, // สถานะงาน
        'actions', // การดำเนินการ
      ]
    })
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
    Swal.fire('เกิดข้อผิดพลาด', err.message, 'error')
  }
}

// FILTER
const filteredRows = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return rows.value.filter((r) => {
    const matchSearch =
      r[1].toLowerCase().includes(q) ||
      r[2].toLowerCase().includes(q) ||
      r[3].toLowerCase().includes(q)

    const urgencyKey = ['low', 'medium', 'high'].find((k) => r[4].includes(k))
    const statusKey = ['pending', 'in_progress', 'done'].find((k) => r[5].includes(k))

    const matchUrgency =
      selectedUrgencies.value.length === 0 || selectedUrgencies.value.includes(urgencyKey)
    const matchStatus =
      selectedStatuses.value.length === 0 || selectedStatuses.value.includes(statusKey)
    const matchDate =
      !selectedDate.value ||
      new Date(r[0]).toLocaleDateString('th-TH') ===
        new Date(selectedDate.value).toLocaleDateString('th-TH')

    return matchSearch && matchUrgency && matchStatus && matchDate
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
        class="h-10 px-3 rounded-lg border border-gray-300 bg-white text-gray-700"
      />
      <!-- สถานะ -->
      <div class="relative">
        <button
          @click.stop="showStatusFilter = !showStatusFilter"
          class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700"
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
          class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10"
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
          class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700"
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
          class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10"
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
          class="text-blue-600 hover:text-blue-700 text-sm font-medium"
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
    class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 relative">
      <h2 class="text-xl font-semibold mb-4 text-blue-700">มอบหมายงานให้ผู้รับผิดชอบหลัก</h2>
      <!-- ปุ่มปิด -->
      <button
        @click="closeAssignPopup"
        class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-lg"
      >
        ✕
      </button>

      <!-- ประเภทช่าง -->
      <select
        v-model="selectedType"
        class="border border-gray-300 rounded-md px-3 py-2 w-full mb-3 focus:ring-2 focus:ring-blue-400 focus:outline-none"
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
        class="border border-gray-300 rounded-md px-3 py-2 w-full mb-4 focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />
      <!-- รายชื่อช่าง -->
      <div class="max-h-60 overflow-y-auto space-y-2">
        <div
          v-for="tech in filteredTechnicians"
          :key="tech.us_id"
          class="flex justify-between items-start p-3 border rounded-lg hover:bg-gray-50 transition cursor-pointer"
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
            class="w-5 h-5 accent-blue-600 cursor-pointer mt-2"
          />
        </div>

        <p v-if="filteredTechnicians.length === 0" class="text-center text-gray-500 py-4">
          — ไม่พบช่าง —
        </p>
      </div>

      <!-- ปุ่มล่าง -->
      <div class="flex justify-end gap-3 mt-6">
        <button
          @click="closeAssignPopup"
          class="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-medium transition"
        >
          ยกเลิก
        </button>
        <button
          @click="confirmAssign"
          :disabled="!selectedTechnician || loadingAssign"
          class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition disabled:opacity-50"
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
