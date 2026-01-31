<!-- หน้า Preview หลังจากอัปโหลดไฟล์ Excel สามารถเลือกผู้ใช้ที่ต้องการ import ได้ -->
<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <label class="flex items-center gap-2 cursor-pointer">
        <!-- checkbox สำหรับเลือก import ทั้งหมด (เฉพาะแถวที่มีข้อมูลที่ถูกต้อง) -->
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
    <!-- จำนวนรายการที่เลือก import -->
      <span class="text-sm text-gray-500"> {{ selectedCount }} รายการที่เลือก </span>
    </div>

    <!-- ตารางแสดงข้อมูลผู้ใช้ก่อน import -->
    <div class="overflow-auto border rounded-lg max-h-96">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-gray-100">
          <tr>
            <th class="p-2"></th>
            <th class="p-2 text-left">ชื่อ-นามสกุล</th>
            <th class="p-2 text-left">ชื่อผู้ใช้</th>
            <th class="p-2 text-left">หน่วยงาน</th>
            <th class="p-2 text-left">บทบาท</th>
            <th class="p-2 text-left">ตำแหน่ง</th>
          </tr>
        </thead>

        <!-- ข้อมูลในตาราง -->
        <tbody>
          <!-- ถ้าข้อมูลไม่ถูกต้อง แถวจะเป็นสีแดง -->
          <tr
            v-for="(u, index) in users"
            :key="u.username || index"
            :class="!u.isValid ? 'bg-red-50' : ''"
          >
            <!-- checkbox ในตาราง -->
            <td class="p-2">
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

            <!-- ชื่อ-นามสกุล -->
            <td class="p-2">{{ u.first_name_th }} {{ u.last_name_th }}</td>

            <!-- username -->
            <td class="p-2">
              {{ u.username }}
            </td>

            <!-- หน่วยงาน -->
            <td class="p-2">
              {{ u.department }}
            </td>

            <!-- บทบาท -->
            <td class="p-2">
              {{ u.role_name }}
            </td>

            <!-- ตำแหน่งของช่าง-->
            <td class="p-2">
              <!-- ถ้าไม่ระบุตำแหน่ง แสดงเป็นตัวอักษรสีแดง "ไม่ได้ระบุตำแหน่ง" -->
              <span
                v-if="u.role_name === 'Technician'"
                :class="u.technician_type ? 'text-gray-800' : 'text-red-500 font-medium'"
              >
                {{ u.technician_type || 'ไม่ได้ระบุตำแหน่ง' }}
              </span>
              <span v-else>-</span>
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

    <!-- ปุ่ม import -->
      <button
        class="inline-flex items-center justify-center w-full h-10 px-4 font-medium text-white transition-colors bg-green-500 rounded-md sm:w-auto sm:justify-start hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        :disabled="selectedCount === 0"
        @click="importSelected"
      >
        Import ผู้ใช้ที่เลือก
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

/**
 * รับข้อมูล users จาก component import-user-component
 */
const props = defineProps({
  users: {
    type: Array,
    required: true,
  },
})

/*
  back    = ย้อนกลับไปหน้า upload
  close   = ปิด popup
  refresh = โหลดตารางผู้ใช้ใหม่หลัง import สำเร็จ
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

/*
  ตรวจว่ามี user อย่างน้อย 1 คนที่ข้อมูลถูกต้อง
  ใช้เปิด/ปิด checkbox "เลือกทั้งหมด"
 */
const hasValidUser = computed(() => props.users.some((u) => u.isValid))
const selectedCount = computed(() => props.users.filter((u) => u.selected && u.isValid).length)

/*
  get เช็คว่าผู้ใช้ที่ valid ทุกคนถูกเลือกหรือยัง
  set ติ๊ก / เอาติ๊กออก ให้ผู้ใช้ที่ valid ทุกคน
 */
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


async function importSelected() {
  // เลือกเฉพาะ user ที่ติ๊กเลือก และข้อมูลถูกต้อง
  const selected = props.users.filter((u) => u.selected && u.isValid)

  try {
    const res = await fetch(`${API_BASE}/users/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        users: selected.map((u) => ({
          username: u.username,
          title_name: u.title_name,
          first_name_th: u.first_name_th,
          last_name_th: u.last_name_th,
          first_name_en: u.first_name_en,
          last_name_en: u.last_name_en,
          phone: u.phone,
          department: u.department,
          role_name: u.role_name,
          technician_type: u.technician_type,
        })),
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      alert(err.message || 'Import failed')
      return
    }

    const result = await res.json()
    console.log('IMPORT RESULT:', result)

    emit('close')
    emit('refresh')
  } catch (err) {
    console.error(err)
    alert('ไม่สามารถเชื่อมต่อ backend ได้')
  }
}
</script>
