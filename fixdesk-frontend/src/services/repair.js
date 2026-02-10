const API_BASE_URL = import.meta.env.VITE_API_BASE

// 1. ฟังก์ชันดึงสถิติการแจ้งซ่อมของผู้ใช้
export async function getRepairStatistics(targetUserId, userAuthenticationToken) {
  // ยิง Request ไปขอข้อมูลสถิติ โดยแนบ Token ไปยืนยันตัวตนด้วย
  const apiResponse = await fetch(`${API_BASE_URL}/repair-stats/${targetUserId}`, {
    headers: { Authorization: `Bearer ${userAuthenticationToken}` },
  })

  // ถ้าเซิร์ฟเวอร์ตอบกลับมาว่า "ไม่สำเร็จ" ให้แจ้ง Error ทันที
  if (!apiResponse.ok) {
    throw new Error('Load stats failed')
  }

  // แปลงข้อมูลที่ได้เป็น JSON แล้วส่งกลับไป
  return apiResponse.json()
}

// 2. ฟังก์ชันดึงรายการแจ้งซ่อม "ของฉัน"
export async function getMyRepairList(targetUserId, userAuthenticationToken) {
  // ดึงข้อมูลรายการซ่อมของ User คนนี้
  const apiResponse = await fetch(`${API_BASE_URL}/repair_forms/${targetUserId}`, {
    headers: { Authorization: `Bearer ${userAuthenticationToken}` },
  })

  // แปลงข้อมูลที่ได้รับมาเก็บไว้ในตัวแปร
  const responseData = await apiResponse.json()

  // ถ้ามีปัญหา ให้เอาข้อความจากเซิร์ฟเวอร์มาแจ้งเตือน
  if (!apiResponse.ok) {
    throw new Error(responseData.message)
  }

  return responseData
}

// 3. ฟังก์ชันดึงรายละเอียดการแจ้งซ่อม (ตามรหัสใบงาน)
export async function getRepairDetailByCode(repairRequestCode) {
  // ดึงข้อมูลใบงานตามรหัสที่ส่งเข้ามา
  const apiResponse = await fetch(`${API_BASE_URL}/repair-requests/${repairRequestCode}`)
  const responseData = await apiResponse.json()

  if (!apiResponse.ok) {
    throw new Error(responseData.message || 'โหลดข้อมูลไม่สำเร็จ')
  }

  return responseData
}

// 4. ฟังก์ชันดึงรายการแจ้งซ่อมทั้งหมด (สำหรับ Admin)
export async function getAdminRepairList(userAuthenticationToken) {
  // ดึงข้อมูลรายการซ่อมทั้งหมด พร้อมระบุประเภทข้อมูลที่ต้องการ (JSON)
  const apiResponse = await fetch(`${API_BASE_URL}/admin/repairs`, {
    headers: {
      Authorization: `Bearer ${userAuthenticationToken}`,
      'Content-Type': 'application/json',
    },
  })

  // พยายามแปลงข้อมูลเป็น JSON ถ้าแปลงไม่ได้ (เช่น error) ให้เป็น null ไว้ก่อน
  const responseData = await apiResponse.json().catch(() => null)

  // ถ้าโหลดไม่สำเร็จ ให้แจ้ง Error
  if (!apiResponse.ok) {
    throw new Error(responseData?.message || 'โหลดข้อมูลล้มเหลว')
  }

  return responseData
}

// 5. ฟังก์ชันดึงงานซ่อมสำหรับช่างเทคนิค
export async function getTechnicianRepairList(userAuthenticationToken) {
  // ดึงรายการงานซ่อมส่วนของช่าง
  const apiResponse = await fetch(`${API_BASE_URL}/technician/repairs`, {
    headers: { Authorization: `Bearer ${userAuthenticationToken}` },
  })

  if (!apiResponse.ok) {
    throw new Error('Fetch failed')
  }

  return apiResponse.json()
}
