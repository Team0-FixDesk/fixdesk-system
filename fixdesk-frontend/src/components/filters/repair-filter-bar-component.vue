/**
 * =====================================================================
 * @file            repair-filter-bar.component.vue
 * @layer           Component (Presentation Layer)
 * @version         1.0.0
 * @since           2026-01-07
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-02-18
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  คอมโพเนนต์ช่องค้นหา และตัวกรองข้อมูล
 *
 *  ความสามารถ:
 *   - ค้นหาข้อมูลด้วยข้อความ (Search)
 *   - กรองตามวันที่
 *   - กรองตามสถานะ (Multi-select)
 *   - กรองตามระดับความเร่งด่วน (เฉพาะโหมด repair)
 *   - รีเซ็ตตัวกรองทั้งหมด
 *
 *  พฤติกรรมจะปรับตาม props:
 *   - mode ('repair' | 'stock')
 *   - showStatus (Boolean)
 *   - showUrgencies (Boolean)
 *
 * @emits
 *   update:search
 *   update:statuses
 *   update:urgencies
 *   update:date
 *   reset
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  - ปรับปรุงคำอธิบายให้สอดคล้องกับบทบาทของคอมโพเนนต์   [2026-02-18, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *  - แก้ไขสีของช่องกรอกข้อมูล และตัวกรองข้อมูล           [2026-02-18, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * =====================================================================
 */

<script setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'

/* ==================== Props ==================== */
const props = defineProps({
  search: String,
  date: String,

  statuses: {
    type: Array,
    default: () => [],
  },

  urgencies: {
    type: Array,
    default: () => [],
  },

  mode: {
    type: String,
    default: 'repair', // 'repair' | 'stock'
  },

  /* 🔑 คุมว่าจะแสดง filter สถานะไหม */
  showStatus: {
    type: Boolean,
    default: true,
  },

  /* 🔑 คุมว่าจะแสดง filter ความเร่งด่วนไหม */
  showUrgencies: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits([
  'update:search',
  'update:statuses',
  'update:urgencies',
  'update:date',
  'reset',
])

/* ==================== State ==================== */
const isStatusOpen = ref(false)
const isUrgencyOpen = ref(false)

/* ==================== Mode ==================== */
const isRepair = computed(() => props.mode === 'repair')
const isStock = computed(() => props.mode === 'stock')

/* ==================== UI Config ==================== */
const searchPlaceholder = computed(() =>
  isStock.value ? 'ค้นหาใบเบิก / หน่วยงาน / รายละเอียด' : 'ค้นหาใบแจ้งซ่อม / หน่วยงาน / ครุภัณฑ์',
)

/* ==================== Status Options ==================== */
const statusOptions = computed(() => {
  if (isStock.value) {
    return [
      { value: 'approved', label: 'อนุมัติแล้ว' },
      { value: 'rejected', label: 'ไม่อนุมัติ' },
    ]
  }

  // repair
  return [
    { value: 'pending', label: 'รอดำเนินการ' },
    { value: 'in_progress', label: 'กำลังดำเนินการ' },
    { value: 'done', label: 'ดำเนินการเสร็จสิ้น' },
  ]
})

/* ==================== Actions ==================== */
function toggleStatus() {
  isStatusOpen.value = !isStatusOpen.value
  if (isStatusOpen.value) isUrgencyOpen.value = false
}

function toggleUrgency() {
  isUrgencyOpen.value = !isUrgencyOpen.value
  if (isUrgencyOpen.value) isStatusOpen.value = false
}

function toggleValue(list, value, emitName) {
  emit(emitName, list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
}
</script>

<template>
  <div class="mb-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <!-- LEFT -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Search -->
        <input
          :value="search"
          @input="emit('update:search', $event.target.value)"
          type="text"
          placeholder="ค้นหารายการแจ้งซ่อม"
          :title="searchPlaceholder"
          class="w-[260px] h-10 px-4 rounded-lg border border-gray-300 text-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />

        <!-- Date -->
        <input
          type="date"
          :value="date"
          @input="emit('update:date', $event.target.value)"
          class="h-10 px-3 rounded-lg border border-gray-300 text-gray-700"
        />

        <!-- Urgency (เฉพาะ Repair) -->
        <div v-if="isRepair && showUrgencies" class="relative">
          <button
            @click.stop="toggleUrgency"
            class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white hover:bg-gray-50 text-gray-500"
          >
            ความเร่งด่วน
            <Icon
              icon="meteor-icons:chevron-down"
              style="color: gray"
              class="w-4 h-4 opacity-70 transition-transform"
              :class="{ 'rotate-180': isUrgencyOpen }"
            />
          </button>

          <div
            v-if="isUrgencyOpen"
            class="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-50 text-sm"
          >
            <label
              v-for="u in [
                { value: 'low', label: 'ไม่เร่งด่วน' },
                { value: 'medium', label: 'เร่งด่วน' },
                { value: 'high', label: 'เร่งด่วนมาก' },
              ]"
              :key="u.value"
              class="flex items-center py-1 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                :checked="urgencies.includes(u.value)"
                @change="toggleValue(urgencies, u.value, 'update:urgencies')"
              />
              <span class="ml-2">{{ u.label }}</span>
            </label>
          </div>
        </div>

        <!-- Status -->
        <div v-if="showStatus" class="relative">
          <button
            @click.stop="toggleStatus"
            class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white hover:bg-gray-50 text-gray-500"
          >
            สถานะ
            <Icon
              icon="meteor-icons:chevron-down"
              style="color: gray"
              class="w-4 h-4 opacity-70 transition-transform"
              :class="{ 'rotate-180': isStatusOpen }"
            />
          </button>

          <div
            v-if="isStatusOpen"
            class="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-50 text-sm"
          >
            <label
              v-for="s in statusOptions"
              :key="s.value"
              class="flex items-center py-1 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                :checked="statuses.includes(s.value)"
                @change="toggleValue(statuses, s.value, 'update:statuses')"
              />
              <span class="ml-2">{{ s.label }}</span>
            </label>
          </div>
        </div>

        <!-- Reset -->
        <button
          v-if="search || statuses.length || urgencies.length || date"
          @click="emit('reset')"
          class="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          ล้างตัวกรอง
        </button>
      </div>

      <!-- RIGHT SLOT -->
      <slot name="right" />
    </div>
  </div>
</template>
