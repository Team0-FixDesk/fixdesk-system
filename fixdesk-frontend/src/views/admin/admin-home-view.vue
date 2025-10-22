<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header section -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">หน้าแรก</h1>
        <p class="text-gray-600">ภาพรวมงานแจ้งเรียนแจ้งซ่อม</p>
      </div>
      <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        แจ้งซ่อม
      </button>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Card 1 -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-blue-600">5 งาน</h2>
          <p class="text-gray-600 text-sm">งานทั้งหมดในวันนี้</p>
        </div>
      </div>

      <!-- Card 2 -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-orange-500">5 งาน</h2>
          <p class="text-gray-600 text-sm">กำลังดำเนินการ</p>
        </div>
      </div>

      <!-- Card 3 -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-green-600">7 งาน</h2>
          <p class="text-gray-600 text-sm">เสร็จสิ้น (7 วัน)</p>
        </div>
      </div>

      <!-- Card 4 -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-red-600">1 งาน</h2>
          <p class="text-gray-600 text-sm">ยกเลิก (7 วัน)</p>
        </div>
      </div>
    </div>

    <!-- Recent requests table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="p-6 border-b">
        <h2 class="text-lg font-semibold text-gray-800">รายการแจ้งซ่อมล่าสุด</h2>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ใบแจ้งซ่อม</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อผู้แจ้ง</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ประเภท</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หมายเลขครุภัณฑ์</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หน่วยงาน</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ความเร่งด่วน</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะงาน</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายละเอียด</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(request, index) in repairRequests" :key="index" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ request.date }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ request.ticketId }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ request.requesterName }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ request.type }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ request.assetId }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ request.department }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="`inline-flex px-2 py-1 text-xs font-medium rounded-full ${request.urgency === 'เร่งด่วนมาก' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`">
                  {{ request.urgency }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="`inline-flex px-2 py-1 text-xs font-medium rounded-full ${request.status === 'รอดำเนินการ' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`">
                  {{ request.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button class="text-blue-600 border border-blue-600 hover:bg-blue-50 px-3 py-1 rounded-md text-sm">
                  รายละเอียด
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              แสดง <span class="font-medium">1</span> ถึง <span class="font-medium">5</span> จากทั้งหมด <span class="font-medium">20</span> รายการ
            </p>
          </div>
          <div>
            <nav class="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <a href="#" class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                <span class="sr-only">Previous</span>
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </a>
              <a href="#" class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                1
              </a>
              <a href="#" class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-blue-50 text-sm font-medium text-blue-600 hover:bg-blue-100">
                2
              </a>
              <a href="#" class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                3
              </a>
              <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                ...
              </span>
              <a href="#" class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                10
              </a>
              <a href="#" class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                <span class="sr-only">Next</span>
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Mock data สำหรับแสดงในตาราง
const repairRequests = ref([
  {
    date: '11/11/1111',
    ticketId: 'ABC-000',
    requesterName: 'ABC',
    type: 'ไฟฟ้า',
    assetId: 'ABC-000',
    department: 'ABC-000',
    urgency: 'เร่งด่วนมาก',
    status: 'รอดำเนินการ'
  },
  {
    date: '11/11/1111',
    ticketId: 'ABC-000',
    requesterName: 'ABC',
    type: 'ไฟฟ้า',
    assetId: 'ABC-000',
    department: 'ABC-000',
    urgency: 'เร่งด่วนมาก',
    status: 'รอดำเนินการ'
  },
  {
    date: '11/11/1111',
    ticketId: 'ABC-000',
    requesterName: 'ABC',
    type: 'ไฟฟ้า',
    assetId: 'ABC-000',
    department: 'ABC-000',
    urgency: 'เร่งด่วนมาก',
    status: 'รอดำเนินการ'
  },
  {
    date: '11/11/1111',
    ticketId: 'ABC-000',
    requesterName: 'ABC',
    type: 'ไฟฟ้า',
    assetId: 'ABC-000',
    department: 'ABC-000',
    urgency: 'เร่งด่วนมาก',
    status: 'รอดำเนินการ'
  },
  {
    date: '11/11/1111',
    ticketId: 'ABC-000',
    requesterName: 'ABC',
    type: 'ไฟฟ้า',
    assetId: 'ABC-000',
    department: 'ABC-000',
    urgency: 'เร่งด่วนมาก',
    status: 'รอดำเนินการ'
  }
])

// เตรียมสำหรับการเชื่อมต่อ API ในอนาคต
// const fetchRepairRequests = async () => {
//   try {
//     const response = await fetch('your-api-endpoint');
//     const data = await response.json();
//     repairRequests.value = data;
//   } catch (error) {
//     console.error('Error fetching repair requests:', error);
//   }
// }

// เมื่อต้องการเชื่อมต่อ API ให้เรียกใช้ฟังก์ชัน fetchRepairRequests ใน onMounted
// onMounted(() => {
//   fetchRepairRequests();
// })

defineOptions({ name: 'AdminHomeView' })
</script>
