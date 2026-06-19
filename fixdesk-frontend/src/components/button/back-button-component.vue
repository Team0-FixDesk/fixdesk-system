/**
 * =====================================================================
 * @file            back-button-component.vue
 * @layer           Component (Presentation Layer)
 * @version         1.0.0
 * @since
 * @author
 * @contributors
 *
 * @lastModified
 * @lastModifiedBy
 * @description
 *  ปุ่มย้อนกลับใช้ใน header หรือ modal สำหรับกลับไปยังหน้าก่อนหน้า
 * @features
 *  - รองรับการนำทางย้อนกลับและใช้งานเป็นปุ่มไอคอน
 *  - ขนาดเหมาะกับการใช้งานใน header/modal
 *
 * @usedBy
 *
 * @changelog
 *
 * =====================================================================
 */

<script setup>
import { Icon } from '@iconify/vue'
import BaseButtonComponent from './base/base-button-component.vue'
</script>

<template>
  <BaseButtonComponent
    class="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition"
  >
    <Icon icon="fluent:ios-arrow-24-filled" width="18" height="18" style="color: #8e8e8e" />
  </BaseButtonComponent>
</template>
