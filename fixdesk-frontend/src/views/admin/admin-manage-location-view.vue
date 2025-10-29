<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

defineOptions({ name: 'AdminManageLocationView' })

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
const buildings = ref([])
const floors = ref([])
const rooms = ref([])
const searchQuery = ref('')
const selectedBuilding = ref('')
const selectedFloor = ref('')
const currentPage = ref(1)
const perPage = 10
const sortOrder = ref('ก-ฮ') // 'ก-ฮ', 'ฮ-ก'

/* ===============================
 * 📥 FETCH DATA
 * =============================== */
async function fetchBuildings() {
  try {
    const res = await fetch(`${API_BASE}/buildings`)
    const data = await res.json()
    buildings.value = data
  } catch (err) {
    console.error('❌ Error fetching buildings:', err)
  }
}

async function fetchFloors(buildingId) {
  try {
    const res = await fetch(`${API_BASE}/floors/${buildingId}`)
    const data = await res.json()
    floors.value = data
  } catch (err) {
    console.error('❌ Error fetching floors:', err)
  }
}

async function fetchRooms(floorId) {
  try {
    const res = await fetch(`${API_BASE}/rooms/${floorId}`)
    const data = await res.json()
    rooms.value = data
  } catch (err) {
    console.error('❌ Error fetching rooms:', err)
  }
}

/* ===============================
 * 🔍 COMPUTED DATA
 * =============================== */
const displayData = computed(() => {
  let data = []

  // ขั้นที่ 1: ถ้าไม่เลือกอาคาร แสดงอาคารทั้งหมด
  if (!selectedBuilding.value) {
    data = buildings.value.map(b => ({
      name: b.building_name,
      building: b.building_name,
      floor: '-',
      room: '-',
      id: b.building_id,
      type: 'building'
    }))
  }
  // ขั้นที่ 2: ถ้าเลือกอาคารแล้ว แต่ยังไม่เลือกชั้น แสดงชั้นทั้งหมดของอาคารนั้น
  else if (selectedBuilding.value && !selectedFloor.value) {
    const buildingName = buildings.value.find(b => b.building_id == selectedBuilding.value)?.building_name || '-'
    data = floors.value.map(f => ({
      name: f.floor_name,
      building: buildingName,
      floor: f.floor_name,
      room: '-',
      id: f.floor_id,
      type: 'floor'
    }))
  }
  // ขั้นที่ 3: ถ้าเลือกอาคารและชั้นแล้ว แสดงห้องทั้งหมดของชั้นนั้น
  else if (selectedBuilding.value && selectedFloor.value) {
    const buildingName = buildings.value.find(b => b.building_id == selectedBuilding.value)?.building_name || '-'
    const floorName = floors.value.find(f => f.floor_id == selectedFloor.value)?.floor_name || '-'
    data = rooms.value.map(r => ({
      name: r.room_name,
      building: buildingName,
      floor: floorName,
      room: r.room_name,
      id: r.room_id,
      type: 'room'
    }))
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    data = data.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.building.toLowerCase().includes(query) ||
      item.floor.toLowerCase().includes(query) ||
      item.room.toLowerCase().includes(query)
    )
  }

  // Sort
  if (sortOrder.value === 'ก-ฮ') {
    data.sort((a, b) => a.name.localeCompare(b.name, 'th'))
  } else {
    data.sort((a, b) => b.name.localeCompare(a.name, 'th'))
  }

  return data
})

const totalEntries = computed(() => displayData.value.length)
const totalPages = computed(() => Math.ceil(displayData.value.length / perPage))
const startEntry = computed(() =>
  totalEntries.value === 0 ? 0 : (currentPage.value - 1) * perPage + 1
)
const endEntry = computed(() => Math.min(currentPage.value * perPage, totalEntries.value))
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return displayData.value.slice(start, start + perPage)
})

/* ===============================
 * 🎯 ACTIONS
 * =============================== */
async function handleBuildingChange() {
  if (selectedBuilding.value) {
    await fetchFloors(selectedBuilding.value)
  } else {
    floors.value = []
  }
  selectedFloor.value = ''
  rooms.value = []
  currentPage.value = 1
}

async function handleFloorChange() {
  if (selectedFloor.value) {
    await fetchRooms(selectedFloor.value)
  } else {
    rooms.value = []
  }
  currentPage.value = 1
}

function handleClearFilters() {
  selectedBuilding.value = ''
  selectedFloor.value = ''
  floors.value = []
  rooms.value = []
  searchQuery.value = ''
  currentPage.value = 1
}

function handleEdit(item) {
  console.log('Edit:', item)
  // TODO: Implement edit functionality
  alert(`แก้ไข: ${item.name}`)
}

function handleDelete(item) {
  console.log('Delete:', item)
  // TODO: Implement delete functionality
  if (confirm(`ต้องการลบ "${item.name}" หรือไม่?`)) {
    alert('ฟังก์ชันลบยังไม่ได้ทำ')
  }
}

function handleAdd() {
  console.log('Add new location')
  // TODO: Implement add functionality
  alert('ฟังก์ชันเพิ่มสถานที่ยังไม่ได้ทำ')
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

/* ===============================
 * 🚀 LIFECYCLE
 * =============================== */
onMounted(async () => {
  await fetchBuildings()
})
</script>

<template>
  <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-6xl">
    <!-- 🔹 หัวข้อ -->
    <h1 class="text-xl font-bold text-blue-700 mb-2">สถานที่ทั้งหมด</h1>
    <p class="text-sm text-gray-600 mb-6">
      ค้นหาตรองและเรียงลำดับรายการอาคาร ชั้น ห้อง
    </p>

    <!-- 🔍 แถบค้นหาและตัวกรอง -->
    <div class="flex items-center gap-3 mb-6">
      <!-- ช่องค้นหา -->
      <div class="relative flex-1 max-w-xs">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหา"
          class="w-full border border-gray-300 rounded-lg px-4 py-2 pr-12 focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
        <button class="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-blue-600 hover:bg-blue-700 rounded px-3 py-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      <!-- Dropdown เรียงลำดับ -->
      <select
        v-model="sortOrder"
        class="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm"
      >
        <option value="ก-ฮ">เรียงตามอักษร ก-ฮ</option>
        <option value="ฮ-ก">เรียงตามอักษร ฮ-ก</option>
      </select>

      <!-- Dropdown เลือกอาคาร -->
      <select
        v-model="selectedBuilding"
        @change="handleBuildingChange"
        class="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm min-w-[150px]"
      >
        <option value="">🏢 ทุกอาคาร</option>
        <option v-for="building in buildings" :key="building.building_id" :value="building.building_id">
          {{ building.building_name }}
        </option>
      </select>

      <!-- Dropdown เลือกชั้น (แสดงเมื่อเลือกอาคารแล้ว) -->
      <select
        v-if="selectedBuilding"
        v-model="selectedFloor"
        @change="handleFloorChange"
        class="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm min-w-[150px]"
      >
        <option value="">🏗️ ทุกชั้น</option>
        <option v-for="floor in floors" :key="floor.floor_id" :value="floor.floor_id">
          {{ floor.floor_name }}
        </option>
      </select>

      <!-- ปุ่มล้างตัวกรอง -->
      <button
        v-if="selectedBuilding || searchQuery"
        @click="handleClearFilters"
        class="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
      >
        ล้างตัวกรอง
      </button>

      <!-- ปุ่มเพิ่มสถานที่ -->
      <button
        @click="handleAdd"
        class="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm whitespace-nowrap"
      >
        <span class="text-xl leading-none">+</span>
        <span>เพิ่มสถานที่</span>
      </button>
    </div>

    <!-- 🧾 ตาราง -->
    <div class="overflow-x-auto border border-gray-200 rounded-lg">
      <table class="w-full text-sm text-left text-gray-700 border-collapse">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-6 py-3 text-center font-semibold">อาคาร</th>
            <th class="px-6 py-3 text-center font-semibold">ชั้น</th>
            <th class="px-6 py-3 text-center font-semibold">ห้อง</th>
            <th class="px-6 py-3 text-center font-semibold">หมายเหตุ</th>
            <th class="px-6 py-3 text-center font-semibold">การจัดการ</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="item in paginatedData"
            :key="`${item.type}-${item.id}`"
            class="bg-white border-b hover:bg-blue-50 transition"
          >
            <td class="text-center px-6 py-3">{{ item.building }}</td>
            <td class="text-center px-6 py-3">{{ item.floor }}</td>
            <td class="text-center px-6 py-3">{{ item.room }}</td>
            <td class="text-center px-6 py-3">-</td>
            <td class="text-center px-6 py-3">
              <div class="flex items-center justify-center gap-2">
                <!-- ปุ่มแก้ไข -->
                <button
                  @click="handleEdit(item)"
                  class="flex items-center justify-center w-9 h-8 bg-yellow-400 hover:bg-yellow-500 text-white rounded-lg transition"
                  title="แก้ไข"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                <!-- ปุ่มลบ -->
                <button
                  @click="handleDelete(item)"
                  class="flex items-center justify-center w-9 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                  title="ลบ"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>

          <!-- ไม่มีข้อมูล -->
          <tr v-if="paginatedData.length === 0">
            <td colspan="5" class="text-center py-6 text-gray-500">
              — ไม่พบข้อมูล —
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 📄 Pagination -->
    <div class="flex items-center justify-between mt-4">
      <div class="text-sm text-gray-500">
        Showing {{ startEntry }} to {{ endEntry }} of {{ totalEntries }} entries
      </div>

      <div
        class="flex items-center gap-2 transition-opacity duration-200"
        :class="{ 'opacity-0 pointer-events-none': totalPages <= 1 }"
      >
        <button
          @click="goToPage(1)"
          :disabled="currentPage === 1"
          class="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          «
        </button>

        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          class="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ‹
        </button>

        <button
          v-for="page in totalPages"
          :key="page"
          @click="goToPage(page)"
          :class="[
            'px-3 py-1 border border-gray-300 rounded-md text-sm transition-colors',
            currentPage === page
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white hover:bg-gray-50'
          ]"
        >
          {{ page }}
        </button>

        <button
          @click="nextPage"
          :disabled="currentPage === totalPages"
          class="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ›
        </button>

        <button
          @click="goToPage(totalPages)"
          :disabled="currentPage === totalPages"
          class="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          »
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom styles */
select:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

button:disabled {
  cursor: not-allowed;
}
</style>
