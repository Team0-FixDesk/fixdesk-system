import { ref } from 'vue'
import { useAuthToken } from '@/composables/useAuthToken'

// Composable: ดึงและเก็บข้อมูลโปรไฟล์ผู้ใช้
// คืนค่า state ที่หน้า UI ต้องการ (ชื่อ, หน่วยงาน, loading, error)
export function useUserProfile() {
  // [Standard] ค่าคงที่ใช้ตัวพิมพ์ใหญ่ (UPPER_SNAKE_CASE)
  const API_BASE_URL = import.meta.env.VITE_API_BASE

  // ดึงค่า Token และ UserId จาก Composable อื่น
  // (เปลี่ยนชื่อตัวแปรให้ชัดเจนขึ้น เพื่อใช้ในไฟล์นี้)
  const { token: userAuthenticationToken, userId: currentUserId } = useAuthToken()

  const userDisplayName = ref('ผู้ใช้งาน') // ชื่อที่จะแสดงบนหน้าจอ
  const userDepartmentName = ref('หน่วยงาน') // ชื่อหน่วยงาน
  const userRoleName = ref('') // ชื่อบทบาท
  const isProfileLoading = ref(false) // สถานะ "กำลังโหลด" (True/False)
  const fetchProfileError = ref(null) // เก็บข้อความ Error (ถ้ามี)

  // ฟังก์ชันดึงข้อมูลผู้ใช้จาก Server
  const fetchUserProfileData = async () => {
    // 1. ตรวจสอบก่อนว่ามี "กุญแจ (Token)" และ "รหัสประจำตัว (ID)" หรือยัง?
    // ถ้าไม่มีอย่างใดอย่างหนึ่ง ให้จบการทำงานทันที (ไม่ต้องเสียเวลายิง API)
    if (!userAuthenticationToken.value || !currentUserId.value) {
      return
    }

    // 2. เริ่มกระบวนการโหลด: เปิดสถานะ Loading และล้าง Error เก่าทิ้ง
    isProfileLoading.value = true
    fetchProfileError.value = null

    try {
      // 3. ยิง Request ไปขอข้อมูลจาก Server
      const apiResponse = await fetch(`${API_BASE_URL}/users/${currentUserId.value}`, {
        headers: {
          Authorization: `Bearer ${userAuthenticationToken.value}`,
        },
      })

      // ถ้า Server ตอบกลับมาว่ามีปัญหา (เช่น ไม่เจอ user นี้)
      if (!apiResponse.ok) {
        throw new Error('Fetch user failed')
      }

      // 4. แปลงข้อมูลที่ได้มาเป็น Object
      const userData = await apiResponse.json()

      // 5. อัปเดตข้อมูลลงในตัวแปร State (เพื่อแสดงผลที่หน้าจอ)
      if (userData.us_first_name_th) {
        // เอาชื่อจริง + นามสกุล มาต่อกัน (ใช้ trim() ตัดช่องว่างหัวท้ายออก)
        userDisplayName.value = `${userData.us_first_name_th} ${userData.us_last_name_th || ''}`.trim()
        // อัปเดตชื่อหน่วยงาน
        userDepartmentName.value = userData.us_department
        // อัปเดตบทบาท
        userRoleName.value = userData.role_name || ''
      }
    } catch (errorObject) {
      // กรณีเกิดข้อผิดพลาด (เน็ตหลุด, Server พัง)
      console.error('โหลดข้อมูลผู้ใช้ไม่สำเร็จ:', errorObject)
      fetchProfileError.value = errorObject.message || 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้'
    } finally {
      // [Standard] ไม่ว่าจะสำเร็จหรือล้มเหลว ต้องปิดสถานะ Loading เสมอ
      isProfileLoading.value = false
    }
  }

  // ส่งตัวแปรและฟังก์ชันออกไปให้ Component ใช้งาน
  return {
    userDisplayName, // ชื่อผู้ใช้
    userDepartmentName, // หน่วยงาน
    userRoleName, // บทบาท
    isProfileLoading, // สถานะโหลด
    fetchProfileError, // ข้อความ error
    fetchUserProfileData, // ฟังก์ชันสั่งโหลดข้อมูล
  }
}
