import { computed } from 'vue'
import { createBadgeHtml } from '@/utils/badgeHtml.util'
import { useTruncateText } from '@/composables/useTruncateText.js'

const { truncateSentences } = useTruncateText()

// Composable แปลงรายการซ่อมเป็นข้อมูลตารางสำหรับ Technician
// คืนค่า: sortedRepairs, repairTableRows, repairTableRaw, onRepairRowClick
export function useTechnicianRepairTable(repairRequests, router) {
  // เรียงรายการตามวันที่ล่าสุด 
  const sortedRepairs = computed(() => {
    return [...repairRequests.value]
      .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate))
      .slice(0, 5)
  })

  // สร้างข้อมูลแถวที่ Component ตารางจะใช้งาน
  const repairTableRows = computed(() => {
    return sortedRepairs.value.map((r) => [
      r.rf_code, // รหัสตั๋ว
      truncateSentences(r.rf_problem) || '-', // หัวเรื่องตัดสั้นสำหรับแสดง
      r.department_name || '-', // หน่วยงาน
      `${r.building_name || ''} ${r.room_name || ''}`, // สถานที่ (อาคาร + ห้อง)
      createBadgeHtml(r.urgency, 'urgency'), // ป้ายความเร่งด่วน
      createBadgeHtml(r.status, 'status'), // ป้ายสถานะ
    ])
  })

  // ข้อมูลดิบที่ใช้สำหรับการเลือก/คลิกแถว (เก็บ id)
  const repairTableRaw = computed(() => {
    return sortedRepairs.value.map((r) => ({
      ticketId: r.rf_code,
    }))
  })

  // เมื่อคลิกแถว ให้ไปที่หน้า detail ของตั๋วนั้น
  const onRepairRowClick = (item) => {
    const id = typeof item === 'object' ? item.ticketId : item
    if (!id) return

    router.push({
      path: `/main/repair-detail/${id}`,
      state: { fromTechnician: true },
    })
  }

  return {
    sortedRepairs,
    repairTableRows,
    repairTableRaw,
    onRepairRowClick,
  }
}
