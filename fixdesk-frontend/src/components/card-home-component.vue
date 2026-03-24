/**
 * =====================================================================
 * @file            card-home-component.vue
 * @layer           Component (UI Component)
 * @version         1.0.0
 * @since           2026-02-02
 * @author
 * @contributors
 *
 * @lastModified    2026-02-02
 * @lastModifiedBy
 * ---------------------------------------------------------------------
 * @description
 *  คอมโพเนนต์การ์ดสำหรับหน้าแรก แสดงค่าสรุปและป้ายกำกับของแต่ละไอเท็ม
 *  รองรับการคลิกเพื่อส่ง event กลับไปยัง parent component
 *
 * @requires
 *  - vue
 * ---------------------------------------------------------------------
 * @changelog
 *
 * =====================================================================
 */

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

    <div
      v-for="(item, index) in items"
      :key="index"
      @click="$emit('click', item)"
      class="bg-white hover:bg-gray-50 rounded-lg shadow p-6 cursor-pointer"
    >
      <div class="text-center">
        <h2 class="text-2xl font-bold" :class="item.colorClass">
          {{ item.value }} {{ itemUnit || 'งาน' }}
        </h2>
        <p class="text-gray-600 text-sm">{{ item.label }}</p>
      </div>
    </div>

  </div>
</template>

<script setup>
defineProps({
  // รับข้อมูลมาเป็น Array ก้อนเดียวเลย
  items: {
    type: Array,
    required: true,
    default: () => []
  },
  itemUnit: {
    type: String,
    required: false,
    default: 'งาน'
  }
})

defineEmits(['click'])
</script>
