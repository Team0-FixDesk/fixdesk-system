/**
 * =====================================================================
 * @file            add-user-button-component.vue
 * @layer           Component (Presentation Layer)
 * @version         1.0.0
 * @since
 * @author
 * @contributors
 *
 * @lastModified
 * @lastModifiedBy
 * @description
 *  ปุ่มสำเร็จรูปสำหรับเรียกหน้าการแจ้งซ่อมหรือฟังก์ชันเพิ่มรายการใช้งานด่วน
 * @features
 *  - นำทางไปยังหน้าสร้างแจ้งซ่อม
 *  - รูปแบบปุ่มพร้อมไอคอนและข้อความ
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
    class="h-10 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-sm"
  >
    <Icon icon="fluent:add-12-filled" width="20" height="20" />
    แจ้งซ่อม
  </BaseButtonComponent>
</template>
