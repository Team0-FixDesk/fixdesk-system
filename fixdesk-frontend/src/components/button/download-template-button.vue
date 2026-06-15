<script setup>
/**
 * =====================================================================
 * @file            download-template-button.vue
 * @layer           Presentation Layer (Component)
 * @version         1.0.0
 * @since           2026-03-21
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *
 * @lastModified    2026-03-21
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  Component สำหรับปุ่มดาวน์โหลด Template Excel
 *  ทำหน้าที่:
 *  - รับ Props เพื่อกำหนดประเภทของ Template ที่ต้องการดาวน์โหลด (เช่น users, locations, stocks)
 *  - เมื่อผู้ใช้คลิกปุ่ม จะเรียกใช้ฟังก์ชัน handleDownload ที่จะติดต่อกับ Template Service เพื่อดาวน์โหลดไฟล์ Excel ตามประเภทที่กำหนด
 *  - แสดงไอคอนโหลดขณะกำลังดาวน์โหลด และป้องกันการคลิกซ้ำจนกว่าการดาวน์โหลดจะเสร็จสิ้น
 *  - โครงสร้างเป็นแบบ Layered Architecture
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-03-21, พชร ไพศรีสกุล] V 1.0.0
 *  - Initial implementation Download Template Button Component
 *
 * =====================================================================
*/

import { ref } from 'vue';
import { templateService } from '@/services/template';
import { Icon } from '@iconify/vue'
import BaseButtonComponent from './base/base-button-component.vue'

// กำหนด Props ให้รับค่าจากหน้าอื่นได้
const props = defineProps({
  templateType: {
    type: String,
    required: true // บังคับว่าต้องส่งมา (เช่น 'users', 'stocks')
  },
  fileName: {
    type: String,
    default: 'Template.xlsx' // ชื่อไฟล์เริ่มต้นตอนเซฟ
  },
  buttonText: {
    type: String,
    default: 'ดาวน์โหลด Template'
  }
});

const isLoading = ref(false);

const handleDownload = async () => {
  if (isLoading.value) return;

  isLoading.value = true;
  try {
    const blob = await templateService.downloadTemplate(props.templateType);

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', props.fileName);
    document.body.appendChild(link);

    link.click();

    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Download error:', error);
    alert(`เกิดข้อผิดพลาดในการโหลดไฟล์ ${props.fileName}`);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <BaseButtonComponent
    @click="handleDownload"
    :disabled="isLoading"
    class="h-10 px-3 sm:px-4 border-[1px] border-[#0048EF] hover:bg-blue-50 text-[#1E48D1] rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
  >
    <Icon
      v-if="isLoading"
      icon="eos-icons:loading"
      width="24"
      height="24"
      style="color: #0048EF"
      class="shrink-0"
    />
    <Icon
      v-else
      icon="iconoir:download"
      width="24"
      height="24"
      style="color: #0048EF"
      class="shrink-0"
    />

    <span class="hidden sm:inline">{{ buttonText }}</span>
  </BaseButtonComponent>
</template>
