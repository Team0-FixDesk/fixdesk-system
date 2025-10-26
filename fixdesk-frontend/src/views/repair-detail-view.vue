<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/* ==============================
 * ⚙️ CONFIG
 * ============================== */
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const route = useRoute()
const router = useRouter()

/* ==============================
 * 💾 STATE
 * ============================== */
const repair = ref(null)
const loading = ref(true)
const reporterFromToken = ref('-')

/* ==============================
 * 🔐 JWT PARSER
 * ============================== */
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return {}
  }
}

/* ==============================
 * 📥 FETCH DETAIL
 * ============================== */
async function fetchRepairDetail() {
  try {
    const id = route.params.id
    const token = localStorage.getItem('token')

    console.log('🔍 Fetching repair detail for ID:', id)

    if (token) {
      const payload = parseJwt(token)
      reporterFromToken.value = `${payload.us_prefix_th || ''}${payload.us_first_name_th || payload.us_first_name || ''} ${payload.us_last_name_th || payload.us_last_name || ''}`.trim()
    }

    const res = await fetch(`${API_BASE}/repair-requests/${id}`)
    console.log('📡 Response status:', res.status)

    if (!res.ok) {
      const errorData = await res.json()
      console.error('❌ API Error:', errorData)
      throw new Error('โหลดข้อมูลไม่สำเร็จ')
    }

    const data = await res.json()
    console.log('✅ Received data:', data)

    repair.value = {
      ...data,
      reporter_name: data.reporter_name || reporterFromToken.value,
      technician_name:
        data.technician_first_name && data.technician_last_name
          ? `${data.technician_first_name} ${data.technician_last_name}`
          : '— ยังไม่ได้มอบหมาย —',
    }
  } catch (err) {
    console.error('❌ โหลดข้อมูลล้มเหลว:', err)
  } finally {
    loading.value = false
  }
}

/* ==============================
 * 🎨 BADGE STATUS
 * ============================== */
function statusBadge(status) {
  const style =
    'inline-flex justify-center items-center min-w-[130px] h-[34px] text-sm font-medium px-3 py-1 rounded-lg'
  const map = {
    pending: `<span class="${style} bg-amber-100 text-amber-700">รอดำเนินการ</span>`,
    in_progress: `<span class="${style} bg-blue-100 text-blue-700">กำลังดำเนินการ</span>`,
    done: `<span class="${style} bg-green-100 text-green-700">เสร็จสิ้น</span>`,
  }
  return map[status] || '-'
}

function urgencyBadge(urgency) {
  const style =
    'inline-flex justify-center items-center min-w-[100px] h-[34px] text-sm font-medium px-3 py-1 rounded-lg'
  const map = {
    low: `<span class="${style} bg-green-100 text-green-700">ไม่เร่งด่วน</span>`,
    medium: `<span class="${style} bg-yellow-100 text-yellow-700">เร่งด่วน</span>`,
    high: `<span class="${style} bg-red-100 text-red-700">เร่งด่วนมาก</span>`,
  }
  return map[urgency] || `<span class="${style} bg-gray-100 text-gray-700">ไม่ระบุ</span>`
}

/* ==============================
 * 🚀 LIFECYCLE
 * ============================== */
onMounted(fetchRepairDetail)
</script>


<template>
  <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-6xl">
    <!-- 🧾 หัวข้อ -->
    <h1 class="text-xl font-bold text-blue-700 mb-6">รายละเอียดใบแจ้งซ่อม</h1>

    <!-- ⏳ กำลังโหลด -->
    <div v-if="loading" class="text-center text-gray-500 py-10 animate-pulse">
      กำลังโหลดข้อมูล...
    </div>

    <!-- ✅ แสดงข้อมูล -->
    <div v-else-if="repair" class="space-y-6 text-gray-700">
      <!-- 🧩 ข้อมูลหลัก -->
      <div class="grid grid-cols-2 gap-y-3">
        <p><strong>เลขที่ใบแจ้งซ่อม:</strong> {{ repair.rf_code }}</p>
        <p>
          <strong>ความเร่งด่วน:  </strong>
          <span v-html="urgencyBadge(repair.rf_urgency)"></span>
        </p>

        <p>
          <strong>สถานะ:  </strong>
          <span v-html="statusBadge(repair.rf_user_status)"></span>
        </p>

        <p><strong>ผู้แจ้ง:</strong> {{ repair.reporter_name || reporterFromToken }}</p>

        <p><strong>เบอร์โทร:</strong> {{ repair.rf_phone || '-' }}</p>

        <p>
          <strong>ช่างผู้รับผิดชอบ:</strong>
          {{ repair.technician_name }}
        </p>

        <p><strong>ประเภทที่แจ้งซ่อม:</strong> {{ repair.repair_type_name || '-' }}</p>

        <p><strong>หมายเลขครุภัณฑ์:</strong> {{ repair.rf_prop_number || '-' }}</p>

        <!-- 🏢 สถานที่ -->
        <p class="col-span-2">
          <strong>สถานที่:</strong>
          อาคาร {{ repair.rf_building || '-' }}, ชั้น {{ repair.rf_floor || '-' }}, ห้อง
          {{ repair.rf_room || '-' }}
        </p>

        <p class="col-span-2">
          <strong>วันที่แจ้ง:</strong>
          {{ new Date(repair.rf_create_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
        </p>
      </div>

      <!-- 💬 ปัญหาที่พบ -->
      <div>
        <p class="font-semibold text-gray-800 mb-2">ปัญหาที่พบ:</p>
        <p
          class="p-3 bg-gray-50 rounded-md border border-gray-200 whitespace-pre-line min-h-[80px]"
        >
          {{ repair.rf_problem || '—' }}
        </p>
      </div>

      <!-- 🛠️ รายละเอียดเพิ่มเติม -->
      <div>
        <p class="font-semibold text-gray-800 mb-2">รายละเอียดเพิ่มเติม:</p>
        <p
          class="p-3 bg-gray-50 rounded-md border border-gray-200 whitespace-pre-line min-h-[80px]"
        >
          {{ repair.rf_detail || '—' }}
        </p>
      </div>
    </div>

    <!-- ❌ ไม่พบข้อมูล -->
    <div v-else class="text-center text-gray-500 py-10">ไม่พบข้อมูลใบแจ้งซ่อมนี้</div>

    <!-- 🔙 ปุ่มย้อนกลับ -->
    <div class="mt-8 flex justify-end">
      <button
        @click="router.back()"
        class="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-medium transition"
      >
        ← กลับไปหน้าก่อนหน้า
      </button>
    </div>
  </div>
</template>

