<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import Sweetalert from 'sweetalert2'

import { useRouter } from 'vue-router'
const router = useRouter()

defineOptions({ name: 'StockWithdrawApproveView' })

const API = import.meta.env.VITE_API_BASE

const token = localStorage.getItem('token') || sessionStorage.getItem('token')

// รับรหัสใบเบิกจาก URL
const route = useRoute()
const sfCode = route.params.code

const canApprove = computed(() => request.value.status === 'waiting')
const actionError = ref('')

/* ================= DATA จาก backend ================= */
const request = ref({
  requester: '',
  department: '',
  date: '',
  status: '',
  repairCode: '',
  location: '',
})

/* ================= APPROVER ================= */
const approverName = ref('')
const selectedAction = ref(null)

// ถ้ามีข้อมูล user ใน local/session storage
const sessionUser = JSON.parse(
  localStorage.getItem('session_user') || sessionStorage.getItem('session_user') || '{}',
)

if (sessionUser.firstName && sessionUser.lastName) {
  approverName.value = `${sessionUser.firstName} ${sessionUser.lastName}`
}

const items = ref([])

/* ================= ดึงข้อมูลจริง ================= */
const loadDetail = async () => {
  try {
    const res = await axios.get(`${API}/stock-forms/detail/${sfCode}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = res.data
    console.log('sfCode =', sfCode)

    console.log('API RESULT =', data)

    if (!data || data.length === 0) return

    request.value = {
      requester: data[0].requester,
      department: data[0].us_department, // ✔ แก้แล้ว
      date: new Date(data[0].sf_create_at).toLocaleDateString('th-TH'),
      status: data[0].sf_status,
      repairCode: data[0].sf_code, // ✔ ใช้รหัสใบเบิกแทน (ยังไม่มี rf_code)
      location: `${data[0].bd_name} ${data[0].fl_name} ${data[0].room_name}`,
    }

    items.value = data.map((d) => ({
      id: d.pd_id,
      name: d.pd_name,
      assetCode: d.pd_asset_code, // ✔
      category: d.category, // ✔
      qty: d.sfd_qty, // ✔
      img: d.pd_upload_image, // ✔
    }))
  } catch (err) {
    console.error(err)
    Sweetalert.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้', 'error')
  }
}

onMounted(loadDetail)
const allReviewed = computed(() => items.value.every((i) => i.status !== 'รออนุมัติ'))

/* ================= METHODS ================= */

const confirmApprove = async () => {
  if (!selectedAction.value) {
    actionError.value = 'กรุณาเลือกผลการอนุมัติ'
    return
  }

  const apiStatus = selectedAction.value === 'approved' ? 'approved' : 'rejected'

  try {
    await axios.put(
      `${API}/stock-forms/update-status`,
      {
        sf_code: sfCode,
        status: apiStatus,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    // Toast แบบเดียวกับไฟล์ MyListView.vue
    Sweetalert.fire({
      toast: true,
      position: 'top-end',
      title: 'บันทึกผลสำเร็จ',
      text: apiStatus === 'approved' ? 'ใบเบิกได้รับการอนุมัติ' : 'ใบเบิกถูกปฏิเสธ',
      icon: 'success',
      timer: 1800,
      showConfirmButton: false,
    })

    // Redirect หลัง Toast ปิด
    setTimeout(() => {
      router.push('/main/stock-withdraw-list')
    }, 1800)
  } catch (err) {
    Sweetalert.fire({
      toast: true,
      position: 'top-end',
      title: 'เกิดข้อผิดพลาด',
      text: 'ไม่สามารถบันทึกผลได้',
      icon: 'error',
      timer: 2000,
      showConfirmButton: false,
    })
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
  if (window.history.length > 1) {
    router.go(-1) // หรือ router.back()
  }
}
</script>

<template>
  <div class="bg-gray-50 min-h-screen px-3 sm:px-6 lg:px-8">
    <div
      class="bg-white rounded-xl shadow-sm p-4 sm:p-6 lg:p-8 mx-auto max-w-7xl border border-gray-100"
    >
      <div class="flex items-center gap-3 mb-6">
        <div
          class="w-11 h-11 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition"
          @click="goBack"
        >
          <img src="/icon/back-icon.svg" class="w-6 h-6 sm:w-5 sm:h-5" />
        </div>

        <h1 class="text-2xl font-bold">รายการเบิก</h1>
      </div>

      <div class="grid grid-cols-12 gap-6">
        <!-- LEFT -->
        <div class="col-span-8 space-y-1">
          <div
            v-for="item in items"
            :key="item.id"
            class="border rounded-xl p-4 space-y-1 bg-white hover:bg-gray-50 transition"
          >
            <p class="font-semibold text-gray-800 text-sm">
              {{ item.name }}
            </p>

            <p class="text-sm text-gray-500 text-sm">
              <span class="text-gray-600">หมายเลขครุภัณฑ์:</span>
              {{ item.assetCode }}
            </p>

            <p class="text-sm text-gray-500 text-sm">
              <span class="text-gray-600">หมวดหมู่:</span>
              {{ item.category }}
            </p>

            <p class="text-sm text-gray-500 text-sm">
              <span class="text-gray-600">จำนวนที่เบิก:</span>
              {{ item.qty }}
            </p>
          </div>
        </div>

        <!-- RIGHT -->
        <div class="col-span-4 space-y-4">
          <!-- INFO -->
          <div class="border rounded-xl">
            <div class="px-4 py-3 border-b font-bold text-lg">ข้อมูลผู้เบิกของ</div>

            <div class="p-4 space-y-3 text-sm">
              <div class="grid grid-cols-2">
                <span>ชื่อผู้ทำรายการเบิก</span>
                <span class="text-gray-600">{{ request.requester }}</span>
              </div>

              <div class="grid grid-cols-2">
                <span>หน่วยงาน / สังกัด</span>
                <span class="text-gray-600">{{ request.department }}</span>
              </div>

              <div class="grid grid-cols-2">
                <span>วันที่ทำการเบิก</span>
                <span class="text-gray-600">{{ request.date }}</span>
              </div>

              <div class="grid grid-cols-2 items-center">
                <span>สถานะ</span>
                <span v-html="renderStatusStockBadge(request.status)"></span>
              </div>

              <div class="grid grid-cols-2">
                <span>รหัสงานซ่อม</span>
                <span class="text-gray-600">{{ request.repairCode }}</span>
              </div>

              <div class="grid grid-cols-2">
                <span>สถานที่ / จุดซ่อม</span>
                <span class="text-gray-600">{{ request.location }}</span>
              </div>
            </div>
          </div>

          <!-- APPROVER -->
          <div class="border rounded-xl">
            <div class="px-4 py-3 border-b font-bold text-lg">
              สำหรับผู้อนุมัติเบิก
              <p class="text-xs font-normal text-gray-500">กรุณากรอกข้อมูลเพื่ออนุมัติการเบิก</p>
            </div>

            <div class="p-4 space-y-4">
              <div>
                <label class="text-sm block mb-1"> ชื่อผู้อนุมัติการเบิกของ </label>
                <input
                  v-model="approverName"
                  disabled
                  class="w-full px-3 py-2 rounded border border-gray-300 bg-gray-100 text-gray-400"
                />
              </div>
              <div v-if="canApprove" class="space-y-2">
                <label class="text-sm font-semibold">ผลการอนุมัติ</label>

                <div class="space-y-2">
                  <!-- อนุมัติ -->
                  <label
                    class="flex items-center gap-3 border rounded-lg p-3 cursor-pointer hover:bg-green-50 transition"
                    :class="selectedAction === 'approved' ? 'border-green-500 bg-green-50' : ''"
                  >
                    <input
                      type="radio"
                      value="approved"
                      v-model="selectedAction"
                      class="w-4 h-4 text-green-600"
                    />
                    <span class="font-medium text-green-700">อนุมัติทั้งหมด</span>
                  </label>

                  <!-- ไม่อนุมัติ -->
                  <label
                    class="flex items-center gap-3 border rounded-lg p-3 cursor-pointer hover:bg-red-50 transition"
                    :class="selectedAction === 'rejected' ? 'border-red-500 bg-red-50' : ''"
                  >
                    <input
                      type="radio"
                      value="rejected"
                      v-model="selectedAction"
                      class="w-4 h-4 text-red-600"
                    />
                    <span class="font-medium text-red-700">ไม่อนุมัติใบเบิก</span>
                  </label>
                </div>
                <div v-if="actionError" class="text-red-600 text-sm mt-1">
                  {{ actionError }}
                </div>
              </div>
              <button
                v-if="canApprove"
                class="ml-auto block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
                :disabled="!allReviewed"
                @click="confirmApprove"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
