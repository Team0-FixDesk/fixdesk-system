<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import RepairFilterBarComponent from '@/components/filters/repair-filter-bar-component.vue'
import TableComponent from '@/components/table-component.vue'
import Swal from 'sweetalert2'

defineOptions({ name: 'ManageReportView' })

const router = useRouter()
const API_BASE = import.meta.env.VITE_API_BASE

// --- Helper Functions (ย้ายมาไว้บนสุดเพื่อให้เรียกใช้ได้เสมอ) ---

// Helper: Format Date (เพิ่มการดัก null)
function formatDate(date) {
  if (!date) return '-'
  try {
    const d = new Date(date)
    // เช็คว่าเป็น Invalid Date หรือไม่
    if (isNaN(d.getTime())) return '-'

    return d.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (e) {
    return '-'
  }
}

// Helper: Format Date for Filter (YYYY-MM-DD)
function toLocalYMD(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Helper: Status Text
const getStatusText = (status) => {
  switch (status) {
    case 'done':
    case 'completed': return 'เสร็จสิ้น'
    case 'cancel':
    case 'cancelled': return 'ยกเลิก'
    default: return status
  }
}

// Helper: Generate HTML String
// เพิ่ม param: isPdf (default = false)
const getRepairFormHTML = (item, isPdf = false) => {
  if (!item) return '';

  // จัดเตรียมข้อมูล
  const code = item.rf_code || '........';
  const date = formatDate(item.rf_create_at);
  const department = item.reporter?.department || '..............................................';
  const phone = item.reporter?.phone || '............................';
  const issue = item.rf_problem || item.rf_issue || '...................................................................................................................';
  const assetId = item.rf_prop_number || '.............................................................................';
  const building = item.building_name || item.rf_building || '..................';
  const floor = item.floor_name || item.rf_floor || '..................';
  const room = item.room_name || item.rf_room || '..................';
  const detail = item.rf_detail || '........................................................................................................................................................................................\n........................................................................................................................................................................................';
  const reporterName = item.reporter?.name;
  const technician = item.main_technician || '...............................................................................................................';
  const techSummary = item.rf_tech_summary || '........................................................................................................................................................................................\n........................................................................................................................................................................................';
  const isOutsourced = item.rf_is_outsourced || false;
  const assignerName = item.assigner?.name || '........................................................';

  // --- กำหนด Style แยกกันระหว่าง Preview กับ PDF ---
  // ถ้าเป็น PDF: เพิ่ม padding-bottom และเส้นหนาขึ้น (แก้บั๊ก html2canvas)
  // ถ้าเป็น Preview: ใช้ค่าปกติ สวยงามบนจอ
  const valueStyle = isPdf
    ? `border-bottom: 2px dotted #888; padding-bottom: 8px; line-height: 1.2; margin-bottom: 2px;`
    : `border-bottom: 1px dotted #000; padding-bottom: 0px; line-height: 1.4; margin-bottom: 2px;`;

  // Preview: top: 3px (สวยบนจอ)
  // PDF: top: 5px (ดันลงมาอีกหน่อย เพราะ html2canvas ชอบดึงขึ้น)
  const checkboxTop = isPdf ? '10px' : '1px';
  const checkboxLineHeight = isPdf ? '5px' : '12px'; // ปรับตำแหน่งเครื่องหมายถูกในกล่องนิดหน่อย

  const checkboxStyle = `width: 16px; height: 16px; border: 1px solid #000; display: inline-block; margin-right: 8px; position: relative; top: ${checkboxTop}; text-align: center; line-height: ${checkboxLineHeight}; font-size: 14px; font-weight: bold;`;
  return `
    <div style="width: 100%; height: 100%; padding: 40px; box-sizing: border-box; font-family: 'THSarabun', 'Sarabun', sans-serif !important; background: white; color: #000; position: relative;">
      <style>
        .form-content * { font-family: 'THSarabun', 'Sarabun', sans-serif !important; box-sizing: border-box; }
        .form-content .title { font-size: 28px; font-weight: bold; margin-bottom: 4px; text-align: center; line-height: 1.2; }
        .form-content .subtitle { font-size: 18px; text-align: center; margin-bottom: 24px; }
        .form-content .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 18px; line-height: 1.4; }
        .form-content .box { border: 1px solid #888; border-radius: 4px; margin-bottom: 16px; padding: 16px; font-size: 18px; }
        .form-content .flex-gap { display: flex; gap: 16px; align-items: flex-start; }
        .form-content .col { flex: 1; }
        .form-content .label { white-space: nowrap; }

        /* ใช้ตัวแปร valueStyle ที่เรากำหนดข้างบน */
        .form-content .value {
            font-weight: bold;
            margin-left: 8px;
            display: inline-block;
            min-width: 50px;
            color: #000;
            ${valueStyle}
        }

        .form-content .check-box { width: 16px; height: 16px; border: 1px solid #000; display: inline-block; margin-right: 8px; position: relative; top: 3px; text-align: center; line-height: 12px; font-size: 14px; font-weight: bold; }
        .form-content .sign-area { display: flex; justify-content: space-between; margin-top: 24px; text-align: center; }
        .form-content .divider { height: 1px; background: #ccc; margin: 16px 0; }
        .text-blue { color: #2563eb; }
      </style>

      <div class="form-content">
        <div class="title">แบบฟอร์มแจ้งซ่อม</div>
        <div class="subtitle">สำนักปลัดเทศบาล งานอาคารและสถานที่ (ฝ่ายอำนวยการ)</div>

        <div class="row" style="margin-bottom: 20px;">
          <div>เลขที่ <span class="value text-blue" style="border: none;">${code}</span></div>
          <div>ลงวันที่ <span class="value" style="border: none;">${date}</span></div>
        </div>

        <div class="box">
          <div class="flex-gap">
            <div style="min-width: 20px;">1.</div>
            <div style="flex: 1;">
              <div class="flex-gap">
                <div class="col">หน่วยงาน <span class="value">${department}</span></div>
                <div class="col">เบอร์โทรศัพท์ติดต่อ <span class="value">${phone}</span></div>
              </div>

              <div style="margin-top: 8px;">
                ขอความกรุณาตรวจสอบ/ซ่อมแซม <span class="value" style="width: 90%;">${issue}</span>
              </div>
              <div style="margin-top: 4px;">
                หมายเลขครุภัณฑ์ <span class="value" style="width: 90%;">${assetId}</span>
              </div>

              <div class="flex-gap" style="margin-top: 4px;">
                <span>อาคาร <span class="value">${building}</span></span>
                <span>ชั้น <span class="value">${floor}</span></span>
                <span>ห้อง <span class="value">${room}</span></span>
              </div>
            </div>
          </div>
        </div>

        <div class="box">
          <div class="flex-gap">
            <div style="min-width: 20px;">2.</div>
            <div style="flex: 1;">
              <div>สาเหตุ/อาการเสีย</div>
              <div style="font-weight: bold; white-space: pre-wrap; margin-top: 4px; min-height: 40px; ">${detail}</div>
            </div>
          </div>

          <div class="sign-area">
            <div>
              <div>ลงชื่อ ........................................................ผู้แจ้ง</div>
              <div style="margin-top: 4px;"> ${reporterName ? `(${reporterName})` : ''}</div>
            </div>
            <div>
              <div>ลงชื่อ ........................................................ผู้รับแจ้ง</div>
              <div style="margin-top: 4px;">${assignerName ? `(${assignerName})` : ''}</div>
            </div>
          </div>
        </div>

        <div class="box">
          <div style="font-weight: bold; margin-bottom: 12px; text-decoration: underline;">สำหรับเจ้าหน้าที่ ตรวจสอบ/ซ่อม</div>

          <div><span style="${checkboxStyle}">${!isOutsourced ? '✓' : ''}</span> สามารถแก้ไข/ซ่อมบำรุงได้</div>
          <div style="margin-top: 8px;"><span style="${checkboxStyle}">${isOutsourced ? '✓' : ''}</span> ต้องจ้างบริษัทฯมาดำเนินการ................................................................................................</div>

          <div class="divider"></div>

          <div>รายละเอียดการตรวจสอบ/ซ่อม</div>
          <div style="font-weight: bold; white-space: pre-wrap; margin-top: 4px; min-height: 40px;">${techSummary}</div>

          <div style="margin-top: 16px;">
            สรุปผล:
            <span style="margin-left: 16px;"><span style="${checkboxStyle}"></span> เรียบร้อย</span>
            <span style="margin-left: 16px;"><span style="${checkboxStyle}"></span> ไม่เรียบร้อย เพราะ .............................................................</span>
          </div>

          <div class="divider"></div>

          <div>ผู้ดำเนินการตรวจสอบ/ซ่อม <span class="value" style="width: 65%;">${technician}</span></div>

          <div class="sign-area">
            <div>
              <div>ลงชื่อ ........................................................</div>
              <div style="margin-top: 4px;">เจ้าหน้าที่หน่วยงานผู้รับบริการ</div>
              <div style="margin-top: 4px;">........../........../..........</div>
            </div>
            <div>
              <div>ลงชื่อ ........................................................</div>
              <div style="margin-top: 4px;">&nbsp;</div>
              <div style="margin-top: 4px;">........../........../..........</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// --- State & Logic ---

// State
const repairRequests = ref([])
const loading = ref(false)
const error = ref(null)
const currentPage = ref(1)
const perPage = 10

// Selection
const selectedItems = ref([])

// Default Values
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)

// Month Data
const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

const yearOptions = computed(() => {
  const currentAD = new Date().getFullYear()
  const years = []
  for (let i = 0; i < 5; i++) {
    years.push(currentAD - i)
  }
  return years
})

const monthOptions = computed(() => {
  return thaiMonths.map((name, index) => ({
    value: index + 1,
    label: name
  }))
})

// Filter bar state
const search = ref('')
const statusFilters = ref([])
const dateFilter = ref('')

// Print Modal State
const showPrintModal = ref(false)
const previewItem = ref(null)
const printOption = ref('merged')
const printSelection = ref([])
const isGeneratingPDF = ref(false)
const printDetails = ref([])
const printLoading = ref(false)

// --- Computed ---

// Computed สำหรับแสดงผลในหน้าเว็บ (Preview UI)
const previewHtmlContent = computed(() => {
  // ส่ง false เพราะเป็น Preview บนหน้าจอ (ไม่ต้องเผื่อ html2canvas)
  return getRepairFormHTML(previewItem.value, false)
})

// Filter rows
const filteredRows = computed(() => {
  return repairRequests.value.filter((item) => {
    const status = item.meta.rf_user_status
    const isCompleted = status === 'done' || status === 'completed' || status === 'cancel' || status === 'cancelled'

    // กรอง เดือนและปี
    const itemDate = item.rawDate
    const matchYear = selectedYear.value ? itemDate.getFullYear() === parseInt(selectedYear.value) : true
    const matchMonth = selectedMonth.value ? (itemDate.getMonth() + 1) === parseInt(selectedMonth.value) : true

    if (!matchYear || !matchMonth) return false

    // สถานะ
    if (statusFilters.value.length && !statusFilters.value.includes(status)) return false

    // วันที่ (Filter bar)
    if (dateFilter.value) {
      const dateStr = toLocalYMD(itemDate)
      if (dateStr !== dateFilter.value) return false
    }

    // ค้นหา
    if (search.value) {
      const q = search.value.toLowerCase()
      const fields = [
        item.meta.rf_code,
        item.meta.us_first_name,
        item.meta.us_last_name,
        item.meta.tt_name,
        item.meta.rf_prop_number,
        item.meta.department_name
      ].map(x => (x || '').toString().toLowerCase())
      if (!fields.some(f => f.includes(q))) return false
    }

    return isCompleted
  })
})

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filteredRows.value.slice(start, start + perPage)
})

const paginatedRowsForTable = computed(() => {
  return paginatedRows.value.map(row => [
    '',
    formatDate(row.meta.rf_create_at),
    row.meta.rf_code,
    `${row.meta.us_first_name} ${row.meta.us_last_name}`,
    row.meta.tt_name || '-',
    row.meta.department_name || '-',
    row.meta.rf_user_status
  ])
})

// --- Watchers ---

watch([selectedMonth, selectedYear], () => {
  currentPage.value = 1
  selectedItems.value = []
})

// --- Actions ---

const fetchRepairRequests = async () => {
  loading.value = true
  error.value = null
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) throw new Error('ไม่พบ token')

    const response = await fetch(`${API_BASE}/admin/repairs`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) throw new Error('โหลดข้อมูลล้มเหลว')

    const data = await response.json()
    repairRequests.value = data.map((r) => ({
      meta: r,
      rawDate: new Date(r.rf_create_at),
    }))
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function fetchPrintDetails(codes) {
  printDetails.value = []
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  const results = await Promise.all(
    codes.map(async (code) => {
      try {
        const res = await fetch(`${API_BASE}/repair-requests/${code}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) return null
        const data = await res.json()
        return data
      } catch (e) {
        return null
      }
    })
  )
  printDetails.value = results.filter(Boolean)
}

function handleRowClick(rf_code) {
  const idx = selectedItems.value.indexOf(rf_code)
  if (idx === -1) {
    selectedItems.value.push(rf_code)
  } else {
    selectedItems.value.splice(idx, 1)
  }
}

function resetFilters() {
  search.value = ''
  statusFilters.value = []
  dateFilter.value = ''
}

const clearSelection = () => {
  selectedItems.value = []
}

const openPrintModal = async () => {
  printSelection.value = [...selectedItems.value]
  showPrintModal.value = true
  printLoading.value = true
  await fetchPrintDetails(printSelection.value)
  previewItem.value = printDetails.value[0] || null
  printLoading.value = false
}

const closePrintModal = () => {
  showPrintModal.value = false
  previewItem.value = null
}

const togglePrintSelection = (code) => {
  const index = printSelection.value.indexOf(code)
  if (index > -1) {
    printSelection.value.splice(index, 1)
  } else {
    printSelection.value.push(code)
  }
}

const goToCreateReport = () => {
  router.push('/main/create-report')
}

// Generate Single PDF (สำหรับตอนกดโหลดไฟล์)
const generateSinglePDF = async (item) => {
  const tempDiv = document.createElement('div')
  const a4WidthPx = 794
  const a4HeightPx = 1123

  // เรียกใช้ฟังก์ชันเดียวกันกับ Preview
  tempDiv.innerHTML = getRepairFormHTML(item, true);

  tempDiv.style.width = `${a4WidthPx}px`;
  tempDiv.style.height = `${a4HeightPx}px`;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0';

  document.body.appendChild(tempDiv);

  try {
    const canvas = await html2canvas(tempDiv.firstElementChild, {
      scale: 4,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: a4WidthPx,
      height: a4HeightPx,
      windowWidth: a4WidthPx,
      windowHeight: a4HeightPx
    });

    document.body.removeChild(tempDiv);
    return { img: canvas.toDataURL('image/png', 1.0), width: a4WidthPx, height: a4HeightPx }
  } catch (error) {
    document.body.removeChild(tempDiv);
    console.error("Error creating canvas", error);
    throw error;
  }
}

const downloadCSV = async () => {
  if (filteredRows.value.length === 0) {
    alert('ไม่มีข้อมูลสำหรับเดือนที่เลือก')
    return
  }
  const codes = filteredRows.value.map(row => row.meta.rf_code)
  await fetchPrintDetails(codes)
  if (printDetails.value.length === 0) {
    alert('ไม่พบข้อมูลสำหรับ export')
    return
  }
  const headers = ['ลำดับ', 'แจ้งซ่อมเมื่อ', 'ผู้รับผิดชอบงานหลัก', 'รายการปฏิบัติงาน', 'ตรวจสอบ/ซ่อม', 'สรุปผลการซ่อม', 'ผู้แจ้งซ่อม'];
  const rows = printDetails.value.map((item, index) => [
    index + 1,
    formatDate(item.rf_create_at),
    item.main_technician || '-',
    item.rf_detail || '-',
    item.rf_tech_summary || '-',
    getStatusText(item.rf_user_status),
    item.reporter?.department || '-',
  ])
  const BOM = '\uFEFF'
  const csvContent = BOM + [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  let fileName = 'รายงานสรุป_ทั้งหมด.csv'
  if (selectedMonth.value && selectedYear.value) {
    const monthName = thaiMonths[parseInt(selectedMonth.value) - 1]
    const yearBE = parseInt(selectedYear.value) + 543
    fileName = `รายงานปฏิบัติงานประจำเดือน${monthName} ${yearBE}.csv`
  }
  link.setAttribute('href', url)
  link.setAttribute('download', fileName)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const downloadPDF = async () => {
  if (printSelection.value.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'ไม่มีรายการที่เลือก',
      text: 'กรุณาเลือกใบแจ้งซ่อมอย่างน้อย 1 รายการเพื่อดาวน์โหลดไฟล์ PDF',
    })
    return
  }
  isGeneratingPDF.value = true
  try {
    const itemsToPrint = printDetails.value.filter(item => printSelection.value.includes(item.rf_code))
    let pdfFileName = 'ใบแจ้งซ่อม_ทั้งหมด'
    if (selectedMonth.value && selectedYear.value) {
      const monthName = thaiMonths[parseInt(selectedMonth.value) - 1]
      const yearBE = parseInt(selectedYear.value) + 543
      pdfFileName = `ใบแจ้งซ่อมประจำเดือน${monthName} ${yearBE}`
    }
    if (itemsToPrint.length === 1 && printOption.value === 'merged') {
      pdfFileName = `ใบแจ้งซ่อม_${itemsToPrint[0].rf_code}`
    }
    if (printOption.value === 'merged') {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      for (let i = 0; i < itemsToPrint.length; i++) {
        const { img, width, height } = await generateSinglePDF(itemsToPrint[i])
        if (i > 0) pdf.addPage()
        pdf.addImage(img, 'PNG', 0, 0, 210, 297, undefined, 'FAST')
      }
      pdf.save(`${pdfFileName}.pdf`)
    } else {
      const zip = new JSZip()
      for (const item of itemsToPrint) {
        const { img, width, height } = await generateSinglePDF(item)
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        })
        pdf.addImage(img, 'PNG', 0, 0, 210, 297)
        const pdfBlob = pdf.output('blob')
        zip.file(`ใบแจ้งซ่อม_${item.rf_code}.pdf`, pdfBlob)
      }
      const content = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      link.download = `${pdfFileName}.zip`
      link.click()
    }
    closePrintModal()
    if (window.$swal) {
      window.$swal.fire({
        icon: 'success',
        title: 'สำเร็จ',
        text: 'สร้างไฟล์เรียบร้อยแล้ว',
        timer: 2000,
        showConfirmButton: false
      })
    }
  } catch (err) {
    console.error('Error generating PDF:', err)
    alert('เกิดข้อผิดพลาดในการสร้างไฟล์: ' + err.message)
  } finally {
    isGeneratingPDF.value = false
  }
}

onMounted(() => {
  fetchRepairRequests()
})
</script>


<template>
  <!-- Root container for the report management page -->
  <div class="min-h-screen bg-gray-50 p-4 pt-4">
    <!-- Centered main content -->
    <div class="max-w-[1400px] mx-auto">
      <!-- Main card -->
      <div class="bg-white rounded-xl shadow-md p-8 mx-auto max-w-7xl-6">
        <!-- Page title and description -->
        <h1 class="text-2xl font-bold text-gray-800">สร้างรายงาน</h1>
        <p class="text-gray-500 mt-1">การสร้างรายงานประจำเดือนหรือบันทึกใบแจ้งซ่อม</p>
        <div class="flex flex-col lg:flex-row gap-6">
          <!-- Sidebar: Month/Year selection and actions -->
          <div class="lg:w-72 flex-shrink-0 space-y-4">
            <!-- Month/Year selection -->
            <div class="bg-white rounded-xl shadow-sm p-4">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">เลือกเดือน/ปี:</h3>
              <div class="grid grid-cols-2 gap-3">
                <!-- Month select -->
                <select v-model="selectedMonth"
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-700 ">
                  <option v-for="(month, index) in monthOptions" :key="index" :value="month.value">
                    {{ month.label }}
                  </option>
                </select>
                <!-- Year select -->
                <select v-model="selectedYear"
                  class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-700">
                  <option v-for="year in yearOptions" :key="year" :value="year">{{ year + 543 }}</option>
                </select>
              </div>
            </div>
            <!-- Export and navigation buttons -->
            <div class="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <button @click="downloadCSV"
                class="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-sm">
                <!-- CSV icon -->
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                ดาวน์โหลดสรุป CSV
              </button>
              <button @click="goToCreateReport"
                class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-sm">
                <!-- Go to create report icon -->
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                ไปหน้าสร้างบันทึกข้อความ
              </button>
            </div>
          </div>
          <!-- Main content: Filter bar and table -->
          <div class="mb-4 flex-1">
            <!-- Filter bar for searching/filtering reports -->
            <repair-filter-bar-component v-model:search="search" v-model:statuses="statusFilters"
              v-model:date="dateFilter" :showStatus="false" :showUrgencies="false" @reset="resetFilters" />
            <div class="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[600px] mt-4">
              <!-- Table header: status and selection info -->
              <div class="p-4 border-b border-gray-200">
                <div v-if="selectedItems.length === 0" class="flex justify-between items-center">
                  <h3 class="text-lg font-semibold text-gray-800">
                    รายการแจ้งซ่อมที่เสร็จสิ้น
                  </h3>
                  <span class="text-sm text-gray-500">{{ filteredRows.length }} รายการ</span>
                </div>
                <div v-else
                  class="flex justify-between items-center bg-blue-600 text-white -m-4 p-4 rounded-t-xl transition-all">
                  <!-- Selection actions and print button -->
                  <div class="flex items-center gap-3">
                    <button @click="clearSelection" class="p-1 hover:bg-blue-700 rounded-full transition-colors">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <span class="font-medium">เลือกแล้ว {{ selectedItems.length }} รายการ</span>
                  </div>
                  <button @click="openPrintModal"
                    class="flex items-center gap-2 bg-white text-blue-600 font-medium py-2 px-4 rounded-lg hover:bg-blue-50 transition-all">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    ดาวน์โหลด ({{ selectedItems.length }})
                  </button>
                </div>
              </div>

              <div class="flex-1 flex flex-col overflow-x-auto">
                <table-component :columns="['', 'วันที่', 'หมายเลขแจ้งซ่อม', 'ผู้แจ้ง', 'ประเภท', 'หน่วยงาน', 'สถานะ']"
                  :rows="paginatedRowsForTable" :perPage="perPage" :idColumnIndex="2"
                  :activeId="selectedItems[0] || null" :statusColumn="6"
                  :columnAlign="['center', 'left', 'left', 'left', 'center', 'left', 'center']" :hiddenColumns="[]"
                  @detail="handleRowClick" class="w-full" :id-column-as-link="false">
                  <template #cell-0="{ row }">
                    <input type="checkbox" :value="row[2]" v-model="selectedItems" @click.stop
                      class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" />
                  </template>
                </table-component>

                <div class="flex-1 flex flex-col">

                  <div v-if="loading" class="flex-1 flex items-center justify-center min-h-[300px] w-full">
                    <svg class="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                      </circle>
                      <path class="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                      </path>
                    </svg>
                  </div>

                  <div v-else-if="filteredRows.length === 0"
                    class="flex-1 flex flex-col items-center justify-center min-h-[300px] w-full text-gray-500">
                    <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>ไม่มีรายการแจ้งซ่อมในเดือนนี้</p>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Teleport to="body">
      <div v-if="showPrintModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="closePrintModal"></div>
        <div
          class="relative bg-white rounded-xl shadow-2xl w-[95%] max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <div class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <h2 class="text-lg font-semibold text-gray-800">
              เตรียมดาวน์โหลดแบบฟอร์ม ({{ printSelection.length }} รายการ)
            </h2>
            <button @click="closePrintModal" class="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-hidden flex">
            <div class="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
              <div class="p-3 border-b border-gray-200">
                <h3 class="text-sm font-semibold text-gray-700">รายการที่เลือก</h3>
              </div>
              <div class="flex-1 overflow-y-auto p-2">
                <div v-for="(item, index) in printDetails" :key="item.rf_code" @click="previewItem = item"
                  class="p-3 mb-2 rounded-lg cursor-pointer transition-all border" :class="{
                    'bg-blue-100 border-blue-400': previewItem?.rf_code === item.rf_code,
                    'bg-white border-gray-200 hover:bg-gray-100': previewItem?.rf_code !== item.rf_code
                  }">
                  <div class="flex items-start gap-2">
                    <input type="checkbox" :checked="printSelection.includes(item.rf_code)"
                      @click.stop="togglePrintSelection(item.rf_code)"
                      class="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded" />
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-gray-800">{{ index + 1 }}. {{ item.rf_code }}</p>
                      <p class="text-xs text-gray-500 truncate">({{ item.tt_name }} - {{ item.reporter?.name || '-' }})
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex-1 flex flex-col bg-white">
              <div class="p-3 border-b border-gray-200">
                <h3 class="text-sm font-semibold text-gray-700">ตัวอย่างเอกสาร</h3>
              </div>
              <div class="flex-1 overflow-auto p-4">
                <div v-if="previewItem" class="mx-auto">
                  <div ref="previewDocRef" class="bg-white border border-gray-300 shadow-lg mx-auto overflow-hidden"
                    style="width: 595px; min-height: 842px;" v-html="previewHtmlContent">
                  </div>
                </div>
                <div v-else class="flex items-center justify-center h-full text-gray-400">
                  <p>เลือกรายการเพื่อดูตัวอย่าง</p>
                </div>
              </div>
            </div>
          </div>
          <!-- Modal Footer -->
          <div class="p-4 border-t border-gray-200 bg-gray-50">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <!-- Print Options -->
              <div class="flex items-center gap-4">
                <span class="text-sm font-medium text-gray-700">ตัวเลือกการดาวน์โหลด:</span>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" v-model="printOption" value="merged"
                    class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                  <span class="text-sm text-gray-700">รวมเป็นไฟล์เดียว</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" v-model="printOption" value="zip"
                    class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                  <span class="text-sm text-gray-700">ดาวน์โหลดเป็นไฟล์แยก (ZIP File)</span>
                </label>
              </div>
              <!-- Action Buttons -->
              <div class="flex gap-3">
                <button @click="closePrintModal"
                  class="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-all">
                  ยกเลิก
                </button>
                <button @click="downloadPDF" :disabled="isGeneratingPDF || printSelection.length === 0"
                  class="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed">
                  <svg v-if="isGeneratingPDF" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                    </path>
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{{ isGeneratingPDF ? 'กำลังสร้าง...' : 'ดาวน์โหลดไฟล์' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
@font-face {
  font-family: 'THSarabun';
  src: url('/fonts/THSarabun.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'THSarabun';
  src: url('/fonts/THSarabun Bold.ttf') format('truetype');
  font-weight: bold;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'THSarabun';
  src: url('/fonts/THSarabun Italic.ttf') format('truetype');
  font-weight: normal;
  font-style: italic;
  font-display: swap;
}

@font-face {
  font-family: 'THSarabun';
  src: url('/fonts/THSarabun BoldItalic.ttf') format('truetype');
  font-weight: bold;
  font-style: italic;
  font-display: swap;
}

.form-preview,
.form-preview * {
  font-family: 'THSarabun', 'Sarabun', sans-serif !important;
}

.fixed-row {
  min-height: 28px;
  display: flex;
  align-items: center;
}

.fixed-block {
  min-height: 56px;
  display: flex;
  align-items: flex-start;
}

.fixed-detail {
  min-height: 48px;
  white-space: pre-wrap;
}
</style>
