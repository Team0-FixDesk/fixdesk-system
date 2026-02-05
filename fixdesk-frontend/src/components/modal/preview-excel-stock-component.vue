<script setup>
import { computed } from 'vue'

/**
 * รับข้อมูล stock จาก component import-stock-component
 */
const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
})

/*
  back    = ย้อนกลับไปหน้า upload
  close   = ปิด popup
  refresh = โหลดตารางรายการอุปกรณ์ใหม่หลัง import สำเร็จ
 */
const emit = defineEmits(['back', 'close', 'refresh'])

const API_BASE = import.meta.env.VITE_API_BASE

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/**
 * เช็คว่ามีรายการที่ valid อย่างน้อย 1 ตัวไหม
 * ใช้เปิด/ปิด checkbox “เลือกทั้งหมด”
 */
const hasValidItem = computed(() => props.items.some((u) => u.isValid))
const selectedCount = computed(() => props.items.filter((u) => u.selected && u.isValid).length)

/**
 * checkbox “เลือกทั้งหมด”
 * get เช็คว่าอุปกรณ์ที่ valid ทุกตัวถูกเลือก
 * set ติ๊ก / เอาติ๊กออกเฉพาะตัวที่ valid
 */
const allSelected = computed({
  get() {
    const validItems = props.items.filter((u) => u.isValid)
    if (!validItems.length) return false
    return validItems.every((u) => u.selected)
  },
  set(val) {
    props.items.forEach((u) => {
      if (u.isValid) u.selected = val
    })
  },
})

async function importSelected() {
  // เลือกเฉพาะอุปกรณ์ที่ติ๊กเลือก และข้อมูลถูกต้อง
  const selected = props.items.filter((u) => u.selected && u.isValid)

  try {
    const res = await fetch(`${API_BASE}/stock/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items: selected }),
    })

    if (!res.ok) {
      const err = await res.json()
      alert(err.message || 'Import failed')
      return
    }

    emit('close')
    emit('refresh')
  } catch (err) {
    console.error(err)
    alert('ไม่สามารถเชื่อมต่อ backend ได้')
  }
}
</script>

<!-- หน้า Preview หลังจากอัปโหลดไฟล์ Excel สามารถเลือกอุปกรณ์ที่ต้องการ import ได้ -->
<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <label class="flex items-center gap-2 cursor-pointer">

        <!-- checkbox สำหรับเลือก import ทั้งหมด (เฉพาะแถวที่มีข้อมูลที่ถูกต้อง) -->
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

      <!-- จำนวนรายการที่เลือก import -->
      <span class="text-sm text-gray-500"> {{ selectedCount }} รายการที่เลือก </span>
    </div>

    <!-- ตารางแสดงข้อมูลอุปกรณ์ก่อน import -->
    <div class="overflow-auto border rounded-lg max-h-96">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-100">
          <tr>
            <th class="p-2"></th>
            <th class="p-2 text-left">ชื่อรายการ</th>
            <th class="p-2 text-left">ครุภัณฑ์</th>
            <th class="p-2 text-left">หมวดหมู่</th>
            <th class="p-2 text-left">จำนวน</th>
            <th class="p-2 text-left">หน่วย</th>
            <th class="p-2 text-left">สถานะ</th>
          </tr>
        </thead>

        <!-- ข้อมูลในตาราง -->
        <tbody>
          <!-- ถ้าข้อมูลไม่ถูกต้อง แถวจะเป็นสีแดง -->
          <tr
            v-for="(u, index) in items"
            :key="u.id || index"
            :class="!u.isValid ? 'bg-red-50' : ''"
          >
            <!-- checkbox ในตาราง-->
            <td class="p-2">
              <label class="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="u.selected"
                  :disabled="!u.isValid"
                  class="hidden peer"
                />
                <div
                  class="flex items-center justify-center w-4 h-4 border border-gray-400 rounded-none peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-disabled:opacity-40"
                >
                  <svg
                    v-if="u.selected"
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

            <!-- ชื่อรายการ -->
            <td class="p-2">{{ u.pd_name }}</td>

            <!-- หมายเลขครุภัณฑ์ -->
            <td class="p-2">{{ u.pd_asset_code || '-' }}</td>

            <!-- หมวดหมู่ -->
            <td class="p-2">{{ u.pd_category_name }}</td>

            <!-- จำนวน -->
            <td class="p-2">{{ u.pd_quantity }}</td>

            <!-- หน่วย -->
            <td class="p-2">{{ u.pd_unit_name }}</td>

            <!-- สถานะ -->
            <td class="p-2">{{ u.status }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex justify-end gap-2 mt-4">
      <button
        class="inline-flex items-center justify-center w-full h-10 px-4 font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
        @click="$emit('back')"
      >
        ย้อนกลับ
      </button>

      <button
        class="inline-flex items-center justify-center w-full h-10 px-4 font-medium text-white bg-green-500 rounded-md hover:bg-green-600 disabled:bg-gray-400"
        :disabled="selectedCount === 0"
        @click="importSelected"
      >
        Import รายการที่เลือก
      </button>
    </div>
  </div>
</template>
