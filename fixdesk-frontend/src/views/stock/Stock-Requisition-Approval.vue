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
    text: 'ระบบจะบันทึกผลการพิจารณาและปิดงานใบเบิกนี้',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true,
  })

  if (!result.isConfirmed) return

  try {
    isSubmitting.value = true

    // 1) อัปเดตรายการย่อย
    await Promise.all(
      items.value.map((it) =>
        axios.put(
          `${API}/stock-forms/detail/update-item-status`,
          {
            sf_code: sfCode,
            pd_id: it.id,
            status: it.status,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      ),
    )

    // 2) อัปเดตสถานะหัวใบเป็น approved เสมอ
    await updateFormStatus('approved')

    await Sweetalert.fire('สำเร็จ', 'บันทึกผลการพิจารณาและปิดงานใบเบิกเรียบร้อยแล้ว', 'success')

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
  <div>
    <div class="mx-auto max-w-7xl">
      <!-- Top Header -->
      <div class="bg-white rounded-xl shadow-sm p-4 mb-4 border border-slate-200">
        <div class="flex items-start sm:items-center justify-between">
          <div class="flex items-center gap-4">
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
              <h1 class="text-xl font-bold text-slate-900">อนุมัติการเบิกของ</h1>
              <p class="text-sm text-slate-500">
                ตรวจสอบรายการ และเลือกผลการอนุมัติให้ครบทุกรายการก่อนยืนยัน
              </p>
            </div>
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

          <!-- LEFT : รายการเบิก -->
          <div
            v-for="item in items"
            :key="item.id"
            class="border rounded-xl p-3 bg-white hover:bg-gray-50 transition"
          >
            <!-- สำคัญ: items-stretch -->
            <div class="flex gap-4 items-stretch">
              <!-- รูป -->
              <div class="w-32 shrink-0 self-stretch">
                <img
                  v-if="item.img"
                  :src="item.img"
                  :alt="item.name"
                  class="w-full h-full rounded-lg border bg-gray-100 object-cover"
                  @error="(e) => (e.target.src = '/icon/no-image-icon.svg')"
                />
                <div
                  v-else
                  class="w-full h-full rounded-lg border bg-gray-100 flex items-center justify-center text-xs text-gray-400"
                >
                  ไม่มีรูป
                </div>
              </div>

              <!-- เนื้อหา -->
              <div class="flex-1 flex flex-col">
                <!-- แถวบน -->
                <div class="flex justify-between items-start gap-4">
                  <p class="font-semibold text-gray-800 text-sm">
                    {{ item.name }}
                  </p>

                  <div class="inline-flex rounded-xl h-[30px]">
                    <!-- ========== BEFORE CONFIRM (เลือกได้) ========== -->
                    <template v-if="request.status === 'waiting'">
                      <!-- APPROVE -->
                      <label
                        class="flex items-center gap-2 px-4 py-2 cursor-pointer transition text-sm font-semibold hover:bg-emerald-50"
                        :class="
                          item.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200'
                            : 'text-slate-600'
                        "
                      >
                        <input
                          type="radio"
                          class="hidden"
                          :name="`approve-${item.id}`"
                          value="approved"
                          :checked="item.status === 'approved'"
                          @change="approveItem(item.id, 'approved')"
                        />

                        <img src="/icon/approved-icon.svg" class="w-5 h-5 shrink-0" alt="" />
                        <span>อนุมัติ</span>
                      </label>

                      <div class="w-px bg-slate-200"></div>

                      <!-- REJECT -->
                      <label
                        class="flex items-center gap-2 px-4 py-2 cursor-pointer transition text-sm font-semibold hover:bg-rose-50"
                        :class="
                          item.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 ring-2 ring-rose-200'
                            : 'text-slate-600'
                        "
                      >
                        <input
                          type="radio"
                          class="hidden"
                          :name="`approve-${item.id}`"
                          value="rejected"
                          :checked="item.status === 'rejected'"
                          @change="approveItem(item.id, 'rejected')"
                        />

                        <img src="/icon/rejected-icon.svg" class="w-5 h-5 shrink-0" alt="" />
                        <span>ไม่อนุมัติ</span>
                      </label>
                    </template>

                    <!-- ========== AFTER CONFIRM (read-only) ========== -->
                    <template v-else>
                      <div
                        class="flex items-center justify-center min-h-[35px] min-w-[140px] px-6 py-2 text-sm font-semibold rounded-full select-none"
                        :class="
                          item.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        "
                      >
                        {{ item.status === 'approved' ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ' }}
                      </div>
                    </template>
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
              <p class="font-bold text-slate-900">ข้อมูลผู้เบิกของ</p>
              <p class="text-xs text-slate-500 mt-0.5">ใช้สำหรับอ้างอิงก่อนอนุมัติ</p>
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
                <p class="col-span-5 text-slate-500">รหัสงานซ่อม</p>
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
          <div
            class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:sticky lg:top-6"
          >
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

              <div v-if="canApprove" class="space-y-2">
                <div class="flex items-start">
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

              <button
                v-if="canApprove"
                class="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!allReviewed || isSubmitting"
                @click="confirmApprove"
              >
                <span v-if="isSubmitting" class="inline-flex items-center gap-2">
                  <span
                    class="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin"
                  ></span>
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
        <div
          class="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between"
        >
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
    <div
      v-if="isImageOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="ดูรูป"
      @click.self="closeImage"
    >
      <div class="absolute inset-0 bg-black/60"></div>

      <div
        class="relative w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-xl border border-white/10"
      >
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <p class="text-sm font-semibold text-slate-900 truncate">{{ previewAlt }}</p>
          <button
            type="button"
            class="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition flex items-center justify-center"
            @click="closeImage"
            aria-label="ปิด"
            title="ปิด"
          >
            ✕
          </button>
        </div>

        <div class="bg-slate-50 p-3 sm:p-4">
          <div
            class="w-full aspect-[16/9] sm:aspect-[3/2] rounded-xl overflow-hidden bg-white border border-slate-200"
          >
            <img
              :src="previewSrc"
              :alt="previewAlt"
              class="w-full h-full object-contain"
              @error="(e) => (e.target.src = '/icon/no-image.svg')"
            />
          </div>

          <p class="text-xs text-slate-500 mt-3">
            *คลิกด้านนอกหรือกด ✕ เพื่อปิด (ช่วยลดความผิดพลาดก่อนอนุมัติ)
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
