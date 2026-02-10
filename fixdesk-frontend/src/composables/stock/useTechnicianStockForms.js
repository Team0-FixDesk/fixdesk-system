import { ref } from 'vue'
import { getStockForms } from '@/services/stock'
import { getStockStatusLabel, getUrgencyLabel } from '@/utils/repairStatus.util'

export function useTechnicianStockForms(tokenRef, userIdRef, isAuthenticatedRef, logout) {
  const stockForms = ref([])
  const loadingStock = ref(false)

  const fetchStockForms = async () => {
    loadingStock.value = true

    try {
      if (!isAuthenticatedRef.value) {
        logout()
        return
      }

      const data = await getStockForms(tokenRef.value, userIdRef.value)

      stockForms.value = data.map((item) => ({
        ...item,
        rawDate: item.sf_create_at,
        status: getStockStatusLabel(item.sf_status),
        urgency: getUrgencyLabel(item.sf_urgency),
      }))
    } catch (err) {
      console.error(err)
    } finally {
      loadingStock.value = false
    }
  }

  return {
    stockForms,
    loadingStock,
    fetchStockForms,
  }
}
