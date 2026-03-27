/**
 * =====================================================================
 * @file            base-button-component.vue
 * @layer           Component (Presentation Layer)
 * @version         1.0.0
 * @since
 * @author
 * @contributors
 *
 * @lastModified
 * @lastModifiedBy
 * @description
 *  ปุ่มพื้นฐานที่ใช้เป็น wrapper ให้ปุ่มอื่นๆ รองรับการนำทางและสถานะโหลด
 * @features
 *  - รองรับ `to`, `loading`, `disabled`, และ `icon`
 *  - ส่ง event `click` กลับสู่ parent
 *
 * @usedBy
 *  - หลายปุ่มภายในโครงการ (Import, Back, Repair, Add User ฯลฯ)
 *
 * @changelog
 *
 * =====================================================================
 */

<script setup>
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

const router = useRouter()

const props = defineProps({
  to: String,
  loading: Boolean,
  disabled: Boolean,
  icon: String,
  iconSize: {
    type: Number,
    default: 18,
  }
})

const emit = defineEmits(['click'])

const handleClick = (e) => {
  if (props.disabled || props.loading) return

  if (props.to) router.push(props.to)

  emit('click', e)
}
</script>

<template>
  <button
    :disabled="disabled || loading"
    @click="handleClick"
    class="inline-flex items-center justify-center gap-2 transition"
  >
    <!-- Loading -->
    <Icon
      v-if="loading"
      icon="svg-spinners:90-ring"
      :width="iconSize"
      :height="iconSize"
    />

    <!-- Icon -->
    <Icon
      v-else-if="icon"
      :icon="icon"
      :width="iconSize"
      :height="iconSize"
    />

    <!-- Content slot -->
    <slot />
  </button>
</template>
