import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * สถานะการเปิด/ปิด Sidebar
 * ใช้ควบคุมการขยายความกว้าง (w-20 / w-64)
 * และควบคุมการแสดงผลข้อความเมนู
 *
 * @type {import('vue').Ref<boolean>}
 */

// Desktop state
export const isOpen = ref(false)
export const desktopHandlers = {
  onMouseenter: () => (isOpen.value = true),
  onMouseleave: () => (isOpen.value = false),
}

// Mobile state
export const isMobile = ref(false)
export const mobileOpen = ref(false)

export function checkMobile() {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) mobileOpen.value = false
}

// Initialize on mount
if (typeof window !== 'undefined') {
  checkMobile()
  window.addEventListener('resize', checkMobile)
}

// --- Computed: ตัดสินว่า sidebar ควร "ขยาย" หรือเปล่า ---
export const isExpanded = computed(() =>
  isMobile.value ? mobileOpen.value : isOpen.value
)

// --- Computed: class ของ aside ตาม mode ---
export const sidebarClasses = computed(() => {
  if (isMobile.value) {
    return [
      'w-64',
      'transition-transform duration-300 ease-in-out',
      mobileOpen.value ? 'translate-x-0' : '-translate-x-full',
    ]
  }
  return [
    'transition-[width] duration-300 ease-in-out',
    isOpen.value ? 'w-64' : 'w-20',
  ]
})
