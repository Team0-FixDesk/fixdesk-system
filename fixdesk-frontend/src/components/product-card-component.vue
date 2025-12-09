<script setup>
import { ref, computed } from 'vue';

// รับข้อมูลสินค้าเข้ามา
const props = defineProps({
  product: {
    type: Object,
    required: true
  }
});

// State เช็คว่ารูปภาพโหลดได้หรือไม่
const isImageError = ref(false);

// ฟังก์ชันคำนวณสีของสถานะ (Computed Property)
// เช็คจากคำใน Text ของ status
const statusColorClass = computed(() => {
  const status = props.product.status || '';
  
  if (status.includes('หมด') || status.includes('out') || status.includes('Out')) {
    return 'text-red-600 bg-red-50'; // สีแดง
  }
  if (status.includes('น้อย') || status.includes('low') || status.includes('Low') || status.includes('ใกล้')) {
    return 'text-orange-600 bg-orange-50'; // สีส้ม
  }
  return 'text-green-600 bg-green-50'; // สีเขียว (ปกติ)
});
</script>

<template>
  <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-300 flex flex-col h-full group">
    
    <div class="h-48 w-full bg-gray-50 relative flex items-center justify-center overflow-hidden">
      
      <img 
        v-if="product.imageUrl && !isImageError"
        :src="product.imageUrl" 
        :alt="product.name"
        @error="isImageError = true"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />

      <div v-else class="flex flex-col items-center justify-center text-gray-400 p-4 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-2 opacity-50">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
        </svg>
        <span class="text-sm font-medium">รอรูปสินค้า</span>
      </div>

    </div>

    <div class="p-4 flex flex-col flex-grow">
      
      <h3 class="text-lg font-bold text-gray-800 mb-3 line-clamp-1" :title="product.name">
        {{ product.name }}
      </h3>

      <div class="space-y-2 text-sm text-gray-500 mb-4 flex-grow">
        
        <div class="flex justify-between items-center">
          <span class="font-medium text-gray-400">รหัส:</span> 
          <span>{{ product.serialNumber }}</span>
        </div>

        <div class="flex justify-between items-center">
          <span class="font-medium text-gray-400">หมวดหมู่:</span> 
          <span>{{ product.category }}</span>
        </div>

        <div class="flex justify-between items-center">
          <span class="font-medium text-gray-400">คงเหลือ:</span> 
          <span class="text-gray-800 font-semibold">{{ product.quantity }} {{ product.unit }}</span>
        </div>

        <div class="flex justify-between items-center pt-2 mt-2 border-t border-gray-100">
          <span class="font-medium text-gray-400">สถานะ:</span> 
          <span 
            class="px-2 py-1 rounded-md text-xs font-bold"
            :class="statusColorClass"
          >
            {{ product.status }}
          </span>
        </div>

      </div>

      <button class="w-full py-2.5 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 active:scale-95 transition-all duration-200 mt-auto">
        เพิ่มลงตระกร้า
      </button>

    </div>
  </div>
</template>