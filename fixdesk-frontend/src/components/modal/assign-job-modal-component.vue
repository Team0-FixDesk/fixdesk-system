/**
 * =====================================================================
 * @file            assign-job-modal-component.vue
 * @module          มอดูลจัดการงานซ่อม - มอบหมายงานให้ช่าง
 * @layer           Component (Presentation Layer)
 * @version         1.0.1
 * @since           2025-10-21
 * @author          เศรษฐพงศ์ หอมชื่น
 * @lastModified    2026-02-27
 * @lastModifiedBy  เศรษฐพงศ์ หอมชื่น
 * ---------------------------------------------------------------------
 * @description
 *  Component สำหรับเลือกช่างและมอบหมายงานซ่อม
 *  รองรับฟีเจอร์:
 *    - แสดงรายการช่างว่าง
 *    - เลือกช่างเพื่อมอบหมายงาน
 *    - แสดงประเภทช่างและความพร้อม
 * =====================================================================
 */
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import Swal from 'sweetalert2'
import { Icon } from '@iconify/vue'

const props = defineProps({
  repairId: { type: [String, Number], required: true },
})

// ส่ง Event กลับไปหาแม่
const emit = defineEmits(['close', 'completed'])

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
      text: 'ไม่สามารถโหลดรายชื่อช่างได้',
      icon: 'error',
      background: '#FFFFFF',
      color: '#dc2626',
    })
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
  }),
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
  console.log('🔵 [Assign Modal] confirmAssign called')
  console.log('🔵 [Assign Modal] repairId:', props.repairId)
  console.log('🔵 [Assign Modal] selectedTechnician:', selectedTechnician.value)

  if (!selectedTechnician.value) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    })
    Toast.fire({
      title: 'กรุณาเลือกช่างผู้รับผิดชอบ',
      icon: 'warning',
      background: '#FFFFFF',
      color: '#d97706',
    })
    return
  }

  loadingAssign.value = true
  try {
    // ดึง user id จาก token
    let assignedBy = null
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (token) {
      try {
        const decoded = (await import('jwt-decode')).default(token)
        assignedBy = decoded.us_id || decoded.id
      } catch (err) {
        assignedBy = null
      }
    }

    const res = await fetch(`${API_BASE}/assign-repair`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        rf_code: props.repairId,
        technician_id: selectedTechnician.value,
        is_lead: true, // มอบหมายเป็นผู้รับผิดชอบหลัก
        ra_assigned_by: assignedBy, // ส่ง id ผู้มอบหมายไปด้วย
      }),
    })

    const resBody = await res.json()
    console.log('🟢 [Assign Modal] API Response:', { ok: res.ok, status: res.status, body: resBody })

    // เช็คกรณี "มอบหมายแล้ว" แม้ว่า res.ok = true
    const msg = resBody.message || ''
    if (msg.includes('มอบหมายแล้ว') || msg.includes('ถูกมอบหมายแล้ว')) {
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        animation: false,
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
      })
      Toast.fire({
        title: 'แจ้งเตือน',
        text: msg,
        icon: 'info',
        background: '#FFFFFF',
        color: '#0277bd',
      })
      console.log('🟡 [Assign Modal] Already assigned - emitting completed & close')
      emit('completed')
      emit('close')
      return
    }

    if (!res.ok) {
      throw new Error(msg || 'มอบหมายงานไม่สำเร็จ')
    }

    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      animation: false,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
      },
    })
    Toast.fire({
      title: 'มอบหมายงานเรียบร้อยแล้ว',
      icon: 'success',
      background: '#FFFFFF',
      color: '#1e3a8a',
    })
    console.log('✅ [Assign Modal] Success - emitting completed & close')
    emit('completed')
    emit('close')
  } catch (err) {
    console.error('❌ [Assign Modal] Error:', err)
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
      text: err.message,
      icon: 'error',
      background: '#FFFFFF',
      color: '#dc2626',
    })
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
          class="px-5 py-2 font-medium text-white transition bg-neutral-300 rounded-md hover:bg-neutral-400"
        >
          ยกเลิก
        </button>
        <button
          @click="confirmAssign"
          :disabled="!selectedTechnician || loadingAssign"
          class="px-5 py-2 font-medium text-white transition bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50"
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
