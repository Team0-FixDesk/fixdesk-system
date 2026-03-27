/**
 * =====================================================================
 * @file            preview-user-excel-component.vue
 * @layer           Component Layer (UI Component)
 * @version         1.2.0
 * @since           2026-01-13
 * @author          นายณัฐภัทร จันทร์อิ่ม
 * @contributors
 *   - ณัฐภัทร (Nattaphat2004)
 *   - พชร ไพศรีสกุล (Pachara2004)
 *
 * @lastModified    2026-02-25
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  โมดอลแสดงตัวอย่างข้อมูลผู้ใช้จากไฟล์ Excel ก่อนนำเข้า
 *  แสดงรายการที่ parse แล้ว, ตรวจสอบความถูกต้อง และให้เลือกข้อมูลที่จะ import
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-01-13] V1.0.0 - นายณัฐภัทร จันทร์อิ่ม
 *  - สร้าง component preview สำหรับ import ข้อมูลผู้ใช้จาก Excel
 *  [2026-01-16] V1.0.1 - พชร ไพศรีสกุล
 *  - แก้ไข logic การ import user ฝั่ง frontend
 *  [2026-01-31] V1.0.2 - นายณัฐภัทร จันทร์อิ่ม
 *  - ปรับปรุงโครงสร้าง import Excel ให้รองรับระบบใหม่
 *  [2026-02-05] V1.1.0 - พชร ไพศรีสกุล
 *  - ปรับปรุงการ import user ให้สอดคล้องกับ backend
 *  - เพิ่ม validation และปรับปรุง UX การเลือก import
 *  [2026-02-25, พชร ไพศรีสกุล] V 1.2.0
 *  - แก้ไขการสร้างบัญชีผู้ใช้จากการ import จากไฟล์ ให้รองรับการสร้าง default รหัสผ่าน
 *
 * =====================================================================
 */

<script setup>
import { computed } from 'vue'

/**
 * รับข้อมูล users จาก component import-user-component
 * คาดหวังว่าข้อมูลที่ส่งมา (props.users) จะถูก map มาจาก Excel แล้วตาม Key ด้านล่างนี้:
 * Col 0: username
 * Col 1: title_name
 * Col 2: position (ตำแหน่งบุคลากร)
 * Col 3: first_name_th
 * Col 4: last_name_th
 * Col 5: first_name_en
 * Col 6: last_name_en
 * Col 7: phone
 * Col 8: department
 * Col 9: role_name
 * Col 10: technician_type
 */
const props = defineProps({
  users: {
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
const hasValidUser = computed(() => props.users.some((u) => u.isValid))
const selectedCount = computed(() => props.users.filter((u) => u.selected && u.isValid).length)

const allSelected = computed({
  get() {
    const validUsers = props.users.filter((u) => u.isValid)
    if (!validUsers.length) return false
    return validUsers.every((u) => u.selected)
  },
  set(val) {
    props.users.forEach((u) => {
      if (u.isValid) u.selected = val
    })
  },
})

/* Import Function */
async function importSelected() {
  const selected = props.users.filter((u) => u.selected && u.isValid)

  try {
    const res = await fetch(`${API_BASE}/users/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        // Map ข้อมูลตามคอลัมน์ใน Excel/CSV
        users: selected.map((u) => ({
          username: u.username,               // Col 0: ชื่อผู้ใช้
          title_name: u.title_name,           // Col 1: คำนำหน้า
          position: u.position,               // Col 2: ตำแหน่งบุคลากร (เพิ่มใหม่)
          first_name_th: u.first_name_th,     // Col 3: ชื่อไทย
          last_name_th: u.last_name_th,       // Col 4: นามสกุลไทย
          first_name_en: u.first_name_en,     // Col 5: ชื่ออังกฤษ
          last_name_en: u.last_name_en,       // Col 6: นามสกุลอังกฤษ
          phone: u.phone,                     // Col 7: เบอร์โทร
          department: u.department,           // Col 8: หน่วยงาน
          role_name: u.role_name,             // Col 9: บทบาท
          technician_type: u.technician_type, // Col 10: ตำแหน่งช่าง
        })),
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      emit('error', result.message || 'Import ไม่สำเร็จ')
      return
    }

    emit('success', result)
    emit('refresh')
    emit('close')
  } catch (err) {
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
          :disabled="!hasValidUser"
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
            <th class="p-2 text-left">ชื่อผู้ใช้</th>
            <th class="p-2 text-left">ชื่อ-นามสกุล</th>
            <th class="p-2 text-left">ตำแหน่ง</th>
            <th class="p-2 text-left">หน่วยงาน</th>
            <th class="p-2 text-left">บทบาท</th>
            <th class="p-2 text-left">ประเภทช่าง</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(u, index) in users"
            :key="index"
            :class="!u.isValid ? 'bg-red-50' : 'hover:bg-gray-50'"
          >
            <td class="p-3">
              <label class="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="u.selected"
                  :disabled="!u.isValid"
                  class="hidden peer"
                />
                <div
                  class="flex items-center justify-center w-4 h-4 border border-gray-400 peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-disabled:opacity-40"
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

            <td class="p-2 font-mono text-xs">
              {{ u.username }}
            </td>

            <td class="p-2">
              <div>{{ u.title_name }}{{ u.first_name_th }} {{ u.last_name_th }}</div>
              <div class="text-xs text-gray-400">{{ u.first_name_en }} {{ u.last_name_en }}</div>
            </td>

            <td class="p-2">
              {{ u.position || '-' }}
            </td>

            <td class="p-2">
              {{ u.department }}
            </td>

            <td class="p-2">
              <span class="px-2 py-1 text-xs rounded">
                {{ u.role_name }}
              </span>
            </td>

            <td class="p-2">
              <span
                v-if="u.role_name === 'Technician'"
                :class="u.technician_type ? 'text-blue-600' : 'text-red-500 font-bold'"
              >
                {{ u.technician_type || 'ไม่ระบุ' }}
              </span>
              <span v-else class="text-gray-300">-</span>
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
