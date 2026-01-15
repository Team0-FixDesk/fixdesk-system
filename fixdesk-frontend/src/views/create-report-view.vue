<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { jwtDecode } from 'jwt-decode'
import Swal from 'sweetalert2'

// Refs
const documentRef = ref(null)
const exportWrapper = ref(null)
const isGenerating = ref(false)
const userFullName = ref('')

// Thai Months
const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

// Get current month and year (Buddhist Era)
const now = new Date()
const currentMonthIndex = now.getMonth()
const currentYear = computed(() => now.getFullYear() + 543)

// Form Data
const formData = ref({
  department: 'สำนักปลัดเทศบาล ฝ่ายอำนวยการ งานอาคารและสถานที่',
  documentNumber: '',
  subject: 'รายงานการปฏิบัติงานของงานอาคารและสถานที่',
  to: 'นายกเทศมนตรีนครบ้านสวน',
  content: '',
  month: thaiMonths[currentMonthIndex],
  position: ''
})

// Validation State
const errors = ref({
  department: '',
  documentNumber: '',
  subject: '',
  to: '',
  content: '',
  position: ''
})

// Validation Logic
function validateField(field) {
  switch (field) {
    case 'department':
      errors.value.department = formData.value.department.trim() ? '' : 'กรุณากรอกส่วนราชการ';
      break;
    case 'documentNumber':
      errors.value.documentNumber = formData.value.documentNumber.trim() ? '' : 'กรุณากรอกเลขที่เอกสาร';
      break;
    case 'subject':
      errors.value.subject = formData.value.subject.trim() ? '' : 'กรุณากรอกเรื่อง';
      break;
    case 'to':
      errors.value.to = formData.value.to.trim() ? '' : 'กรุณากรอกชื่อผู้รับ';
      break;
    case 'content':
      errors.value.content = formData.value.content.trim() ? '' : 'กรุณากรอกเนื้อเรื่อง';
      break;
    case 'position':
      errors.value.position = formData.value.position.trim() ? '' : 'กรุณากรอกตำแหน่ง';
      break;
  }
}

// Check all fields
function validateForm() {
  let valid = true;
  Object.keys(errors.value).forEach(field => {
    validateField(field);
    if (errors.value[field]) valid = false;
  });
  return valid;
}

// Watch each field for instant validation (clear error on type)
Object.keys(formData.value).forEach(field => {
  if (errors.value[field] !== undefined) {
    watch(() => formData.value[field], () => {
      if (errors.value[field]) validateField(field);
    });
  }
});

// Computed: Formatted Date in Thai Buddhist Era
const formattedDate = computed(() => {
  const day = now.getDate()
  const month = thaiMonths[now.getMonth()]
  const year = now.getFullYear() + 543
  return `${day} ${month} ${year}`
})

// Computed: Format content with indentation
const formattedContent = computed(() => {
  if (!formData.value.content) return ''
  return formData.value.content
    .replace(/\t/g, '&emsp;&emsp;&emsp;')
    .replace(/\n/g, '<br>')
})

// Handle Tab key
function handleKeydown(e) {
  if (e.key === 'Tab') {
    e.preventDefault()
    const textarea = e.target
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value
    formData.value.content = value.substring(0, start) + '\t' + value.substring(end)
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 1
    }, 0)
  }
}

// Generate PDF
async function generatePDF() {
  validateForm()
  if (Object.values(errors.value).some(err => err !== '')) {
    Swal.fire({
      icon: 'error',
      title: 'ข้อมูลไม่ครบถ้วน',
      text: 'กรุณากรอกข้อมูลให้ครบถ้วนก่อนสร้าง PDF',
    })
    return
  }
  if (!documentRef.value) {
    Swal.fire({
      icon: 'error',
      title: 'ไม่พบเอกสาร',
      text: 'ไม่พบเอกสารที่ต้องการสร้าง PDF กรุณาลองใหม่อีกครั้ง',
    })
    return
  }

  isGenerating.value = true

  try {
    await nextTick()

    const originalElement = exportWrapper.value
    const clone = originalElement.cloneNode(true)

    clone.style.position = 'absolute'
    clone.style.left = '-9999px'
    clone.style.top = '0'
    clone.style.width = '794px'
    document.body.appendChild(clone)

    // Manual styling fix for PDF clone (dotted lines)
    const infoValues = clone.querySelectorAll('.info-value')
    infoValues.forEach(el => {
      el.style.borderBottom = 'none'
      el.style.backgroundImage = 'linear-gradient(to right, #000 33%, rgba(255,255,255,0) 0%)'
      el.style.backgroundSize = '3px 1px'
      el.style.backgroundRepeat = 'repeat-x'
      el.style.backgroundPosition = '0 calc(100% - 0px)' // Adjust this value if needed for PDF vertical position
    })

    const canvas = await html2canvas(clone, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      letterRendering: true
    })

    document.body.removeChild(clone)

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const imgData = canvas.toDataURL('image/png', 1.0)
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297)

    const filename = `บันทึกข้อความ_${formData.value.month}_${currentYear.value}.pdf`
    pdf.save(filename)

    if (window.Swal) {
      window.Swal.fire({
        icon: 'success',
        title: 'สำเร็จ',
        text: 'สร้าง PDF เรียบร้อยแล้ว',
        timer: 2000,
        showConfirmButton: false
      })
    }
  } catch (error) {
    console.error('Error generating PDF:', error)
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: 'ไม่สามารถสร้าง PDF ได้ กรุณาลองใหม่อีกครั้ง',
    })
  } finally {
    isGenerating.value = false
  }
}

function resetForm() {
  formData.value = {
    department: '',
    documentNumber: '',
    subject: '',
    to: '',
    content: '',
    month: thaiMonths[currentMonthIndex],
    position: ''
  }
  // Clear errors on reset
  Object.keys(errors.value).forEach(key => errors.value[key] = '')
}

onMounted(() => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (token) {
    try {
      const decoded = jwtDecode(token)
      const firstName = decoded.us_first_name_th || ''
      const lastName = decoded.us_last_name_th || ''
      userFullName.value = `${firstName} ${lastName}`.trim() || decoded.us_user_name || 'ผู้ใช้ระบบ'
    } catch (err) {
      console.error('Decode token error:', err)
      userFullName.value = 'ผู้ใช้ระบบ'
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4 pt-16">
    <div class="max-w-[1400px] mx-auto">
      <div class="flex flex-col lg:flex-row gap-4">
        <div class="bg-white rounded-xl shadow-lg p-4 lg:w-[850px] flex-shrink-0">
          <h2 class="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            ตัวอย่างเอกสาร
          </h2>
          <div class="pdf-preview-wrapper">
            <div class="justify-center flex">
              <div ref="exportWrapper" class="export-wrapper">
                <div ref="documentRef" class="pdf-document">
                  <div class="pdf-header">
                    <img src="/icon/Garuda.svg" alt="ครุฑ" class="garuda-icon" />
                    <h1 class="pdf-title">บันทึกข้อความ</h1>
                  </div>
                  <div class="pdf-info">
                    <div class="info-row">
                      <span class="info-label w-20">ส่วนราชการ</span>
                      <span class="info-value flex-1">{{ formData.department }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label w-8">ที่</span>
                      <span class="info-value w-48">{{ formData.documentNumber }}</span>
                      <span class="info-label w-12 ml-8">วันที่</span>
                      <span class="info-value flex-1">{{ formattedDate }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label w-10">เรื่อง</span>
                      <span class="info-value flex-1">
                        {{ formData.subject }} {{ formData.month ? 'ประจำเดือน' + formData.month : '' }} {{ currentYear }}
                      </span>
                    </div>
                    <div class="info-row">
                      <span class="info-label w-10">เรียน</span>
                      <span class="info-value flex-1">{{ formData.to }}</span>
                    </div>
                  </div>
                  <div class="pdf-content">
                    <div class="user-content" v-html="formattedContent"></div>
                    <p class="fixed-text indent mt-4">
                      งานอาคารและสถานที่ จึงขอรายงานการปฏิบัติงาน ประจำเดือน{{ formData.month }} {{ currentYear }}
                    </p>
                    <p class="fixed-text">ตามรายงานการปฏิบัติงานที่แนบท้าย</p>
                    <p class="fixed-text indent mt-2">จึงเรียนมาเพื่อโปรดทราบ</p>
                  </div>
                  <div class="pdf-signature mt-12">
                    <div class="signature-box text-center ml-auto w-[250px]">
                      <div class="signature-line mb-2">(ลงชื่อ)..............................................</div>
                      <div class="signature-name">({{ userFullName }})</div>
                      <div class="signature-position">{{ formData.position }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-5 flex-1 min-w-[380px]">
          <h2 class="text-xl font-bold text-gray-800 mb-4 pb-3 border-b border-gray-200">กรอกข้อมูลเอกสาร</h2>

          <form @submit.prevent="generatePDF" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                ส่วนราชการ <span class="text-red-500">*</span>
              </label>
              <input v-model="formData.department" type="text"
                :class="['w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400', errors.department ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500']"
                placeholder="เช่น สำนักปลัดเทศบาล ฝ่ายอำนวยการ งานอาคารและสถานที่"
                @blur="validateField('department')" />
              <p v-if="errors.department" class="text-xs text-red-500 mt-1">{{ errors.department }}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  ที่ (เลขที่เอกสาร) <span class="text-red-500">*</span>
                </label>
                <input v-model="formData.documentNumber" type="text"
                  :class="['w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400', errors.documentNumber ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500']"
                  placeholder="เช่น สป.2200/2568"
                  @blur="validateField('documentNumber')" />
                <p v-if="errors.documentNumber" class="text-xs text-red-500 mt-1">{{ errors.documentNumber }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
                <input :value="formattedDate" type="text" disabled
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  เรื่อง <span class="text-red-500">*</span>
                </label>
                <input v-model="formData.subject" type="text"
                  :class="['w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400', errors.subject ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500']"
                  placeholder="รายงานการปฏิบัติงาน..."
                  @blur="validateField('subject')" />
                <p v-if="errors.subject" class="text-xs text-red-500 mt-1">{{ errors.subject }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">ประจำเดือน</label>
                <select v-model="formData.month"
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white">
                  <option v-for="month in thaiMonths" :key="month" :value="month">{{ month }}</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                เรียน <span class="text-red-500">*</span>
              </label>
              <input v-model="formData.to" type="text"
                :class="['w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400', errors.to ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500']"
                placeholder="นายกเทศมนตรีนครบ้านสวน"
                @blur="validateField('to')" />
              <p v-if="errors.to" class="text-xs text-red-500 mt-1">{{ errors.to }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                เนื้อเรื่อง <span class="text-red-500">*</span>
              </label>
              <p class="text-xs text-gray-500 mb-1">กด Tab เพื่อย่อหน้า, กด Enter เพื่อขึ้นบรรทัดใหม่</p>
              <textarea v-model="formData.content" rows="4" @keydown="handleKeydown"
                :class="['w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all resize-y placeholder:text-gray-400', errors.content ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500']"
                placeholder="ด้วย งานอาคารและสถานที่..."
                @blur="validateField('content')"></textarea>
              <p v-if="errors.content" class="text-xs text-red-500 mt-1">{{ errors.content }}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้เขียนหนังสือ</label>
                <input :value="userFullName" type="text" disabled
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  ตำแหน่ง <span class="text-red-500">*</span>
                </label>
                <input v-model="formData.position" type="text"
                  :class="['w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400', errors.position ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500']"
                  placeholder="ผู้ช่วยเจ้าพนักงานธุรการ"
                  @blur="validateField('position')" />
                <p v-if="errors.position" class="text-xs text-red-500 mt-1">{{ errors.position }}</p>
              </div>
            </div>

            <div class="flex gap-4 pt-4 border-t border-gray-200 mt-6">
              <button type="submit"
                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
                :disabled="isGenerating">
                <svg v-if="isGenerating" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{{ isGenerating ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF' }}</span>
              </button>

              <button type="button" @click="resetForm"
                class="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all">
                ล้างข้อมูล
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Keeping your existing CSS */
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');

@font-face {
  font-family: 'TH Sarabun';
  src: local('TH Sarabun'), url('/fonts/THSarabun.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}
/* ... rest of your existing CSS definitions for font faces ... */

.pdf-preview-wrapper {
  transform: scale(1);
  transform-origin: center;
  margin-bottom: 30px;
}

.pdf-document {
  width: 794px;
  height: 1123px;
  padding: 50px 96px 50px 96px;
  font-family: 'TH Sarabun', 'Sarabun', sans-serif !important;
  font-size: 18px;
  background: #ffffff;
  box-sizing: border-box;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.pdf-document * {
  font-family: 'TH Sarabun', 'Sarabun', sans-serif !important;
}

.pdf-header {
  position: relative;
  margin-bottom: 15px;
  height: 80px;
}

.garuda-icon {
  width: 70px;
  height: 70px;
  position: absolute;
  left: 0;
  top: 0;
}

.pdf-title {
  font-size: 32px;
  font-weight: bold;
  text-align: center;
  padding-top: 15px;
  margin: 0;
}

.pdf-info {
  font-size: 18px;
  line-height: 1.9;
  margin-top: 25px;
}

.info-row {
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 30px;
  margin-bottom: 8px;
}

.info-label {
  font-weight: bold;
  height: 100%;
  display: flex;
  align-items: flex-end;
  white-space: nowrap;
  padding-bottom: 5px;
}

.info-value {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
  min-width: 50px;
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 5px;
  background-image: linear-gradient(to right, #000 30%, rgba(255, 255, 255, 0) 0%);
  background-position: bottom 15px left 0;
  background-size: 3px 1px;
  background-repeat: repeat-x;
  border-bottom: none !important;
}

.pdf-content {
  font-size: 18px;
  line-height: 1.9;
  margin-top: 30px;
}

.user-content {
  white-space: pre-wrap;
  text-indent: 2.5em;
}

.fixed-text {
  margin: 0;
}

.fixed-text.indent {
  text-indent: 2.5em;
  margin-top: 15px;
}

.pdf-signature {
  margin-top: 50px;
  display: flex;
  justify-content: flex-end;
  padding-right: 60px;
}

.signature-box {
  text-align: center;
}

.signature-line {
  margin: 0 0 50px 0;
}

.signature-name,
.signature-position {
  margin: 0;
}

.export-wrapper {
  width: 794px;
  height: 1123px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
