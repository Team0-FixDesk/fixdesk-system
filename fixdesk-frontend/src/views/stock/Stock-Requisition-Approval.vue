<script setup>
import { ref, computed } from 'vue'
import Swal from 'sweetalert2'

defineOptions({ name: 'StockWithdrawApproveView' })

/* ================= DATA ================= */
const request = ref({
  requester: 'นายธนาภัทร จันทร์งาน',
  department: 'ช่างเทคนิค',
  date: '29 กันยายน 2568',
  status: 'รออนุมัติ',
  repairCode: 'ABC-10010',
  location: 'สำนักปลัด',
  remark: 'ใช้เปลี่ยนหลอดไฟ',
})

const approverName = ref('นายธนาภัทร จันทร์งาน')
const approveRemark = ref('')

const items = ref([
  {
    id: 1,
    name: 'เครื่องพิมพ์เลเซอร์ขาวดำ HP LaserJet Pro MFP M428fdw',
    assetCode: 'EL-25-001',
    category: 'ไฟฟ้า',
    qty: 1,
    status: 'รออนุมัติ',
  },
])

/* ================= COMPUTED ================= */
const statusClass = computed(() => {
  if (request.value.status === 'อนุมัติแล้ว')
    return 'bg-green-100 text-green-700'
  if (request.value.status === 'ไม่อนุมัติ')
    return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-700'
})

const allApproved = computed(() =>
  items.value.every(i => i.status === 'อนุมัติแล้ว')
)

/* ================= METHODS ================= */
const approveItem = (item) => {
  item.status = 'อนุมัติแล้ว'
  request.value.status = allApproved.value ? 'อนุมัติแล้ว' : 'รออนุมัติ'
}

const rejectItem = async (item) => {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'ไม่อนุมัติรายการนี้?',
    input: 'textarea',
    inputPlaceholder: 'กรุณาระบุเหตุผล',
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
  })

  if (!result.isConfirmed) return

  item.status = 'ไม่อนุมัติ'
  request.value.status = 'ไม่อนุมัติ'
}

/* ✅ POPUP ยืนยันแบบในรูป */
const confirmApprove = async () => {
  const isReject = items.value.some(i => i.status === 'ไม่อนุมัติ')

  const result = await Swal.fire({
    icon: isReject ? 'warning' : 'success',
    title: isReject
      ? 'ยืนยันการไม่อนุมัติการเบิก'
      : 'ยืนยันการอนุมัติการเบิก',
    text: 'คุณต้องการยืนยันผลการพิจารณาหรือไม่',
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true,
    confirmButtonColor: isReject ? '#ef4444' : '#22c55e',
    cancelButtonColor: '#e5e7eb',
  })

  if (!result.isConfirmed) return

  request.value.status = isReject ? 'ไม่อนุมัติ' : 'อนุมัติแล้ว'

  await Swal.fire({
    icon: 'success',
    title: 'บันทึกผลเรียบร้อย',
    showConfirmButton: false,
    timer: 1500,
  })
}

</script>

<template>
  <div class="max-w-7xl mx-auto bg-white rounded-xl shadow p-6">

    <h1 class="text-2xl font-bold mb-6">รายการเบิก</h1>

    <div class="grid grid-cols-12 gap-6">

      <!-- LEFT -->
      <div class="col-span-8 space-y-4">
        <div v-for="item in items" :key="item.id" class="border rounded-xl p-4 flex justify-between items-center">
          <div class="flex gap-4">
            <img src="https://via.placeholder.com/60" class="w-14 h-14 rounded border" />
            <div>
              <p class="font-semibold">{{ item.name }}</p>
              <p class="text-sm text-gray-500">
                หมายเลขครุภัณฑ์ : {{ item.assetCode }}
              </p>
              <p class="text-sm text-gray-500">
                หมวดหมู่ : {{ item.category }}
              </p>
              <p class="text-sm text-gray-500">
                จำนวนที่เบิก : {{ item.qty }}
              </p>
            </div>
          </div>

          <div class="flex gap-2">
            <button class="bg-green-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              :disabled="item.status !== 'รออนุมัติ'" @click="approveItem(item)">
              อนุมัติ
            </button>
            <button class="bg-red-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              :disabled="item.status !== 'รออนุมัติ'" @click="rejectItem(item)">
              ไม่อนุมัติ
            </button>
          </div>
        </div>
      </div>

      <!-- RIGHT -->
      <div class="col-span-4 space-y-4">

        <!-- INFO -->
        <div class="border rounded-xl">
          <div class="px-4 py-3 border-b font-bold text-lg">
            ข้อมูลผู้เบิกของ
          </div>

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
              <span class="inline-flex px-3 py-1 rounded-full text-xs w-fit" :class="statusClass">
                {{ request.status }}
              </span>
            </div>

            <div class="grid grid-cols-2">
              <span>รหัสงานซ่อม</span>
              <span class="text-gray-600">{{ request.repairCode }}</span>
            </div>

            <div class="grid grid-cols-2">
              <span>สถานที่ / จุดซ่อม</span>
              <span class="text-gray-600">{{ request.location }}</span>
            </div>

            <div class="grid grid-cols-2 items-center">
              <span class="text-gray-500">หมายเหตุ</span>
              <span class="text-gray-600">{{ request.remark }}</span>
            </div>
          </div>
        </div>

        <!-- APPROVER -->
        <div class="border rounded-xl">
          <div class="px-4 py-3 border-b font-bold text-lg">
            สำหรับผู้อนุมัติเบิก
            <p class="text-xs font-normal text-gray-500">
              กรุณากรอกข้อมูลเพื่ออนุมัติการเบิก
            </p>
          </div>

          <div class="p-4 space-y-4">
            <div>
              <label class="text-sm block mb-1">
                ชื่อผู้อนุมัติการเบิกของ
              </label>
              <input v-model="approverName" disabled
                class="w-full px-3 py-2 rounded border border-gray-300 bg-gray-100 text-gray-400" />
            </div>

            <div>
              <label class="text-sm block mb-1">หมายเหตุ</label>
              <textarea v-model="approveRemark" rows="3" placeholder="กรุณากรอกหมายเหตุ" class="w-full px-3 py-2 border border-gray-300 rounded
                       text-gray-700 placeholder:text-gray-400
                       focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
            </div>

            <button
              class="ml-auto block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
              :disabled="!allReviewed" @click="confirmApprove">
              ยืนยัน
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>