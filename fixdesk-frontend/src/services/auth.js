const API_BASE_URL = import.meta.env.VITE_API_BASE

// ฟังก์ชันสำหรับส่งข้อมูลไปเข้าสู่ระบบ
export const loginUser = async (username, password) => {
  // ส่งชื่อผู้ใช้และรหัสผ่านไปตรวจสอบที่เซิร์ฟเวอร์
  const apiResponse = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userName: username, // ส่งค่าตามที่หลังบ้านต้องการ
      password: password,
    }),
  })

  // แปลงข้อมูลที่ตอบกลับมาให้อยู่ในรูปแบบที่ใช้งานได้ (JSON)
  const responseData = await apiResponse.json()

  // ถ้าเซิร์ฟเวอร์บอกว่าไม่ผ่าน (เช่น รหัสผิด) ให้แจ้งเตือน Error ทันที
  if (!apiResponse.ok) {
    throw new Error(responseData.message || 'LOGIN_FAILED')
  }

  // ถ้าทุกอย่างถูกต้อง ส่งข้อมูลกลับไปให้ทำงานต่อ
  return responseData
}
