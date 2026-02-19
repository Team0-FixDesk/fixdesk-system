import { ref } from 'vue'
import { getTechnicianRepairList } from '@/services/repair'

export function useTechnicianRepairs(tokenRef, isAuthenticatedRef, logout) {
  const repairRequests = ref([])
  const loading = ref(false)

  // แปลงค่า urgency ให้เป็นข้อความอ่านง่าย
  const mapUrgency = (u) => ({ high: 'เร่งด่วนมาก', medium: 'เร่งด่วน', low: 'ไม่เร่งด่วน' })[u] || 'เร่งด่วน'

  // แปลงสถานะเป็นข้อความอ่านง่าย
  const mapStatus = (s) =>
    ({ pending: 'รอดำเนินการ', in_progress: 'กำลังดำเนินการ', done: 'เสร็จสิ้น', cancel: 'ยกเลิก' })[s] || 'รอดำเนินการ'

  const fetchRepairRequests = async () => {
    loading.value = true

    try {
      if (!isAuthenticatedRef.value) {
        logout()
        return
      }

      const data = await getTechnicianRepairList(tokenRef.value)

      // แปลงข้อมูลตอบกลับให้ง่ายต่อการใช้งานใน UI
      repairRequests.value = data.map((item) => ({
        ...item,
        createdAt: item.rf_create_at, // วันที่สร้าง 
        status: mapStatus(item.rf_user_status),
        urgency: mapUrgency(item.rf_urgency),
      }))
    } catch (err) {
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  return {
    repairRequests,
    loading,
    fetchRepairRequests,
  }
}
