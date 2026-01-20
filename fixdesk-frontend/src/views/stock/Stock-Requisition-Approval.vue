<script setup>
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
      img: d.pd_upload_image,
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

  const allRejected = list.length > 0 && list.every((it) => it.status === 'rejected')
  if (allRejected) return 'rejected'

  // มี approved อย่างน้อย 1 = approved
  const hasApproved = list.some((it) => it.status === 'approved')
  if (hasApproved) return 'approved'

  // กันพลาด (จริง ๆ ปุ่มยืนยันกดไม่ได้ถ้าไม่ครบ)
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
      // ถ้า backend ยังไม่มี endpoint นี้ จะโดน 404/500
      console.error('updateFormStatus error:', err)
      await Sweetalert.fire(
        'อัปเดตหัวใบไม่สำเร็จ',
        'บันทึกรายการย่อยสำเร็จแล้ว แต่ยังอัปเดตสถานะใบเบิกไม่ได้ (กรุณาตรวจสอบ endpoint /stock-forms/update-status)',
        'warning',
      )
    }

    await Sweetalert.fire('สำเร็จ', 'บันทึกผลการอนุมัติเรียบร้อยแล้ว', 'success')

    // โหลดใหม่ให้ตรงกับ DB
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
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-lg bg-amber-50 text-amber-500 font-semibold">รออนุมัติ</span>`
    case 'approved':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-lg bg-green-100 text-green-600 font-semibold">อนุมัติแล้ว</span>`
    case 'rejected':
      return `<span class="inline-flex justify-center items-center w-36 h-8 rounded-lg bg-red-100 text-red-500 font-semibold">ไม่อนุมัติ</span>`
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
      <div
        class="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6"
      >
        <div class="flex items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center hover:bg-slate-100 active:scale-[0.98] transition"
              @click="goBack"
              aria-label="ย้อนกลับ"
              title="ย้อนกลับ"
            >
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
                {{ items.filter(i => i.status === 'approved' || i.status === 'rejected').length }}
                / {{ items.length }} รายการ
              </p>
            </div>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="mt-4">
          <div class="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>ตรวจสอบรายการ</span>
            <span v-if="items.length > 0">
              {{ Math.round((items.filter(i => i.status === 'approved' || i.status === 'rejected').length / items.length) * 100) }}%
            </span>
            <span v-else>0%</span>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
            <div
              class="h-full rounded-full bg-blue-600 transition-all"
              :style="{
                width: items.length
                  ? `${(items.filter(i => i.status === 'approved' || i.status === 'rejected').length / items.length) * 100}%`
                  : '0%'
              }"
            ></div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-6">
        <!-- LEFT: Items -->
        <div class="col-span-12 lg:col-span-8 space-y-4">
          <!-- Empty state -->
          <div
            v-if="items.length === 0"
            class="bg-white rounded-2xl border border-slate-200 p-8 text-center"
          >
            <p class="text-slate-700 font-semibold">ไม่พบรายการเบิก</p>
            <p class="text-sm text-slate-500 mt-1">โปรดลองรีเฟรช หรือตรวจสอบรหัสใบเบิก</p>
          </div>

          <div
            v-for="item in items"
            :key="item.id"
            class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            <!-- Card header -->
            <div class="p-4 sm:p-5 flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-slate-900 truncate">
                  {{ item.name }}
                </p>

                <div class="mt-2 flex flex-wrap gap-2 text-xs">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                    <span class="font-medium text-slate-700">ครุภัณฑ์</span>
                    <span class="text-slate-500">•</span>
                    <span class="truncate">{{ item.assetCode }}</span>
                  </span>

                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                    <span class="font-medium text-slate-700">หมวดหมู่</span>
                    <span class="text-slate-500">•</span>
                    <span class="truncate">{{ item.category }}</span>
                  </span>

                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                    <span class="font-medium text-slate-700">จำนวน</span>
                    <span class="text-slate-500">•</span>
                    <span class="font-semibold text-slate-900">{{ item.qty }}</span>
                  </span>
                </div>
              </div>

              <!-- Decision UI -->
              <div class="shrink-0 flex flex-col items-end gap-2">
                <template v-if="request.status === 'waiting'">
                  <div class="flex gap-2">
                    <label
                      class="group inline-flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition
                             hover:bg-emerald-50 hover:border-emerald-200"
                      :class="item.status === 'approved'
                        ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                        : 'bg-white border-slate-200'"
                      title="อนุมัติรายการนี้"
                    >
                      <input
                        type="radio"
                        :name="`approve-${item.id}`"
                        value="approved"
                        @change="approveItem(item.id, 'approved')"
                        class="w-4 h-4 text-emerald-600"
                        :checked="item.status === 'approved'"
                      />
                      <span class="text-sm font-semibold text-emerald-700">อนุมัติ</span>
                    </label>

                    <label
                      class="group inline-flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition
                             hover:bg-rose-50 hover:border-rose-200"
                      :class="item.status === 'rejected'
                        ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200'
                        : 'bg-white border-slate-200'"
                      title="ไม่อนุมัติรายการนี้"
                    >
                      <input
                        type="radio"
                        :name="`approve-${item.id}`"
                        value="rejected"
                        @change="approveItem(item.id, 'rejected')"
                        class="w-4 h-4 text-rose-600"
                        :checked="item.status === 'rejected'"
                      />
                      <span class="text-sm font-semibold text-rose-700">ไม่อนุมัติ</span>
                    </label>
                  </div>

                  <!-- Micro hint -->
                  <p
                    v-if="item.status === 'waiting'"
                    class="text-xs text-slate-400"
                  >
                    *ยังไม่ได้เลือกผลการอนุมัติ
                  </p>
                </template>

                <template v-else>
                  <div v-html="renderStatusStockBadge(item.status)"></div>
                </template>
              </div>
            </div>

            <!-- Subtle footer line -->
            <div class="h-px bg-slate-100"></div>

            <!-- Optional: image preview (ถ้ามีรูป) -->
            <div v-if="item.img" class="p-4 sm:p-5 pt-4">
              <div class="flex items-center gap-3">
                <div class="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                  <img
                    :src="item.img"
                    alt="รูปครุภัณฑ์"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p class="text-xs text-slate-500">
                  รูปภาพประกอบ (ถ้าไม่แสดง อาจเป็น path ใน backend/ไฟล์ไม่พบ)
                </p>
              </div>
            </div>
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
                <input
                  v-model="approverName"
                  disabled
                  class="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500"
                />
              </div>

              <!-- Inline guidance + error -->
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

              <!-- Primary CTA -->
              <button
                v-if="canApprove"
                class="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white
                       bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition
                       disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!allReviewed || isSubmitting"
                @click="confirmApprove"
              >
                <span v-if="isSubmitting" class="inline-flex items-center gap-2">
                  <span class="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin"></span>
                  กำลังบันทึก...
                </span>
                <span v-else>ยืนยันผลการอนุมัติ</span>
              </button>

              <!-- When already decided -->
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
              {{ items.filter(i => i.status === 'approved' || i.status === 'rejected').length }}
              / {{ items.length }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
