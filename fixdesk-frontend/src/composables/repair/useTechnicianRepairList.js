import { ref } from 'vue'
import Swal from 'sweetalert2'

export function useTechnicianRepairList(API_BASE, token, isAuthenticated, logout) {
  const repairList = ref([])

  const allowedStatuses = ['pending', 'in_progress', 'outsource']

  function formatRow(r) {
    const fullName = `${r.us_first_name || ''} ${r.us_last_name || ''}`.trim()

    const place = [r.bd_name, r.fl_name, r.room_name].filter(Boolean).join(' / ') || '-'

    return [
      r.rf_code,
      `วันที่แจ้ง: ${new Date(r.rf_create_at).toLocaleDateString('th-TH')} </br>
       ชื่อผู้แจ้ง: ${fullName}</br>
       หน่วยงาน: ${r.department_name}</br>
       เรื่องที่แจ้ง: ${r.rf_problem}</br>
       สถานที่: ${place}`,
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
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      })

      if (res.status === 401) {
        Swal.fire('หมดเวลาเข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบใหม่', 'warning')
        logout()
        return
      }

      const data = await res.json()

      repairList.value = data
        .filter((r) => allowedStatuses.includes(r.rf_user_status))
        .map(formatRow)
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
