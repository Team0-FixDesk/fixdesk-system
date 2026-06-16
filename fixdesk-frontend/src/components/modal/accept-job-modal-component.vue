<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import Swal from 'sweetalert2'
import { Icon } from '@iconify/vue'

const props = defineProps({
  repairCode: {
    type: String,
    required: true,
  },
  currentUserId: {
    type: [Number, String],
    default: null,
  },
})

const emit = defineEmits(['close', 'success'])

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// State
const acceptMode = ref('alone') // 'alone' | 'team'
const technicians = ref([])
const technicianTypes = ref([])
const selectedTeam = ref([])
const selectedType = ref('')
const searchTech = ref('')
const showAssignTypeFilter = ref(false)

// Computed
const filteredTechnicians = computed(() =>
  technicians.value.filter((t) => {
    // ซ่อนตัวเอง (เพราะตัวเองถูก auto-select ใน logic แล้ว)
    if (props.currentUserId && t.us_id === props.currentUserId) return false

    const matchType = !selectedType.value || t.tt_name === selectedType.value
    const matchSearch =
      !searchTech.value ||
      `${t.us_first_name} ${t.us_last_name}`.toLowerCase().includes(searchTech.value.toLowerCase())

    return matchType && matchSearch
  }),
)

// Methods
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

function closeDropdown(e) {
  if (!e.target.closest('.relative')) {
    showAssignTypeFilter.value = false
  }
}

async function fetchTechnicians() {
  try {
    const res = await fetch(`${API_BASE}/technicians`, { headers: getAuthHeaders() })
    const typesRes = await fetch(`${API_BASE}/technician-types`)

    const techs = await res.json()
    technicianTypes.value = await typesRes.json()

    // เก็บรายการช่างทั้งหมด
    technicians.value = techs

    // Auto-select ตัวเองในโหมดทีม
    if (props.currentUserId) {
      // ตรวจสอบว่าตัวเองอยู่ในลิสต์ไหม
      const me = techs.find((t) => t.us_id === props.currentUserId)
      if (me) {
        selectedTeam.value = [me.us_id]
      }
    }
  } catch (err) {
    console.error('❌ โหลดข้อมูลช่างไม่สำเร็จ:', err)
    // Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดรายชื่อช่างได้', 'error')
  }
}

async function checkAssignmentCount(rf_code) {
  try {
    const res = await fetch(
      `${API_BASE}/repair-assignment/count?rf_code=${encodeURIComponent(rf_code)}`,
      { headers: getAuthHeaders() },
    )
    if (!res.ok) return null
    const payload = await res.json()
    return Number(payload.count || 0)
  } catch (err) {
    console.warn('checkAssignmentCount error:', err)
    return null
  }
}

async function setLeadForAssignment(rf_code) {
  try {
    const res1 = await fetch(`${API_BASE}/repair-assignment/set-lead`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rf_code }),
    })
    if (res1.ok) return true
  } catch (err) {}

  try {
    const res2 = await fetch(
      `${API_BASE}/technician/accept-job/${encodeURIComponent(rf_code)}?set_lead=1`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ set_lead: true }),
      },
    )
    if (res2.ok) return true
  } catch (err) {}

  try {
    const res3 = await fetch(`${API_BASE}/assign-repair-team`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        rf_code,
        technician_ids: [],
        mode: 'solo',
      }),
    })
    if (res3.ok) return true
  } catch (err) {}

  return false
}

async function confirmAccept() {
  const code = props.repairCode
  if (!code) return

  // โหมดทำงานคนเดียว
  if (acceptMode.value === 'alone') {
    try {
      const res = await fetch(`${API_BASE}/technician/accept-job/${encodeURIComponent(code)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          animation: false,
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        })
        Toast.fire({
          title: 'เกิดข้อผิดพลาด',
          text: payload.message || 'ไม่สามารถรับงานได้',
          icon: 'error',
          background: '#FFFFFF',
          color: '#dc2626',
        })
        return
      }

      const count = await checkAssignmentCount(code)
      if (count === 1) {
        await setLeadForAssignment(code)
      } else if (count === null) {
        await setLeadForAssignment(code)
      }

      emit('success')
      emit('close')
    } catch (err) {
      console.error('Error accepting job (alone):', err)
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        animation: false,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      Toast.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ขณะรับงาน',
        icon: 'error',
        background: '#FFFFFF',
        color: '#dc2626',
      })
    }
    return
  }

  // โหมดทำงานเป็นทีม
  if (acceptMode.value === 'team') {
    if (!selectedTeam.value || selectedTeam.value.length === 0) {
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        animation: false,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      })
      Toast.fire({
        title: 'โปรดเลือกช่างอย่างน้อย 1 คน',
        icon: 'warning',
        background: '#FFFFFF',
        color: '#d97706',
      })
      return
    }

    try {
      const res = await fetch(`${API_BASE}/assign-repair-team`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          rf_code: code,
          technician_ids: selectedTeam.value,
          mode: 'merge',
        }),
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          animation: false,
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        })
        Toast.fire({
          title: 'เกิดข้อผิดพลาด',
          text: payload.message || 'มอบหมายทีมไม่สำเร็จ',
          icon: 'error',
          background: '#FFFFFF',
          color: '#dc2626',
        })
        return
      }

      const res2 = await fetch(`${API_BASE}/technician/accept-job/${encodeURIComponent(code)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      })

      if (!res2.ok) {
        const p2 = await res2.json().catch(() => ({}))
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          animation: false,
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        })
        Toast.fire({
          title: 'เกิดข้อผิดพลาด',
          text: p2.message || 'รับงานหลังมอบหมายทีมไม่สำเร็จ',
          icon: 'error',
          background: '#FFFFFF',
          color: '#dc2626',
        })
        return
      }

      emit('success')
      emit('close')
    } catch (err) {
      console.error('Error accepting job (team):', err)
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        animation: false,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      Toast.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ขณะมอบหมายทีม/รับงาน',
        icon: 'error',
        background: '#FFFFFF',
        color: '#dc2626',
      })
    }
  }
}

// Lifecycle
onMounted(() => {
  fetchTechnicians()
  document.addEventListener('click', closeDropdown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-40">
    <div class="bg-white rounded-t-2xl sm:rounded-lg shadow-lg w-full sm:max-w-xl p-6 sm:p-8 relative max-h-[90dvh] flex flex-col">
      <h2 class="text-lg sm:text-xl font-bold text-black mb-6">รับงาน / มอบหมายทีม</h2>

      <button
        @click="$emit('close')"
        class="absolute text-lg text-gray-500 top-4 right-4 hover:text-gray-700"
      >
        ✕
      </button>

      <div class="mb-4 flex gap-6">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" value="alone" v-model="acceptMode" class="w-4 h-4 text-blue-600 border-gray-300 cursor-pointer" />
          ทำงานคนเดียว
        </label>

        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" value="team" v-model="acceptMode" class="w-4 h-4 text-blue-600 border-gray-300 cursor-pointer" />
          ทำงานเป็นทีม
        </label>
      </div>

      <div v-if="acceptMode === 'team'" class="flex flex-col min-h-0 flex-1">
        <div class="flex flex-col sm:flex-row gap-3 mb-4">
          <div class="relative w-full sm:w-1/2">
            <button
              @click.stop="showAssignTypeFilter = !showAssignTypeFilter"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none flex justify-between items-center bg-white text-gray-700 h-10"
            >
              <span class="truncate">{{ selectedType || 'ประเภทช่างทั้งหมด' }}</span>
              <Icon
                icon="meteor-icons:chevron-down"
                style="color: gray"
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

          <div class="w-full sm:w-1/2">
            <input
              v-model="searchTech"
              type="text"
              placeholder="ค้นหา"
              class="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none h-10"
            />
          </div>
        </div>

        <div class="space-y-2 overflow-y-auto flex-1 min-h-0 max-h-60 sm:max-h-72">
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
              class="w-4 h-4 mt-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <p v-if="filteredTechnicians.length === 0" class="py-4 text-center text-gray-500">
            — ไม่พบช่าง —
          </p>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button
          @click="$emit('close')"
          class="flex-1 sm:flex-none px-5 py-2 font-medium text-white transition bg-neutral-300 rounded-md hover:bg-neutral-400"
        >
          ยกเลิก
        </button>
        <button
          @click="confirmAccept"
          class="flex-1 sm:flex-none px-5 py-2 font-medium text-white transition bg-blue-700 rounded-md hover:bg-blue-800"
        >
          ยืนยัน
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* สไตล์สำหรับ Scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}
</style>
