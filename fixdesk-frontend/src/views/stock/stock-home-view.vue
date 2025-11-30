<template>
  <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-8xl container mx-auto px-5 py-6">

    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">หน้าแรก</h1>
        <p class="text-gray-600">รายการของที่เบิก</p>
      </div>
      <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        แจ้งซ่อม
      </button>
    </div>


    <!-- Stats cards -->
    <div class="flex flex-wrap justify-center gap-6 mb-8">
      <!-- Card 1 -->
      <div class="bg-white rounded-lg border p-6 w-60">
        <div class="text-center">
          <p class="text-gray-600 text-sm">จำนวนรายการ</p>
          <h2 class="text-2xl font-bold text-blue-600">{{ itemsCount }} รายการ</h2>
        </div>
      </div>

      <!-- Card 2 -->
      <div class="bg-white rounded-lg border p-6 w-60">
        <div class="text-center">
          <p class="text-gray-600 text-sm">ของเข้าใหม่วันนี้</p>
          <h2 class="text-2xl font-bold text-orange-500">{{ itemsNew }} รายการ</h2>
        </div>
      </div>

      <!-- Card 3 -->
      <div class="bg-white rounded-lg border p-6 w-60">
        <div class="text-center">
          <p class="text-gray-600 text-sm">คำขอเบิกรออนุมัติ</p>
          <h2 class="text-2xl font-bold text-green-600">{{ itemRequestWaiting }} รายการ</h2>
        </div>
      </div>

      <!-- Card 4 -->
      <div class="bg-white rounded-lg border p-6 w-60">
        <div class="text-center">
          <p class="text-gray-600 text-sm">คำขอเบิกไม่อนุมัติ</p>
          <h2 class="text-2xl font-bold text-red-600">{{ itemRequestDeclined }} รายการ</h2>
        </div>
      </div>
    </div>

    <!-- Bar Charts Box -->
    <div class="flex gap-4">
      <div class="bg-white rounded-xl border pt-4 px-6 flex-1">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-800">ภาพรวมสต็อก (กราฟ)</h1>
            <p class="text-gray-600">รายการของที่เบิก</p>
          </div>
          <div class="relative inline-block">
            <!-- Button shows the selected choice -->
            <button @click="open = !open" class="flex bg-white border border-gray-300 rounded px-5 py-2 text-gray-700 hover:bg-gray-100 focus:outline-none">
              {{ selected }}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="-4 0 24 12"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>

            <!-- Dropdown menu -->
            <div v-if="open" class="absolute right-0 mt-2 w-40 bg-white border border-gray-300 rounded shadow-lg z-10">
              <a href="#" @click.prevent="choose('7 วัน')" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">7 วัน</a>
              <a href="#" @click.prevent="choose('14 วัน')" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">14 วัน </a>
              <a href="#" @click.prevent="choose('21 วัน')" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">21 วัน</a>
            </div>
          </div>
        </div>
        <hr class="border-t-2 border-gray-300 my-4 -mx-6" />
        <!-- Charts -->
      </div>

      <!-- Recent Requests (x5) Box -->
      <div class="bg-white rounded-xl border pt-4 px-6 flex-2">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">คำขอเบิก (รออนุมัติ)</h1>
          <p class="text-gray-600">รายการของที่เบิก (5 รายการล่าสุด)</p>
        </div>
        <hr class="border-t-2 border-gray-300 my-4 -mx-6" />
        <div v-for="(item, index) in 5" :key="index" class="mb-4">
          <!-- Requests (x5)-->
          <span class="inline-block px-3 py-1 rounded-full" style="background-color:#D9EFFF; color:#0072C3; font-size:0.875rem; font-weight:500;">{{ Req_ID || "REQ-0000-000" }}</span>
          <p class="text-gray-600 text-sm text-xl"><b>{{ problem || "[หัวข้อปัญหา]" }}</b></p>
          <p class="text-[16px] text-[#A1A1A1]">เบิก {{ attempt || "[ครั้งที่เบิก]" }} • {{ us_id || "[ชื่อผู้เบิก]"}}</p>
          <p class="text-[16px] text-[#A1A1A1]">ขอเมื่อ {{ cate || "00/00/0000" }} {{ time || "00:00:00"}}</p>
        </div>
      </div>
    </div>

    <!-- End Page -->
  </div>
</template>

<style>
.flex-1 {
  flex: 1.4;
}
.flex-2 {
  flex: 1;
}
</style>

<script setup>

const itemsCount = 1
const itemsNew = 2
const itemRequestWaiting = 3
const itemRequestDeclined = 4

defineOptions({ name: 'StockHomeView' })
</script>

<script>
export default {
  data() {
    return {
      open: false,
      selected: '7 วัน'
    };
  },
  methods: {
    choose(option) {
      this.selected = option;
      this.open = false;
    }
  }
};
</script>
