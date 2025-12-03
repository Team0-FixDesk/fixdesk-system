<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import TableComponent from '@/components/table-component.vue'
import RepairButton from '@/components/repair-button.vue'
import { useRouter } from 'vue-router'
import Sweetalert from 'sweetalert2'

defineOptions({ name: 'MyListView' })

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

const columns = [
  'วันที่',
  'ใบแจ้งซ่อม',
  'หมายเลขครุภัณฑ์',
  'หน่วยงาน',
  'ความเร่งด่วน',
  'สถานะงาน',
  'ตัวดำเนินการ',
]
const rows = ref([])
const searchQuery = ref('')
const selectedStatuses = ref([])
const selectedUrgencies = ref([])
const selectedTypes = ref([])
const showStatusFilter = ref(false)
const showUrgencyFilter = ref(false)
const showTypeFilter = ref(false)
const selectedDate = ref('')
const technicianTypes = ref(['TI', 'ประปา', 'อิเล็กทรอนิกส์', 'ไฟฟ้า', 'ไม้'])

// JWT Decode
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return {}
  }
}

// ดึงข้อมูลรายการแจ้งซ่อม
async function fetchMyRepairs() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) return
  const payload = parseJwt(token)
  const userId = payload.us_id
  try {
    const res = await fetch(`${API_BASE}/my-repairs/${userId}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')

    rows.value = data.map((repair) => {
      let urgencyBadge = '-'
      switch (repair.rf_urgency) {
        case 'high':
          urgencyBadge = `<span class='inline-flex justify-center items-center w-36 h-8 rounded-full bg-red-100 text-red-600 font-semibold'>เร่งด่วนมาก</span>`
          break
        case 'medium':
          urgencyBadge = `<span class='inline-flex justify-center items-center w-36 h-8 rounded-full bg-amber-50 text-amber-500 font-semibold'>เร่งด่วน</span>`
          break
        case 'low':
          urgencyBadge = `<span class='inline-flex justify-center items-center w-36 h-8 rounded-full bg-green-100 text-green-600 font-semibold'>ไม่เร่งด่วน</span>`
          break
      }

      const statusBadge = (() => {
        switch (repair.rf_user_status) {
          case 'pending':
            return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-amber-50 text-amber-500 font-semibold">รอดำเนินการ</span>`
          case 'in_progress':
            return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">กำลังดำเนินการ</span>`
          case 'done':
            return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-green-100 text-green-600 font-semibold">ดำเนินการเสร็จสิ้น</span>`
          default:
            return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-full bg-gray-100 text-gray-500 font-semibold">ยกเลิก</span>`
        }
      })()

      return [
        new Date(repair.rf_create_at).toLocaleDateString('th-TH'),
        repair.rf_code,
        repair.rf_prop_number || '-',
        repair.department_name || '-',
        urgencyBadge,
        statusBadge,
        'actions',
      ]
    })
  } catch (err) {
    console.error('โหลดข้อมูลไม่สำเร็จ:', err)
  }
}

// ฟิลเตอร์
const filteredRows = computed(() => {
  return rows.value.filter((row) => {
    const matchSearch =
      row[1].includes(searchQuery.value) ||
      row[2].includes(searchQuery.value) ||
      row[3].includes(searchQuery.value)

    const urgencyText = ['low', 'medium', 'high'].find((key) => row[4].includes(key))
    const statusText = ['pending', 'in_progress', 'done'].find((key) => row[5].includes(key))
    const matchUrgency =
      selectedUrgencies.value.length === 0 || selectedUrgencies.value.includes(urgencyText)
    const matchStatus =
      selectedStatuses.value.length === 0 || selectedStatuses.value.includes(statusText)
    const matchDate =
      !selectedDate.value ||
      new Date(row[0]).toLocaleDateString('th-TH') ===
        new Date(selectedDate.value).toLocaleDateString('th-TH')

    return matchSearch && matchUrgency && matchStatus && matchDate
  })
})

function clearFilters() {
  selectedUrgencies.value = []
  selectedStatuses.value = []
  selectedTypes.value = []
}

// ปิด dropdown เมื่อคลิกรอบนอก
function closeDropdown(e) {
  if (!e.target.closest('.relative')) {
    showStatusFilter.value = false
    showUrgencyFilter.value = false
    showTypeFilter.value = false
  }
}

onMounted(() => {
  fetchMyRepairs()
  document.addEventListener('click', closeDropdown)
})
onBeforeUnmount(() => document.removeEventListener('click', closeDropdown))

// ปุ่ม action ต่าง ๆ
const goToCreate = () => router.push('/main/repair-request')
const goToDetail = (code) => router.push(`/main/repair-detail/${code}`)
const goToEdit = (code) => router.push(`/main/repair-edit/${code}`)

// ฟังก์ชันการลบ
async function handleDelete(repairCode) {
  const result = await Sweetalert.fire({
    title: 'ลบรายการนี้?',
    text: `คุณต้องการลบใบแจ้งซ่อมหมายเลข ${repairCode} หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ลบเลย',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#e53e3e',
  })
  if (!result.isConfirmed) return

  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const res = await fetch(`${API_BASE}/my-repairs/${repairCode}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'ลบไม่สำเร็จ')

    rows.value = rows.value.filter((r) => r[1] !== repairCode)
    Sweetalert.fire('สำเร็จ', 'ลบรายการเรียบร้อยแล้ว', 'success')
  } catch (err) {
    console.error('ลบไม่สำเร็จ:', err)
    Sweetalert.fire('เกิดข้อผิดพลาด', err.message, 'error')
  }
}
</script>

<template>
  <div class="bg-gray-50 rounded-xl p-1 mx-auto max-w-7xl">
    <!-- ฟิลเตอร์ -->
    <div class="mb-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาใบแจ้งซ่อม / หน่วยงาน / ครุภัณฑ์"
            class="w-[260px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
          />
          <input
            v-model="selectedDate"
            type="date"
            class="h-10 px-3 rounded-lg border border-gray-300 bg-white text-gray-700"
          />

          <!-- ความเร่งด่วน -->
          <div class="relative">
            <button
              @click.stop="showUrgencyFilter = !showUrgencyFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700"
            >
              ความเร่งด่วน
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200"
                :class="{ 'rotate-180': showUrgencyFilter }"
                alt="toggle"
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
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">ไม่เร่งด่วน</span>
              </label>
              <label class="flex items-center py-1">
                <input
                  type="checkbox"
                  value="medium"
                  v-model="selectedUrgencies"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">เร่งด่วน</span>
              </label>
              <label class="flex items-center py-1">
                <input
                  type="checkbox"
                  value="high"
                  v-model="selectedUrgencies"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">เร่งด่วนมาก</span>
              </label>
            </div>
          </div>

          <!-- สถานะ -->
          <div class="relative">
            <button
              @click.stop="showStatusFilter = !showStatusFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700"
            >
              สถานะ
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200"
                :class="{ 'rotate-180': showStatusFilter }"
                alt="toggle"
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
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">รอดำเนินการ</span>
              </label>
              <label class="flex items-center py-1">
                <input
                  type="checkbox"
                  value="in_progress"
                  v-model="selectedStatuses"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">กำลังดำเนินการ</span>
              </label>
              <label class="flex items-center py-1">
                <input
                  type="checkbox"
                  value="done"
                  v-model="selectedStatuses"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">ดำเนินการเสร็จสิ้น</span>
              </label>
            </div>
          </div>

          <!-- ประเภทงาน -->
          <div class="relative">
            <button
              @click.stop="showTypeFilter = !showTypeFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700"
            >
              ประเภทงาน
              <img
                src="/icon/sidebar/chevron-down-icon.svg"
                class="w-4 h-4 opacity-70 transition-transform duration-200"
                :class="{ 'rotate-180': showTypeFilter }"
                alt="toggle"
              />
            </button>
            <div
              v-if="showTypeFilter"
              class="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-700 z-10"
            >
              <label v-for="t in technicianTypes" :key="t" class="flex items-center py-1">
                <input
                  type="checkbox"
                  :value="t"
                  v-model="selectedTypes"
                  class="w-4 h-4 text-blue-600 border-gray-300"
                />
                <span class="ml-2">{{ t }}</span>
              </label>
            </div>
          </div>

          <!-- ปุ่มล้างตัวกรอง -->
          <transition name="fade">
            <button
              v-if="selectedStatuses.length || selectedUrgencies.length || selectedTypes.length"
              @click="clearFilters"
              class="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ล้างตัวกรอง
            </button>
          </transition>
        </div>

        <!-- component ปุ่มแจ้งซ่อม-->
        <RepairButton />
      </div>
    </div>
  </div>

  <!-- ตาราง -->
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl">
    <h1 class="text-xl font-bold text-black mb-2">รายการของฉัน</h1>
    <div class="p-3 mx-auto max-w-8xl">
      <TableComponent
        :columns="columns"
        :rows="filteredRows"
        :perPage="10"
        mode="user"
        @delete="handleDelete"
        @detail="goToDetail"
        @edit="goToEdit"
      />
    </div>
  </div>
</template>
