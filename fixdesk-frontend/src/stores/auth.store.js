import { defineStore } from 'pinia'
import { jwtDecode } from 'jwt-decode'
import { loginUser } from '@/services/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    userAuthenticationToken: null, // โทเคนสำหรับยืนยันตัวตน
    userInformation: null, // ข้อมูลของผู้ใช้งานที่ล็อกอินอยู่
  }),

  actions: {
    // ฟังก์ชันสำหรับเข้าสู่ระบบ
    // รับค่า: ชื่อผู้ใช้, รหัสผ่าน, และสถานะการจำรหัสผ่าน (True/False)
    async loginUserAccount(username, password, isRememberMeChecked) {
      // 1. ส่งข้อมูลไปตรวจสอบที่เซิร์ฟเวอร์ (เรียกใช้ Service ที่ทำไว้ก่อนหน้านี้)
      const apiResponse = await loginUser(username, password)

      // 2. แกะข้อมูลที่ซ่อนอยู่ใน Token (เช่น รหัสพนักงาน, ชื่อ, ตำแหน่ง) ออกมาใช้งาน
      const decodedTokenPayload = jwtDecode(apiResponse.token)

      // 3. จัดเตรียมข้อมูลผู้ใช้ให้พร้อมสำหรับการเก็บ
      const userProfile = {
        id: decodedTokenPayload.us_id,
        username: decodedTokenPayload.us_user_name,
        role: decodedTokenPayload.role_name,

        fullName:
          `${decodedTokenPayload.us_prefix_th || ''}${decodedTokenPayload.us_first_name_th || ''} ${decodedTokenPayload.us_last_name_th || ''}`.trim(),

        department: decodedTokenPayload.us_department || '',
      }

      // ถ้าติ๊ก "จำฉันไว้" -> เก็บลง localStorage (ปิด browser ไม่หาย)
      // ถ้าไม่ติ๊ก -> เก็บลง sessionStorage (ปิด browser แล้วหาย)
      const targetStorage = isRememberMeChecked ? localStorage : sessionStorage

      // บันทึกข้อมูลลงใน Browser ตามที่เลือกไว้
      targetStorage.setItem('token', apiResponse.token)
      targetStorage.setItem('session_user', JSON.stringify(userProfile))

      // อัปเดตข้อมูลเข้าไปใน State กลางของแอปพลิเคชัน
      this.userAuthenticationToken = apiResponse.token
      this.userInformation = userProfile

      return userProfile
    },

    // ฟังก์ชันสำหรับออกจากระบบ
    logoutUser() {
      // ล้างข้อมูลทุกอย่างออกจากเครื่อง ทั้งแบบถาวรและชั่วคราว
      localStorage.clear()
      sessionStorage.clear()

      // รีเซ็ตค่าใน State ให้กลับเป็นค่าเริ่มต้น (ว่างเปล่า)
      this.userAuthenticationToken = null
      this.userInformation = null
    },
  },
})
