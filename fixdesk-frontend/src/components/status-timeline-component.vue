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
      <div class="relative w-8 flex justify-center">
        <!-- เส้นแนวตั้ง -->
        <div
          v-if="index !== timelineSteps.length - 1"
          class="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2"
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
          class="relative z-10 flex h-5 w-5 rounded-full ring-8 ring-white shadow"
          :class="{
            'bg-green-500': step.stepState === 'completed',
            'bg-yellow-400': step.stepState === 'current',
            'bg-gray-300': step.stepState === 'upcoming',
          }"
        ></span>
      </div>

      <!-- เนื้อหา -->
      <div class="flex-1 -translate-y-1 pl-3 pb-6 text-gray-600">
        <div class="flex flex-col space-y-0.5">
          <!-- เวลา -->
          <p class="text-sm text-gray-500">
            {{ step.displayTime }}
          </p>
          <!-- ชื่อสถานะ -->
          <p class="text-gray-900 text-sm sm:text-base">
            {{ step.title }}
          </p>
          <!-- รายละเอียด -->
          <p class="text-sm text-gray-500">
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
