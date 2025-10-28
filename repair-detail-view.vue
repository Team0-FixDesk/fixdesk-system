<script setup>
// 🎯 ตอนหลังพี่จะ fetch ข้อมูลจริงด้วย useRoute() ได้
// import { ref, onMounted } from 'vue'
// import { useRoute } from 'vue-router'
// const route = useRoute()
// const repairCode = route.params.code
</script>

<template>
  <div class="bg-gray-50 min-h-screen py-10 space-y-8">
    <!-- 🔹 ส่วนหัวเรื่อง -->
    <div class="bg-white rounded-xl shadow-sm p-8 mx-auto max-w-7xl border border-gray-100">
      <div class="flex items-start justify-between">
        <!-- ซ้าย -->
        <div>
          <h1 class="text-xl font-bold text-gray-900 mb-1">รายละเอียดงานซ่อม</h1>
          <p class="text-gray-700 font-semibold">-</p>
          <p class="text-gray-500 mt-2">
            รายละเอียด : -
          </p>
        </div>

        <!-- ขวา (ป้ายสถานะ) -->
        <div class="flex flex-wrap gap-3 justify-end">
          <span class="bg-yellow-100 text-yellow-700 font-medium px-4 py-1.5 rounded-full">
            -
          </span>
          <span class="bg-red-100 text-red-600 font-medium px-4 py-1.5 rounded-full">
            -
          </span>
          <span class="bg-gray-200 text-gray-800 font-medium px-4 py-1.5 rounded-full">
            ประเภท : -
          </span>
        </div>
      </div>

      <!-- 🧍‍♂️ กล่องข้อมูล 3 ช่อง -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div class="border border-gray-200 rounded-lg p-4">
          <p class="text-sm text-gray-500">ผู้แจ้ง</p>
          <p class="font-medium text-gray-800">-</p>
        </div>

        <div class="border border-gray-200 rounded-lg p-4">
          <p class="text-sm text-gray-500">ผู้รับผิดชอบงานหลัก</p>
          <p class="font-medium text-gray-800">-</p>
          <p class="text-sm text-gray-500 mt-1">
            ตำแหน่ง : <span class="font-medium text-gray-800">-</span>
          </p>
        </div>

        <div class="border border-gray-200 rounded-lg p-4">
          <p class="text-sm text-gray-500">แจ้งซ่อมเมื่อ</p>
          <p class="font-medium text-gray-800">-</p>
        </div>
      </div>
    </div>

    <!-- 🔹 สองคอลัมน์หลัก -->
    <div class="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- ซ้าย 2 ช่อง -->
      <div class="lg:col-span-2 space-y-6">
        <!-- กล่องสถานที่และอุปกรณ์ -->
        <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">สถานที่และอุปกรณ์</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-500">
                  <img src="/icon/building-icon.svg" class="w-5 h-5" />
                </div>
                <p><span class="text-gray-500">อาคาร/ชั้น/ห้อง:</span> -</p>
              </div>

              <div class="flex items-center gap-3">
                <div class="w-10 h-10 flex items-center justify-center rounded-lg bg-green-500">
                  <img src="/icon/prop-icon.svg" class="w-5 h-5" />
                </div>
                <p><span class="text-gray-500">หมายเลขครุภัณฑ์:</span> -</p>
              </div>

              <div class="flex items-center gap-3">
                <div class="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-400">
                  <img src="/icon/item-icon.svg" class="w-5 h-5" />
                </div>
                <p><span class="text-gray-500">อุปกรณ์ที่ชำรุด:</span> -</p>
              </div>
            </div>

            <div
              class="border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm"
            >
              ไม่มีการแนบรูปภาพ
            </div>
          </div>
        </div>

        <!-- กล่องรายการเบิก -->
        <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">รายการเบิก</h2>
          <div class="text-center text-gray-400 text-lg py-8">- ไม่มีรายการเบิก -</div>
        </div>
      </div>

      <!-- ขวา -->
      <div class="space-y-6">
        <!-- ข้อมูลผู้แจ้ง -->
        <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div class="flex items-center gap-2 mb-3">
            <img src="/icon/user-icon2.svg" class="w-10 h-10" />
            <h2 class="text-lg font-semibold text-gray-800">ข้อมูลผู้แจ้ง</h2>
          </div>
          <div class="space-y-2 text-gray-700">
            <p><span class="text-gray-500">ชื่อ:</span> -</p>
            <p><span class="text-gray-500">เบอร์โทร:</span> -</p>
            <p><span class="text-gray-500">หน่วยงาน:</span> -</p>
          </div>
        </div>

        <!-- สถานะการดำเนินงาน -->
        <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div class="flex items-center gap-2 mb-3">
            <img src="/icon/time-icon.svg" class="w-8 h-8" />
            <h2 class="text-lg font-semibold text-gray-800">สถานะการดำเนินงาน</h2>
          </div>

          <!-- Timeline -->
          <ol class="relative border-s border-gray-200">
            <li class="mb-5 ms-5">
              <div
                class="absolute w-5 h-5 bg-yellow-400 rounded-full mt-2.5 -start-2.5 border border-white"
              ></div>
              <time class="mb-1 text-sm font-normal leading-none text-gray-400">-</time>
              <h3 class="text-base font-semibold text-gray-900">-</h3>
              <p class="text-sm font-normal text-gray-500">-</p>
            </li>

            <li class="mb-5 ms-5">
              <div
                class="absolute w-5 h-5 bg-amber-500 rounded-full mt-2.5 -start-2.5 border border-white"
              ></div>
              <time class="mb-1 text-sm font-normal leading-none text-gray-400">-</time>
              <h3 class="text-base font-semibold text-gray-900">-</h3>
              <p class="text-sm font-normal text-gray-500">-</p>
            </li>

            <li class="ms-5">
              <div
                class="absolute w-5 h-5 bg-gray-300 rounded-full mt-2.5 -start-2.5 border border-white"
              ></div>
              <time class="mb-1 text-sm font-normal leading-none text-gray-400">-</time>
              <h3 class="text-base font-semibold text-gray-500">-</h3>
              <p class="text-sm font-normal text-gray-400">-</p>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>
