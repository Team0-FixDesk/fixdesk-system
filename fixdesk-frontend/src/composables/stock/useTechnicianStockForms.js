import { ref } from 'vue'
import { getStockForms } from '@/services/stock'
import { getStockStatusLabel, getUrgencyLabel } from '@/utils/repairStatus.util'

// Composable: โหลดและจัดเก็บรายการแบบฟอร์มการเบิก stock
// คืนค่า: stockForms, loadingStock, fetchStockForms()
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

      // แปลงข้อมูลให้ชื่อชัดเจนขึ้นสำหรับ UI
      stockForms.value = data.map((item) => ({
        ...item,
        createdAt: item.sf_create_at,
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
