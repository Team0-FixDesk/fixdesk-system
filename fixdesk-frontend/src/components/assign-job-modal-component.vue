<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import Swal from 'sweetalert2'

const props = defineProps({
  repairId: { type: [String, Number], required: true }
})

// ส่ง Event กลับไปหาแม่
const emit = defineEmits(['close', 'success'])

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// Variables
const technicians = ref([])
const technicianTypes = ref([])
const selectedType = ref('')
const searchTech = ref('')
const selectedTechnician = ref(null)
const loadingAssign = ref(false)
const showAssignTypeFilter = ref(false)

// Fetch Data
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

// Computed Filter
const filteredTechnicians = computed(() =>
  technicians.value.filter((t) => {
    const matchType = !selectedType.value || t.tt_name === selectedType.value
    const matchSearch =
      !searchTech.value ||
      `${t.us_first_name} ${t.us_last_name}`.toLowerCase().includes(searchTech.value.toLowerCase())
    return matchType && matchSearch
  })
)

// Methods
function toggleAssignTypeFilter() {
  showAssignTypeFilter.value = !showAssignTypeFilter.value
}

function selectAssignType(typeName) {
  selectedType.value = typeName
  showAssignTypeFilter.value = false
}

function closeDropdown(e) {
  if (!e.target.closest('.relative')) {
    showAssignTypeFilter.value = false
  }
}

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
        rf_code: props.repairId,
        technician_id: selectedTechnician.value,
      }),
    })

    const resBody = await res.json()

    if (!res.ok) {
      const msg = resBody.message || 'มอบหมายงานไม่สำเร็จ'
      // ถ้า Backend บอกว่ามอบหมายไปแล้ว ให้ถือว่า Success แบบมีเตือน
      if (msg.includes('มอบหมายแล้ว') || msg.includes('ถูกมอบหมายแล้ว')) {
        Swal.fire('แจ้งเตือน', msg, 'info')
        emit('success') // แจ้งแม่ว่าให้รีโหลดข้อมูล
        emit('close')
        return
      }
      throw new Error(msg)
    }

    Swal.fire('สำเร็จ', 'มอบหมายงานเรียบร้อยแล้ว', 'success')
    emit('success') // แจ้งแม่ว่าสำเร็จ
    emit('close')   // ปิด Modal

  } catch (err) {
    Swal.fire('เกิดข้อผิดพลาด', err.message, 'error')
  } finally {
    loadingAssign.value = false
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
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
    <div class="bg-white rounded-lg shadow-lg w-full max-w-xl p-8 relative">
      <h2 class="text-lg sm:text-xl font-bold text-black mb-6">มอบหมายงานให้ผู้รับผิดชอบหลัก</h2>
      <button
        @click="$emit('close')"
        class="absolute text-lg text-gray-500 top-4 right-4 hover:text-gray-700"
      >
        ✕
      </button>

      <div class="flex flex-col sm:flex-row gap-3 mb-4">
        <div class="relative w-full sm:w-1/2">
          <button
            @click.stop="toggleAssignTypeFilter"
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

        <div class="w-full sm:w-1/2">
          <input
            v-model="searchTech"
            type="text"
            placeholder="ค้นหา"
            class="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none h-10"
          />
        </div>
      </div>

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
          @click="$emit('close')"
          class="px-5 py-2 font-medium text-gray-700 transition bg-gray-200 rounded-md hover:bg-gray-300"
        >
          ยกเลิก
        </button>
        <button
          @click="confirmAssign"
          :disabled="!selectedTechnician || loadingAssign"
          class="px-5 py-2 font-medium text-white transition bg-[#1E48D1] rounded-md hover:bg-blue-900 disabled:opacity-50"
        >
          {{ loadingAssign ? 'กำลังมอบหมาย...' : 'ยืนยัน' }}
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
