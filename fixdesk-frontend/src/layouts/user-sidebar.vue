/**
 * =====================================================================
 * @file            user-sidebar.view.vue
 * @layer           View Layer (Presentation Layer)
 * @version         2.1.0
 * @since           2025-10-21
 * @author          เศรษฐพงศ์ หอมชื่น
 * @contributors
 *   - เศรษฐพงศ์ หอมชื่น
 *   - พชร ไพศรีสกุล
 *   - นราธิป แสนทวีสุข
 *
 * @lastModified    2026-02-22
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  Sidebar Component สำหรับผู้ใช้งาน (User Role)
 *
 *  ทำหน้าที่:
 *    - แสดงเมนูแบบแบ่งหมวด (Section-based Menu)
 *    - รองรับ Hover Expand / Collapse
 *    - รองรับ Tooltip ขณะ Sidebar ถูกย่อ
 *    - แสดง Active Route อัตโนมัติผ่าน RouterLink
 *    - แสดงข้อมูลโปรไฟล์ผู้ใช้งานผ่าน SidebarProfile Component
 *
 *  การออกแบบ:
 *    - ใช้โครงสร้าง menuSections เพื่อรองรับการเพิ่มหมวดในอนาคต
 *    - รองรับ Responsive Layout และ Smooth Transition
 *
 * @usedBy
 *   - main-layout.view.vue
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - build(project): setup environment project
 *     [2025-10-21, เศรษฐพงศ์ หอมชื่น] V 1.0.0
 *   - feat(frontend): add sidebar and page structure for all actors
 *     [2025-10-21, พชร ไพศรีสกุล] V 1.1.0
 *   - feat(auth): complete login and logout system with user profile display
 *     [2025-10-22, พชร ไพศรีสกุล] V 1.2.0
 *   - refactor(auth-backend): update database structure and adjust login & profile components
 *     [2025-10-23, พชร ไพศรีสกุล] V 1.3.0
 *   - style(frontend, backend): ปรับรูปแบบโค้ดให้สะอาดและเป็นระเบียบ
 *     [2025-12-03, พชร ไพศรีสกุล] V 1.3.1
 *   - feat(frontend): ทำหน้า UserHome
 *     [2025-12-06, พชร ไพศรีสกุล] V 1.4.0
 *   - fix(frontend): แก้ไขบัค
 *     [2026-01-19, พชร ไพศรีสกุล] V 1.4.1
 *   - refactor(user-sidebar): ปรับ sidebar ให้รองรับการแสดงเมนูหลักและการขยาย/ย่อ
 *     [2026-02-02, นราธิป แสนทวีสุข] V 2.0.0
 *   - fix(frontend): ย้ายไฟล์ icon ไปยัง assets
 *     [2026-02-05, พชร ไพศรีสกุล] V 2.0.1
 *   - Refactor Sidebar เป็น Section-based และปรับปรุง UX
 *     [2026-02-22, พชร ไพศรีสกุล] V 2.1.0
 *
 * =====================================================================
 */

<script setup>
import { ref } from 'vue'
import SidebarProfile from '@/components/sidebar-profile-component.vue'
import LogoFIXDESK from '@/assets/icons/LogoFIXDESK-logo.png'
import HomeIcon from '@/assets/icons/sidebar/home-icon.svg'
import RepairIcon from '@/assets/icons/sidebar/repair-icon.svg'
import ListIcon from '@/assets/icons/sidebar/list-icon.svg'
import { computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

/**
 * สถานะการเปิด/ปิด Sidebar
 * ใช้ควบคุมการขยายความกว้าง (w-20 / w-64)
 * และควบคุมการแสดงผลข้อความเมนู
 *
 * @type {import('vue').Ref<boolean>}
 */
const isOpen = ref(false)
const desktopHandlers = {
  onMouseenter: () => (isOpen.value = true),
  onMouseleave: () => (isOpen.value = false),
}

// Mobile state
const isMobile = ref(false)
const mobileOpen = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) mobileOpen.value = false
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// --- Computed: ตัดสินว่า sidebar ควร "ขยาย" หรือเปล่า ---
const isExpanded = computed(() =>
  isMobile.value ? mobileOpen.value : isOpen.value
)

// --- Computed: class ของ aside ตาม mode ---
const sidebarClasses = computed(() => {
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
/**
 * โครงสร้างเมนูแบบแบ่งหมวด (Section-based Structure)
 * รูปแบบข้อมูล:
 * [
 *   {
 *     title: string,
 *     items: [
 *       { icon, label, path }
 *     ]
 *   }
 * ]
 * รองรับการเพิ่มหมวดเมนูได้โดยไม่ต้องแก้ Template
 *
 * @type {Array<{ title: string, items: Array<{ icon: string, label: string, path: string }> }>}
 */
const menuSections = [
  {
    title: 'เมนูหลัก',
    items: [
      { icon: HomeIcon, label: 'หน้าหลัก', path: '/main/user-home' },
      { icon: RepairIcon, label: 'แจ้งซ่อม', path: '/main/repair-request' },
      { icon: ListIcon, label: 'รายการของฉัน', path: '/main/my-list' },
    ],
  },
]
</script>

<template>
  <!-- ปุ่ม Hamburger (แสดงเฉพาะ mobile) -->
  <button
    v-if="isMobile && !mobileOpen"
    class="fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 bg-[#1E48D1] text-white rounded-lg shadow-lg md:hidden"
    @click="mobileOpen = true"
    aria-label="Toggle menu"
  >
    <Icon :icon="mobileOpen ? 'mdi:close' : 'mdi:menu'" width="22" height="22" />
  </button>

  <!-- Backdrop (แสดงเฉพาะ mobile ตอน sidebar เปิด) -->
  <Transition name="fade">
    <div
      v-if="isMobile && mobileOpen"
      class="fixed inset-0 z-30 bg-black/40 md:hidden"
      @click="mobileOpen = false"
    />
  </Transition>

  <!-- Sidebar -->
  <aside
    class="fixed top-0 left-0 h-screen bg-[#1E48D1] text-white shadow-lg overflow-y-auto overflow-x-hidden flex flex-col justify-between select-none z-50"
    :class="sidebarClasses"
    v-bind="!isMobile ? desktopHandlers : {}"
  >
    <!-- โลโก้ -->
    <div class="flex items-center justify-start h-20 border-b border-blue-700 px-4">
      <img :src="LogoFIXDESK" alt="FixDesk Logo" class="w-10 h-10 object-contain" />
      <span
        class="ml-3 text-2xl font-bold tracking-wide transition-opacity duration-300"
        :class="isExpanded ? 'opacity-100 visible' : 'opacity-0 invisible'"
      >
        FIXDESK
      </span>
    </div>

    <!-- เมนูหลัก -->
    <nav class="flex flex-col gap-2 mt-6 px-2 flex-1">
      <template v-for="(section, sIndex) in menuSections" :key="sIndex">
        <div class="h-1 px-3 mt-2 mb-2 flex items-center">
          <span
            class="text-xs uppercase tracking-wider text-blue-200 transition-opacity duration-200"
            :class="isExpanded ? 'opacity-100' : 'opacity-0'"
          >
            {{ section.title }}
          </span>
        </div>

        <RouterLink
          v-for="(menu, index) in section.items"
          :key="index"
          :title="!isExpanded ? menu.label : ''"
          :to="menu.path"
          class="group flex items-center rounded-lg transition-all duration-200 h-10 px-2 hover:bg-blue-800"
          active-class="bg-blue-900 shadow-inner"
          @click="isMobile && (mobileOpen = false)"
        >
          <div class="flex items-center justify-center w-10 h-10 shrink-0 transition-all duration-300">
            <template v-if="typeof menu.icon === 'string'">
              <img :src="menu.icon" :alt="menu.label" class="w-5 h-5" />
            </template>
            <template v-else>
              <Icon :icon="menu.icon.name" width="20" height="20" style="color: #ffffff" />
            </template>
          </div>

          <span
            class="text-sm font-medium whitespace-nowrap transition-all duration-300"
            :class="isExpanded ? 'opacity-100 visible ml-2' : 'opacity-0 invisible ml-0'"
          >
            {{ menu.label }}
          </span>
        </RouterLink>
      </template>
    </nav>

    <SidebarProfile :expanded="isExpanded" />
  </aside>
</template>
