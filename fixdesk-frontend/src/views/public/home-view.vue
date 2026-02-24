/**
 * =====================================================================
 * @file            home.view.vue
 * @module          มอดูลแจ้งซ่อม - การติดตามสถานะ และดูรายละเอียดคำร้องแจ้งซ่อม
 * @layer           View (Presentation Layer)
 * @version         1.0.1
 * @since           2025-02-04
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-02-19
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล 
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอสำหรับผู้ใช้งานภายนอกใช้ค้นหา และตรวจสอบสถานะงานซ่อม
 *  รองรับการค้นหาด้วย:
 *    - หมายเลขแจ้งซ่อม (rf_code)
 *    - ชื่อผู้แจ้ง        (reporter)
 *    - หน่วยงาน       (department)
 *
 * @requires
 *  - vue-router
 *  - @/composables/useRepairSearch
 *  - @/utils/repairStatus.util
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  - ปรับปรุงข้อความที่ใช้ให้เหมาะสม        [2569-02-17, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *  - แก้ไขแถบสถานะความคืบหน้าของงานซ่อม  [2569-02-17, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *  - ปรับปรุงข้อความอธิบายหน้าจอ          [2569-02-19, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * =====================================================================
 */

<script setup>

import { useRouter } from 'vue-router'
import { useRepairSearchProcess } from '@/composables/useRepairSearch'
import { getRepairStatusLabel, getRepairStatusColorClass, getProgressBarColor } from '@/utils/repairStatus.util'

import LogoFIXDESK from '@/assets/icons/LogoFIXDESK-logo.png'

const router = useRouter()

const {
  keyword,  // คำค้นหาที่ผู้ใช้ป้อนเข้า
  loading,  // สถานะการโหลด (จริง = กำลังค้นหา, เท็จ = เสร็จสิ้น)
  errorMessage,  // ข้อความข้อผิดพลาด (หากมี)
  searched,  // สถานะการค้นหา (จริง = ค้นหาแล้ว, เท็จ = ยังไม่ค้นหา)
  results,  // รายการผลลัพธ์การค้นหา
  currentPage,  // หน้าปัจจุบันของการแบ่งหน้า
  totalResultCount, // จำนวนรายการค้นหาที่พบ
  totalPages,  // จำนวนหน้าทั้งหมด
  handleSearch,  // ฟังก์ชันสำหรับการค้นหา
  goPrevPage,  // ฟังก์ชันสำหรับไปหน้าก่อนหน้า
  goNextPage,  // ฟังก์ชันสำหรับไปหน้าถัดไป
} = useRepairSearchProcess()

/* ฟังก์ชัน: นำทางผู้ใช้ไปยังหน้าเข้าสู่ระบบ */
const goToLogin = () => router.push('/login')
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center">
    <header class="w-full max-w-6xl flex justify-between items-center py-6 px-6">
      <div class="flex items-center gap-3 text-3xl font-semibold text-slate-800">
        <img :src="LogoFIXDESK" alt="FixDesk Logo" class="w-10 h-10 object-contain" />
        <span>FixDesk</span>
      </div>

      <button
        @click="goToLogin"
        class="px-6 py-2 bg-slate-800 hover:bg-slate-500 border border-slate-300 rounded-lg shadow-sm flex items-center gap-2 transition font-semibold text-white"
      >
        <span>เข้าสู่ระบบ</span>
      </button>
    </header>
    <section class="mt-6 mb-12 text-center">
      <h1 class="text-3xl font-bold text-slate-800 tracking-tight">ตรวจสอบสถานะงานซ่อม</h1>
      <p class="text-lg text-slate-500 mt-2">
        ค้นหารายการแจ้งซ่อม และติดตามสถานะงานซ่อมได้อย่างสะดวกรวดเร็ว
      </p>
    </section>

    <div class="w-full max-w-4xl bg-white p-8 shadow-md rounded-3xl border border-slate-200 mb-7">
      <!-- ป้ายกำกับสำหรับกล่องค้นหา -->
      <label class="text-slate-600 font-medium">
        ค้นหารายการแจ้งซ่อมด้วยหมายเลขแจ้งซ่อม ชื่อผู้แจ้งซ่อม หรือหน่วยงาน (ระบุอย่างใดอย่างหนึ่ง)
      </label>

      <div class="flex gap-3 mt-3">
        <!-- กล่องข้อความสำหรับการป้อนคำค้นหา -->
        <input
          v-model="keyword"
          type="text"
          @keyup.enter="handleSearch(1)"
          class="flex-1 px-5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-400 transition"
        />
        <!-- ปุ่มสำหรับค้นหา -->
        <button
          @click="handleSearch(1)"
          class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition active:scale-[0.97]"
        >
          ค้นหา
        </button>
      </div>

      <div class="mt-3 text-sm text-slate-400">
        ตัวอย่างการค้นหา : RF20250217001, สมชาย ใจดี, แผนก IT
      </div>
    </div>

    <!-- ส่วนผลลัพธ์ - แสดงผลลัพธ์การค้นหา -->
    <div class="w-full max-w-4xl">  
      <!-- แสดงข้อความกำลังค้นหา -->
      <div v-if="loading" class="text-center py-10 text-slate-500 animate-pulse">กำลังค้นหา...</div>

      <!-- แสดงข้อความข้อผิดพลาด (ถ้ามี) -->
      <div
        v-if="errorMessage && !loading"
        class="bg-red-50 text-red-600 p-5 rounded-2xl border border-red-200 shadow mb-5"
      >
        {{ errorMessage }}
      </div>

      <!-- แสดงข้อความ "ไม่พบรายการ" เมื่อค้นหาแล้วแต่ไม่มีผลลัพธ์ -->
      <div
        v-if="!loading && searched && results.length === 0"
        class="bg-white p-8 rounded-3xl shadow text-center border border-slate-200"
      >
        <p class="text-slate-500 text-lg">ไม่พบรายการที่ค้นหา</p>
      </div>

      <!-- แสดงจำนวนรายการที่พบ -->
      <p v-if="results.length > 0" class="text-slate-500 mb-3 text-md">
        พบ {{ totalResultCount }} รายการ
      </p>

      <!-- แสดงแต่ละรายการการซ่อม -->
      <div
        v-for="item in results"
        :key="item.rf_code"
        class="bg-white p-7 shadow-lg rounded-3xl border border-slate-200 hover:shadow-xl transition mb-6"
      >
        <!-- แถวบนของการ์ด: หมายเลขแจ้งซ่อมและสถานะ -->
        <div class="flex justify-between items-start">
          <!-- หมายเลขแจ้งซ่อม -->
          <p class="text-md font-semibold text-slate-700">หมายเลขแจ้งซ่อม : {{ item.rf_code }}</p>

          <!-- สถานะการซ่อม -->
          <span
            class="px-3 py-1 text-sm rounded-full"
            :class="getRepairStatusColorClass(item.rf_user_status)"
          >
            {{ getRepairStatusLabel(item.rf_user_status) }}
          </span>
        </div>

        <!-- ข้อมูลรายละเอียดการซ่อม -->
        <div class="mt-2 space-y-1 text-slate-800">
          <!-- ชื่อผู้แจ้ง -->
          <p>
            <strong>ผู้แจ้งซ่อม :</strong>
            {{ item.reporter_firstname }} {{ item.reporter_lastname }}
          </p>
          <!-- หน่วยงานของผู้แจ้ง -->
          <p>
            <strong>หน่วยงาน :</strong>
            {{ item.reporter_department }}
          </p>
          <!-- รายละเอียดปัญหา -->
          <p>
            <strong>เรื่องที่แจ้ง :</strong> {{ item.rf_problem }}
          </p>
          <!-- สถานที่ (สัญลักษณ์สถาปัตยกรรม) -->
          <p>
            <strong>สถานที่ :</strong>
            {{ item.building_name }} ชั้น {{ item.floor_name }} {{ item.room_name }}
          </p>
        </div>

        <!-- แถบความคืบหน้า - แสดงขั้นตอนของการซ่อม -->
        <div class="mt-6 flex items-center gap-3 text-sm font-medium">
          <span :class="getProgressBarColor(item.rf_user_status, 1)">● รอดำเนินการ</span>
          <span class="text-slate-300">→</span>

          <span :class="getProgressBarColor(item.rf_user_status, 2)">● กำลังดำเนินการ</span>
          <span class="text-slate-300">→</span>

          <span :class="getProgressBarColor(item.rf_user_status, 3)">● ดำเนินการเสร็จสิ้น</span>
        </div>
      </div>
      <!-- ส่วนแบ่งหน้า - ปุ่มไปหน้าก่อนหน้าและถัดไป -->
      <div v-if="totalPages > 1" class="flex justify-center items-center gap-4 mt-10">
        <button
          @click="goPrevPage"
          :disabled="currentPage === 1"
          class="w-24 px-4 py-2 text-slate-700 rounded-xl border text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-slate-100"
        >
          ก่อนหน้า
        </button>

        <!-- แสดงหมายเลขหน้าปัจจุบันและจำนวนหน้าทั้งหมด -->
        <span class="text-slate-600 text-sm font-medium">
          หน้า {{ currentPage }} จาก {{ totalPages }}
        </span>

        <!-- ปุ่มถัดไป -->
        <button
          @click="goNextPage"
          :disabled="currentPage === totalPages"
          class="w-24 px-4 py-2 text-slate-700 rounded-xl border text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-slate-100"
        >
          ถัดไป
        </button>
      </div>
    </div>
    <!-- ส่วนท้ายเพจ - ข้อมูลลิขสิทธิ์ -->

    <footer class="mt-16 text-slate-400 text-sm pb-10">
      92 Tech Co.,Ltd — 2025 FixDesk All rights reserved.
    </footer>
  </div>
</template>
