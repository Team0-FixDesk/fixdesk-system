<template>
  <div class="bg-white rounded-xl shadow-md p-12 mx-auto max-w-7xl">
    <!-- หัวข้อ -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-black">แบบฟอร์มแจ้งซ่อม</h1>

      <!-- แสดงชื่อหน่วยงาน (ถ้าอยากให้แสดงเฉย ๆ) -->
      <p class="text-gray-600 text-base mt-2">
        {{ formData.department || 'ชื่อหน่วยงาน' }}
      </p>
    </div>
    <div class="p-12 mx-auto max-w-8xl">
      <!-- ฟอร์มหลัก -->
      <form class="space-y-6">
        <!-- แถว 1 -->
        <div class="grid grid-cols-2 gap-10">
          <div>
            <label class="text-base font-medium text-black">
              ลงชื่อผู้แจ้ง <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">กรอกชื่อ–นามสกุลของผู้ที่ทำการแจ้งปัญหา</p>
            <input
              v-model="formData.reporterName"
              type="text"
              class="w-full text-xm bg-white border border-neutral-400 rounded-md"
              placeholder="กรอกชื่อ–นามสกุล"
            />
          </div>

          <div>
            <label class="text-base font-medium text-black">
              เบอร์โทรศัพท์ <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">กรอกเบอร์โทรศัพท์ที่สามารถติดต่อกลับได้</p>
            <input
              v-model="formData.phoneNumber"
              type="text"
              class="w-full text-xm bg-white border border-neutral-400 rounded-md"
              placeholder="กรอกเบอร์โทรศัพท์"
            />
          </div>
        </div>

        <!-- แถว 2 -->
        <div class="grid grid-cols-3 gap-10">
          <div>
            <label class="text-base font-medium text-black">
              หน่วยงาน <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">กรอกชื่อหน่วยงานหรือแผนกที่สังกัด</p>
            <input
              v-model="formData.department"
              type="text"
              class="w-full text-xm bg-white border border-neutral-400 rounded-md"
              placeholder="กรอกชื่อหน่วยงาน"
            />
          </div>

          <div>
            <label class="text-base font-medium text-black">
              ประเภท <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">โปรดเลือกประเภทงานหรือสิ่งของที่ต้องการซ่อม</p>
            <select
              v-model="formData.repairType"
              class="w-full text-xm bg-white border border-neutral-400 rounded-md text-neutral-700"
            >
              <option value="">กรุณาเลือกประเภท</option>
              <option
                v-for="(type, index) in formData.repairTypeOptions"
                :key="index"
                :value="type"
              >
                {{ type }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-base font-medium text-black">หมายเลขครุภัณฑ์</label>
            <p class="text-neutral-400 text-xs mb-2">กรอกหมายเลขครุภัณฑ์ (ถ้ามี)</p>
            <input
              v-model="formData.assetCode"
              type="text"
              class="w-full text-xm bg-white border border-neutral-400 rounded-md"
              placeholder="กรอกเลขครุภัณฑ์ (ถ้ามี)"
            />
          </div>
        </div>

        <!-- แถว 3 -->
        <div>
          <label class="text-base font-medium text-black">
            ขอความอนุเคราะห์ตรวจสอบ/ซ่อมแซม <span class="text-red-600">*</span>
          </label>
          <p class="text-neutral-400 text-xs mb-2">กรอกปัญหาที่ต้องการให้ตรวจสอบหรือซ่อมแซม</p>
          <input
            v-model="formData.problemDetail"
            type="text"
            class="w-full text-xm bg-white border border-neutral-400 rounded-md"
            placeholder="กรุณากรอกรายละเอียดปัญหา"
          />
        </div>

        <!-- แถว 4 -->
        <div class="grid grid-cols-3 gap-10">
          <div>
            <label class="text-base font-medium text-black">
              อาคาร <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">โปรดระบุชื่ออาคารที่พบปัญหา</p>
            <select
              v-model="formData.repairType"
              class="w-full text-xm bg-white border border-neutral-400 rounded-md text-neutral-700"
            >
              <option value="">กรุณาเลือกอาคาร</option>
              <option
                v-for="(type, index) in formData.repairTypeOptions"
                :key="index"
                :value="type"
              >
                {{ type }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-base font-medium text-black">
              ชั้น <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">โปรดเลือกชั้นที่พบปัญหา</p>
            <select
              v-model="formData.repairType"
              class="w-full text-xm bg-white border border-neutral-400 rounded-md text-neutral-700"
            >
              <option value="">กรุณาเลือกชั้น</option>
              <option
                v-for="(type, index) in formData.repairTypeOptions"
                :key="index"
                :value="type"
              >
                {{ type }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-base font-medium text-black">
              ห้อง <span class="text-red-600">*</span>
            </label>
            <p class="text-neutral-400 text-xs mb-2">โปรดเลือกห้องหรือพื้นที่ที่พบปัญหา</p>
            <select
              v-model="formData.repairType"
              class="w-full text-xm bg-white border border-neutral-400 rounded-md text-neutral-700"
            >
              <option value="">กรุณาเลือกห้อง</option>
              <option
                v-for="(type, index) in formData.repairTypeOptions"
                :key="index"
                :value="type"
              >
                {{ type }}
              </option>
            </select>
          </div>
        </div>

        <!-- แถว 5 -->
        <div class="mb-1">
          <label class="text-base font-medium text-black">
            สาเหตุ/อาการเสีย <span class="text-red-600">*</span>
          </label>
          <p class="text-neutral-400 text-xs mb-2">อธิบายอาการเสียหรือสาเหตุที่พบอย่างชัดเจน</p>
        </div>

        <!--แถวหลัก (2 ช่องเท่ากัน) -->
        <div class="grid grid-cols-2 gap-10 items-stretch">
          <!-- ซ้าย: กล่องข้อความ -->
          <div class="flex flex-col flex-1">
            <textarea
              v-model="formData.issueDescription"
              class="flex-1 w-full min-h-[320px] text-xm bg-white border border-neutral-400 rounded-md resize-none"
              placeholder="กรุณากรอกสาเหตุ/อาการที่เสีย"
            ></textarea>
          </div>

          <!-- ขวา: กล่องอัปโหลด + ปุ่มเร่งด่วน -->
          <div class="flex flex-col flex-1">
            <label
              for="dropzone-file"
              class="flex flex-col flex-1 min-h-[320px] items-center justify-center w-full border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
            >
              <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <img src="/icon/image-up-icon.svg" class="w-10 h-10 mb-2 opacity-70" />
                <p class="text-sm text-gray-500">
                  <span class="font-semibold">เลือกไฟล์ หรือลากไฟล์เพื่ออัปโหลด</span>
                </p>
              </div>
              <input id="dropzone-file" type="file" class="hidden" @change="handleFileUpload" />
            </label>

            <!-- ปุ่มเร่งด่วน -->
            <div class="flex justify-center items-center gap-12 mt-4">
              <div
                v-for="(level, index) in urgencyLevels"
                :key="index"
                class="flex items-center gap-3 cursor-pointer select-none"
                @click="formData.urgency = level.value"
              >
                <div
                  class="w-7 h-7 rounded-full border-2 shadow-md transition-all duration-200"
                  :class="[level.border, formData.urgency === level.value ? level.bg : 'bg-white']"
                ></div>
                <span class="text-base text-black font-normal">{{ level.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ปุ่มบันทึก -->
        <div class="flex justify-end mt-10">
          <button
            type="button"
            class="bg-[#1E48D1] text-white px-6 py-3 rounded-lg hover:bg-sky-700 transition"
            @click="handleSubmit"
          >
            บันทึกฟอร์มแจ้งซ่อม
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineOptions({ name: 'RepairRequestView' })

const formData = ref({
  issueDescription: '',
  urgency: '',
  uploadedFile: null,
})

const urgencyLevels = [
  { label: 'เร่งด่วนมาก', value: 'high', border: 'border-red-600', bg: 'bg-red-600' },
  { label: 'เร่งด่วน', value: 'medium', border: 'border-amber-400', bg: 'bg-amber-400' },
  { label: 'ไม่เร่งด่วน', value: 'low', border: 'border-green-600', bg: 'bg-green-600' },
]

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  formData.value.uploadedFile = file || null
  if (file) {
    console.log('📁 ไฟล์ที่อัปโหลด:', file.name)
  }
}

const handleSubmit = () => {
  console.log('ข้อมูลที่กรอก:', formData.value)
  alert('ส่งข้อมูลสำเร็จ (จำลอง)')
}

</script>
