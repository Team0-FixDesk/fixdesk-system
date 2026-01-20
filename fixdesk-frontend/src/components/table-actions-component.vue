<script setup>
import { computed, onMounted, onBeforeUnmount, ref, nextTick } from 'vue'

const props = defineProps({
  rowId: {
    type: [String, Number],
    required: true,
  },
  openMenuId: {
    type: [String, Number],
    default: null,
  },
  role: {
    type: String,
    required: true, // technician / admin / assign / user / stock / location
  },
  status: {
    type: String,
    default: null, // raw HTML หรือ key ('pending', 'in_progress', ...)
  },
  status_stock: {
    type: String,
    default: null, // raw HTML หรือ key ('pending', 'cancel', ...)
  },
  row: {
    type: Array,
    required: true,
  },
  assignedTech: {
    type: [String, Number, null],
    default: null,
  },
})

const emit = defineEmits([
  'toggle-menu',
  'detail',
  'edit',
  'delete',
  'assign',
  'accept',
  'outsource',
  'close-job',
  'open-stock',
])

// Computed: เช็คว่าเมนูนี้เปิดอยู่ไหม
const isMenuOpen = computed(() => props.openMenuId === props.rowId)

// Ref สำหรับ dropdown position
const buttonRef = ref(null)
const dropdownRef = ref(null)
const dropdownStyle = ref({})

async function toggleMenu(event) {
  event.stopPropagation()

  if (isMenuOpen.value) {
    emit('toggle-menu', null)
    return
  }

  emit('toggle-menu', props.rowId)

  // รอ DOM อัปเดตแล้วคำนวณตำแหน่ง
  await nextTick()
  calculatePosition()
}

function emitAndClose(eventName, payload) {
  emit(eventName, payload)
  emit('toggle-menu', null)
}


function calculatePosition() {
  if (!buttonRef.value) return

  const btn = buttonRef.value.getBoundingClientRect()
  const dropdownHeight = 220 // ปรับตามความสูงจริง
  const viewportHeight = window.innerHeight

  const spaceBelow = viewportHeight - btn.bottom
  const openAbove = spaceBelow < dropdownHeight

  dropdownStyle.value = {
    position: 'fixed',
    top: openAbove ? `${btn.top - dropdownHeight - 8}px` : `${btn.bottom + 8}px`,
    left: `${btn.right - 192}px`, // 192 = w-48
    zIndex: 9999,
  }
}

function closeMenu() {
  if (isMenuOpen.value) {
    emit('toggle-menu', null)
  }
}

// Utility: แปลง HTML Badge → status key
function parseStatusBadge(html) {
  if (!html) return null

  const text = html.replace(/<[^>]+>/g, '').trim()
  const map = {
    รอดำเนินการ: 'pending',
    กำลังดำเนินการ: 'in_progress',
    ดำเนินการเสร็จสิ้น: 'done',
    เสร็จสิ้น: 'done',
    ยกเลิก: 'cancel',
  }

  return map[text] || null
}

// Normalize Status (HTML badge หรือ key → key เดียวกัน)
const normalizedStatus = computed(() => {
  const raw = props.status

  if (!raw) return null

  // ถ้าเป็น HTML → parse
  if (raw.includes && raw.includes('<')) {
    return parseStatusBadge(raw)
  }

  // ถ้าเป็น key อยู่แล้ว → ส่งกลับเลย
  return raw
})

// Lifecycle: ปิดเมนูเมื่อคลิกนอกคอมโพเนนต์
onMounted(() => {
  document.addEventListener('click', closeMenu)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeMenu)
})
</script>

<template>
  <div class="relative flex justify-center" @click.stop>
    <!-- Kebab Button -->
    <button
      ref="buttonRef"
      class="w-8 h-8 bg-gray-700 hover:bg-gray-800 text-white rounded-md flex items-center justify-center"
      @click="toggleMenu"
      title="เมนู"
    >
      <img src="/icon/Kebab.svg" class="w-5 h-5" />
    </button>

    <!-- Dropdown Menu -->
    <Teleport to="body">
      <div
        v-if="isMenuOpen"
        ref="dropdownRef"
        class="w-48 bg-white shadow-xl border border-gray-200 rounded-lg p-2"
        :style="dropdownStyle"
        @click.stop
      >
        <!-- ทุก role ใช้ได้ -->
        <button
          v-if="role !== 'stock'"
          @click="emitAndClose('detail', row)"
          class="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 flex items-center gap-2"
        >
          <img
            src="/icon/info-icon.svg"
            class="bg-blue-400 hover:bg-blue-600 rounded-md p-1 h-6 w-6"
          />
          รายละเอียด
        </button>

        <!-- Technician -->
        <template v-if="role === 'technician'">
          <!-- รับงาน (pending) -->
          <button
            v-if="normalizedStatus === 'pending'"
            @click="emitAndClose('accept', row)"
            class="w-full text-left px-3 py-2 rounded-md hover:bg-teal-50 flex items-center gap-2 group"
          >
            <div
              class="w-6 h-6 rounded-md bg-teal-500 flex items-center justify-center group-hover:bg-teal-600"
            >
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span class="group-hover:text-teal-700">รับงาน</span>
          </button>

          <!-- ปิดงาน (in_progress, outsource) -->
          <button
            v-if="normalizedStatus === 'in_progress' || normalizedStatus === 'outsource'"
            @click="emitAndClose('close-job', row)"
            class="w-full text-left px-3 py-2 rounded-md hover:bg-green-50 flex items-center gap-2 group"
          >
            <div
              class="w-6 h-6 rounded-md bg-green-500 flex items-center justify-center group-hover:bg-green-600"
            >
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <span class="group-hover:text-green-700">ปิดงาน</span>
          </button>

          <!-- จ้างช่างภายนอก (in_progress) -->
          <button
            v-if="normalizedStatus === 'in_progress'"
            @click="emitAndClose('outsource', row)"
            class="w-full text-left px-3 py-2 rounded-md hover:bg-amber-50 flex items-center gap-2 group"
          >
            <div
              class="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center group-hover:bg-amber-600"
            >
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <span class="group-hover:text-amber-700">จ้างช่างภายนอก</span>
          </button>

          <!-- เบิกวัสดุอุปกรณ์ (in_progress, outsource) -->
          <button
            v-if="normalizedStatus === 'in_progress' || normalizedStatus === 'outsource'"
            @click="emitAndClose('open-stock', row)"
            class="w-full text-left px-3 py-2 rounded-md hover:bg-blue-50 flex items-center gap-2 group"
          >
            <div
              class="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center group-hover:bg-blue-600"
            >
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <span class="group-hover:text-blue-700">เบิกวัสดุอุปกรณ์</span>
          </button>
        </template>

        <!-- Admin / Location -->
        <template v-if="role === 'admin' || role === 'location'">
          <button
            @click="emitAndClose('edit', row)"
            class="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
          >
            <img
              src="/icon/edit-icon.svg"
              class="bg-amber-400 hover:bg-amber-600 rounded-md p-1 h-6 w-6"
            />
            แก้ไข
          </button>
          <div class="border-t border-gray-300 mx-1"></div>

          <button
            @click="emitAndClose('delete', row)"
            class="w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600 flex items-center gap-2"
          >
            <img
              src="/icon/bin-icon.svg"
              class="bg-red-400 hover:bg-red-600 rounded-md p-1 h-6 w-6"
            />
            ลบ
          </button>
        </template>

        <!-- Assign -->
        <!-- Assign -->
        <template v-if="role === 'assign'">
          <!-- ยังไม่มอบหมาย -->
          <button
            v-if="props.assignedTech == null"
            @click="emitAndClose('assign', row)"
            class="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
          >
            <img
              src="/icon/arrow-right.svg"
              class="bg-green-400 hover:bg-green-600 rounded-md p-1 h-6 w-6"
            />
            มอบหมายงาน
          </button>

          <!-- มอบหมายแล้ว -->
          <div v-else class="px-3 py-2 text-sm text-gray-500 leading-snug flex gap-2">
            <svg
              class="w-4 h-4 text-gray-400 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M12 18a9 9 0 110-18 9 9 0 010 18z"
              />
            </svg>

            <span>
              งานนี้ถูกมอบหมายแล้ว<br />
              <span
                class="text-blue-600 cursor-pointer hover:underline"
                @click="emitAndClose('detail', row)"
              >
                ดูรายละเอียดใบแจ้งซ่อม
              </span>
            </span>
          </div>
        </template>

        <!-- User -->
        <template v-if="role === 'user'">
          <button
            v-if="normalizedStatus === 'pending'"
            @click="emitAndClose('edit', row)"
            class="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
          >
            <img
              src="/icon/edit-icon.svg"
              class="bg-amber-400 hover:bg-amber-600 rounded-md p-1 h-6 w-6"
            />
            แก้ไข
          </button>
          <div class="border-t border-gray-300 mx-1"></div>
          <button
            v-if="normalizedStatus === 'pending'"
            @click="emitAndClose('delete', row)"
            class="w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600 flex items-center gap-2"
          >
            <img
              src="/icon/bin-icon.svg"
              class="bg-red-400 hover:bg-red-600 rounded-md p-1 h-6 w-6"
            />
            ลบ
          </button>
        </template>

        <!-- Stock -->
        <template v-if="role === 'stock'">
          <div class="border-t border-gray-200 my-1"></div>

          <button
            @click="emitAndClose('edit', row)"
            class="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
          >
            <img src="/icon/edit-icon.svg" class="bg-amber-400 rounded-md p-1 h-6 w-6" />
            แก้ไข
          </button>

          <div class="border-t border-gray-200 my-1"></div>

          <button
            @click="emitAndClose('delete', row)"
            class="w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600 flex items-center gap-2"
          >
            <img src="/icon/bin-icon.svg" class="bg-red-400 rounded-md p-1 h-6 w-6" />
            ลบ
          </button>
        </template>
        <template v-if="role === 'stockList'"> </template>
      </div>
    </Teleport>
  </div>
</template>
