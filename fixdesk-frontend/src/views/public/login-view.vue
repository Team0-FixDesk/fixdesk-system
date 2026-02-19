/**
 * =====================================================================
 * @file            login.view.vue
 * @module          มอดูล Authentication - การจัดการสิทธิ์ผู้ใช้งาน
 * @layer           View (Presentation Layer)
 * @version         1.0.0
 * @since           2025-10-22
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-02-17
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอสำหรับเข้าสู่ระบบ FixDesk
 *  กรอกข้อมูลด้วย:
 *    - ช่องกรอกชื่อผู้ใช้ (username)
 *    - ช่องกรอกรหัสผ่าน (password)
 *    - ตัวเลือก "จำฉันไว้" (isRememberMe)
 *
 * @requires
 *  - @iconify/vue
 *  - @/composables/useLogin
 *
 * ---------------------------------------------------------------------
 * @changelog
 * - ปรับปรุงข้อความที่ใช้ให้เหมาะสม      [2026-02-17, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * - ปรับปรุงข้อความของคำอธิบายจำฉันไว้  [2026-02-17, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * =====================================================================
 */

<script setup>
import { Icon } from '@iconify/vue'
import { useLogin } from '@/composables/useLogin'

import LogoFIXDESK from '@/assets/icons/Logo.png'
import Logo92Tech from '@/assets/icons/92Tech-logo.png'

// ดึงข้อมูลและฟังก์ชันจาก composable
const {
  username,  // ชื่อผู้ใช้ที่ป้อนเข้า
  password,  // รหัสผ่านที่ป้อนเข้า
  errorMessage,  // ข้อความข้อผิดพลาดจากการเข้าสู่ระบบ (หากมี)
  isLoading,  // สถานะการโหลด (จริง = กำลังประมวลผล, เท็จ = เสร็จสิ้น)
  isRememberMe,  // สถานะการบันทึกการเข้าสู่ระบบ
  handleLogin  // ฟังก์ชันสำหรับการเข้าสู่ระบบ
} = useLogin()

</script>

<template>
  <!-- หัวข้อหลัก - พื้นหลังและการจัดเรียง -->
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-200 bg-center px-4">
    <div
      class="relative overflow-visible bg-white/95 rounded-xl shadow-xl w-full max-w-md sm:max-w-xl lg:max-w-3xl flex flex-col lg:flex-row items-center gap-8 p-10">
      <div class="flex flex-col items-center justify-center flex-1">
        <img :src="Logo92Tech" alt="92 Tech logo" class="hidden md:block absolute top-4 left-4 w-10" />
        <img :src="LogoFIXDESK" alt="FixDesk logo" class="w-48 h-auto" />
      </div>

      <!-- ส่วนฟอร์มเข้าสู่ระบบ -->
      <div class="flex-1 flex flex-col items-center">
        <h1 class="text-3xl font-bold text-[#1E48D1] mb-6">เข้าสู่ระบบ</h1>
        <form class="flex flex-col gap-4 w-full max-w-sm" @submit.prevent="handleLogin">
          <input v-model="username" type="text" aria-label="ชื่อผู้ใช้" placeholder="ชื่อผู้ใช้"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-base placeholder-gray-400" />

          <input v-model="password" type="password" aria-label="รหัสผ่าน" placeholder="รหัสผ่าน"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-base placeholder-gray-400" />

          <label class="flex items-center gap-2 text-sm text-gray-700 relative">
            <input v-model="isRememberMe" type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-[#1E48D1] focus:ring-[#1E48D1]" />
            <span>จำฉันไว้</span>

            <span
              class="group relative inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full text-gray-400 cursor-pointer select-none hover:text-gray-600 transition"
              aria-label="คำอธิบายการจำฉันไว้" tabindex="0">
              <Icon icon="fluent:info-16-filled" width="16" height="16" style="color: #8e8e8e" />
              <div
                class="absolute z-50 bottom-full left-0 mt-2 w-[330px] p-3 text-xs text-white bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none text-left">
                <p class="mb-1">หากเลือก ระบบจะบันทึกข้อมูลการเข้าสู่ระบบไว้ในอุปกรณ์นี้</p>
                <ul class="list-disc list-outside pl-5 space-y-1 text-gray-200">
                  <li>สามารถเข้าสู่ระบบได้โดยไม่ต้องกรอกชื่อผู้ใช้ และรหัสผ่านใหม่</li>
                  <li>หากไม่มีการใช้งาน บัญชีจะออกจากระบบเองโดยอัตโนมัติเมื่อถึงเวลาที่กำหนด</li>
                </ul>
                <p class="text-red-500">คำเตือน! <span class="text-yellow-200">แนะนำให้ใช้ฟังก์ชันนี้บนอุปกรณ์ส่วนตัว</span></p>
              </div>
            </span>
          </label>

          <button type="submit" :disabled="isLoading"
            class="w-full py-2 rounded-md bg-[#1E48D1] text-white font-medium text-base hover:bg-blue-700 transition-colors disabled:opacity-60">
            {{ isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
          </button>
        </form>

        <!-- ส่วนข้อมูลข้อผิดพลาด -->
        <!-- Container สำหรับแสดงข้อความข้อผิดพลาด -->
        <div class="min-h-[1.25rem] mt-3">
          <!-- แสดงข้อความข้อผิดพลาด (ถ้ามี) -->
          <p v-if="errorMessage" class="text-red-600 text-center text-sm font-medium">
            {{ errorMessage }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
