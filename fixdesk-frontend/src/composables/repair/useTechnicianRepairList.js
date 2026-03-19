/**
 * =====================================================================
 * @file            useTechnicianRepairList.js
 * @layer           Composable (Business Logic Layer)
 * @version         1.0.1
 * @since           2026-02-09
 * @author          พชร ไพศรีสกุล
 * @lastModified    2026-03-13
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  Composable สำหรับโหลดและจัดการรายการงานซ่อมของช่างเทคนิค
 *   - เรียก API เพื่อดึงรายการงานซ่อมของช่าง (/technician/repairs)
 *   - ตรวจสอบสถานะการเข้าสู่ระบบก่อนเรียก API
 *   - กรองสถานะงานที่อนุญาต (pending / in_progress / outsource)
 *   - จัดรูปแบบข้อมูลให้อยู่ในรูปแบบที่ TableComponent ใช้งานได้
 *   - จัดการกรณี Token หมดอายุ (401) และเรียก logout
 *   - แสดง SweetAlert เมื่อเกิดข้อผิดพลาด
 *   - ส่งออก repairList และ fetchRepairList สำหรับใช้งานใน View
 *
 * @requires
 *   - vue (ref)
 *   - sweetalert2
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - แก้ไขการใช้สัญลักษณ์ : ในตาราง  [2026-02-20, ปฏิพัทธ์ จงนันทพันธ์กุล]
 *   - แก้ไข alert                  [2026-03-06, เศรษฐพงศ์ หอมชื่น]
 *   - แก้ไขคำ alert              [2026-03-13, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * =====================================================================
 */

// Composable: โหลดและจัดรูปแบบรายการงานสำหรับ Technician
// คืน `repairList` และ `fetchRepairList()` เพื่อให้หน้าจอแสดงตารางได้เลย
import { ref } from 'vue'
import Swal from 'sweetalert2'
export function useTechnicianRepairList(API_BASE, token, isAuthenticated, logout) {
  const repairList = ref([])

  const allowedStatuses = ['pending', 'in_progress', 'outsource']

  function formatRepairRow(r) {
    const fullName = `${r.us_first_name || ''} ${r.us_last_name || ''}`.trim()
    const place = [r.bd_name, r.fl_name, r.room_name].filter(Boolean).join(' / ') || '-'

    return [
      r.rf_code,
      `วันที่แจ้งซ่อม : ${new Date(r.rf_create_at).toLocaleDateString('th-TH')} </br>
       ชื่อผู้แจ้ง : ${fullName}</br>
       หน่วยงาน : ${r.department_name}</br>
       เรื่องที่แจ้ง : ${r.rf_problem}</br>
       สถานที่ : ${place}`,
      r.rf_user_status,
      '',
    ]
  }

  async function fetchRepairList() {
    try {
      if (!isAuthenticated.value) {
        logout()
        return
      }

      const res = await fetch(`${API_BASE}/technician/repairs`, {
        headers: { Authorization: `Bearer ${token.value}` },
      })

      if (res.status === 401) {
        Sweetalert.fire({
        title: 'หมดเวลาเข้าสู่ระบบ',
        text: 'กรุณาเข้าสู่ระบบใหม่',
        icon: 'warning',
        confirmButtonColor: '#0048EF', 
        confirmButtonText: 'ตกลง'
      })
        logout()
        return
      }

      const data = await res.json()

      repairList.value = data.filter((r) => allowedStatuses.includes(r.rf_user_status)).map(formatRepairRow)
    } catch (err) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message,
        timer: 3000,
        showConfirmButton: false,
      })
    }
  }

  return {
    repairList,
    fetchRepairList,
  }
}
