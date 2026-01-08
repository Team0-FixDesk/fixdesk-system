<template>
  <div class="min-h-screen bg-gray-50 p-4 pt-16">
    <div class="max-w-[1400px] mx-auto">
      <div class="flex flex-col lg:flex-row gap-4">
        <!-- Preview Panel (Left) - ขนาดพอดีกับ A4 -->
        <div class="bg-white rounded-xl shadow-lg p-4 lg:w-[850px] flex-shrink-0">
          <h2 class="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            ตัวอย่างเอกสาร
          </h2>

          <!-- A4 Document Preview - แสดงเอกสารโดยตรง -->
          <div class="pdf-preview-wrapper">
            <div class="justify-center flex">
              <div ref="exportWrapper" class="export-wrapper">
                <div ref="documentRef" class="pdf-document">
                  <!-- Header with Garuda on Left -->
                  <div class="pdf-header">
                    <img src="/icon/Garuda.svg" alt="ครุฑ" class="garuda-icon" />
                    <h1 class="pdf-title">บันทึกข้อความ</h1>
                  </div>

                  <!-- Document Info -->
                  <div class="pdf-info">
                    <div class="info-row">
                      <span class="info-label" style="min-width: 80px;">ส่วนราชการ</span>
                      <span class="info-value">{{ formData.department || '' }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label" style="min-width: 25px;">ที่</span>
                      <span class="info-value" style="min-width: 180px;">{{ formData.documentNumber || '' }}</span>
                      <span class="info-label" style="min-width: 45px; margin-left: 30px;">วันที่</span>
                      <span class="info-value">{{ formattedDate }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label" style="min-width: 40px;">เรื่อง</span>
                      <span class="info-value">{{ formData.subject || '' }} ประจำเดือน{{ formData.month }} {{ currentYear }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label" style="min-width: 40px;">เรียน</span>
                      <span class="info-value">{{ formData.to || '' }}</span>
                    </div>
                  </div>

                  <!-- Content -->
                  <div class="pdf-content">
                    <!-- User Content -->
                    <div class="user-content " v-html="formattedContent"></div>

                    <!-- Fixed Text -->
                    <p class="fixed-text indent">
                      งานอาคารและสถานที่ จึงขอรายงานการปฏิบัติงาน ประจำเดือน{{ formData.month }} {{ currentYear }}
                    </p>
                    <p class="fixed-text">ตามรายงานการปฏิบัติงานที่แนบท้าย</p>
                    <p class="fixed-text indent" style="margin-top: 10px;">จึงเรียนมาเพื่อโปรดทราบ</p>
                  </div>

                  <!-- Signature Section - Right aligned -->
                  <div class="pdf-signature">
                    <div class="signature-box">
                      <p class="signature-line">(ลงชื่อ)..............................................</p>
                      <p class="signature-name">({{ userFullName }})</p>
                      <p class="signature-position">{{ formData.position || '' }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Form Panel (Right) - ยืดหยุ่นตามพื้นที่ที่เหลือ -->
        <div class="bg-white rounded-xl shadow-lg p-5 flex-1 min-w-[380px]">
          <h2 class="text-xl font-bold text-gray-800 mb-4 pb-3 border-b border-gray-200">กรอกข้อมูลเอกสาร</h2>

          <form @submit.prevent="generatePDF" class="space-y-4">
            <!-- ส่วนราชการ -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                ส่วนราชการ <span class="text-red-500">*</span>
              </label>
              <input v-model="formData.department" type="text" required
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                placeholder="เช่น สำนักปลัดเทศบาล ฝ่ายอำนวยการ งานอาคารและสถานที่" />
            </div>

            <!-- ที่ + วันที่ (บรรทัดเดียวกัน) -->
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

            <!-- เรื่อง + ประจำเดือน (บรรทัดเดียวกัน) -->
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

            <!-- เรียน -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                เรียน <span class="text-red-500">*</span>
              </label>
              <input v-model="formData.to" type="text" required
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                placeholder="นายกเทศมนตรีนครบ้านสวน" />
            </div>

            <!-- เนื้อเรื่อง -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                เนื้อเรื่อง <span class="text-red-500">*</span>
              </label>
              <p class="text-xs text-gray-500 mb-1">กด Tab เพื่อย่อหน้า, กด Enter เพื่อขึ้นบรรทัดใหม่</p>
              <textarea v-model="formData.content" required rows="4" @keydown="handleKeydown"
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-y placeholder:text-gray-400"
                placeholder="ด้วย งานอาคารและสถานที่ ฝ่ายอำนวยการ สำนักปลัดเทศบาล ได้รับมอบหมายให้..."></textarea>
            </div>

            <!-- ผู้เขียน + ตำแหน่ง (บรรทัดเดียวกัน) -->
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

            <!-- Action Buttons -->
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

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { jwtDecode } from 'jwt-decode'
import d from 'dom-to-image-more'

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
  department: '',
  documentNumber: '',
  subject: '',
  to: '',
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

// Generate PDF - ใช้ html2canvas แทน dom-to-image เพื่อความแม่นยำ
async function generatePDF() {
  if (!documentRef.value) {
    alert('ไม่พบเอกสาร')
    return
  }

  isGenerating.value = true

  try {
    // รอให้ Vue อัปเดต DOM ก่อน
    await nextTick()

    // บันทึก transform เดิม แล้วรีเซ็ตชั่วคราวเพื่อ capture ขนาดจริง
    const wrapper = documentRef.value.parentElement
    const originalTransform = wrapper.style.transform
    wrapper.style.transform = 'scale(1)'

    // รอให้ browser reflow
    await new Promise(resolve => setTimeout(resolve, 100))

    // Capture ด้วย html2canvas - ดีกว่า dom-to-image สำหรับภาษาไทยและ fonts
    const canvas = await html2canvas(exportWrapper.value, {
      scale: 2, // ความละเอียดสูง
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794,
      height: 1123,
      logging: false
    })

    // คืนค่า transform
    wrapper.style.transform = originalTransform

    // สร้าง PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const imgData = canvas.toDataURL('image/png', 1.0)
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297)

    const filename = `บันทึกข้อความ_${formData.value.month}_${currentYear.value}.pdf`
    pdf.save(filename)

    if (window.$swal) {
      window.$swal.fire({
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
  align-items: baseline;
  margin-top: 10px;
}

.info-row:first-child {
  margin-top: 0;
}

.info-label {
  font-weight: bold;
}

.info-value {
  flex: 1;
  border-bottom: 1px dotted #000;
  padding-left: 5px;
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
