<script setup>
import { computed } from 'vue'

/**
 * รับข้อมูล items จาก component import-stock-component
 * คาดหวังว่าข้อมูลที่ส่งมา (props.items) จะถูก map มาจาก Excel แล้วตาม Key ด้านล่างนี้:
 * - pd_name (ชื่อรายการ)
 * - pd_asset_code (หมายเลขครุภัณฑ์)
 * - pd_category_name (หมวดหมู่)
 * - pd_quantity (จำนวน)
 * - pd_unit_name (หน่วยนับ)
 * - status (สถานะ)
 */
const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
})

/* Events */
const emit = defineEmits(['back', 'close', 'refresh', 'success', 'error'])

const API_BASE = import.meta.env.VITE_API_BASE

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/* Checkbox Logic */
const hasValidItem = computed(() => (props.items || []).some((item) => item.isValid))
const selectedCount = computed(
  () => (props.items || []).filter((item) => item.selected && item.isValid).length,
)
const allSelected = computed({
  get() {
    const validItems = (props.items || []).filter((item) => item.isValid)
    if (!validItems.length) return false
    return validItems.every((item) => item.selected)
  },
  set(val) {
    // ตรงนี้ถ้า items ไม่มี ก็จะไม่ทำงาน ไม่ error
    if (props.items) {
      props.items.forEach((item) => {
        if (item.isValid) item.selected = val
      })
    }
  },
})

/* Import Function */
async function importSelected() {
  const selected = props.items.filter((item) => item.selected && item.isValid)

  try {
    const res = await fetch(`${API_BASE}/stock/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        // Map ข้อมูลตามคอลัมน์ใน Excel Stock
        items: selected.map((item) => ({
          pd_name: item.pd_name, // ชื่อรายการ
          pd_asset_code: item.pd_asset_code, // หมายเลขครุภัณฑ์
          pd_category_name: item.pd_category_name, // หมวดหมู่
          pd_quantity: Number(item.pd_quantity), // จำนวน (แปลงเป็นตัวเลข)
          pd_unit_name: item.pd_unit_name, // หน่วยนับ
          status: item.status, // สถานะ
        })),
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      emit('error', result.message || 'Import failed')
      return
    }

    emit('success', result)
    emit('refresh')
    emit('close')
  } catch (err) {
    console.error(err)
    emit('error', 'ไม่สามารถเชื่อมต่อ backend ได้')
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          v-model="allSelected"
          :disabled="!hasValidItem"
          class="hidden peer"
        />
        <div
          class="flex items-center justify-center w-4 h-4 border border-gray-400 peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-disabled:opacity-40"
        >
          <svg
            v-if="allSelected"
            xmlns="http://www.w3.org/2000/svg"
            class="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="3"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span>เลือกทั้งหมด</span>
      </label>
      <span class="text-sm text-gray-500"> {{ selectedCount }} รายการที่เลือก </span>
    </div>

    <div class="overflow-auto border rounded-lg max-h-96">
      <table class="w-full text-sm">
        <thead class="sticky top-0 z-10 bg-gray-100 shadow-sm">
          <tr>
            <th class="p-2 w-10"></th>
            <th class="p-2 text-left">ชื่อรายการ</th>
            <th class="p-2 text-left">ครุภัณฑ์</th>
            <th class="p-2 text-left">หมวดหมู่</th>
            <th class="p-2 text-center w-20">จำนวน</th>
            <th class="p-2 text-left w-20">หน่วย</th>
            <th class="p-2 text-left w-24">สถานะ</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(item, index) in items"
            :key="index"
            :class="!item.isValid ? 'bg-red-50' : 'hover:bg-gray-50'"
          >
            <td class="p-3">
              <label class="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="item.selected"
                  :disabled="!item.isValid"
                  class="hidden peer"
                />
                <div
                  class="flex items-center justify-center w-4 h-4 border border-gray-400 peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-disabled:opacity-40"
                >
                  <svg
                    v-if="item.selected"
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="3"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </label>
            </td>

            <td class="p-2 font-medium">
              {{ item.pd_name }}
            </td>

            <td class="p-2 font-mono text-xs text-gray-600">
              {{ item.pd_asset_code || '-' }}
            </td>

            <td class="p-2">
              {{ item.pd_category_name }}
            </td>

            <td class="p-2 text-center">
              {{ item.pd_quantity }}
            </td>

            <td class="p-2 text-gray-500">
              {{ item.pd_unit_name }}
            </td>

            <td class="p-2">
              <span
                class="px-2 py-1 text-xs rounded"
                :class="
                  item.status === 'พร้อมใช้งาน' || item.status === 'Active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                "
              >
                {{ item.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex justify-end gap-2 mt-4">
      <button
        class="inline-flex items-center justify-center w-full h-10 px-4 font-medium text-gray-700 transition-colors border border-gray-300 rounded-md sm:justify-start sm:w-auto hover:bg-gray-50"
        @click="$emit('back')"
      >
        ย้อนกลับ
      </button>

      <button
        class="inline-flex items-center justify-center w-full h-10 px-4 font-medium text-white transition-colors bg-green-500 rounded-md sm:w-auto sm:justify-start hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        :disabled="selectedCount === 0"
        @click="importSelected"
      >
        Import {{ selectedCount }} รายการ
      </button>
    </div>
  </div>
</template>
