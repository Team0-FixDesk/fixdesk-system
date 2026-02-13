<script setup>
import { Icon } from '@iconify/vue'
import BaseButtonComponent from './base/base-button-component.vue'
</script>

<template>
  <BaseButtonComponent
    class="w-11 h-11 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition"
  >
    <Icon icon="fluent:ios-arrow-24-filled" width="18" height="18" style="color: #8e8e8e" />
  </BaseButtonComponent>
</template>
