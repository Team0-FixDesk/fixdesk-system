/**
 * =====================================================================
 * @file            product-card-component.vue
 * @layer           Component (Presentation Layer)
 * @version         1.0.0
 * @since
 * @author
 * @contributors
 *
 * @lastModified
 * @lastModifiedBy
 * @description
 *  การ์ดแสดงข้อมูลสินค้าในคลัง ใช้เลือกและเพิ่มสินค้าลงตะกร้าเพื่อเบิกของ
 * @features
 *
 * @usedBy
 *
 * @changelog
 *
 * =====================================================================
 */

<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['add'])
const imageRef = ref(null)

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
})

const isImageError = ref(false)

const statusColorClass = computed(() => {
  const status = props.product.status || ''

  if (status.includes('หมด') || status.includes('out') || status.includes('Out')) {
    return 'text-red-600 bg-red-50'
  }
  if (
    status.includes('น้อย') ||
    status.includes('low') ||
    status.includes('Low') ||
    status.includes('ใกล้')
  ) {
    return 'text-orange-600 bg-orange-50'
  }
  return 'text-green-600 bg-green-50'
})
</script>

<template>
  <div
    class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow duration-300 flex flex-col h-full group"
  >
    <!-- รูปสินค้า (ใหญ่ขึ้น) -->
    <div
      class="h-40 w-full bg-gray-50 flex items-center justify-center overflow-hidden"
    >
      <img
        v-if="product.imageUrl && !isImageError"
        :src="product.imageUrl"
        :alt="product.name"
        @error="isImageError = true"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />

      <div
        v-else
        class="flex flex-col items-center justify-center text-gray-400 p-3 text-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="42"
          height="42"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mb-1 opacity-50"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
        <span class="text-xs font-medium">รอรูปสินค้า</span>
      </div>
    </div>

    <!-- เนื้อหา (กระชับลง) -->
    <div class="p-3 flex flex-col flex-grow">
      <h3
        class="text-sm font-semibold text-gray-800 mb-1 line-clamp-1"
        :title="product.name"
      >
        {{ product.name }}
      </h3>

      <div class="space-y-1 text-xs text-gray-500 mb-2 flex-grow">
        <div class="flex justify-between items-center">
          <span class="text-gray-400">รหัส:</span>
          <span>{{ product.serialNumber }}</span>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-gray-400">หมวด:</span>
          <span class="line-clamp-1 text-right">{{ product.category }}</span>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-gray-400">คงเหลือ:</span>
          <span class="text-gray-800 font-semibold">
            {{ product.quantity }} {{ product.unit }}
          </span>
        </div>

        <div class="flex justify-between items-center pt-1 border-t border-gray-100">
          <span class="text-gray-400">สถานะ:</span>
          <span
            class="px-2 py-0.5 rounded-md text-[11px] font-semibold"
            :class="statusColorClass"
          >
            {{ product.status }}
          </span>
        </div>
      </div>

      <button
        @click="emit('add', product, imageRef)"
        class="w-full py-2 text-xs rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 active:scale-95 transition-all duration-200 mt-auto"
      >
        เพิ่มลงตะกร้า
      </button>
    </div>
  </div>
</template>
