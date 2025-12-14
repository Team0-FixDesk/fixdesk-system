<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

    <div
      v-for="(item, index) in items"
      :key="index"
      @click="$emit('click', item)"
      class="bg-white rounded-lg shadow p-6 cursor-pointer"
    >
      <div class="text-center">
        <h2 class="text-2xl font-bold" :class="item.colorClass">
          {{ item.value }} {{ item.unit || 'งาน' }}
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
  }
})

defineEmits(['click'])
</script>
