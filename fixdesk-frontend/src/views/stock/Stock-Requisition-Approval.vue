/**
 * =====================================================================
 * @file            stock-withdraw-approve-view.vue
 * @module          มอดูลการจัดการของผู้ดูแลคลัง - การตรวจสอบ และอนุมัติรายการเบิกของ
 * @layer           View (Presentation Layer)
 * @version         1.0.1
 * @since           2025-12-21
 * @author          ธนภัทร จันทร์งาม
 * @lastModified    2026-02-27
 * @lastModifiedBy  เศรษฐพงศ์ หอมชื่น
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอสำหรับอนุมัติรายการเบิกของของผู้ดูแลคลัง
 *  แสดงรายละเอียดรายการเบิก และรายการวัสดุ/ครุภัณฑ์ที่ขอเบิก
 *  ผู้อนุมัติสามารถ:
 *   - ตรวจสอบข้อมูลผู้เบิก และสถานที่ใช้งาน
 *   - ดูรายการวัสดุ/อุปกรณ์ที่ขอเบิก
 *   - เลือกผลการพิจารณาแต่ละรายการ (อนุมัติ / ไม่อนุมัติ)
 *
 * @requires
 *   - vue
 *   - vue-router
 *   - axios
 *   - sweetalert2
 *   - @iconify/vue
 *   - @/components/button/back-button-component.vue
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - ปรับข้อความและรูปแบบการแจ้งเตือน (Toast / Alert)
 *   ให้สอดคล้องกับมาตรฐานของระบบ
 *   [2026-02-21, ธนภัทร จันทร์งาม]
 *   - ปรับปรุงข้อความที่ใช้ให้เหมาะสม   [2026-02-18, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - แก้ไขสีปุ่ม และ border         [2026-02-27, เศรษฐพงศ์ หอมชื่น]
 * =====================================================================
 */

<script setup>
/**
 * =====================================================================
 * @file            Stock-Requisition-Approval.vue
 * @module          อนุมัติการเบิกวัสดุ / อุปกรณ์
 * @layer           View (Presentation Layer)
 * @version         1.0.0
 * @since           2025-10-17
 * @lastModified    2026-02-17
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 *  หน้าจอสำหรับผู้อนุมัติพิจารณาอนุมัติ/ไม่อนุมัติรายการเบิกวัสดุและอุปกรณ์
 *  รองรับฟีเจอร์:
 *    - เลือกรายการด้วย Checkbox (เลือกทั้งหมดหรือเลือกรายการเดียว)
 *    - ตั้งค่าสถานะอนุมัติ/ไม่อนุมัติแบบ Bulk Actions
 *    - แสดง Progress Bar ความคืบหน้าการตรวจสอบ
 *    - ยืนยันการทำรายการทั้งหมดพร้อมกัน
 *    - แสดงข้อมูลผู้เบิก หน่วยงาน และรหัสงานซ่อมที่เกี่ยวข้อง
 *
 * @requires
 *   - vue (ref, computed, onMounted)
 *   - vue-router
 *   - axios
 *   - sweetalert2
 *   - @iconify/vue
 *   - @/components/button/back-button-component.vue
 *
 * @authors
 *   - พชร ไพศรีสกุล
 *   - นราธิป แสนทวีสุข
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  - เพิ่ม Checkbox และ Bulk Actions เพื่อ UX ที่ดีขึ้น    [2026-02-17, นราธิป]
 *  - แยก Flow ระหว่างตั้งค่าและยืนยันบันทึก              [2026-02-17, นราธิป]
 *  - เปลี่ยน Alert เป็น Toast และเพิ่ม Auto Redirect    [2026-02-17, นราธิป]
 *  - ปรับ Checkbox ให้อยู่กลางบรรทัด                      [2026-02-17, นราธิป]
 *  - ปรับสีของปุ่ม และปรับแต่ง checkbox                [2026-02-27, เศรษฐพงศ์]
 * =====================================================================
 */

import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import Sweetalert from 'sweetalert2'
import BackButtonComponent from '@/components/button/back-button-component.vue'
import { Icon } from '@iconify/vue'


defineOptions({ name: 'StockWithdrawApproveView' })

const router = useRouter()
const route = useRoute()

const API = import.meta.env.VITE_API_BASE
const token = localStorage.getItem('token') || sessionStorage.getItem('token')

// รับรหัสใบเบิกจาก URL
const sfCode = route.params.code || ''

/* ================= DATA ================= */
const request = ref({
  requester: '',
  department: '',
  date: '',
  status: '',
  repairCode: '',
  location: '',
})

const items = ref([])

/* ================= SELECTION ================= */
const selectedItems = ref(new Set())

const toggleSelectAll = () => {
  if (selectedItems.value.size === items.value.length) {
    selectedItems.value.clear()
  } else {
    items.value.forEach((item) => selectedItems.value.add(item.id))
  }
}

const toggleSelectItem = (itemId) => {
  if (selectedItems.value.has(itemId)) {
    selectedItems.value.delete(itemId)
  } else {
    selectedItems.value.add(itemId)
  }
}

const selectedCount = computed(() => selectedItems.value.size)
const isAllSelected = computed(() =>
  items.value.length > 0 && selectedItems.value.size === items.value.length
)

const approveSelected = () => {
  if (selectedItems.value.size === 0) {
    Sweetalert.fire({
      icon: 'warning',
      title: 'กรุณาเลือกรายการก่อน',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    })
    return
  }

  // แค่เปลี่ยนสถานะ ไม่บันทึก DB
  items.value.forEach((item) => {
    if (selectedItems.value.has(item.id)) {
      item.status = 'approved'
    }
  })

  Sweetalert.fire({
    icon: 'success',
    title: `ตั้งค่าอนุมัติ ${selectedItems.value.size} รายการ`,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  })

  selectedItems.value.clear()
  actionError.value = ''
}

const rejectSelected = () => {
  if (selectedItems.value.size === 0) {
    Sweetalert.fire({
      icon: 'warning',
      title: 'กรุณาเลือกรายการก่อน',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    })
    return
  }

  // แค่เปลี่ยนสถานะ ไม่บันทึก DB
  items.value.forEach((item) => {
    if (selectedItems.value.has(item.id)) {
      item.status = 'rejected'
    }
  })

  Sweetalert.fire({
    icon: 'success',
    title: `ตั้งค่าไม่อนุมัติ ${selectedItems.value.size} รายการ`,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  })

  selectedItems.value.clear()
  actionError.value = ''
}

/* ================= APPROVER ================= */
const approverName = ref('')

const sessionUser = JSON.parse(
  localStorage.getItem('session_user') || sessionStorage.getItem('session_user') || '{}',
)

if (sessionUser.fullName) {
  approverName.value = sessionUser.fullName
}

/* ================= UI STATE ================= */
const actionError = ref('')
const isSubmitting = ref(false)

const canApprove = computed(() => request.value.status === 'waiting')

const allReviewed = computed(() => {
  return (
    items.value.length > 0 &&
    items.value.every((it) => it.status === 'approved' || it.status === 'rejected')
  )
})

const reviewedCount = computed(
  () => items.value.filter((i) => i.status === 'approved' || i.status === 'rejected').length,
)

/* ================= Image Preview Modal ================= */
const isImageOpen = ref(false)
const previewSrc = ref('')
const previewAlt = ref('')

const closeImage = () => {
  isImageOpen.value = false
  previewSrc.value = ''
  previewAlt.value = ''
}

/* ================= LOAD DATA ================= */
const loadDetail = async () => {
  try {
    const res = await axios.get(`${API}/stock-forms/detail/${sfCode}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = res.data
    if (!data || data.length === 0) return

    request.value = {
      requester: data[0].requester,
      department: data[0].us_department,
      date: new Date(data[0].sf_create_at).toLocaleDateString('th-TH'),
      status: data[0].sf_status,
      repairCode: data[0].rf_code,
      location: `${data[0].bd_name} ${data[0].fl_name} ${data[0].room_name}`,
    }

    items.value = data.map((d) => ({
      id: d.pd_id,
      name: d.pd_name,
      assetCode: d.pd_asset_code,
      category: d.category,
      qty: d.sfd_qty,
      status: d.sfd_status, // waiting / approved / rejected
      img: d.pd_upload_image ? `${API}/uploads/${d.pd_upload_image}` : null,
    }))
  } catch (err) {
    console.error(err)
    Sweetalert.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้', 'error')
  }
}

onMounted(loadDetail)

/* ================= METHODS ================= */
const approveItem = (pdId, status) => {
  if (!canApprove.value) return
  actionError.value = ''

  const idx = items.value.findIndex((it) => it.id === pdId)
  if (idx !== -1) items.value[idx].status = status
}

const confirmApprove = async () => {
  if (!allReviewed.value) {
    actionError.value = 'กรุณาเลือกผลการอนุมัติให้ครบทุกรายการก่อนกดยืนยัน'
    return
  }

  const approvedCount = items.value.filter((it) => it.status === 'approved').length
  const rejectedCount = items.value.filter((it) => it.status === 'rejected').length

  let confirmText = 'ระบบจะบันทึกผลการพิจารณาและปิดงานใบเบิกนี้'

  if (approvedCount > 0 && rejectedCount > 0) {
    confirmText = `คุณกำลังจะบันทึกผลการพิจารณาอนุมัติ ${approvedCount} รายการ และไม่อนุมัติ ${rejectedCount} รายการ เมื่อยืนยันแล้ว จะไม่สามารถแก้ไขได้`
  } else if (approvedCount > 0) {
    confirmText = `คุณเลือกอนุมัติทั้งหมด ${approvedCount} รายการ`
  } else if (rejectedCount > 0) {
    confirmText = `คุณเลือกไม่อนุมัติทั้งหมด ${rejectedCount} รายการ`
  }

  const result = await Sweetalert.fire({
    title: 'ยืนยันการบันทึกผลการอนุมัติรายการเบิก?',
    text: confirmText,
    icon: 'question',

    showCancelButton: true,

    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#0048EF', 
    cancelButtonColor: '#d4d4d4', 
    reverseButtons: true,

    // ปรับขนาด title ให้เล็กลง
    customClass: {
      title: 'text-2xl font-bold',   // เดิมจะประมาณ text-2xl
    }
  })

  if (!result.isConfirmed) return

  try {
    isSubmitting.value = true

    const payload = {
      sf_code: sfCode,
      items: items.value.map((it) => ({
        pd_id: it.id,
        status: it.status,
      })),
    }

    console.log('Sending payload:', payload)

    // ใช้ batch endpoint เพื่ออัปเดตทุกรายการพร้อมกัน
    await axios.put(
      `${API}/stock-forms/detail/update-items-status-batch`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    //  เก็บข้อความ success ไว้ชั่วคราว
    sessionStorage.setItem(
  'stockWithdrawSuccess',
  'บันทึกผลการอนุมัติรายการเบิกเรียบร้อยแล้ว'
)

    // redirect ไปหน้าปลายทาง
    router.push('/main/stock-withdraw-history')

    // Redirect to stock-withdraw-list
    
  } catch (err) {
    console.error('Error details:', err)
    console.error('Error response:', err.response?.data)

    const errorMsg = err.response?.data?.message || err.message || 'อัปเดตสถานะไม่สำเร็จ'
    Sweetalert.fire('ผิดพลาด', errorMsg, 'error')
  } finally {
    isSubmitting.value = false
  }
}

function renderStatusStockBadge(type) {
  switch (type) {
    case 'waiting':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-lg bg-amber-50 text-amber-600 font-semibold border border-amber-100">รออนุมัติ</span>`
    case 'approved':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">อนุมัติแล้ว</span>`
    case 'rejected':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-lg bg-rose-50 text-rose-700 font-semibold border border-rose-100">ไม่อนุมัติ</span>`
    default:
      return type
  }
}

function goBack() {
  router.back()
}
</script>

<template>
  <div>
    <div class="mx-auto max-w-7xl">
      <!-- Top Header -->
      <div class="bg-white rounded-xl shadow-sm p-4 mb-4 border border-slate-200">
        <div class="flex items-start sm:items-center justify-between">
          <div class="flex items-center gap-4">
            <BackButtonComponent @click="goBack" />

            <div>
              <h1 class="text-xl font-bold text-slate-900">รายละเอียดการขอเบิก</h1>
              <p class="text-sm text-slate-500">
                ตรวจสอบรายการวัสดุ/อุปกรณ์ และรายละเอียดการขอเบิก
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-6">
        <!-- LEFT: Items -->
        <div class="col-span-12 lg:col-span-8 space-y-4">
          <!-- Empty state -->
          <div v-if="items.length === 0" class="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p class="text-slate-700 font-semibold">ไม่พบรายการเบิก</p>
            <p class="text-sm text-slate-500 mt-1">โปรดลองรีเฟรช หรือตรวจสอบหมายเลขรายการเบิก</p>
          </div>



          <!-- LEFT : รายการเบิก -->
          <div v-for="item in items" :key="item.id" class="border rounded-xl p-3 bg-white hover:bg-gray-50 transition">
            <!-- สำคัญ: items-stretch -->
            <div class="flex gap-4 items-stretch">
              <!-- Checkbox (Show only when status is waiting) -->
              <div
                v-if="request.status === 'waiting'"
                class="flex items-center"
              >
                <input
                  type="checkbox"
                  :checked="selectedItems.has(item.id)"
                  @change="toggleSelectItem(item.id)"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <!-- รูป -->
              <div class="w-32 shrink-0 self-stretch">
                <img v-if="item.img" :src="item.img" :alt="item.name"
                  class="w-full h-full rounded-lg border bg-gray-100 object-cover" @error="item.img = null" />

                <div v-else class="w-full h-full rounded-lg border bg-gray-100 flex items-center justify-center">
                  <Icon icon="ix:no-image" width="48" height="48" style="color: #8e8e8e" />
                </div>
              </div>

              <!-- เนื้อหา -->
              <div class="flex-1 flex flex-col">
                <!-- แถวบน -->
                <div class="flex justify-between items-start gap-4">
                  <p class="font-semibold text-gray-800 text-sm">
                    {{ item.name }}
                  </p>

                  <!-- Status Badge (แสดงเฉพาะเมื่อมีการอนุมัติแล้ว) -->
                  <div v-if="item.status !== 'waiting'" class="inline-flex rounded-xl h-[30px]">
                    <div
                      class="flex items-center justify-center min-h-[35px] min-w-[120px] px-4 py-2 text-sm font-semibold rounded-full select-none"
                      :class="item.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                        ">
                      {{ item.status === 'approved' ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ' }}
                    </div>
                  </div>
                </div>

                <!-- รายละเอียด -->
                <div class="space-y-1 text-sm text-gray-500">
                  <p>
                    <span class="text-gray-600">หมายเลขครุภัณฑ์:</span>
                    {{ item.assetCode }}
                  </p>
                  <p>
                    <span class="text-gray-600">หมวดหมู่:</span>
                    {{ item.category }}
                  </p>
                  <p>
                    <span class="text-gray-600">จำนวนที่เบิก:</span>
                    {{ item.qty }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Sticky Panel -->
        <div class="col-span-12 lg:col-span-4 space-y-4">
          <!-- Request Info -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-200">
              <p class="font-bold text-slate-900">รายละเอียดผู้ขอเบิก</p>
              <p class="text-xs text-slate-500 mt-0.5">ข้อมูลนี้อ้างอิงถึงรายละเอียดของงานซ่อมก่อนการอนุมัติ</p>
            </div>

            <div class="p-4 space-y-3 text-sm">
              <div class="grid grid-cols-12 gap-2">
                <p class="col-span-5 text-slate-500">ผู้ทำรายการ</p>
                <p class="col-span-7 text-slate-900 font-medium break-words">
                  {{ request.requester }}
                </p>
              </div>

              <div class="grid grid-cols-12 gap-2">
                <p class="col-span-5 text-slate-500">หน่วยงาน</p>
                <p class="col-span-7 text-slate-900 font-medium break-words">
                  {{ request.department }}
                </p>
              </div>

              <div class="grid grid-cols-12 gap-2">
                <p class="col-span-5 text-slate-500">วันที่ทำรายการ</p>
                <p class="col-span-7 text-slate-900 font-medium">{{ request.date }}</p>
              </div>

              <div class="grid grid-cols-12 gap-2 items-center">
                <p class="col-span-5 text-slate-500">สถานะ</p>
                <div class="col-span-7" v-html="renderStatusStockBadge(request.status)"></div>
              </div>

              <div class="grid grid-cols-12 gap-2">
                <p class="col-span-5 text-slate-500">หมายเลขแจ้งซ่อม</p>
                <p class="col-span-7 text-slate-900 font-medium break-words">
                  {{ request.repairCode }}
                </p>
              </div>

              <div class="grid grid-cols-12 gap-2">
                <p class="col-span-5 text-slate-500">สถานที่</p>
                <p class="col-span-7 text-slate-900 font-medium break-words">
                  {{ request.location }}
                </p>
              </div>
            </div>
          </div>

          <!-- Approver + Actions (sticky) -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:sticky lg:top-6">
            <div class="px-4 py-3 border-b border-slate-200">
              <p class="font-bold text-slate-900">สำหรับผู้อนุมัติ</p>
              <p class="text-xs text-slate-500 mt-0.5">ตรวจสอบรายการวัสดุ/อุปกรณ์ที่จำเป็นต่อการซ่อม
                และยืนยันผลการอนุมัติ</p>
            </div>

            <div class="p-4 space-y-4">
              <div>
                <label class="text-sm font-medium text-slate-700 block mb-1">
                  ชื่อผู้อนุมัติผลการเบิก
                </label>
                <input v-model="approverName" disabled
                  class="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500" />
              </div>

              <!-- Action Buttons (Show when status is waiting) -->
              <div v-if="canApprove" class="space-y-3">
                <!-- Select All Checkbox -->
                <label class="flex items-center gap-3 cursor-pointer group p-3 rounded-xl border-2 border-slate-200 hover:border-blue-300 transition bg-slate-50">
                  <input
                    type="checkbox"
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span class="text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition">
                    เลือกทั้งหมด ({{ items.length }} รายการ)
                  </span>
                </label>

                <!-- Progress Display -->
                <div class="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-xs text-blue-600">จำนวนรายการที่ตรวจสอบแล้ว</p>
                    <p class="text-xs font-semibold text-blue-700">
                      {{ reviewedCount }} / {{ items.length }}
                    </p>
                  </div>
                  <div class="w-full bg-blue-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      :style="{ width: `${(reviewedCount / items.length) * 100}%` }"></div>
                  </div>
                </div>

                <!-- Quick Action Buttons -->
                <div class="grid grid-cols-2 gap-2">
                  <button @click="approveSelected" :disabled="selectedCount === 0"
                    class="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed">
                    <Icon icon="mdi:check" width="18" height="18" />
                    <span>อนุมัติ</span>
                  </button>

                  <button @click="rejectSelected" :disabled="selectedCount === 0"
                    class="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed">
                    <Icon icon="mdi:close" width="18" height="18" />
                    <span>ไม่อนุมัติ</span>
                  </button>
                </div>

                <p class="text-xs text-slate-500 text-center leading-relaxed">
                  <Icon icon="mdi:lightbulb-on" class="inline" width="14" height="14" />
                  เลือกรายการ → กดอนุมัติ/ไม่อนุมัติ → ยืนยันบันทึก
                </p>

                <!-- Error Message -->
                <div v-if="actionError" class="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p class="text-sm text-rose-700 font-semibold">ยังทำรายการไม่ครบ</p>
                  <p class="text-xs text-rose-600 mt-1">{{ actionError }}</p>
                </div>

                <!-- Confirm Button (Only enabled when all items reviewed) -->
                <button
                  @click="confirmApprove"
                  :disabled="!allReviewed || isSubmitting"
                  class="w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3.5 font-bold text-white bg-blue-700 hover:bg-blue-800 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  <Icon v-if="!isSubmitting" icon="mdi:content-save-check" width="20" height="20" />
                  <span v-if="isSubmitting" class="inline-flex items-center gap-2">
                    <span
                      class="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin"></span>
                    กำลังบันทึก...
                  </span>
                  <span v-else>ยืนยันการทำรายการทั้งหมด</span>
                </button>
              </div>

              <!-- Completed State -->
              <div v-else class="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p class="text-sm font-semibold text-emerald-700">รายการเบิกนี้ได้รับการอนุมัติแล้ว</p>
                <p class="text-xs text-emerald-700/80 mt-1">
                  หากต้องการแก้ไข กรุณาติดต่อผู้ดูแลระบบ
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile status (show only on small) -->
      <div class="sm:hidden mt-6">
        <div class="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <p class="text-xs text-slate-500">สถานะรายการเบิก</p>
            <div class="mt-1" v-html="renderStatusStockBadge(request.status)"></div>
          </div>
          <div class="text-right">
            <p class="text-xs text-slate-500">ความคืบหน้า</p>
            <p class="text-sm font-semibold text-slate-900 mt-1">
              {{ reviewedCount }} / {{ items.length }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Preview Modal -->
    <div v-if="isImageOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog"
      aria-modal="true" aria-label="ดูรูป" @click.self="closeImage">
      <div class="absolute inset-0 bg-black/60"></div>

      <div class="relative w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-xl border border-white/10">
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <p class="text-sm font-semibold text-slate-900 truncate">{{ previewAlt }}</p>
          <button type="button"
            class="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition flex items-center justify-center"
            @click="closeImage" aria-label="ปิด" title="ปิด">
            ✕
          </button>
        </div>

        <div class="bg-slate-50 p-3 sm:p-4">
          <div class="w-full aspect-[16/9] sm:aspect-[3/2] rounded-xl overflow-hidden bg-white border border-slate-200">
            <img :src="previewSrc" :alt="previewAlt" class="w-full h-full object-contain"
              @error="(e) => (e.target.src = '/icon/no-image.svg')" />
          </div>

          <p class="text-xs text-slate-500 mt-3">
            *คลิกด้านนอกหรือกด ✕ เพื่อปิด (ช่วยลดความผิดพลาดก่อนอนุมัติ)
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
