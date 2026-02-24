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
