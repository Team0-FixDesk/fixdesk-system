/**
 * =====================================================================
 * @file            technician-withdraw-confirm.view.vue
 * @module          มอดูลการจัดการงานของช่าง - การเบิกของ และดูรายละเอียดการเบิก
 * @layer           Component (Presentation Layer)
 * @version         1.0.0
 * @since           2025-12-24
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-03-01
 * @lastModifiedBy  วิศรุต ภู่ระหงษ์
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอยืนยันการเบิกวัสดุ/อุปกรณ์ของช่างซ่อม
 *   - แสดงข้อมูลผู้ทำรายการ (ชื่อ / หน่วยงาน)
 *   - แสดงหมายเลขใบแจ้งซ่อมที่อ้างอิง
 *   - กรอกวันที่ทำการเบิก
 *   - แสดงรายการวัสดุ/อุปกรณ์ที่เลือกเบิก
 *   - คำนวณและแสดงจำนวนรวมทั้งหมด
 *   - ส่งข้อมูลยืนยันการเบิกกลับไปยัง parent component
 *
 * @requires
 *  - vue
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - แก้ไขการใช้สัญลักษณ์ *   [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - แก้ไขข้อความคำอธิบาย   [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - แก้ไขวันที่เบิกมีค่าเริ่มต้นเป็นวันที่ปัจจุบัน [2026-03-01, วิศรุต ภู่ระหงษ์]
 *
 * =====================================================================
 */

<script setup>
import { ref } from 'vue'

const props = defineProps({
  items: Array,
  total: Number,
  loading: Boolean,

  requesterName: String,
  department: String,
  repairCode: String,
})

const emits = defineEmits(['confirm', 'back'])

// ช่องนี้ผู้ใช้กรอกเอง
const withdrawDate = ref(new Date().toISOString().split('T')[0])
</script>
<template>
  <div class="flex flex-col h-full w-full">
    <!-- ========== SECTION A: FORM AREA ========== -->
    <div class="pb-4 mb-4 border-b border-gray-200">
      <h3 class="text-lg font-semibold text-gray-700 mb-4">แบบฟอร์มขอเบิกวัสดุ/อุปกรณ์</h3>

      <div class="space-y-4">
        <!-- ชื่อ + หน่วยงาน -->
        <div class="grid grid-cols-2 gap-3">
          <!-- ชื่อ -->
          <div class="flex flex-col">
            <label class="text-sm text-gray-600 mb-1">ชื่อผู้ทำรายการ <span class="text-red-500">*</span></label>
            <input
              type="text"
              :value="props.requesterName"
              disabled
              class="h-10 px-3 border rounded-lg bg-gray-100 text-gray-500"
            />
          </div>

          <!-- หน่วยงาน -->
          <div class="flex flex-col">
            <label class="text-sm text-gray-600 mb-1">หน่วยงาน <span class="text-red-500">*</span></label>
            <input
              type="text"
              :value="props.department"
              disabled
              class="h-10 px-3 border rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
        </div>

        <!-- หมายเลขใบแจ้งซ่อม + วันที่ -->
        <div class="grid grid-cols-2 gap-3">
          <!-- หมายเลขแจ้งซ่อม -->
          <div class="flex flex-col">
            <label class="text-sm text-gray-600 mb-1">หมายเลขใบแจ้งซ่อม <span class="text-red-500">*</span></label>
            <input
              type="text"
              :value="props.repairCode"
              disabled
              class="h-10 px-3 border rounded-lg bg-gray-100 text-gray-500"
            />
          </div>

          <!-- วันที่ทำการเบิก -->
          <div class="flex flex-col">
            <label class="text-sm text-gray-600 mb-1">วันที่เบิก <span class="text-red-500">*</span></label>
            <input
              type="date"
              v-model="withdrawDate"
              class="h-10 px-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <h3 class="text-lg text-gray-700 font-semibold mb-4">รายการที่เบิก</h3>

      <div class="space-y-2">
        <div
          v-for="item in items"
          :key="item.id"
          class="border p-3 rounded-lg flex justify-between items-center bg-gray-50"
        >
          <span>{{ item.name }}</span>
          <span class="font-semibold">x {{ item.qty }}</span>
        </div>
      </div>
    </div>

    <!--         BUTTONS           -->
    <div class="mt-6 flex flex-col gap-3">
      <p class="mt-4 text-gray-700">
        รวมทั้งหมด : <strong>{{ total }}</strong> รายการ
      </p>
      <button
        class="w-full py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
        :disabled="loading"
        @click="
          emits('confirm', {
            requesterName: props.requesterName,
            department: props.department,
            repairCode: props.repairCode,
            withdrawDate,
          })
        "
      >
        <span v-if="!loading">ส่งแบบฟอร์มคำขอเบิก</span>
        <span v-else>กำลังประมวลผล...</span>
      </button>

      <button
        class="w-full py-3 border rounded-xl hover:bg-gray-100 transition"
        @click="$emit('back')"
      >
        กลับไปเลือกวัสดุ/อุปกรณ์เพิ่มเติม
      </button>
    </div>
  </div>
</template>
