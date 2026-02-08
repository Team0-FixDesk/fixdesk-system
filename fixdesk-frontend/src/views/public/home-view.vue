<script setup>
import { useRouter } from 'vue-router'
import { useRepairSearch } from '@/composables/useRepairSearch'
import { getStatusText, getStatusBadgeClass, getStepColor } from '@/utils/repairStatus.util'

import LogoFIXDESK from '@/assets/icons/LogoFIXDESK-logo.png'

const router = useRouter()

const {
  keyword,
  loading,
  errorMessage,
  searched,
  results,
  currentPage,
  totalPages,
  handleSearch,
  goPrevPage,
  goNextPage,
} = useRepairSearch()

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
        ค้นหารายการแจ้งซ่อม ติดตามสถานะแบบเรียลไทม์ สะดวก รวดเร็ว
      </p>
    </section>

    <div class="w-full max-w-4xl bg-white p-8 shadow-md rounded-3xl border border-slate-200 mb-7">
      <label class="text-slate-600 font-medium">
        ค้นหางานซ่อมด้วยหมายเลขแจ้งซ่อม / ชื่อผู้แจ้ง / หน่วยงาน (ระบุอย่างใดอย่างหนึ่ง)
      </label>

      <div class="flex gap-3 mt-3">
        <input
          v-model="keyword"
          type="text"
          @keyup.enter="handleSearch(1)"
          class="flex-1 px-5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-400 transition"
        />

        <button
          @click="handleSearch(1)"
          class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition active:scale-[0.97]"
        >
          ค้นหา
        </button>
      </div>

      <div class="mt-3 text-sm text-slate-400">
        ตัวอย่างการค้นหา: RFXXXXXXXXXXX, สมชาย ใจดี, แผนก IT
      </div>
    </div>

    <div class="w-full max-w-4xl">
      <div v-if="loading" class="text-center py-10 text-slate-500 animate-pulse">กำลังค้นหา...</div>

      <div
        v-if="errorMessage && !loading"
        class="bg-red-50 text-red-600 p-5 rounded-2xl border border-red-200 shadow mb-5"
      >
        {{ errorMessage }}
      </div>

      <div
        v-if="!loading && searched && results.length === 0"
        class="bg-white p-8 rounded-3xl shadow text-center border border-slate-200"
      >
        <p class="text-slate-500 text-lg">ไม่พบรายการที่ค้นหา</p>
      </div>

      <p v-if="results.length > 0" class="text-slate-500 mb-3 text-md">
        พบ {{ totalItems }} รายการ
      </p>

      <div
        v-for="item in results"
        :key="item.rf_code"
        class="bg-white p-7 shadow-lg rounded-3xl border border-slate-200 hover:shadow-xl transition mb-6"
      >
        <div class="flex justify-between items-start">
          <p class="text-md font-semibold text-slate-700">เลขแจ้งซ่อม: {{ item.rf_code }}</p>

          <span
            class="px-3 py-1 text-sm rounded-full"
            :class="getStatusBadgeClass(item.rf_user_status)"
          >
            {{ getStatusText(item.rf_user_status) }}
          </span>
        </div>

        <div class="mt-2 space-y-1 text-slate-700">
          <p>
            <strong class="text-slate-800">ผู้แจ้ง:</strong>
            {{ item.reporter_firstname }} {{ item.reporter_lastname }}
          </p>
          <p>
            <strong class="text-slate-800">หน่วยงาน:</strong>
            {{ item.reporter_department }}
          </p>
          <p><strong class="text-slate-800">ปัญหา:</strong> {{ item.rf_problem }}</p>
          <p class="text-slate-500">
            <strong class="text-slate-700">สถานที่:</strong>
            {{ item.building_name }} {{ item.floor_name }} {{ item.room_name }}
          </p>
        </div>

        <div class="mt-6 flex items-center gap-3 text-sm font-medium">
          <span :class="getStepColor(item.step, 1)">● รอดำเนินการ</span>
          <span class="text-slate-400">→</span>
          <span :class="getStepColor(item.step, 2)">● กำลังดำเนินการ</span>
          <span class="text-slate-400">→</span>
          <span :class="getStepColor(item.step, 3)">● ดำเนินการเสร็จสิ้น</span>
        </div>
      </div>

      <div v-if="totalPages > 1" class="flex justify-center items-center gap-4 mt-10">
        <button
          @click="goPrevPage"
          :disabled="currentPage === 1"
          class="w-24 px-4 py-2 text-slate-700 rounded-xl border text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-slate-100"
        >
          ก่อนหน้า
        </button>

        <span class="text-slate-600 text-sm font-medium">
          หน้า {{ currentPage }} จาก {{ totalPages }}
        </span>

        <button
          @click="goNextPage"
          :disabled="currentPage === totalPages"
          class="w-24 px-4 py-2 text-slate-700 rounded-xl border text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-slate-100"
        >
          ถัดไป
        </button>
      </div>
    </div>

    <footer class="mt-16 text-slate-400 text-sm pb-10">
      92 Tech Co.,Ltd — 2025 FixDesk All rights reserved.
    </footer>
  </div>
</template>
