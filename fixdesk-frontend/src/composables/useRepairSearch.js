import { ref } from 'vue'
import { searchRepairList } from '@/services/public'
import { getRepairStepNumber } from '@/utils/repairStatus.util'

// Composable สำหรับการค้นหาใบแจ้งซ่อม (หน้า Public)
// คืนค่า: keyword, loading, results, pagination และฟังก์ชันค้นหา/เลื่อนหน้า
export function useRepairSearchProcess() {
  const searchKeyword = ref('') // คำที่ผู้ใช้พิมพ์ค้นหา
  const isSearchingLoading = ref(false) // สถานะการค้นหา
  const searchErrorMessage = ref('') // ข้อความผิดพลาด
  const hasUserPerformedSearch = ref(false) // เช็คว่าเคยกดค้นหาหรือยัง

  const searchResultList = ref([]) // ผลลัพธ์จาก API
  const currentPageNumber = ref(1) // หน้าปัจจุบัน
  const totalResultCount = ref(0) // จำนวนรายการทั้งหมดที่เจอ
  const totalPageCount = ref(1) // จำนวนหน้าทั้งหมด (คำนวณจากรายการหารด้วยจำนวนต่อหน้า)

  // จำนวนรายการต่อหน้า (ค่าคงที่)
  const ITEMS_PER_PAGE = 5

  const executeSearchRepair = async (targetPage = 1) => {
    // 1. ถ้าไม่ได้พิมพ์อะไรมาเลย ก็ไม่ต้องทำอะไร 
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
      searchErrorMessage.value = 'เกิดข้อผิดพลาดในการค้นหา'
    } finally {
      // 7. [Standard] ไม่ว่าจะสำเร็จหรือไม่ ต้องปิดสถานะโหลดเสมอ
      isSearchingLoading.value = false
    }
  }

  // ฟังก์ชันสำหรับกดปุ่ม "ย้อนกลับ"
  const goToPreviousPage = () => {
    if (currentPageNumber.value > 1) executeSearchRepair(currentPageNumber.value - 1)
  }

  // ฟังก์ชันสำหรับกดปุ่ม "ถัดไป"
  const goToNextPage = () => {
    if (currentPageNumber.value < totalPageCount.value) executeSearchRepair(currentPageNumber.value + 1)
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
