<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  columns: {
    type: Array,
    default: () => [],
  },
  rows: {
    type: Array,
    default: () => [],
  },
  perPage: {
    type: Number,
    default: 3,
  },
  // mode:
  //  - "full"       : edit/delete (ซ่อนคอลัมน์ที่ 1)
  //  - "assign"     : มอบหมายงาน (ซ่อนคอลัมน์ที่ 1)
  //  - "technician" : 3 ปุ่ม รับงาน / เปลี่ยนสถานะ / เสร็จสิ้น
  //  - "stock"      : แสดงทุกคอลัมน์
  //  - "location"   : สำหรับจัดการสถานที่ (แสดงทุกคอลัมน์ + ปุ่มเหมือน full)
  mode: {
    type: String,
    default: 'full',
  },
  // rawRows: ข้อมูลดิบแต่ละแถว (object) — ใช้ดู meta เช่น assigned, code, status เป็นต้น
  rawRows: {
    type: Array,
    default: () => [],
  },
  // (optional) current logged-in user id — ถ้ามีจะช่วยตรวจ permission เพิ่มเติม
  currentUserId: {
    type: [String, Number],
    default: null,
  },
  // เพิ่ม prop ใหม่
  idColumnIndex: {
    type: Number,
    default: 1,
  },
  activeId: {
    type: [String, Number],
    default: null,
  },
})

function getRowId(row) {
  return row[props.idColumnIndex] || null
}

const currentPage = ref(1)
const totalEntries = computed(() => (props.rows || []).length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalEntries.value / props.perPage)))

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * props.perPage
  const end = start + props.perPage
  return (props.rows || []).slice(start, end)
})

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}
function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}
function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

/* หา meta ของแถวจาก rawRows ด้วย rf_code หรือ code (รองรับทั้งสองแบบ) */
function getRowMetaByCode(row) {
  const code = getRowId(row)
  if (!code) return null
  // rawRows อาจประกอบด้วย objects ที่มี property ต่างกัน เช่น code / rf_code / rfCode
  return (
    props.rawRows.find((item) => {
      if (!item) return false
      // ถ้า item เป็น array ให้รองรับ index 1 ด้วย
      if (Array.isArray(item) && item[1] === code) return true
      if (item.code === code) return true
      if (item.rf_code === code) return true
      if (item.rfCode === code) return true
      if (item.us_user_name && item.us_user_name === code) return true
      if (item.username && item.username === code) return true
      if (item.us_id && String(item.us_id) === String(code)) return true
      if (item.id && String(item.id) === String(code)) return true
      if (item.rf_code && String(item.rf_code) === String(code)) return true
      return false
    }) || null
  )
}

/* ตรวจว่าบัญชี/แถวนี้มีฟอร์มแจ้งซ่อม หรือ assignment ที่เกี่ยวข้องหรือไม่ (frontend guard) */
function rowHasActiveRepairs(row) {
  const meta = getRowMetaByCode(row)
  if (!meta) return false

  // หลายกรณีที่ backend อาจส่งมา -> รองรับหลายชื่อตัวแปร
  if (meta.has_repairs) return true
  if (meta.hasActiveRepairs) return !!meta.hasActiveRepairs
  if (meta.has_active_repairs) return !!meta.has_active_repairs
  if (typeof meta.repair_count === 'number') return meta.repair_count > 0
  if (meta.repair_count && Number(meta.repair_count) > 0) return true
  if (typeof meta.assignment_count === 'number' && meta.assignment_count > 0) return true
  if (meta.assignment_count && Number(meta.assignment_count) > 0) return true
  if (Array.isArray(meta.assigned_users) && meta.assigned_users.length > 0) return true
  if (meta.assigned === true || meta.assigned === 1) return true
  if (meta.ra_id) return true
  if (meta.rf_us_id) return true
  // fallback: any key containing "repair" with truthy value
  for (const k of Object.keys(meta)) {
    if (k.toLowerCase().includes('repair') && meta[k]) return true
    if (k.toLowerCase().includes('assignment') && meta[k]) return true
  }

  return false
}

/* เช็คว่าแถวนั้นถูกมอบหมายงานแล้วหรือยัง (จาก rawRows) */
function isRowAssigned(row) {
  const meta = getRowMetaByCode(row)
  if (!meta) return false

  // raw data อาจเก็บชื่อ field ต่างกัน: assigned, ra_id, rf_assigned_tech_id, assigned_to ฯลฯ
  if (meta.assigned === true || meta.assigned === 1) return true
  if (meta.ra_id || meta.raId) return true
  if (meta.rf_assigned_tech_id) return true
  if (meta.assigned_to) return true
  if (meta.assigned_users && meta.assigned_users.length > 0) return true

  return false
}

/* เช็คว่าแถวนั้นหัวหน้าทีมหรือยัง (ra_is_lead === 1) */
function isRowLeader(row) {
  const meta = getRowMetaByCode(row)
  if (!meta) return false

  // บาง backend ใช้ ra_is_lead, บางที่ส่งเป็น object ของ assignment ที่มี is_lead
  if (meta.ra_is_lead === 1 || meta.ra_is_lead === '1' || meta.ra_is_lead === true) return true
  if (meta.is_lead === 1 || meta.is_lead === '1' || meta.is_lead === true) return true

  // บางกรณี meta อาจมี array assigned_users ที่เก็บ object {us_id, is_lead}
  if (Array.isArray(meta.assigned_users)) {
    const lead = meta.assigned_users.find(
      (u) => u.is_lead === 1 || u.is_lead === '1' || u.is_lead === true,
    )
    if (lead) return true
  }

  return false
}

/* เช็คว่าแถวนั้นอยู่ในสถานะ pending (สำหรับ user edit/delete หรือ technician accept) */
function getRowStatus(row) {
  const meta = getRowMetaByCode(row)
  if (meta) return meta.rf_user_status || meta.status

  const statusCell = row[5]
  if (statusCell?.includes && statusCell?.includes('รอดำเนินการ')) return 'pending'
  if (statusCell?.includes && statusCell?.includes('กำลังดำเนินการ')) return 'in_progress'
  if (statusCell?.includes && statusCell?.includes('เสร็จสิ้น')) return 'done'

  return null
}

const isPendingStatus = (row) => getRowStatus(row) === 'pending'

const baseIconClass = 'w-8 h-8 sm:w-9 sm:h-8 flex items-center justify-center rounded-md transition'
const assignBaseClass =
  'w-8 h-8 sm:w-9 sm:h-8 flex items-center justify-center rounded-md transition'

// state for kebab (three-dots) dropdown per-row
const openMenu = ref(null)

function toggleMenu(idx) {
  openMenu.value = openMenu.value === idx ? null : idx
}

function closeMenu() {
  openMenu.value = null
}

onMounted(() => document.addEventListener('click', closeMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))

/* ตรวจ permission แก้ไข: ถ้ามี meta ที่บอกว่า protected/has_repairs -> return false
   รวมถึงถ้าสถานะมีค่าและไม่ใช่ 'pending' จะห้ามแก้ไข/ลบ (ตาม requirement ของหน้า "ของฉัน") */
function canEditUser(row) {
  const meta = getRowMetaByCode(row)

  // ถ้ามีสถานะ และสถานะไม่ใช่ pending -> ห้ามแก้ไข/ลบ
  const status = getRowStatus(row)
  if (status && status !== 'pending') return false

  if (meta) {
    if (typeof meta.can_edit !== 'undefined') return !!meta.can_edit
    if (typeof meta.protected !== 'undefined') return !meta.protected
    if (meta.role === 'ADMIN' || meta.role === 'admin' || meta.us_role_id === 1) return false
    if (rowHasActiveRepairs(row)) return false
  }
  return true
}
</script>

<template>
  <div class="relative overflow-x-auto">
    <table class="min-w-[640px] w-full text-xs sm:text-sm text-left text-black border-collapse">
      <thead class="text-l border-b border-[#E9E9E9] text-gray-700 uppercase bg-white text-[#444D5C]">
        <tr>
          <th v-for="(col, i) in props.columns" :key="i" v-show="props.mode === 'stock' ||
            props.mode === 'location' ||
            props.mode === 'user' ||
            props.mode === 'admin' ||
            props.mode === 'assign' ||
            props.mode === 'technician'
            ? true
            : i !== 1
            " class="px-3 py-2 sm:px-3 sm:py-3 text-center">
            {{ col }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(row, ri) in paginatedRows" :key="ri"
          class="bg-white border-b border-[#E9E9E9] hover:bg-gray-50 cursor-pointer"
          :class="{ '!bg-gray-50': row[idColumnIndex] == activeId }" @click="$emit('detail', getRowId(row))">
          <template v-for="(cell, ci) in row" :key="ci">
            <th v-if="ci === 0 && props.mode !== 'location'"
              class="px-6 py-4 font-medium text-center text-black whitespace-nowrap">
              {{ cell }}
            </th>

            <!-- คอลัมน์อื่น -->
            <td v-else-if="
              props.mode === 'location'
                ? ci !== 0
                : props.mode === 'stock' ||
                  props.mode === 'user' ||
                  props.mode === 'admin' ||
                  props.mode === 'assign' ||
                  props.mode === 'technician'
                  ? true
                  : ci !== 1
            " class="px-3 py-2 sm:px-4 sm:py-4 text-center">
              <!-- คอลัมน์ action -->
              <div v-if="cell === 'actions'" class="flex justify-center gap-2">
                <!-- ดูรายละเอียด (แสดงเสมอ) -->
                <div
                  class="w-8 h-8 sm:w-9 sm:h-8 flex items-center justify-center bg-[#1E48D1] hover:bg-[#163A9B] text-white rounded-lg transition cursor-pointer flex-none"
                  title="ดูรายละเอียด" @click.stop="$emit('detail', getRowId(row))">
                  <img src="/icon/info-icon.svg" alt="info" class="w-5 h-5" />
                </div>

                <!-- โหมด technician: แสดงเป็นปุ่ม kebab (สามจุด) พร้อมเมนู -->
                <template v-if="props.mode === 'technician'">
                  <div class="relative" @click.stop>
                    <button @click.stop="toggleMenu(ri)"
                      class="w-8 h-8 flex items-center justify-center bg-[#1E48D1] hover:bg-[#163A9B] text-white rounded-md"
                      :title="'ตัวเลือกเ'">
                      <!-- vertical kebab icon -->
                      <img src="/icon/Kebab.svg" alt="" class="w-5 h-5">
                    </button>

                    <div v-if="openMenu === ri"
                      class="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                      <button
                        class="w-8 h-8 sm:w-9 sm:h-8 flex items-center justify-center bg-[#1E48D1] hover:bg-[#163A9B] text-white rounded-lg transition cursor-pointer flex-none"
                        @click.stop="() => { $emit('detail', getRowId(row)); closeMenu() }">
                        <img src="/icon/info-icon.svg" alt="info" class="w-5 h-5" />
                      </button>

                      <template v-if="getRowStatus(row) === 'pending'">
                        <button
                          class="px-5 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-900 rounded-lg hover:transition flex-none"
                          @click.stop="$emit('accept', getRowId(row))">
                          รับงาน
                        </button>
                      </template>

                      <template v-else-if="getRowStatus(row) === 'in_progress'">
                        <button class="px-5 py-2 text-xs font-medium text-white bg-green-600 rounded-lg"
                          @click.stop="$emit('close-job', getRowMetaByCode(row))">
                          ปิดงาน
                        </button>
                      </template>

                      <template v-else-if="getRowStatus(row) !== 'done'">
                        <button
                          class="px-3 py-2 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg hover:shadow-lg transition flex-none"
                          @click.stop="$emit('change-status', getRowId(row))">
                          เปลี่ยนสถานะ
                        </button>
                      </template>

                      <template v-else>
                        <div class="px-3 py-2 text-sm text-gray-500">เสร็จสิ้น</div>
                      </template>

                      <button
                        class="w-8 h-8 sm:w-9 sm:h-8 flex items-center justify-center bg-[#1E48D1] hover:bg-[#163A9B] text-white rounded-lg transition cursor-pointer flex-none"
                          @click.stop="$emit('open-stock', getRowId(row)); closeMenu()"
                        title="ไปหน้าเบิกของ">
                        <img src="/icon/shopping-basket-icon.svg" alt="basket" class="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </template>

                <!-- โหมด user (แก้ไข/ลบ) -->
                <template v-else-if="props.mode === 'user'">
                  <!-- ถ้ามีฟอร์มค้าง ให้แสดงปุ่ม disabled และ tooltip อธิบาย -->
                  <template v-if="rowHasActiveRepairs(row)">
                    <div :class="[baseIconClass, 'bg-gray-300 text-gray-400 cursor-not-allowed']"
                      :title="'บัญชีนี้มีใบแจ้งซ่อมหรือการมอบหมายงานที่เชื่อมโยงอยู่ จึงไม่สามารถแก้ไขได้'">
                      <img src="/icon/edit-icon.svg" alt="edit" class="w-5 h-5 opacity-70" />
                    </div>

                    <div :class="[baseIconClass, 'bg-gray-300 text-gray-400 cursor-not-allowed']"
                      :title="'บัญชีนี้มีใบแจ้งซ่อมหรือการมอบหมายงานที่เชื่อมโยงอยู่ จึงไม่สามารถลบได้'">
                      <img src="/icon/bin-icon.svg" alt="delete" class="w-5 h-5 opacity-70" />
                    </div>
                  </template>

                  <!-- ถ้าไม่มีฟอร์มค้าง ให้ทำงานได้ตามปกติแต่ต้องเช็คสถานะด้วย -->
                  <template v-else>
                    <!-- ถ้าสถานะไม่ใช่ pending ให้ disabled (สีเทา + tooltip) -->
                    <template v-if="!isPendingStatus(row)">
                      <div :class="[baseIconClass, 'bg-gray-300 text-gray-400 cursor-not-allowed']"
                        :title="'ไม่สามารถแก้ไขได้ (สถานะไม่ใช่รอดำเนินการ)'">
                        <img src="/icon/edit-icon.svg" alt="edit" class="w-5 h-5 opacity-70" />
                      </div>

                      <div :class="[baseIconClass, 'bg-gray-300 text-gray-400 cursor-not-allowed']"
                        :title="'ไม่สามารถลบได้ (สถานะไม่ใช่รอดำเนินการ)'">
                        <img src="/icon/bin-icon.svg" alt="delete" class="w-5 h-5 opacity-70" />
                      </div>
                    </template>

                    <!-- สถานะเป็น pending และไม่มีฟอร์มค้าง -> ปกติ -->
                    <template v-else>
                      <div :class="[
                        baseIconClass,
                        canEditUser(row)
                          ? 'bg-yellow-400 hover:bg-yellow-500 text-white cursor-pointer'
                          : 'bg-gray-300 text-gray-400 cursor-not-allowed',
                      ]" :title="canEditUser(row) ? 'แก้ไข' : 'ไม่สามารถแก้ไขได้'"
                        @click.stop="canEditUser(row) && $emit('edit', getRowId(row))">
                        <img src="/icon/edit-icon.svg" alt="edit" class="w-5 h-5 opacity-90" />
                      </div>

                      <div :class="[
                        baseIconClass,
                        canEditUser(row)
                          ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
                          : 'bg-gray-300 text-gray-400 cursor-not-allowed',
                      ]" :title="canEditUser(row) ? 'ลบ' : 'ไม่สามารถลบได้'"
                        @click.stop="canEditUser(row) && $emit('delete', getRowId(row))">
                        <img src="/icon/bin-icon.svg" alt="delete" class="w-5 h-5 opacity-90" />
                      </div>
                    </template>
                  </template>
                </template>

                <!-- โหมด assign (มอบหมาย) -->
                <template v-else-if="props.mode === 'assign'">
                  <button :class="[
                    assignBaseClass,
                    isRowAssigned(row)
                      ? 'bg-gray-300 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer',
                  ]" :title="isRowAssigned(row) ? 'มอบหมายแล้ว' : 'มอบหมายงาน'" :disabled="isRowAssigned(row)"
                    @click.stop="!isRowAssigned(row) && $emit('assign', getRowId(row))">
                    <img src="/icon/arrow-right.svg" alt="assign" class="w-5 h-5" />
                  </button>
                </template>

                <!-- โหมด full และ location -->
                <template v-else-if="props.mode === 'full' || props.mode === 'location'">
                  <div
                    class="w-8 h-8 sm:w-9 sm:h-8 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-white rounded-md transition cursor-pointer"
                    title="แก้ไข" @click.stop="$emit('edit', getRowId(row))">
                    <img src="/icon/edit-icon.svg" alt="edit" class="w-5 h-5" />
                  </div>

                  <div
                    class="w-8 h-8 sm:w-9 sm:h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-md transition cursor-pointer"
                    title="ลบ" @click.stop="$emit('delete', getRowId(row))">
                    <img src="/icon/bin-icon.svg" alt="delete" class="w-5 h-5" />
                  </div>
                </template>
              </div>

              <!-- ถ้าไม่ใช่ actions ให้แสดงค่าปกติ (รองรับ HTML badges) -->
              <slot v-else :name="`cell-${ci}`" :row="row" :cell="cell" :rowIndex="ri" :columnIndex="ci">
                <span class="break-words" v-html="cell"></span>
              </slot>
            </td>
          </template>
        </tr>
      </tbody>
    </table>

    <!-- Pagination -->
    <div class="flex justify-center sm:justify-end mt-4">
      <div class="inline-flex rounded-md shadow-sm border border-gray-300">
        <button @click="goToPage(1)" :disabled="currentPage === 1"
          class="px-3 py-2 text-gray-500 border-r border-gray-300 hover:bg-gray-100 disabled:opacity-40">
          «
        </button>
        <button @click="prevPage" :disabled="currentPage === 1"
          class="px-3 py-2 text-gray-500 border-r border-gray-300 hover:bg-gray-100 disabled:opacity-40">
          ‹
        </button>

        <button v-for="page in totalPages" :key="page" @click="goToPage(page)" :class="[
          'px-3 py-2 border-r border-gray-300 hover:bg-gray-100 transition-colors',
          currentPage === page
            ? 'bg-blue-100 text-blue-600 border-blue-300'
            : 'bg-white text-gray-700',
        ]">
          {{ page }}
        </button>

        <button @click="nextPage" :disabled="currentPage === totalPages"
          class="px-3 py-2 text-gray-500 border-r border-gray-300 hover:bg-gray-100 disabled:opacity-40">
          ›
        </button>
        <button @click="goToPage(totalPages)" :disabled="currentPage === totalPages"
          class="px-3 py-2 text-gray-500 hover:bg-gray-100 disabled:opacity-40">
          »
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
table {
  table-layout: fixed;
  width: 100%;
}

td,
th {
  text-align: center;
  vertical-align: middle;
}

tbody tr:hover {
  background-color: #f9fafb;
}
</style>
