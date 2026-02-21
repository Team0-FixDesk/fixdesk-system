/**
 * =====================================================================
 * @file            useTechnicianStats.js
 * @layer           Composable (Business Logic Layer)
 * @version         1.0.0
 * @since           2026-02-09
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-02-21
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  Composable สำหรับคำนวณสถิติงานซ่อมของช่างเทคนิค
 *   - คำนวณจำนวนงานที่ได้รับมอบหมายในวันนี้
 *   - คำนวณจำนวนงานที่กำลังดำเนินการ (in_progress)
 *   - คำนวณจำนวนงานที่ดำเนินการเสร็จสิ้น (done)
 *   - คำนวณจำนวนงานที่ถูกยกเลิก (cancel)
 *   - คืนค่า statItems ในรูปแบบ computed สำหรับแสดงผลบน Dashboard
 *
 * @requires
 *   - vue (computed)
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - ปรับปรุงโครงสร้างข้อมูลสถิติสำหรับแสดงผลบน Dashboard  [2026-02-21, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * =====================================================================
 */

import { computed } from 'vue'
// Composable: คำนวณตัวเลขสถิติงานสำหรับ Technician
// นับประเมิณวันนี้, กำลังทำ, เสร็จ, ยกเลิก เพื่อแสดง dashboard
export function useTechnicianStats(repairRequests) {
  function isToday(date) {
    if (!date) return false

    return new Date(date).toDateString() === new Date().toDateString()
  }

  const statItems = computed(() => [
    {
      value: repairRequests.value.filter((r) => isToday(r.createdAt)).length,
      label: 'จำนวนงานซ่อมที่ได้รับมอบหมายในวันนี้',
      colorClass: 'text-amber-500',
      filterStatus: 'today',
    },
    {
      value: repairRequests.value.filter((r) => r.rf_user_status === 'in_progress').length,
      label: 'จำนวนงานซ่อมที่กำลังดำเนินการ',
      colorClass: 'text-blue-600',
      filterStatus: 'in_progress',
    },
    {
      value: repairRequests.value.filter((r) => r.rf_user_status === 'done').length,
      label: 'จำนวนงานซ่อมที่ดำเนินการเสร็จสิ้นในเดือนนี้',
      colorClass: 'text-green-600',
      filterStatus: 'done',
    },
    {
      value: repairRequests.value.filter((r) => r.rf_user_status === 'cancel').length,
      label: 'งานที่ยกเลิก',
      colorClass: 'text-red-600',
      filterStatus: 'cancel',
    },
  ])

  return {
    statItems,
  }
}
