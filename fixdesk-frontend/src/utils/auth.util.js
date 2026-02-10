// ฟังก์ชันสำหรับหาว่า User ตำแหน่งนี้ ต้องเด้งไปที่หน้าไหน
export function getRoutePathByUserRole(userRoleName) {
  // สร้างรายการจับคู่ไว้ว่า "ตำแหน่งไหน" คู่กับ "หน้าไหน"
  const roleRouteMapping = {
    Admin: '/main/admin-home',
    Technician: '/main/technician-home',
    Stock: '/main/stock-home',
    Manager: '/main/dashboard',
  }

  // ถ้าเจอชื่อตำแหน่งในรายการ ให้ส่งลิ้งค์หน้านั้นกลับไป
  // แต่ถ้าหาไม่เจอ (หรือเป็น User ทั่วไป) ให้ส่งไปหน้า "user-home" แทน
  return roleRouteMapping[userRoleName] || '/main/user-home'
}
