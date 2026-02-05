<script setup>
import { Icon } from '@iconify/vue'
import BaseButtonComponent from './base/base-button-component.vue'
</script>

<template>
  <BaseButtonComponent
    class="h-10 px-4 bg-green-600 hover:bg-green-900 text-white rounded-lg shadow-sm"
  >
    <Icon icon="fluent:add-12-filled" width="20" height="20" />
    Import
  </BaseButtonComponent>
</template>
