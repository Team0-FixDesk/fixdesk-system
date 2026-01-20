<script setup>
/**
 * File: stock-withdraw-approve-view.vue
 * Description: หน้าผู้อนุมัติใบเบิกของ (Stock Withdraw Approval) แสดงรายการ + อนุมัติ/ไม่อนุมัติรายชิ้น
 */

import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import Sweetalert from 'sweetalert2'

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

/* ================= APPROVER ================= */
const approverName = ref('')

const sessionUser = JSON.parse(
  localStorage.getItem('session_user') ||
  sessionStorage.getItem('session_user') ||
  '{}',
)

if (sessionUser.firstName && sessionUser.lastName) {
  approverName.value = `${sessionUser.firstName} ${sessionUser.lastName}`
}

/* ================= UI STATE ================= */
const actionError = ref('')
const isSubmitting = ref(false)

const canApprove = computed(() => request.value.status === 'waiting')

const allReviewed = computed(() => {
  return (
    items.value.length > 0 &&
    items.value.every(
      (it) => it.status === 'approved' || it.status === 'rejected',
    )
  )
})

const reviewedCount = computed(
  () =>
    items.value.filter(
      (i) => i.status === 'approved' || i.status === 'rejected',
    ).length,
)

const reviewedPercent = computed(() => {
  if (!items.value.length) return 0
  return Math.round((reviewedCount.value / items.value.length) * 100)
})

/* ================= Image Preview Modal ================= */
const isImageOpen = ref(false)
const previewSrc = ref('')
const previewAlt = ref('')

const openImage = (src, alt = 'รูปครุภัณฑ์') => {
  if (!src) return
  previewSrc.value = src
  previewAlt.value = alt
  isImageOpen.value = true
}

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
      repairCode: data[0].sf_code,
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

/* ================= HELPERS ================= */
/**
 * คำนวณสถานะหัวใบเบิกตามกติกา:
 * - ถ้า rejected ทั้งหมด => rejected
 * - ถ้ามีอย่างน้อย 1 approved => approved (รวมถึงอนุมัติบางส่วน/ทั้งหมด)
 */
const computeFormStatus = () => {
  const list = items.value

  const allRejected =
    list.length > 0 && list.every((it) => it.status === 'rejected')
  if (allRejected) return 'rejected'

  const hasApproved = list.some((it) => it.status === 'approved')
  if (hasApproved) return 'approved'

  return request.value.status || 'waiting'
}

/**
 * อัปเดตสถานะหัวใบเบิกลง DB
 * IMPORTANT: ถ้า endpoint ของคุณชื่อไม่ใช่อันนี้ ให้บอกชื่อจริงแล้วผมปรับให้ตรง
 */
const updateFormStatus = async (status) => {
  await axios.put(
    `${API}/stock-forms/update-status`,
    { sf_code: sfCode, status },
    { headers: { Authorization: `Bearer ${token}` } },
  )
}

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

  const result = await Sweetalert.fire({
    title: 'ยืนยันการทำรายการ?',
    text: 'ระบบจะบันทึกผลการอนุมัติลงฐานข้อมูล',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true,
  })

  if (!result.isConfirmed) return

  try {
    isSubmitting.value = true

    // 1) อัปเดตรายการย่อยลง DB
    await Promise.all(
      items.value.map((it) =>
        axios.put(
          `${API}/stock-forms/detail/update-item-status`,
          { sf_code: sfCode, pd_id: it.id, status: it.status },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      ),
    )

    // 2) คำนวณสถานะหัวใบ + อัปเดตลง DB
    const formStatus = computeFormStatus()
    try {
      await updateFormStatus(formStatus)
    } catch (err) {
      console.error('updateFormStatus error:', err)
      await Sweetalert.fire(
        'อัปเดตหัวใบไม่สำเร็จ',
        'บันทึกรายการย่อยสำเร็จแล้ว แต่ยังอัปเดตสถานะใบเบิกไม่ได้ (กรุณาตรวจสอบ endpoint /stock-forms/update-status)',
        'warning',
      )
    }

    await Sweetalert.fire('สำเร็จ', 'บันทึกผลการอนุมัติเรียบร้อยแล้ว', 'success')
    await loadDetail()
  } catch (err) {
    console.error(err)
    Sweetalert.fire('ผิดพลาด', 'อัปเดตสถานะไม่สำเร็จ', 'error')
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
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-white px-3 sm:px-6 lg:px-8 py-6">
    <div class="mx-auto max-w-7xl">
      <!-- Top Header -->
      <div class="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6">
        <div class="flex items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <button type="button"
              class="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 active:scale-[0.98] transition"
              @click="goBack" aria-label="ย้อนกลับ" title="ย้อนกลับ">
              <img src="/icon/back-icon.svg" class="w-6 h-6" />
            </button>

            <div>
              <h1 class="text-xl sm:text-2xl font-bold text-slate-900">อนุมัติการเบิกของ</h1>
              <p class="text-sm text-slate-500 mt-0.5">
                ตรวจสอบรายการ และเลือกผลการอนุมัติให้ครบทุกรายการก่อนยืนยัน
              </p>
            </div>
          </div>

          <!-- Status Summary -->
          <div class="flex items-center gap-3">
            <div class="text-right">
              <p class="text-xs text-slate-500">ความคืบหน้า</p>
              <p class="text-sm font-semibold text-slate-900 mt-1">
                {{ reviewedCount }} / {{ items.length }} รายการ
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
            <p class="text-sm text-slate-500 mt-1">โปรดลองรีเฟรช หรือตรวจสอบรหัสใบเบิก</p>
          </div>

          <div v-for="item in items" :key="item.id"
            class="relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden">
            <!-- Card body -->
            <div class="p-4 sm:p-5 pb-28 sm:pb-5">
              <!-- Row: Image LEFT | Content RIGHT -->
              <div class="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                <!-- LEFT: Image -->
                <div class="shrink-0">
                  <button v-if="item.img" type="button"
                    class="group relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm hover:shadow-md transition"
                    @click="openImage(item.img, item.name)" :aria-label="`ดูรูป ${item.name}`"
                    title="คลิกเพื่อดูรูปใหญ่">
                    <img :src="item.img" :alt="item.name"
                      class="w-full h-full object-cover group-hover:scale-[1.03] transition" loading="lazy"
                      @error="(e) => (e.target.src = '/icon/no-image.svg')" />
                  </button>

                  <div v-else
                    class="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
                    ไม่มีรูป
                  </div>
                </div>

                <!-- RIGHT: Content -->
                <div class="min-w-0 flex-1 w-full">
                  <p class="text-sm sm:text-base font-semibold text-slate-900 truncate">
                    {{ item.name }}
                  </p>

                  <div class="mt-2 flex flex-wrap gap-2 text-xs">
                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                      <span class="font-medium text-slate-700">รหัสวัสดุ</span>
                      <span class="text-slate-400">•</span>
                      <span class="truncate">{{ item.assetCode }}</span>
                    </span>

                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                      <span class="font-medium text-slate-700">หมวดหมู่</span>
                      <span class="text-slate-400">•</span>
                      <span class="truncate">{{ item.category }}</span>
                    </span>

                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                      <span class="font-medium text-slate-700">จำนวน</span>
                      <span class="text-slate-400">•</span>
                      <span class="font-semibold text-slate-900">{{ item.qty }}</span>
                    </span>
                  </div>

                  <p v-if="request.status === 'waiting' && item.status === 'waiting'"
                    class="text-xs text-slate-400 mt-2">
                    *ยังไม่ได้เลือกผลการอนุมัติ
                  </p>

                  <!-- สถานะรายการ (ซ้ายล่าง) -->
                  <div class="mt-4 text-xs text-slate-500">
                    สถานะรายการ:
                    <span class="font-semibold" :class="item.status === 'approved'
                      ? 'text-emerald-700'
                      : item.status === 'rejected'
                        ? 'text-rose-700'
                        : 'text-amber-700'">
                      {{
                        item.status === 'approved'
                          ? 'อนุมัติ'
                          : item.status === 'rejected'
                            ? 'ไม่อนุมัติ'
                            : 'รอพิจารณา'
                      }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- ปุ่มอนุมัติ และไม่อนุมัติ -->
              <!-- ปุ่มอยู่มุมขวาล่าง แต่ไม่มีกรอบครอบ -->
              <div class="sm:absolute sm:bottom-5 sm:right-5 sm:mt-0 mt-4 flex justify-end z-10">
                <div class="inline-flex items-center gap-2">
                  <template v-if="request.status === 'waiting'">
                    <label class="group inline-flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition
               hover:bg-emerald-50 hover:border-emerald-200" :class="item.status === 'approved'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                : 'bg-white border-slate-200'" title="อนุมัติรายการนี้">
                      <input type="radio" :name="`approve-${item.id}`" value="approved"
                        @change="approveItem(item.id, 'approved')" class="w-4 h-4 text-emerald-600"
                        :checked="item.status === 'approved'" />
                      <span class="text-sm font-semibold text-emerald-700">อนุมัติ</span>
                    </label>

                    <label class="group inline-flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition
               hover:bg-rose-50 hover:border-rose-200" :class="item.status === 'rejected'
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200'
                : 'bg-white border-slate-200'" title="ไม่อนุมัติรายการนี้">
                      <input type="radio" :name="`approve-${item.id}`" value="rejected"
                        @change="approveItem(item.id, 'rejected')" class="w-4 h-4 text-rose-600"
                        :checked="item.status === 'rejected'" />
                      <span class="text-sm font-semibold text-rose-700">ไม่อนุมัติ</span>
                    </label>
                  </template>

                  <template v-else>
                    <div v-html="renderStatusStockBadge(item.status)"></div>
                  </template>
                </div>
              </div>
            </div>

            <div class="h-px bg-slate-100"></div>
          </div>

        </div>

        <!-- RIGHT: Sticky Panel -->
        <div class="col-span-12 lg:col-span-4 space-y-4">
          <!-- Request Info -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-200">
              <p class="font-bold text-slate-900">ข้อมูลผู้เบิกของ</p>
              <p class="text-xs text-slate-500 mt-0.5">ใช้สำหรับอ้างอิงก่อนอนุมัติ</p>
            </div>

            <div class="p-4 space-y-3 text-sm">
              <div class="grid grid-cols-12 gap-2">
                <p class="col-span-5 text-slate-500">ผู้ทำรายการ</p>
                <p class="col-span-7 text-slate-900 font-medium break-words">{{ request.requester }}</p>
              </div>

              <div class="grid grid-cols-12 gap-2">
                <p class="col-span-5 text-slate-500">หน่วยงาน</p>
                <p class="col-span-7 text-slate-900 font-medium break-words">{{ request.department }}</p>
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
                <p class="col-span-5 text-slate-500">รหัสงานซ่อม</p>
                <p class="col-span-7 text-slate-900 font-medium break-words">{{ request.repairCode }}</p>
              </div>

              <div class="grid grid-cols-12 gap-2">
                <p class="col-span-5 text-slate-500">สถานที่</p>
                <p class="col-span-7 text-slate-900 font-medium break-words">{{ request.location }}</p>
              </div>
            </div>
          </div>

          <!-- Approver + Actions (sticky) -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:sticky lg:top-6">
            <div class="px-4 py-3 border-b border-slate-200">
              <p class="font-bold text-slate-900">สำหรับผู้อนุมัติ</p>
              <p class="text-xs text-slate-500 mt-0.5">ตรวจสอบให้ครบก่อนกดยืนยัน</p>
            </div>

            <div class="p-4 space-y-4">
              <div>
                <label class="text-sm font-medium text-slate-700 block mb-1">
                  ชื่อผู้อนุมัติการเบิกของ
                </label>
                <input v-model="approverName" disabled
                  class="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500" />
              </div>

              <div v-if="canApprove" class="space-y-2">
                <div class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div class="mt-0.5 w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></div>
                  <p class="text-xs text-slate-600 leading-relaxed">
                    เลือก <span class="font-semibold text-emerald-700">อนุมัติ</span> หรือ
                    <span class="font-semibold text-rose-700">ไม่อนุมัติ</span>
                    ให้ครบทุกชิ้น ระบบจะเปิดปุ่มยืนยันให้อัตโนมัติ
                  </p>
                </div>

                <div v-if="actionError" class="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p class="text-sm text-rose-700 font-semibold">ยังทำรายการไม่ครบ</p>
                  <p class="text-xs text-rose-600 mt-1">{{ actionError }}</p>
                </div>
              </div>

              <button v-if="canApprove" class="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white
                       bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition
                       disabled:opacity-50 disabled:cursor-not-allowed" :disabled="!allReviewed || isSubmitting"
                @click="confirmApprove">
                <span v-if="isSubmitting" class="inline-flex items-center gap-2">
                  <span class="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin"></span>
                  กำลังบันทึก...
                </span>
                <span v-else>ยืนยันผลการอนุมัติ</span>
              </button>

              <div v-else class="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p class="text-sm font-semibold text-emerald-700">ใบเบิกนี้ได้รับการพิจารณาแล้ว</p>
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
            <p class="text-xs text-slate-500">สถานะใบเบิก</p>
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
