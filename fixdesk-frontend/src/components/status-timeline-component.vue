/**
 * =====================================================================
 * @file            status-timeline-component.vue
 * @module          Status Timeline Component
 * @layer           Component (Presentation Layer)
 * @version         1.0.0
 * @since           2026-03-21
 * @author          นราธิป แสนทวีสุข
 * @lastModified    2026-03-21
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 *  คอมโพเนนต์สำหรับแสดง Timeline ลำดับเหตุการณ์และสถานะการดำเนินงาน
 *  รับ props เป็น timelineSteps โดยแสดงจุดบอกสถานะ (สำเร็จ, ปัจจุบัน, รอดำเนินการ)
 * ---------------------------------------------------------------------
 * @changelog
 *   - Initial implementation
 *     [2026-03-21, นราธิป แสนทวีสุข]
 * =====================================================================
 */

<script setup>
const props = defineProps({
  timelineSteps: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <div class="mt-2 flex flex-col w-full items-start">
    <div
      v-for="(step, index) in timelineSteps"
      :key="index"
      class="flex w-full"
    >
      <!-- คอลัมน์เส้น + วงกลม -->
      <div class="relative w-10 flex justify-center">
        <!-- เส้นแนวตั้ง -->
        <div
          v-if="index !== timelineSteps.length - 1"
          class="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2"
          :class="{
            'bg-green-400':
              (step.stepState === 'completed' || step.stepState === 'current') &&
              (timelineSteps[index + 1]?.stepState === 'completed' ||
                timelineSteps[index + 1]?.stepState === 'current'),
            'bg-gray-200': !(
              (step.stepState === 'completed' || step.stepState === 'current') &&
              (timelineSteps[index + 1]?.stepState === 'completed' ||
                timelineSteps[index + 1]?.stepState === 'current')
            ),
          }"
        ></div>

        <!-- วงกลม (ขอบขาวหนา ๆ) -->
        <span
          class="relative z-10 flex h-6 w-6 rounded-full ring-[6px] ring-white shadow-sm"
          :class="{
            'bg-green-500': step.stepState === 'completed',
            'bg-amber-400': step.stepState === 'current',
            'bg-gray-200': step.stepState === 'upcoming',
          }"
        ></span>
      </div>

      <!-- เนื้อหา -->
      <div class="flex-1 -translate-y-1 pl-6 pb-10 text-gray-600">
        <div class="flex flex-col space-y-1.5">
          <!-- เวลา -->
          <p class="text-[13px] font-medium text-gray-400">
            {{ step.displayTime }}
          </p>
          <!-- ชื่อสถานะ -->
          <p class="text-gray-800 text-base sm:text-lg font-bold">
            {{ step.title }}
          </p>
          <!-- รายละเอียด -->
          <p class="text-[14px] font-medium text-gray-500 leading-snug">
            {{ step.description }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="!timelineSteps.length" class="text-gray-400 text-xs sm:text-sm text-center w-full">
      - ยังไม่มีประวัติการดำเนินการ -
    </div>
  </div>
</template>
