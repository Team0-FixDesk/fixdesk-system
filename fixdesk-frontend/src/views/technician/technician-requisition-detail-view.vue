<script setup>
import { ref} from 'vue'

defineOptions({ name: 'TechnicianRequisitionDetailView' })


const items = ref([
  {
    id: 1,
    name: 'เครื่องพิมพ์เลเซอร์ขาวดำ HP LaserJet Pro MFP M428fdw',
    assetCode: 'EL-25-001',
    qty: 1,
    image: '/img/product-placeholder.png',
  },
])

const form = ref({
  requester: 'นายธนภัทร จันทร์งาน',
  department: 'ABC-000',
  date: '2025-11-21',
  location: '',
  remark: 'เปลี่ยนหลอดไฟห้องประชุม',
})

// handlers
const increaseQty = (item) => item.qty++
const decreaseQty = (item) => item.qty > 1 && item.qty--
const removeItem = (id) => {
  items.value = items.value.filter(i => i.id !== id)
}

const submitRequisition = () => {
  console.log('submit', items.value, form.value)
}
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8">

    <!-- ================= รายการเบิก ================= -->
    <div class="bg-white rounded-xl shadow-md p-6">
      <h2 class="text-lg font-bold mb-4">รายการเบิก</h2>

      <div v-for="item in items" :key="item.id"
        class="flex items-center justify-between border-b py-4">

        <div class="flex gap-4 items-center">
          <img :src="item.image" class="w-16 h-16 rounded border" />

          <div>
            <p class="font-semibold">{{ item.name }}</p>
            <p class="text-sm text-gray-500">หมายเลขครุภัณฑ์ : {{ item.assetCode }}</p>
            <p class="text-sm text-gray-500">หมวดหมู่ : {{ item.category }}</p>

            <div class="flex items-center gap-2 mt-2">
              <button @click="decreaseQty(item)" class="px-2 border rounded">-</button>
              <span class="w-6 text-center">{{ item.qty }}</span>
              <button @click="increaseQty(item)" class="px-2 border rounded">+</button>
            </div>
          </div>
        </div>

        <button @click="removeItem(item.id)"
          class="text-red-500 hover:underline text-sm">
          remove
        </button>
      </div>

      <div class="flex justify-end mt-4">
        <button class="bg-blue-600 text-white px-6 py-2 rounded-lg">
          ยืนยันการเบิก
        </button>
      </div>
    </div>

    <!-- ================= ฟอร์มขอเบิก ================= -->
    <div class="bg-white rounded-xl shadow-md p-6">
      <h2 class="text-lg font-bold mb-1">ฟอร์มขอเบิกวัสดุ / อุปกรณ์</h2>
      <p class="text-sm text-gray-500 mb-6">กรอกข้อมูลส่วนตัวของผู้ขอเบิก</p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div>
          <label class="form-label">ชื่อผู้ทำรายการเบิก *</label>
          <input v-model="form.requester" class="form-input" disabled />
        </div>

        <div>
          <label class="form-label">หน่วยงาน / สังกัด *</label>
          <input v-model="form.department" class="form-input" disabled />
        </div>

        <div>
          <label class="form-label">วันที่ทำการเบิก *</label>
          <input type="date" v-model="form.date" class="form-input" />
        </div>

        <div>
          <label class="form-label">ประเภทงานซ่อม *</label>
          <select v-model="form.jobType" class="form-input">
            <option value="">กรุณาเลือกประเภท</option>
            <option value="repair">ซ่อมบำรุง</option>
            <option value="replace">เปลี่ยนอุปกรณ์</option>
          </select>
        </div>

        <div>
          <label class="form-label">สถานที่ / จุดซ่อม *</label>
          <select v-model="form.location" class="form-input">
            <option value="">กรุณาเลือกสถานที่</option>
            <option value="meeting-room">ห้องประชุม</option>
            <option value="office">สำนักงาน</option>
          </select>
        </div>

        <div>
          <label class="form-label">ความเร่งด่วน *</label>
          <select v-model="form.urgency" class="form-input">
            <option value="">ระดับความเร่งด่วน</option>
            <option value="low">ต่ำ</option>
            <option value="medium">ปานกลาง</option>
            <option value="high">สูง</option>
          </select>
        </div>

        <div class="md:col-span-2">
          <label class="form-label">หมายเหตุ</label>
          <input v-model="form.remark" class="form-input" />
        </div>
      </div>

      <div class="flex justify-end mt-6">
        <button @click="submitRequisition"
          class="bg-blue-600 text-white px-6 py-2 rounded-lg">
          ยื่นคำขอเบิก
        </button>
      </div>
    </div>

  </div>
</template>
