/**
 * =====================================================================
 * @file            manager-sidebar.view.vue
 * @layer           View Layer (Presentation Layer)
 * @version         2.3.0
 * @since           2025-10-21
 * @author          เศรษฐพงศ์ หอมชื่น
 * @contributors
 *   - เศรษฐพงศ์ หอมชื่น
 *   - พชร ไพศรีสกุล
 *   - นราธิป แสนทวีสุข
 *   - วิศรุต ภู่ระหงษ์
 *
 * @lastModified    2026-02-27
 * @lastModifiedBy  วิศรุต ภู่ระหงษ์
 * ---------------------------------------------------------------------
 * @description
 *  Sidebar Component สำหรับผู้ใช้งาน (Manager Role)
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
 *   - buil(project): setup environment project
 *     [2025-10-21, เศรษฐพงศ์ หอมชื่น] V 1.0.0
 *   - feat(frontend): add sidebar and page structure for all actors
 *     [2025-10-21, พชร ไพศรีสกุล] V 1.1.0
 *   - feat(auth): complete login and logout system with user profile display
 *     [2025-10-22, พชร ไพศรีสกุล] V 1.2.0
 *   - refactor(auth-backend): update database structure and adjust login & profile components
 *     [2025-10-23, พชร ไพศรีสกุล] V 1.3.0
 *   - perf(frontend backend):แก้ไขฟอแมตให้ดูสะอาดและเป็นระเบียบ
 *     [2025-12-03, พชร ไพศรีสกุล] V 1.3.1
 *   - feat(frontend): ทำหน้า UserHome
 *     [2025-12-06, พชร ไพศรีสกุล] V 1.4.0
 *   - feat(manager-sidebar): เปลี่ยน path สร้างรายงานเป็น /main/manage-report
 *     [2026-01-13, นราธิป แสนทวีสุข] V 1.4.1
 *   - perfix(feontend, backend)จัดโครงสร้างใหม่
 *     [2026-02-4, พชร ไพศรีสกุล] V 2.0.0
 *   - fix(frontend): เอาไฟล์ icon ต่าง ๆ เข้า assets
 *     [2026-02-5, พชร ไพศรีสกุล] V 2.1.0
 *   - แก้ไข ตาม feedback Menu side bar Manager ให้เหลือแค่ หน้าหลัก กับ แจ้งซ่อม กับ รายการของฉัน
 *     [2026-02-08, นราธิป แสนทวีสุข] V 2.2.0
 *   - Refactor Sidebar เป็น Section-based และปรับปรุง UX
 *     [2026-02-22, พชร ไพศรีสกุล] V 2.3.0
 *   - fix(frontend): แก้ไขหัวข้อหน้า
 * =====================================================================
 */

<script setup>
import { ref } from 'vue'
import SidebarProfile from '@/components/sidebar-profile-component.vue'
import LogoFIXDESK from '@/assets/icons/LogoFIXDESK-logo.png'
import HomeIcon from '@/assets/icons/sidebar/home-icon.svg'
import RepairIcon from '@/assets/icons/sidebar/repair-icon.svg'
import ListIcon from '@/assets/icons/sidebar/list-icon.svg'
import ReportIcon from '@/assets/icons/sidebar/report-icon.svg'

/**
 * สถานะการเปิด/ปิด Sidebar
 * ใช้ควบคุมการขยายความกว้าง (w-20 / w-64)
 * และควบคุมการแสดงผลข้อความเมนู
 *
 * @type {import('vue').Ref<boolean>}
 */
const isOpen = ref(false)

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
      { icon: HomeIcon, label: 'หน้าหลัก', path: '/main/Dashboard' },
      { icon: RepairIcon, label: 'แจ้งซ่อม', path: '/main/repair-request' },
      { icon: ListIcon, label: 'รายการของฉัน', path: '/main/my-list' },
      { icon: ReportIcon, label: 'สร้างรายงาน', path: '/main/manage-report' },
    ],
  },
]
</script>

<template>
  <aside
    class="fixed top-0 left-0 h-screen bg-[#1E48D1] text-white shadow-lg transition-[width] duration-300 ease-in-out overflow-y-auto overflow-x-hidden flex flex-col justify-between select-none"
    :class="isOpen ? 'w-64' : 'w-20'"
    @mouseenter="isOpen = true"
    @mouseleave="isOpen = false"
  >
    <!-- โลโก้ -->
    <div class="flex items-center justify-start h-20 border-b border-blue-700 px-4">
      <img :src="LogoFIXDESK" alt="FixDesk Logo" class="w-10 h-10 object-contain" />
      <span
        class="ml-3 text-2xl font-bold tracking-wide transition-opacity duration-300"
        :class="isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'"
      >
        FIXDESK
      </span>
    </div>
    <!-- เมนูหลัก -->
    <nav class="flex flex-col gap-2 mt-6 px-2 flex-1">
      <template v-for="(section, sIndex) in menuSections" :key="sIndex">
        <!-- หัวข้อหมวด -->
        <div class="h-1 px-3 mt-2 mb-2 flex items-center">
          <span
            class="text-xs uppercase tracking-wider text-blue-200 transition-opacity duration-200"
            :class="isOpen ? 'opacity-100' : 'opacity-0'"
          >
            {{ section.title }}
          </span>
        </div>

        <!-- รายการเมนู -->
        <RouterLink
          v-for="(menu, index) in section.items"
          :key="index"
          :title="!isOpen ? menu.label : ''"
          :to="menu.path"
          class="group flex items-center rounded-lg transition-all duration-200 h-10 px-2 hover:bg-blue-800"
          active-class="bg-blue-900 shadow-inner"
        >
          <div
            class="flex items-center justify-center w-10 h-10 shrink-0 transition-all duration-300"
          >
            <img :src="menu.icon" :alt="menu.label" class="w-5 h-5" />
          </div>

          <span
            class="text-sm font-medium whitespace-nowrap transition-all duration-300"
            :class="isOpen ? 'opacity-100 visible ml-2' : 'opacity-0 invisible ml-0'"
          >
            {{ menu.label }}
          </span>
        </RouterLink>
      </template>
    </nav>
    <SidebarProfile :expanded="isOpen" />
  </aside>
</template>
