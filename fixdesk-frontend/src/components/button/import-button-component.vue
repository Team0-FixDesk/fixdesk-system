<script setup>
import { Icon } from '@iconify/vue'
import BaseButtonComponent from './base/base-button-component.vue'
</script>

<template>
  <BaseButtonComponent class="h-10 px-4 border-[1px] border-[#1E48D1] hover:bg-blue-50 text-[#1E48D1] rounded-lg shadow-sm">
    <Icon icon="iconoir:import" width="24" height="24" style="color: #1E48D1 " />
    Import Excel
  </BaseButtonComponent>
</template>
