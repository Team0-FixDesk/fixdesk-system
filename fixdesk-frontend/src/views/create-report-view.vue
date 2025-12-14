<template>
  <div class="min-h-screen bg-gray-100 p-6">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">สร้างบันทึกข้อความ</h1>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Preview Panel (Left) -->
        <div class="bg-white rounded-lg shadow-lg p-4">
          <h2 class="text-lg font-semibold text-gray-700 mb-4">ตัวอย่างเอกสาร</h2>
          
          <!-- A4 Preview Container -->
          <div class="overflow-auto border border-gray-300 rounded" style="max-height: 80vh;">
            <div 
              ref="documentRef"
              class="bg-white mx-auto"
              style="width: 210mm; min-height: 297mm; padding: 20mm; font-family: 'Sarabun', sans-serif;"
            >
              <!-- Header with Garuda -->
              <div class="text-center mb-6">
                <img src="/icon/Garuda.svg" alt="ครุฑ" class="mx-auto" style="width: 60px; height: 60px;" />
                <h1 class="text-xl font-bold mt-2">บันทึกข้อความ</h1>
              </div>
              
              <!-- Document Info -->
              <div class="mb-4 text-base leading-relaxed">
                <div class="flex mb-1">
                  <span class="font-bold" style="width: 80px;">ส่วนราชการ</span>
                  <span>งานเทคโนโลยีสารสนเทศ กลุ่มงานสารสนเทศทางการแพทย์ โรงพยาบาลโนนไทย</span>
                </div>
                <div class="flex mb-1">
                  <span class="font-bold" style="width: 80px;">ที่</span>
                  <span>{{ formData.documentNumber || '.....................................' }}</span>
                </div>
                <div class="flex mb-1">
                  <span class="font-bold" style="width: 80px;">วันที่</span>
                  <span>{{ formattedDate }}</span>
                </div>
                <div class="flex mb-1">
                  <span class="font-bold" style="width: 80px;">เรื่อง</span>
                  <span>{{ formData.subject || '.....................................' }}</span>
                </div>
                <div class="flex mb-1">
                  <span class="font-bold" style="width: 80px;">เรียน</span>
                  <span>{{ formData.to || '.....................................' }}</span>
                </div>
              </div>

              <!-- Content -->
              <div class="text-base leading-relaxed mt-6">
                <!-- Paragraph 1: User Input -->
                <p class="indent-8 mb-4">
                  {{ formData.paragraph1 || 'ด้วย........................................................................................................................................................................................................................................................................................................................' }}
                </p>
                
                <!-- Paragraph 2: Default Text -->
                <p class="indent-8 mb-4">
                  ในการนี้ งานเทคโนโลยีสารสนเทศ ได้ดำเนินการซ่อมบำรุงคอมพิวเตอร์และอุปกรณ์ต่อพ่วงเรียบร้อยแล้ว 
                  โดยมีรายละเอียดตามเอกสารแนบท้ายบันทึกข้อความฉบับนี้
                </p>
                
                <!-- Paragraph 3: Month Selection -->
                <p class="indent-8 mb-4">
                  จึงเรียนมาเพื่อโปรดทราบ และขออนุมัติเบิกค่าวัสดุคอมพิวเตอร์ ประจำเดือน{{ formData.month || '..................' }}
                </p>
              </div>

              <!-- Signature Section -->
              <div class="mt-16 text-center">
                <div class="inline-block text-left">
                  <p class="mb-16">(ลงชื่อ).............................................</p>
                  <p class="text-center">({{ formData.applicant || '.....................................' }})</p>
                  <p class="text-center">{{ formData.position || 'ตำแหน่ง.....................................' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Form Panel (Right) -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-lg font-semibold text-gray-700 mb-4">กรอกข้อมูลเอกสาร</h2>
          
          <form @submit.prevent="generatePDF" class="space-y-4">
            <!-- Document Number -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">เลขที่เอกสาร</label>
              <input 
                v-model="formData.documentNumber"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="เช่น นท 0032.301/..."
              />
            </div>

            <!-- Date -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
              <input 
                v-model="formData.date"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <!-- Subject -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">เรื่อง</label>
              <input 
                v-model="formData.subject"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ขออนุมัติเบิกค่าวัสดุคอมพิวเตอร์"
              />
            </div>

            <!-- To -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">เรียน</label>
              <input 
                v-model="formData.to"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ผู้อำนวยการโรงพยาบาลโนนไทย"
              />
            </div>

            <!-- Paragraph 1 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">เนื้อหาย่อหน้าที่ 1</label>
              <textarea 
                v-model="formData.paragraph1"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ด้วย..."
              ></textarea>
            </div>

            <!-- Month Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">เดือนที่เบิก</label>
              <select 
                v-model="formData.month"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- เลือกเดือน --</option>
                <option value="มกราคม">มกราคม</option>
                <option value="กุมภาพันธ์">กุมภาพันธ์</option>
                <option value="มีนาคม">มีนาคม</option>
                <option value="เมษายน">เมษายน</option>
                <option value="พฤษภาคม">พฤษภาคม</option>
                <option value="มิถุนายน">มิถุนายน</option>
                <option value="กรกฎาคม">กรกฎาคม</option>
                <option value="สิงหาคม">สิงหาคม</option>
                <option value="กันยายน">กันยายน</option>
                <option value="ตุลาคม">ตุลาคม</option>
                <option value="พฤศจิกายน">พฤศจิกายน</option>
                <option value="ธันวาคม">ธันวาคม</option>
              </select>
            </div>

            <!-- Applicant Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้เขียน</label>
              <input 
                v-model="formData.applicant"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="นายสมชาย ใจดี"
              />
            </div>

            <!-- Position -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
              <input 
                v-model="formData.position"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="นักวิชาการคอมพิวเตอร์"
              />
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-4 pt-4">
              <button
                type="submit"
                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                :disabled="isGenerating"
              >
                <svg v-if="isGenerating" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ isGenerating ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF' }}</span>
              </button>
              
              <button
                type="button"
                @click="resetForm"
                class="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
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
import { ref, computed, onMounted } from 'vue'
import { jsPDF } from 'jspdf'
import domtoimage from 'dom-to-image-more'

// Refs
const documentRef = ref(null)
const isGenerating = ref(false)

// Form Data
const formData = ref({
  documentNumber: '',
  date: '',
  subject: 'ขออนุมัติเบิกค่าวัสดุคอมพิวเตอร์',
  to: 'ผู้อำนวยการโรงพยาบาลโนนไทย',
  paragraph1: '',
  month: '',
  applicant: '',
  position: ''
})

// Thai Months
const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

// Computed: Formatted Date in Thai Buddhist Era
const formattedDate = computed(() => {
  if (!formData.value.date) {
    const today = new Date()
    return formatThaiDate(today)
  }
  const date = new Date(formData.value.date)
  return formatThaiDate(date)
})

// Format date to Thai format with Buddhist Era
function formatThaiDate(date) {
  const day = date.getDate()
  const month = thaiMonths[date.getMonth()]
  const year = date.getFullYear() + 543
  return `${day} ${month} ${year}`
}

// Generate PDF using dom-to-image-more
async function generatePDF() {
  if (!documentRef.value) {
    alert('ไม่พบเอกสาร')
    return
  }

  isGenerating.value = true

  try {
    // Create high-quality PNG from DOM
    const scale = 2 // Higher scale = better quality
    const dataUrl = await domtoimage.toPng(documentRef.value, {
      quality: 1,
      bgcolor: '#ffffff',
      width: documentRef.value.offsetWidth * scale,
      height: documentRef.value.offsetHeight * scale,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: `${documentRef.value.offsetWidth}px`,
        height: `${documentRef.value.offsetHeight}px`
      }
    })

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // A4 dimensions
    const pageWidth = 210
    const pageHeight = 297

    // Add image to PDF
    pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight)

    // Generate filename
    const dateStr = formData.value.date || new Date().toISOString().split('T')[0]
    const filename = `บันทึกข้อความ_${dateStr}.pdf`

    // Download
    pdf.save(filename)

    // Success notification
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
    documentNumber: '',
    date: '',
    subject: 'ขออนุมัติเบิกค่าวัสดุคอมพิวเตอร์',
    to: 'ผู้อำนวยการโรงพยาบาลโนนไทย',
    paragraph1: '',
    month: '',
    applicant: '',
    position: ''
  }
}

// Set default date on mount
onMounted(() => {
  const today = new Date()
  formData.value.date = today.toISOString().split('T')[0]
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');

.indent-8 {
  text-indent: 2em;
}
</style>
