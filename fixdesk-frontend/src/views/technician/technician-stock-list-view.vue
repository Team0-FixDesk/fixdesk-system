<script setup>
defineOptions({ name: 'TechnicianStockListView' })

import { ref } from 'vue'
import ProductCardComponent from '@/components/product-card-component.vue'

// --- ตัวแปรสำหรับ Filter ---
const searchQuery = ref('')
const showTypeFilter = ref(false)
const showCountFilter = ref(false)
const showUnitFilter = ref(false)
const showUrgencyFilter = ref(false)
const selectedTypes = ref([])
const selectedUrgencies = ref([])

// --- หมวดหมู่ของรายการของ ---
// รอดึง API 
const technicianTypes = ['ไฟฟ้า', 'ประปา', 'อิเล็กทรอนิกส์', 'เครื่องกล']

// --- ข้อมูลจำลอง (Mock Data) ใน Card แสดงผล ---
const filteredProducts = ref([
  {
    id: 1,
    name: 'หลอดไฟ LED 12W',
    serialNumber: 'EL-001',
    category: 'ไฟฟ้า',
    quantity: 50,
    unit: 'ชิ้น',
    status: 'พร้อมใช้งาน', // เพิ่มสถานะ
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800'
  },

])
</script>


<template>
  <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-8xl container px-5 py-6 min-h-screen">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-black">รายการคลังสินค้า</h1>
    </div>

    <!-- ฟิลเตอร์ของ-->
    <div class="mb-6">
      <div class="flex flex-wrap md:flex-nowrap items-start md:items-center justify-between gap-4">
        <!-- ฟิลเตอร์ค้นหา -->
        <div class="flex flex-wrap items-center gap-3 flex-grow relative">

          <input v-model="searchQuery" type="text" placeholder="ค้นหารายการของ"
            class="text-gray-700 w-full md:w-[400px] h-10 px-4 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          <!-- ฟิลเตอร์หมวดหมู่ -->
          <div class="relative">
            <button @click.stop="showTypeFilter = !showTypeFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700">
              หมวดหมู่
              <img src="/icon/sidebar/chevron-down-icon.svg" class="w-4 h-4 opacity-70"
                :class="{ 'rotate-180': showTypeFilter }" />
            </button>
            <div v-if="showTypeFilter"
              class="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-20">
              <label v-for="t in technicianTypes" :key="t"
                class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" :value="t" v-model="selectedTypes"
                  class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">{{ t }}</span>
              </label>
            </div>
          </div>
          <!-- ฟิลเตอร์จำนวนคงเหลือ -->
          <div class="relative">
            <button @click.stop="showCountFilter = !showCountFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700">
              จำนวนคงเหลือ
              <img src="/icon/sidebar/chevron-down-icon.svg" class="w-4 h-4 opacity-70"
                :class="{ 'rotate-180': showCountFilter }" />
            </button>
            <div v-if="showCountFilter"
              class="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-20">
              <div class="text-sm text-gray-400">ตัวเลือกจำนวน...</div>
            </div>
          </div>
          <!-- ฟิลเตอร์หน่วยนับ -->
          <div class="relative">
            <button @click.stop="showUnitFilter = !showUnitFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700">
              หน่วยนับ
              <img src="/icon/sidebar/chevron-down-icon.svg" class="w-4 h-4 opacity-70"
                :class="{ 'rotate-180': showUnitFilter }" />
            </button>
            <div v-if="showUnitFilter"
              class="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-20">
              <div class="text-sm text-gray-400">ตัวเลือกหน่วยนับ...</div>
            </div>
          </div>
          <!-- ฟิลเตอร์สถานะ -->
          <div class="relative">
            <button @click.stop="showUrgencyFilter = !showUrgencyFilter"
              class="flex items-center gap-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700">
              สถานะ
              <img src="/icon/sidebar/chevron-down-icon.svg" class="w-4 h-4 opacity-70"
                :class="{ 'rotate-180': showUrgencyFilter }" />
            </button>

            <div v-if="showUrgencyFilter"
              class="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-20">
              <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" value="low" v-model="selectedUrgencies"
                  class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">in stock</span>
              </label>
              <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" value="medium" v-model="selectedUrgencies"
                  class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">low stock</span>
              </label>
              <label class="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" value="high" v-model="selectedUrgencies"
                  class="w-4 h-4 text-blue-600 border-gray-300" />
                <span class="ml-2">out of stock</span>
              </label>
            </div>
          </div>

        </div>
        <!-- ปุ่มตระกร้า -->
        <div class="flex-none">
          <button
            class="inline-flex items-center h-10 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            🛒 ตะกร้า
          </button>
        </div>

        <!-- Side Bar ของตระกร้า-->
      </div>
    </div>

    <div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <ProductCardComponent v-for="product in filteredProducts" :key="product.id" :product="product" />
      </div>

      <div v-if="filteredProducts.length === 0" class="text-center py-10 text-gray-400">
        ไม่พบรายการสินค้า
      </div>
    </div>

  </div>
</template>

