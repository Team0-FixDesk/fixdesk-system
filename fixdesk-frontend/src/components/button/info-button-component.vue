/**
 * =====================================================================
 * @file            info-button-component.vue
 * @layer           Component (Presentation Layer)
 * @version         1.0.0
 * @since
 * @author
 * @contributors
 *
 * @lastModified
 * @lastModifiedBy
 * @description
 *  ปุ่มแสดงไอคอนข้อมูล (info) ใช้ในรายการหรือหัวข้อเพื่อให้ข้อมูลเพิ่มเติม
 * @features
 *  - ปุ่มขนาดเล็กพร้อมไอคอน
 *  - ใช้เป็นปุ่มแสดงข้อมูลเพิ่มเติมแบบ inline
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
    class="flex items-center gap-2 px-2 py-2 rounded-md bg-[#1E48D1] hover:bg-[#163A9B] text-white"
  >
    <Icon
      icon="material-symbols:info-outline-rounded"
      width="16"
      height="16"
      style="color: #ffffff"
    />
  </BaseButtonComponent>
</template>
