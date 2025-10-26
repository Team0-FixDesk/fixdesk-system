<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import SuccessAlert from '@/components/alert/success-alert.vue'
import ConfirmAlert from '@/components/alert/confirm-alert.vue'
import ErrorAlert from '@/components/alert/error-alert.vue'

/* ===============================
 * ⚙️ CONFIG
 * =============================== */
const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

/* ===============================
 * 💾 STATE
 * =============================== */
const rows = ref([])
const searchQuery = ref('')
const selectedTechTypes = ref([])
const selectedStatuses = ref([])
const selectedUrgencies = ref([])
const sortAsc = ref(false)
const showStatusFilter = ref(false)
const showTechTypeFilter = ref(false)
const showUrgencyFilter = ref(false)
const currentPage = ref(1)
const perPage = 10

// 🎯 Tech Type Management Modal
const showManageTechTypeModal = ref(false)
const showAddForm = ref(false)
const isEditingTechType = ref(false)
const currentTechType = ref({ tt_id: null, tt_name: '' })
const showConfirmAlert = ref(false)
const showConfirmDeleteAlert = ref(false)
const showSuccessAlert = ref(false)
const showErrorAlert = ref(false)
const errorMessage = ref('')
const pendingTechTypeAction = ref(null)
const techTypeToDelete = ref(null)

/* ===============================
 * 🧩 Popup มอบหมายงาน
 * =============================== */
const showAssignPopup = ref(false)
const showSuccess = ref(false)
const technicians = ref([])
const technicianTypes = ref([])
const selectedType = ref('')
const searchTech = ref('')
const selectedTechnician = ref(null)
const selectedRepairId = ref(null)
const loadingAssign = ref(false)

/* ===============================
 * 🔧 POPUP ACTIONS
 * =============================== */
function openAssignPopup(repairId) {
  selectedRepairId.value = repairId
  showAssignPopup.value = true
  fetchTechnicians()
}
function closeAssignPopup() {
  showAssignPopup.value = false
  selectedTechnician.value = null
  selectedType.value = ''
  searchTech.value = ''
}

/* ===============================
 * 📥 FETCH TECHNICIANS
 * =============================== */
async function fetchTechnicians() {
  try {
    // Fetch technicians with auth
    const res = await fetch(`${API_BASE}/technicians`, {
      headers: getAuthHeaders()
    })

    if (res.status === 401) {
      alert('กรุณาเข้าสู่ระบบใหม่')
      localStorage.removeItem('token')
      router.push('/login')
      return
    }

    const data = await res.json()
    technicians.value = data

    // Fetch technician types
    const typesRes = await fetch(`${API_BASE}/technician-types`)
    const typesData = await typesRes.json()
    technicianTypes.value = typesData
  } catch (err) {
    console.error('❌ โหลดข้อมูลช่างไม่สำเร็จ:', err)
    errorMessage.value = 'ไม่สามารถโหลดข้อมูลช่างได้'
    showErrorAlert.value = true
  }
}

/* ===============================
 * 🔍 FILTER TECHNICIANS
 * =============================== */
const filteredTechnicians = computed(() =>
  technicians.value.filter((t) => {
    const matchType = !selectedType.value || t.tt_name === selectedType.value
    const matchSearch =
      !searchTech.value ||
      `${t.us_first_name} ${t.us_last_name}`.toLowerCase().includes(searchTech.value.toLowerCase())
    return matchType && matchSearch
  })
)

/* ===============================
 * ✅ CONFIRM ASSIGN
 * =============================== */
async function confirmAssign() {
  loadingAssign.value = true
  try {
    const res = await fetch(`${API_BASE}/assign-repair`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        rf_id: selectedRepairId.value,
        technician_id: selectedTechnician.value,
      }),
    })

    if (res.status === 401) {
      alert('กรุณาเข้าสู่ระบบใหม่')
      localStorage.removeItem('token')
      router.push('/login')
      return
    }

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.message || 'มอบหมายงานไม่สำเร็จ')
    }

    closeAssignPopup()
    await fetchAllRepairs()
    showSuccess.value = true
  } catch (err) {
    errorMessage.value = err.message || 'มอบหมายงานล้มเหลว'
    showErrorAlert.value = true
    console.error(err)
  } finally {
    loadingAssign.value = false
  }
}

/* ===============================
 * 📋 FETCH REPAIR LIST
 * =============================== */
async function fetchAllRepairs() {
  try {
    const res = await fetch(`${API_BASE}/admin/repairs`, {
      headers: getAuthHeaders()
    })

    if (res.status === 401) {
      alert('กรุณาเข้าสู่ระบบใหม่')
      localStorage.removeItem('token')
      router.push('/login')
      return
    }

    if (!res.ok) throw new Error('Failed to fetch repairs')

    rows.value = await res.json()
    console.log('📋 Fetched repairs:', rows.value)
    console.log('🔥 First row urgency:', rows.value[0]?.rf_urgency)
  } catch (err) {
    console.error('❌ Error fetching repairs:', err)
    errorMessage.value = 'ไม่สามารถโหลดรายการแจ้งซ่อมได้'
    showErrorAlert.value = true
  }
}

/* ===============================
 * 🔍 SEARCH + PAGINATION
 * =============================== */
const filteredRows = computed(() => {
  const q = searchQuery.value.toLowerCase()
  let result = rows.value.filter((r) => {
    const matchSearch =
      r.rf_code.toLowerCase().includes(q) ||
      r.us_first_name.toLowerCase().includes(q) ||
      r.us_last_name.toLowerCase().includes(q)

    const matchType = selectedTechTypes.value.length === 0 ||
                     selectedTechTypes.value.includes(r.tt_name)

    const matchStatus = selectedStatuses.value.length === 0 ||
                       selectedStatuses.value.includes(r.rf_user_status)

    const matchUrgency = selectedUrgencies.value.length === 0 ||
                        selectedUrgencies.value.includes(r.rf_urgency)

    return matchSearch && matchType && matchStatus && matchUrgency
  })

  // Sort by date
  return result.sort((a, b) => {
    const dateA = new Date(a.rf_create_at)
    const dateB = new Date(b.rf_create_at)
    return sortAsc.value ? dateA - dateB : dateB - dateA
  })
})

function toggleDateSort() {
  sortAsc.value = !sortAsc.value
}

function clearFilters() {
  selectedTechTypes.value = []
  selectedStatuses.value = []
  selectedUrgencies.value = []
  searchQuery.value = ''
}

// Close filter dropdowns when clicking outside
function closeFilterDropdown(event) {
  const target = event.target
  if (!target.closest('.relative')) {
    showStatusFilter.value = false
    showTechTypeFilter.value = false
    showUrgencyFilter.value = false
  }
}

/* ===============================
 * 🔧 TECH TYPE MANAGEMENT
 * =============================== */
function openManageTechTypeModal() {
  showManageTechTypeModal.value = true
  showTechTypeFilter.value = false
}

function closeManageTechTypeModal() {
  showManageTechTypeModal.value = false
  resetTechTypeForm()
}

function openAddTechTypeForm() {
  showAddForm.value = true
  isEditingTechType.value = false
  currentTechType.value = { tt_id: null, tt_name: '' }
}

function openEditTechTypeForm(techType) {
  showAddForm.value = false
  isEditingTechType.value = true
  currentTechType.value = { tt_id: techType.tt_id, tt_name: techType.tt_name }
}

function resetTechTypeForm() {
  currentTechType.value = { tt_id: null, tt_name: '' }
  isEditingTechType.value = false
  showAddForm.value = false
}

function confirmSaveTechType() {
  if (!currentTechType.value.tt_name.trim()) {
    errorMessage.value = 'กรุณากรอกชื่อประเภทงาน'
    showErrorAlert.value = true
    return
  }

  // ตรวจสอบชื่อซ้ำ
  const trimmedName = currentTechType.value.tt_name.trim()
  const isDuplicate = technicianTypes.value.some(type =>
    type.tt_name.toLowerCase() === trimmedName.toLowerCase() &&
    type.tt_id !== currentTechType.value.tt_id
  )

  if (isDuplicate) {
    errorMessage.value = 'ชื่อประเภทงานนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น'
    showErrorAlert.value = true
    return
  }

  pendingTechTypeAction.value = isEditingTechType.value ? 'edit' : 'add'
  showConfirmAlert.value = true
}

async function handleConfirmSave() {
  showConfirmAlert.value = false

  try {
    if (pendingTechTypeAction.value === 'add') {
      await addTechType()
    } else if (pendingTechTypeAction.value === 'edit') {
      await updateTechType()
    }

    await fetchTechnicians()
    showSuccessAlert.value = true
    resetTechTypeForm()
  } catch (error) {
    console.error('Error saving tech type:', error)
    errorMessage.value = error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    showErrorAlert.value = true
  }
}

async function addTechType() {
  const response = await fetch(`${API_BASE}/technician-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tt_name: currentTechType.value.tt_name.trim() })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'เกิดข้อผิดพลาดในการเพิ่มประเภทงาน')
  }
}

async function updateTechType() {
  const response = await fetch(`${API_BASE}/technician-types/${currentTechType.value.tt_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tt_name: currentTechType.value.tt_name.trim() })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'เกิดข้อผิดพลาดในการแก้ไขประเภทงาน')
  }
}

function confirmDeleteTechType(techType) {
  techTypeToDelete.value = techType
  showConfirmDeleteAlert.value = true
}

async function handleConfirmDelete() {
  showConfirmDeleteAlert.value = false

  try {
    const response = await fetch(`${API_BASE}/technician-types/${techTypeToDelete.value.tt_id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'เกิดข้อผิดพลาดในการลบข้อมูล')
    }

    await fetchTechnicians()
    showSuccessAlert.value = true
    techTypeToDelete.value = null
  } catch (error) {
    console.error('Error deleting tech type:', error)
    errorMessage.value = error.message || 'เกิดข้อผิดพลาดในการลบข้อมูล อาจมีช่างที่ใช้ประเภทงานนี้อยู่'
    showErrorAlert.value = true
  }
}

const totalEntries = computed(() => filteredRows.value.length)
const totalPages = computed(() => Math.ceil(filteredRows.value.length / perPage))
const startEntry = computed(() =>
  totalEntries.value === 0 ? 0 : (currentPage.value - 1) * perPage + 1,
)
const endEntry = computed(() => Math.min(currentPage.value * perPage, totalEntries.value))
const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filteredRows.value.slice(start, start + perPage)
})
function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}
function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}
function goToDetail(id) {
  console.log('🔍 Navigating to detail with ID:', id)
  router.push(`/main/repair-detail/${id}`)
}

/* ===============================
 * 🎨 STATUS BADGE
 * =============================== */
function statusBadge(status) {
  const base =
    'inline-flex justify-center items-center min-w-[130px] h-[34px] text-sm font-medium px-3 py-1 rounded-lg'
  const map = {
    pending: `<span class="${base} bg-amber-100 text-amber-700">รอดำเนินการ</span>`,
    in_progress: `<span class="${base} bg-blue-100 text-blue-700">กำลังดำเนินการ</span>`,
    done: `<span class="${base} bg-green-100 text-green-700">เสร็จสิ้น</span>`,
  }
  return map[status] || '-'
}

function urgencyBadge(urgency) {
  const base =
    'inline-flex justify-center items-center min-w-[100px] h-[34px] text-sm font-medium px-3 py-1 rounded-lg'
  const map = {
    low: `<span class="${base} bg-green-100 text-green-700">ไม่เร่งด่วน</span>`,
    medium: `<span class="${base} bg-yellow-100 text-yellow-700">เร่งด่วน</span>`,
    high: `<span class="${base} bg-red-100 text-red-700">เร่งด่วนมาก</span>`,
  }
  return map[urgency] || `<span class="${base} bg-gray-100 text-gray-700">ไม่ระบุ</span>`
}

/* ===============================
 * 🚀 LIFECYCLE
 * =============================== */
onMounted(async () => {
  await fetchAllRepairs()
  await fetchTechnicians()
  document.addEventListener('click', closeFilterDropdown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeFilterDropdown)
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-6xl">
    <!-- 🔹 หัวข้อ -->
    <h1 class="text-xl font-bold text-blue-700 mb-6">รายการแจ้งซ่อมทั้งหมด</h1>

    <!-- 🔍 แถบค้นหา -->
    <div class="flex items-center gap-3 mb-6">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="ค้นหาใบแจ้งซ่อม..."
        class="border border-gray-300 rounded-lg px-3 py-2 w-64 focus:ring-2 focus:ring-blue-400 focus:outline-none"
      />

      <!-- � ปุ่มเรียงวันที่ -->
      <button
        @click="toggleDateSort"
        class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white hover:bg-gray-50 text-sm text-gray-700 font-medium"
      >
        วันที่
        <img
          v-if="sortAsc"
          src="/icon/sidebar/chevron-up-icon.svg"
          class="w-4 h-4 opacity-70"
          alt="up"
        />
        <img
          v-else
          src="/icon/sidebar/chevron-down-icon.svg"
          class="w-4 h-4 opacity-70"
          alt="down"
        />
      </button>

      <!-- 🎯 ฟิลเตอร์สถานะ -->
      <div class="relative">
        <button
          @click="showStatusFilter = !showStatusFilter"
          class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white hover:bg-gray-50 text-sm text-gray-700 font-medium"
        >
          สถานะ
          <span v-if="selectedStatuses.length > 0" class="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">
            {{ selectedStatuses.length }}
          </span>
          <img
            v-if="!showStatusFilter"
            src="/icon/sidebar/chevron-down-icon.svg"
            class="w-4 h-4 opacity-70"
            alt="down"
          />
          <img
            v-else
            src="/icon/sidebar/chevron-up-icon.svg"
            class="w-4 h-4 opacity-70"
            alt="up"
          />
        </button>

        <div
          v-if="showStatusFilter"
          class="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 space-y-1 z-10"
          @click.stop
        >
          <label class="flex items-center py-2 hover:bg-gray-50 rounded cursor-pointer">
            <input type="checkbox" value="pending" v-model="selectedStatuses" class="w-4 h-4 text-blue-500 border-gray-300 rounded" />
            <span class="ml-2">รอดำเนินการ</span>
          </label>
          <label class="flex items-center py-2 hover:bg-gray-50 rounded cursor-pointer">
            <input type="checkbox" value="in_progress" v-model="selectedStatuses" class="w-4 h-4 text-blue-500 border-gray-300 rounded" />
            <span class="ml-2">กำลังดำเนินการ</span>
          </label>
          <label class="flex items-center py-2 hover:bg-gray-50 rounded cursor-pointer">
            <input type="checkbox" value="done" v-model="selectedStatuses" class="w-4 h-4 text-blue-500 border-gray-300 rounded" />
            <span class="ml-2">เสร็จสิ้น</span>
          </label>
        </div>
      </div>

      <!-- 🔧 ฟิลเตอร์ประเภทงาน -->
      <div class="relative">
        <button
          @click="showTechTypeFilter = !showTechTypeFilter"
          class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white hover:bg-gray-50 text-sm text-gray-700 font-medium"
        >
          ประเภทงาน
          <span v-if="selectedTechTypes.length > 0" class="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">
            {{ selectedTechTypes.length }}
          </span>
          <img
            v-if="!showTechTypeFilter"
            src="/icon/sidebar/chevron-down-icon.svg"
            class="w-4 h-4"
            alt="down"
          />
          <img
            v-else
            src="/icon/sidebar/chevron-up-icon.svg"
            class="w-4 h-4"
            alt="up"
          />
        </button>

        <div
          v-if="showTechTypeFilter"
          class="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 space-y-1 z-10"
          @click.stop
        >
          <label
            v-for="type in technicianTypes"
            :key="type.tt_id"
            class="flex items-center py-2 hover:bg-gray-50 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              :value="type.tt_name"
              v-model="selectedTechTypes"
              class="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span class="ml-2">{{ type.tt_name }}</span>
          </label>

          <!-- ปุ่มจัดการประเภทงาน -->
          <div class="border-t border-gray-200 mt-2 pt-2">
            <button
              @click="openManageTechTypeModal"
              class="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded font-medium flex items-center justify-center gap-1"
            >
              <span>⚙️</span>
              <span>จัดการประเภทงาน</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 🔥 ฟิลเตอร์ความเร่งด่วน -->
      <div class="relative">
        <button
          @click="showUrgencyFilter = !showUrgencyFilter"
          class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white hover:bg-gray-50 text-sm text-gray-700 font-medium"
        >
          ความเร่งด่วน
          <span v-if="selectedUrgencies.length > 0" class="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">
            {{ selectedUrgencies.length }}
          </span>
          <img
            v-if="!showUrgencyFilter"
            src="/icon/sidebar/chevron-down-icon.svg"
            class="w-4 h-4 opacity-70"
            alt="down"
          />
          <img
            v-else
            src="/icon/sidebar/chevron-up-icon.svg"
            class="w-4 h-4 opacity-70"
            alt="up"
          />
        </button>

        <div
          v-if="showUrgencyFilter"
          class="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 space-y-1 z-10"
          @click.stop
        >
          <label class="flex items-center py-2 hover:bg-gray-50 rounded cursor-pointer">
            <input type="checkbox" value="low" v-model="selectedUrgencies" class="w-4 h-4 text-blue-500 border-gray-300 rounded" />
            <span class="ml-2">ไม่เร่งด่วน</span>
          </label>
          <label class="flex items-center py-2 hover:bg-gray-50 rounded cursor-pointer">
            <input type="checkbox" value="medium" v-model="selectedUrgencies" class="w-4 h-4 text-blue-500 border-gray-300 rounded" />
            <span class="ml-2">เร่งด่วน</span>
          </label>
          <label class="flex items-center py-2 hover:bg-gray-50 rounded cursor-pointer">
            <input type="checkbox" value="high" v-model="selectedUrgencies" class="w-4 h-4 text-blue-500 border-gray-300 rounded" />
            <span class="ml-2">เร่งด่วนมาก</span>
          </label>
        </div>
      </div>

      <!-- ล้างตัวกรอง -->
      <button
        v-if="selectedStatuses.length > 0 || selectedTechTypes.length > 0 || selectedUrgencies.length > 0"
        @click="clearFilters"
        class="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        ล้างตัวกรอง
      </button>
    </div>

    <!-- 🧾 ตาราง -->
    <div class="overflow-x-auto border border-gray-200 rounded-lg">
      <table class="w-full text-sm text-left text-gray-700 border-collapse">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-6 py-3 text-center font-semibold">วันที่</th>
            <th class="px-6 py-3 text-center font-semibold">ใบแจ้งซ่อม</th>
            <th class="px-6 py-3 text-center font-semibold">ชื่อผู้แจ้ง</th>
            <th class="px-6 py-3 text-center font-semibold">ประเภท</th>
            <th class="px-6 py-3 text-center font-semibold">ความเร่งด่วน</th>
            <th class="px-6 py-3 text-center font-semibold">สถานะ</th>
            <th class="px-6 py-3 text-center font-semibold">ตัวจัดการ</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="row in paginatedRows"
            :key="row.rf_id"
            class="bg-white border-b hover:bg-blue-50 transition"
          >
            <td class="text-center px-6 py-3">
              {{ new Date(row.rf_create_at).toLocaleDateString('th-TH') }}
            </td>
            <td class="text-center px-6 py-3">{{ row.rf_code }}</td>
            <td class="text-center px-6 py-3">
              {{ row.us_first_name }} {{ row.us_last_name }}
            </td>
            <td class="text-center px-6 py-3">{{ row.tt_name || '-' }}</td>
            <td class="text-center px-6 py-3" v-html="urgencyBadge(row.rf_urgency)"></td>
            <td class="text-center px-6 py-3" v-html="statusBadge(row.rf_user_status)"></td>

            <td class="text-center px-6 py-3">
              <div class="flex justify-center gap-3">
                <!-- 🔍 ดูรายละเอียด -->
                <button
                  @click="goToDetail(row.rf_id)"
                  class="flex items-center justify-center w-9 h-8 bg-blue-500 hover:bg-blue-700 text-white rounded-lg transition"
                  title="ดูรายละเอียด"
                >
                  <img src="/icon/info-icon.svg" class="w-5 h-5" />
                </button>

                <!-- 🧑‍🔧 มอบหมายงาน -->
                <button
                  v-if="row.rf_user_status === 'pending'"
                  @click="openAssignPopup(row.rf_id)"
                  class="flex items-center justify-center w-9 h-8 text-white rounded-lg transition"
                  style="background-color: #29A744;"
                  title="มอบหมายงาน"
                >
                  <img src="/icon/arrow-right.svg" class="w-5 h-5" />
                </button>
              </div>
            </td>
          </tr>

          <!-- ไม่มีข้อมูล -->
          <tr v-if="paginatedRows.length === 0">
            <td colspan="7" class="text-center py-6 text-gray-500">— ไม่มีรายการแจ้งซ่อม —</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 📄 Pagination -->
    <div class="flex items-center justify-between mt-4">
      <div class="text-sm text-gray-500">
        แสดง {{ startEntry }}–{{ endEntry }} จากทั้งหมด {{ totalEntries }} รายการ
      </div>

      <div v-if="totalPages > 1" class="flex items-center gap-2">
        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          class="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ‹
        </button>

        <span class="text-gray-700 text-sm">หน้า {{ currentPage }} / {{ totalPages }}</span>

        <button
          @click="nextPage"
          :disabled="currentPage === totalPages"
          class="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>
    </div>

    <!-- 🧑‍🔧 Popup มอบหมายงาน -->
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

        <!-- 🔧 ประเภทช่าง -->
        <select
          v-model="selectedType"
          class="border border-gray-300 rounded-md px-3 py-2 w-full mb-3 focus:ring-2 focus:ring-blue-400 focus:outline-none"
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
          class="border border-gray-300 rounded-md px-3 py-2 w-full mb-4 focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />

        <!-- รายชื่อช่าง -->
        <div class="max-h-60 overflow-y-auto space-y-2">
          <div
            v-for="tech in filteredTechnicians"
            :key="tech.us_id"
            class="flex items-center justify-between px-3 py-2 border rounded-md hover:bg-gray-50 transition"
          >
            <div>
              <p class="font-medium text-gray-800">
                {{ tech.us_first_name }} {{ tech.us_last_name }}
              </p>
              <p class="text-sm text-gray-500">{{ tech.tt_name || 'ไม่ระบุประเภท' }}</p>
            </div>
            <input
              type="radio"
              name="selectedTech"
              :value="tech.us_id"
              v-model.number="selectedTechnician"
              class="w-5 h-5 accent-blue-600 cursor-pointer"
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

    <!-- 🔧 Modal จัดการประเภทงาน -->
    <div
      v-if="showManageTechTypeModal"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50"
      @click="closeManageTechTypeModal"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-[700px] max-h-[85vh] overflow-hidden flex flex-col"
        @click.stop
      >
        <!-- Header -->
        <div class="bg-blue-600 text-white px-6 py-4 flex justify-between items-center flex-shrink-0">
          <h2 class="text-xl font-bold">จัดการประเภทงานช่าง</h2>
          <button
            @click="closeManageTechTypeModal"
            class="text-white hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 flex-shrink-0">
          <!-- ปุ่มเพิ่มประเภทงาน -->
          <button
            v-if="!showAddForm && !isEditingTechType"
            @click="openAddTechTypeForm"
            class="w-full mb-4 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition"
          >
            <span class="text-xl">+</span>
            <span>เพิ่มประเภทงาน</span>
          </button>

          <!-- ฟอร์มเพิ่มประเภทงาน (สีเขียว) -->
          <div
            v-if="showAddForm && !isEditingTechType"
            class="mb-4 p-4 bg-green-50 rounded-lg border-2 border-green-200"
          >
            <h3 class="text-lg font-semibold mb-3 text-green-700 flex items-center gap-2">
              <span class="text-xl">+</span>
              <span>เพิ่มประเภทงานใหม่</span>
            </h3>
            <input
              v-model="currentTechType.tt_name"
              type="text"
              placeholder="ชื่อประเภทงานช่าง"
              class="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none mb-3"
              @keyup.enter="confirmSaveTechType"
            />
            <div class="flex gap-2">
              <button
                @click="resetTechTypeForm"
                class="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition"
              >
                ยกเลิก
              </button>
              <button
                @click="confirmSaveTechType"
                class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
              >
                เพิ่มประเภทงาน
              </button>
            </div>
          </div>

          <!-- ฟอร์มแก้ไขประเภทงาน (สีเหลือง) -->
          <div
            v-if="isEditingTechType"
            class="mb-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-400"
          >
            <h3 class="text-lg font-semibold mb-3 text-yellow-700 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>แก้ไขประเภทงาน</span>
            </h3>
            <input
              v-model="currentTechType.tt_name"
              type="text"
              placeholder="ชื่อประเภทงานช่าง"
              class="w-full px-4 py-2 border border-yellow-400 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none mb-3"
              @keyup.enter="confirmSaveTechType"
            />
            <div class="flex gap-2">
              <button
                @click="resetTechTypeForm"
                class="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition"
              >
                ยกเลิก
              </button>
              <button
                @click="confirmSaveTechType"
                class="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>

          <!-- หัวข้อรายการ -->
          <div class="mb-3">
            <h4 class="text-md font-semibold text-gray-700 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>รายการประเภทงานทั้งหมด</span>
              <span class="text-sm text-gray-500">({{ technicianTypes.length }} รายการ)</span>
            </h4>
          </div>
        </div>

        <!-- รายการประเภทงาน (Scrollable) -->
        <div class="flex-1 overflow-y-auto px-6 pb-6">
          <div class="space-y-2">
            <div
              v-for="type in technicianTypes"
              :key="type.tt_id"
              :class="[
                'flex items-center justify-between p-4 rounded-lg transition',
                isEditingTechType && currentTechType.tt_id === type.tt_id
                  ? 'bg-yellow-100 border-2 border-yellow-400'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              ]"
            >
              <span class="text-gray-800 font-medium">{{ type.tt_name }}</span>
              <div class="flex gap-2">
                <!-- ปุ่มแก้ไข -->
                <button
                  @click="openEditTechTypeForm(type)"
                  :class="[
                    'p-2 rounded-lg transition',
                    isEditingTechType && currentTechType.tt_id === type.tt_id
                      ? 'text-yellow-700 bg-yellow-200'
                      : 'text-yellow-600 hover:bg-yellow-100'
                  ]"
                  title="แก้ไข"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <!-- ปุ่มลบ -->
                <button
                  @click="confirmDeleteTechType(type)"
                  class="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                  title="ลบ"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- แสดงเมื่อไม่มีข้อมูล -->
            <div v-if="technicianTypes.length === 0" class="text-center py-8 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p>ยังไม่มีประเภทงานในระบบ</p>
              <p class="text-sm">เพิ่มประเภทงานใหม่ได้จากด้านบน</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Alert ยืนยันการบันทึก -->
    <ConfirmAlert
      :visible="showConfirmAlert"
      title="ยืนยันการบันทึก"
      :message="isEditingTechType ? 'คุณต้องการแก้ไขประเภทงานนี้หรือไม่?' : 'คุณต้องการเพิ่มประเภทงานใหม่หรือไม่?'"
      @confirm="handleConfirmSave"
      @cancel="showConfirmAlert = false"
    />

    <!-- Alert ยืนยันการลบ -->
    <ConfirmAlert
      :visible="showConfirmDeleteAlert"
      title="ยืนยันการลบ"
      message="คุณต้องการลบประเภทงานนี้หรือไม่? การลบจะไม่สามารถย้อนกลับได้"
      @confirm="handleConfirmDelete"
      @cancel="showConfirmDeleteAlert = false"
    />

    <!-- Alert แสดงข้อผิดพลาด -->
    <ErrorAlert
      :visible="showErrorAlert"
      :message="errorMessage"
      @close="showErrorAlert = false"
    />

    <!-- Alert สำเร็จ -->
    <SuccessAlert :visible="showSuccessAlert" @close="showSuccessAlert = false" />

    <!-- ✅ Popup สำเร็จ (มอบหมายงาน) -->
    <SuccessAlert :visible="showSuccess" @close="showSuccess = false" />
  </div>
</template>




