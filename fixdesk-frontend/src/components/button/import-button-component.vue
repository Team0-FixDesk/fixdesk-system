/**
 * =====================================================================
 * @file            import-button-component.vue
 * @layer           Component (Presentation Layer)
 * @version         1.0.0
 * @since
 * @author
 * @contributors
 *
 * @lastModified
 * @lastModifiedBy
 * @description
 *  ปุ่มสำหรับเปิดการนำเข้าข้อมูล (Import Excel) ใช้ในหน้าจอจัดการข้อมูล
 * @features
 *  - เปิด modal/flow สำหรับอัปโหลดไฟล์ Excel
 *  - แสดงไอคอนและข้อความเรียกใช้งาน
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
    class="h-10 px-3 sm:px-4 border-[1px] border-[#0048EF] hover:bg-blue-50 text-[#1E48D1] rounded-lg shadow-sm flex items-center gap-2"
  >
    <Icon icon="iconoir:import" width="24" height="24" style="color: #0048EF" class="shrink-0" />
    <span class="hidden sm:inline">Import Excel</span>
  </BaseButtonComponent>
</template>
