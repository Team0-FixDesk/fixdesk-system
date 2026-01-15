<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { jwtDecode } from 'jwt-decode'

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
  // Convert tabs to proper indentation and preserve line breaks
  return formData.value.content
    .replace(/\t/g, '&emsp;&emsp;&emsp;') // Tab = indent
    .replace(/\n/g, '<br>') // Enter = new line
})

// Handle Tab key in textarea
function handleKeydown(e) {
  if (e.key === 'Tab') {
    e.preventDefault()
    const textarea = e.target
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value

    // Insert tab character
    formData.value.content = value.substring(0, start) + '\t' + value.substring(end)

    // Move cursor after tab
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 1
    }, 0)
  }
}

// Generate PDF
async function generatePDF() {
  if (!documentRef.value) {
    alert('ไม่พบเอกสาร')
    return
  }

  isGenerating.value = true

  try {
    await nextTick()

    // โคลน Element (สร้างร่างแยก)
    const originalElement = exportWrapper.value
    const clone = originalElement.cloneNode(true)

    // ตั้งค่า Clone ให้อยู่นอกจอ (User มองไม่เห็น แต่ html2canvas เห็น)
    clone.style.position = 'absolute'
    clone.style.left = '-9999px'
    clone.style.top = '0'
    clone.style.width = '794px' // บังคับความกว้าง A4
    // ต้อง append เข้า body ก่อน html2canvas ถึงจะทำงานได้
    document.body.appendChild(clone)

    const infoValues = clone.querySelectorAll('.info-value')

    infoValues.forEach(el => {
      // ลบ Border เดิมทิ้ง
      el.style.borderBottom = 'none'

      // สร้างเส้นจุดไข่ปลาใหม่ด้วยกราฟิก
      el.style.backgroundImage = 'linear-gradient(to right, #000 33%, rgba(255,255,255,0) 0%)'
      el.style.backgroundSize = '3px 1px' // ขนาดจุด (กว้าง 3px สูง 1px)
      el.style.backgroundRepeat = 'repeat-x'
      el.style.backgroundPosition = '0 calc(100% - 0px)'
    })

    // สั่ง html2canvas ถ่ายรูปจากตัว "Clone"
    const canvas = await html2canvas(clone, {
      scale: 3, // ความคมชัด
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      letterRendering: true
    })

    // ลบตัว Clone ทิ้ง
    document.body.removeChild(clone)

    // สร้าง PDF จากรูปภาพ
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
    alert('เกิดข้อผิดพลาดในการสร้าง PDF: ' + error.message)
  } finally {
    isGenerating.value = false
  }
}

// Reset form
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
}

// Get user info from token
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
              <input v-model="formData.department" type="text" required
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                placeholder="เช่น สำนักปลัดเทศบาล ฝ่ายอำนวยการ งานอาคารและสถานที่" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  ที่ (เลขที่เอกสาร) <span class="text-red-500">*</span>
                </label>
                <input v-model="formData.documentNumber" type="text" required
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                  placeholder="เช่น สป.2200/2568" />
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
                <input v-model="formData.subject" type="text" required
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                  placeholder="รายงานการปฏิบัติงานของงานอาคารและสถานที่ ประจำเดือน..." />
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
              <input v-model="formData.to" type="text" required
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                placeholder="นายกเทศมนตรีนครบ้านสวน" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                เนื้อเรื่อง <span class="text-red-500">*</span>
              </label>
              <p class="text-xs text-gray-500 mb-1">กด Tab เพื่อย่อหน้า, กด Enter เพื่อขึ้นบรรทัดใหม่</p>
              <textarea v-model="formData.content" required rows="4" @keydown="handleKeydown"
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-y placeholder:text-gray-400"
                placeholder="ด้วย งานอาคารและสถานที่ ฝ่ายอำนวยการ สำนักปลัดเทศบาล ได้รับมอบหมายให้..."></textarea>
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
                <input v-model="formData.position" type="text" required
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                  placeholder="ผู้ช่วยเจ้าพนักงานธุรการ" />
              </div>
            </div>

            <div class="flex gap-4 pt-4 border-t border-gray-200 mt-6">
              <button type="submit"
                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
                :disabled="isGenerating">
                <svg v-if="isGenerating" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                  </path>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
/* Fallback to Google Sarabun if local font not available */
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');

/* TH Sarabun Font - ใช้ font ราชการไทย */
@font-face {
  font-family: 'TH Sarabun';
  src: local('TH Sarabun'),
    url('/fonts/THSarabun.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: 'TH Sarabun';
  src: local('TH Sarabun Bold'),
    url('/fonts/THSarabun%20Bold.ttf') format('truetype');
  font-weight: bold;
  font-style: normal;
}

@font-face {
  font-family: 'TH Sarabun';
  src: local('TH Sarabun Italic'),
    url('/fonts/THSarabun%20Italic.ttf') format('truetype');
  font-weight: normal;
  font-style: italic;
}

@font-face {
  font-family: 'TH Sarabun';
  src: local('TH Sarabun BoldItalic'),
    url('/fonts/THSarabun%20BoldItalic.ttf') format('truetype');
  font-weight: bold;
  font-style: italic;
}

/* PDF Document Styles - แสดงเอกสาร A4 โดยตรง */
.pdf-preview-wrapper {
  transform: scale(1);
  transform-origin: center;
  margin-bottom: 30px;
  /* ชดเชยช่องว่างด้านล่าง */
}

.pdf-document {
  width: 794px;
  height: 1123px;
  padding: 50px 96px 50px 96px;
  /* top right bottom left - ขอบซ้ายกว้างกว่าสำหรับเข้าเล่ม */
  font-family: 'TH Sarabun', 'Sarabun', sans-serif !important;
  font-size: 18px;
  background: #ffffff;
  box-sizing: border-box;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

/* Force TH Sarabun font for all elements inside pdf-document */
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
  align-items: flex-end; /* ให้ตัวหนังสือวางอยู่บนเส้นบรรทัดล่างสุดเสมอ */
  width: 100%;
}

.info-row:first-child {
  margin-top: 0;
}

/* จัดระเบียบบรรทัด */
.info-row {
  display: flex;
  align-items: flex-end; /* บังคับให้ฐานตัวหนังสือเท่ากัน */
  width: 100%;
  height: 30px; /* ความสูงบรรทัดตายตัว (สำคัญมาก!) */
  margin-bottom: 8px; /* ระยะห่างระหว่างบรรทัด */
}

/* ปรับ Label (คำนำหน้า) */
.info-label {
  font-weight: bold;
  height: 100%;           /* สูงเต็มบรรทัด */
  display: flex;
  align-items: flex-end;  /* ชิดขอบล่าง */
  white-space: nowrap;    /* ห้ามตัดคำ */

  /* ดันตัวหนังสือขึ้นจากขอบล่างเล็กน้อยเพื่อให้ตรงกับเส้น */
  padding-bottom: 5px;
}

/* ปรับ Value (ช่องกรอกข้อมูล) - พระเอกของเรา */
.info-value {
  flex: 1;                /* ยืดเต็มพื้นที่ */
  height: 100%;           /* สูงเท่าบรรทัด */
  display: flex;
  align-items: flex-end;  /* จัดตัวหนังสือชิดล่าง */
  min-width: 50px;

  /* จัดตำแหน่งตัวหนังสือ */
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 5px;    /* ต้องเท่ากับ .info-label เพื่อให้บรรทัดตรงกัน */

  /* --- ส่วนสำคัญ: สร้างเส้นจุดไข่ปลาด้วย Background --- */
  /* สร้างจุดสีดำขนาด 1px เว้นระยะ */
  background-image: linear-gradient(to right, #000 30%, rgba(255, 255, 255, 0) 0%);
  background-position: bottom 15px left 0; /* <--- ปรับเลข 6px ขึ้น-ลง ได้ตามใจชอบ (ยิ่งมากเส้นยิ่งลอยสูง) */
  background-size: 3px 1px; /* กว้าง 3px (จุด+เว้นวรรค), สูง 1px (ความหนาเส้น) */
  background-repeat: repeat-x;

  /* ลบ Border เดิมทิ้ง */
  border-bottom: none !important;
}

/* ลบ ::after ของเดิมออกให้หมดถ้ามี */
.info-value::after {
  display: none;
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
