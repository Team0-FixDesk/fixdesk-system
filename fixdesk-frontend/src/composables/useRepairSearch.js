import { ref } from 'vue'
import { searchRepairList } from '@/services/public'
import { getRepairStepNumber } from '@/utils/repairStatus.util'

export function useRepairSearchProcess() {
  const searchKeyword = ref('') // คำที่ผู้ใช้พิมพ์ค้นหา
  const isSearchingLoading = ref(false) // สถานะ "กำลังค้นหา" (หมุนติ้วๆ)
  const searchErrorMessage = ref('') // ข้อความแจ้งเตือนเมื่อระบบมีปัญหา
  const hasUserPerformedSearch = ref(false) // ตัวเช็คว่า "เคยกดค้นหาหรือยัง?" (เพื่อเลือกแสดงผลระหว่าง "ไม่พบข้อมูล" กับ "ยังไม่ได้ค้นหา")

  const searchResultList = ref([]) // รายการผลลัพธ์ที่ค้นเจอ
  const currentPageNumber = ref(1) // หน้าปัจจุบัน
  const totalResultCount = ref(0) // จำนวนรายการทั้งหมดที่เจอ
  const totalPageCount = ref(1) // จำนวนหน้าทั้งหมด (คำนวณจากรายการหารด้วยจำนวนต่อหน้า)

  // ค่าคงที่ (จำนวนรายการต่อหน้า)
  const ITEMS_PER_PAGE = 5

  // ฟังก์ชันหลักสำหรับกดค้นหา (รับเลขหน้าที่จะไป ถ้าไม่ส่งมาให้เริ่มหน้า 1)
  const executeSearchRepair = async (targetPage = 1) => {
    // 1. ถ้าไม่ได้พิมพ์อะไรมาเลย ก็ไม่ต้องทำอะไร (กันปุ่มลั่น)
    if (!searchKeyword.value.trim()) return

    // 2. เริ่มต้นกระบวนการ: เปิดโหลด, ลบ Error เก่า, และจำว่า "กดค้นหาแล้วนะ"
    isSearchingLoading.value = true
    searchErrorMessage.value = ''
    hasUserPerformedSearch.value = true
    currentPageNumber.value = targetPage

    try {
      // 3. ส่งคำค้นหา + เลขหน้า + จำนวนต่อหน้า ไปถาม Server
      const apiResponse = await searchRepairList(searchKeyword.value, currentPageNumber.value, ITEMS_PER_PAGE)

      // 4. [Logic] เอาข้อมูลที่ได้ มาเติม "ลำดับขั้นตอน (Step)" เข้าไป
      // เพื่อให้หน้าจอรู้ว่ารายการนี้ซ่อมถึงขั้นไหนแล้ว (เอาไปทำ Progress Bar)
      searchResultList.value = (apiResponse.data || []).map((repairItem) => ({
        ...repairItem, // เอาข้อมูลเดิมมาทั้งหมด
        currentStepNumber: getRepairStepNumber(repairItem.rf_user_status), // เพิ่มเลขขั้นตอนเข้าไป
      }))

      // 5. อัปเดตตัวเลขการแบ่งหน้า
      totalResultCount.value = apiResponse.total
      // สูตรคำนวณหน้า: เอาจำนวนทั้งหมด หารด้วย จำนวนต่อหน้า (ปัดเศษขึ้น)
      totalPageCount.value = Math.ceil(totalResultCount.value / ITEMS_PER_PAGE)

      // 6. [UX] เลื่อนหน้าจอไปบนสุด เพื่อให้เห็นผลลัพธ์ชัดๆ
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      // กรณีระบบมีปัญหา
      searchErrorMessage.value = 'เกิดข้อผิดพลาดในการค้นหา'
    } finally {
      // 7. [Standard] ไม่ว่าจะสำเร็จหรือไม่ ต้องปิดสถานะโหลดเสมอ
      isSearchingLoading.value = false
    }
  }

  // ฟังก์ชันสำหรับกดปุ่ม "ย้อนกลับ"
  const goToPreviousPage = () => {
    // ถ้าไม่ได้อยู่ที่หน้า 1 ก็ถอยหลังได้
    if (currentPageNumber.value > 1) {
      executeSearchRepair(currentPageNumber.value - 1)
    }
  }

  // ฟังก์ชันสำหรับกดปุ่ม "ถัดไป"
  const goToNextPage = () => {
    // ถ้ายังไม่ถึงหน้าสุดท้าย ก็ไปต่อได้
    if (currentPageNumber.value < totalPageCount.value) {
      executeSearchRepair(currentPageNumber.value + 1)
    }
  }

  // ส่งตัวแปรและฟังก์ชันออกไปให้หน้า HTML ใช้งาน
  return {
    keyword: searchKeyword,
    loading: isSearchingLoading,
    errorMessage: searchErrorMessage,
    searched: hasUserPerformedSearch,
    results: searchResultList,
    currentPage: currentPageNumber,
    totalPages: totalPageCount,
    handleSearch: executeSearchRepair,
    goPrevPage: goToPreviousPage,
    goNextPage: goToNextPage,
  }
}
