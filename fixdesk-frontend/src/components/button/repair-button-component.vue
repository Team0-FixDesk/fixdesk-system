/**
 * =====================================================================
 * @file            repair-button-component.vue
 * @layer           Component (Presentation Layer)
 * @version         1.0.0
 * @since
 * @author
 * @contributors
 *
 * @lastModified
 * @lastModifiedBy
 * @description
 *  ปุ่มนำทางไปหน้าสร้างแจ้งซ่อม ใช้เรียกหน้าเพิ่มรายการแจ้งซ่อม
 * @features
 *  - นำทางไปยัง `/main/repair-request`
 *  - รองรับการวางไอคอนและข้อความภายในปุ่ม
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
    to="/main/repair-request"
    class="h-10 px-4 bg-[#1E48D1] hover:bg-[#163A9B] text-white rounded-lg shadow-sm"
  >
    <Icon icon="fluent:add-12-filled" width="20" height="20" />
    แจ้งซ่อม
  </BaseButtonComponent>
</template>
