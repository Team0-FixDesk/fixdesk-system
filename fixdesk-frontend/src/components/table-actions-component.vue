<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'

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
  'change-status',
  'close-job',
  'open-stock',
])

// Computed: เช็คว่าเมนูนี้เปิดอยู่ไหม
const isMenuOpen = computed(() => props.openMenuId === props.rowId)

function toggleMenu(event) {
  event.stopPropagation()

  const next = isMenuOpen.value ? null : props.rowId
  emit('toggle-menu', next)
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
      class="w-8 h-8 bg-gray-700 hover:bg-gray-800 text-white rounded-md flex items-center justify-center"
      @click="toggleMenu"
      title="เมนู"
    >
      <img src="/icon/Kebab.svg" class="w-5 h-5" />
    </button>

    <!-- Dropdown Menu -->
    <div
      v-if="isMenuOpen"
      class="absolute right-0 mt-2 w-48 bg-white shadow-lg border border-gray-200 rounded-lg p-2 z-50"
    >
      <!-- ทุก role ใช้ได้ -->
      <button
        v-if="role !== 'stock'"
        @click="emit('detail', row)"
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
        <button
          v-if="normalizedStatus === 'pending'"
          @click="emit('accept', row)"
          class="w-full text-left px-3 py-2 hover:bg-gray-100"
        >
          รับงาน
        </button>

        <button
          v-if="normalizedStatus === 'in_progress'"
          @click="emit('close-job', row)"
          class="w-full text-left px-3 py-2 hover:bg-gray-100"
        >
          ปิดงาน
        </button>
        <div class="border-t border-gray-300 mx-1"></div>

        <button
          v-if="normalizedStatus !== 'done'"
          @click="emit('change-status', row)"
          class="w-full text-left px-3 py-2 hover:bg-gray-100"
        >
          เปลี่ยนสถานะ
        </button>
        <div class="border-t border-gray-300 mx-1"></div>

        <button
          v-if="normalizedStatus !== 'done'"
          @click="emit('open-stock', row)"
          class="w-full text-left px-3 py-2 hover:bg-gray-100"
        >
          เบิกวัสดุอุปกรณ์
        </button>
      </template>

      <!-- Admin / Location -->
      <template v-if="role === 'admin' || role === 'location'">
        <button
          @click="emit('edit', row)"
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
          @click="emit('delete', row)"
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
      <template v-if="role === 'assign'">
        <button
          v-if="!props.assignedTech"
          @click="emit('assign', row)"
          class="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
        >
          <img
            src="/icon/arrow-right.svg"
            class="bg-green-400 hover:bg-green-600 rounded-md p-1 h-6 w-6"
          />
          มอบหมายงาน
        </button>
      </template>

      <!-- User -->
      <template v-if="role === 'user'">
        <button
          v-if="normalizedStatus === 'pending'"
          @click="emit('edit', row)"
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
          @click="emit('delete', row)"
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
          @click="emit('edit', row)"
          class="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
        >
          <img src="/icon/edit-icon.svg" class="bg-amber-400 rounded-md p-1 h-6 w-6" />
          แก้ไข
        </button>

        <div class="border-t border-gray-200 my-1"></div>

        <button
          @click="emit('delete', row)"
          class="w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600 flex items-center gap-2"
        >
          <img src="/icon/bin-icon.svg" class="bg-red-400 rounded-md p-1 h-6 w-6" />
          ลบ
        </button>
      </template>
    </div>
  </div>
</template>
