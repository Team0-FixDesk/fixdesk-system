<script setup>
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import axios from 'axios'

const router = useRouter()
// ====== CONFIG API URL ======
const API_BASE = import.meta.env.VITE_API_BASE

const keyword = ref('')
const loading = ref(false)
const error = ref('')
const searched = ref(false)
const results = ref([])

// ===== STATUS HANDLER =====
const statusText = (status) => {
  return (
    {
      pending: 'รอดำเนินการ',
      in_progress: 'กำลังดำเนินการ',
      done: 'ดำเนินการเสร็จสิ้น',
    }[status] || 'ไม่ทราบสถานะ'
  )
}

const statusBadge = (status) => {
  return {
    pending: 'bg-blue-200 text-blue-600',
    in_progress: 'bg-amber-100 text-amber-600',
    done: 'bg-green-100 text-green-600',
  }[status]
}

// Timeline step highlight
const stepColor = (currentStep, targetStep) => {
  // ยังไม่ถึงขั้นตอนนั้น → เทา
  if (currentStep < targetStep) {
    return 'text-slate-400'
  }

  // อยู่ในขั้นตอนนั้น → เหลือง
  if (currentStep === targetStep && currentStep !== 3) {
    return 'text-green-600'
  }

  // ถ้าขั้นที่ 3 (เสร็จสิ้น) → ให้เขียวทั้งหมด
  if (currentStep === 3) {
    return 'text-green-600'
  }

  // ผ่านมาแล้ว → เขียว
  if (currentStep > targetStep) {
    return 'text-green-600'
  }
}
// แปลง status → step
const convertStatusToStep = (status) => {
  return (
    {
      pending: 1,
      in_progress: 2,
      done: 3,
    }[status] || 1
  )
}

const onSearch = async () => {
  if (!keyword.value.trim()) return

  loading.value = true
  error.value = ''
  searched.value = true

  try {
    const res = await axios.get(`${API_BASE}/public/search`, {
      params: { keyword: keyword.value },
    })

    results.value = (res.data || []).map((item) => ({
      ...item,
      step: convertStatusToStep(item.rf_user_status),
    }))
  } catch (err) {
    error.value = 'เกิดข้อผิดพลาดในการค้นหา'
  } finally {
    loading.value = false
  }
}

const gotologin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center">
    <!-- Navbar -->
    <header class="w-full max-w-6xl flex justify-between items-center py-6 px-6">
      <div class="flex items-center gap-3 text-3xl font-semibold text-slate-800">
        <img src="/icon/LogoFIXDESK-logo.png" class="h-12 w-auto" alt="FixDesk Logo" />
        <span>FixDesk</span>
      </div>

      <button
        @click="gotologin"
        class="px-6 py-2 bg-slate-800 hover:bg-slate-500 border-lg border-slate-300 rounded-lg shadow-sm flex items-center gap-2 transition font-semibold text-white"
      >
        <span>เข้าสู่ระบบ</span>
      </button>
    </header>

    <!-- Hero Section -->
    <section class="mt-6 mb-12 text-center">
      <h1 class="text-3xl font-bold text-slate-800 tracking-tight">ตรวจสอบสถานะงานซ่อมของคุณ</h1>
      <p class="text-lg text-slate-500 mt-2">
        ค้นหารายการแจ้งซ่อม ติดตามสถานะแบบเรียลไทม์ สะดวก รวดเร็ว
      </p>
    </section>

    <!-- Search Card -->
    <div class="w-full max-w-4xl bg-white p-8 shadow-md rounded-3xl border border-slate-200 mb-7">
      <label class="text-slate-600 font-medium">
        ค้นหางานซ่อมด้วยเลขแจ้งซ่อม / ชื่อผู้แจ้ง / หน่วยงาน
      </label>

      <div class="flex gap-3 mt-3">
        <input
          type="text"
          v-model="keyword"
          @keyup.enter="onSearch"
          class="flex-1 px-5 py-2 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-blue-400 transition"
        />
        <button
          @click="onSearch"
          class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-md transition active:scale-[0.97]"
        >
          ค้นหา
        </button>
      </div>

      <!-- Suggestion -->
      <div class="mt-3 text-sm text-slate-400">
        ตัวอย่างการค้นหา: RF00000000000, สมชาย ใจดี, แผนก IT
      </div>
    </div>

    <!-- Results Section -->
    <div class="w-full max-w-4xl">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-10 text-slate-500 animate-pulse">กำลังค้นหา...</div>

      <!-- Error -->
      <div
        v-if="error && !loading"
        class="bg-red-50 text-red-600 p-5 rounded-2xl border border-red-200 shadow mb-5"
      >
        {{ error }}
      </div>

      <!-- No result -->
      <div
        v-if="!loading && results.length === 0 && searched"
        class="bg-white p-8 rounded-3xl shadow text-center border border-slate-200"
      >
        <p class="text-slate-500 text-lg">ไม่พบรายการที่ค้นหา</p>
      </div>

      <!-- Found -->
      <p v-if="results.length > 0" class="text-slate-500 mb-3 text-md">
        พบ {{ results.length }} รายการ
      </p>

      <div
        v-for="item in results"
        :key="item.rf_code"
        class="bg-white p-7 shadow-lg rounded-3xl border border-slate-200 hover:shadow-xl transition mb-6"
      >
        <div class="flex justify-between items-start">
          <p class="text-md font-semibold text-slate-700">เลขแจ้งซ่อม: {{ item.rf_code }}</p>

          <span class="px-3 py-1 text-sm rounded-full" :class="statusBadge(item.rf_user_status)">
            {{ statusText(item.rf_user_status) }}
          </span>
        </div>

        <div class="mt-2 space-y-1 text-slate-700">
          <p>
            <strong class="text-slate-800">ผู้แจ้ง:</strong> {{ item.reporter_firstname }}
            {{ item.reporter_lastname }}
          </p>
          <p><strong class="text-slate-800">ปัญหา:</strong> {{ item.rf_problem }}</p>
          <p class="text-slate-500">
            <strong class="text-slate-700">สถานที่:</strong>
            {{ item.building_name }} {{ item.floor_name }} {{ item.room_name }}
          </p>
        </div>

        <!-- Status Progress -->
        <div class="mt-6 flex items-center gap-3 text-sm font-medium">
          <span :class="stepColor(item.step, 1)">● รอดำเนินการ</span>
          <span class="text-slate-400">→</span>
          <span :class="stepColor(item.step, 2)">● กำลังดำเนินการ</span>
          <span class="text-slate-400">→</span>
          <span :class="stepColor(item.step, 3)">● ดำเนินการเสร็จสิ้น</span>
        </div>
      </div>
    </div>

    <footer class="mt-16 text-slate-400 text-sm pb-10">
      92 Tech Co.,Ltd — 2025 FixDesk All rights reserved.
    </footer>
  </div>
</template>
