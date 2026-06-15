<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">

    <div
      v-for="(item, index) in items"
      :key="index"
      @click="$emit('click', item)"
      class="bg-white hover:bg-gray-50 rounded-lg shadow p-4 sm:p-5 cursor-pointer flex items-center justify-center"
    >
      <div class="text-center w-full">
        <h2 class="text-xl sm:text-2xl font-bold truncate" :class="item.colorClass">
          {{ item.value }} <span class="text-sm sm:text-base">{{ itemUnit || 'งาน' }}</span>
        </h2>
        <p class="text-gray-600 text-xs sm:text-sm truncate">{{ item.label }}</p>
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
