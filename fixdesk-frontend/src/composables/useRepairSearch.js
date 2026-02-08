import { ref } from 'vue'
import { searchRepair } from '@/services/public'
import { convertStatusToStep } from '@/utils/repairStatus.util'

export function useRepairSearch() {
  const keyword = ref('')
  const loading = ref(false)
  const errorMessage = ref('')
  const searched = ref(false)
  const results = ref([])

  const currentPage = ref(1)
  const pageSize = 5
  const totalItems = ref(0)
  const totalPages = ref(1)

  const handleSearch = async (page = 1) => {
    if (!keyword.value.trim()) return

    loading.value = true
    errorMessage.value = ''
    searched.value = true
    currentPage.value = page

    try {
      const data = await searchRepair(keyword.value, currentPage.value, pageSize)

      results.value = (data.data || []).map((item) => ({
        ...item,
        step: convertStatusToStep(item.rf_user_status),
      }))

      totalItems.value = data.total
      totalPages.value = Math.ceil(totalItems.value / pageSize)

      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      errorMessage.value = 'เกิดข้อผิดพลาดในการค้นหา'
    } finally {
      loading.value = false
    }
  }

  const goPrevPage = () => {
    if (currentPage.value > 1) {
      handleSearch(currentPage.value - 1)
    }
  }

  const goNextPage = () => {
    if (currentPage.value < totalPages.value) {
      handleSearch(currentPage.value + 1)
    }
  }

  return {
    keyword,
    loading,
    errorMessage,
    searched,
    results,
    currentPage,
    totalPages,
    handleSearch,
    goPrevPage,
    goNextPage,
  }
}
