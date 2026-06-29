import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE

// ตั้งชื่อแบบ Verb + Noun (กริยา + นาม) ให้รู้ว่าทำอะไร
export async function searchRepairList(searchKeyword, pageNumber, itemsPerPage) {
  // ดึงข้อมูลรายการแจ้งซ่อมจากเซิร์ฟเวอร์ตามคำค้นหาและหน้าปัจจุบัน
  const apiResponse = await axios.get(`${API_BASE_URL}/public/search`, {
    params: {
      keyword: searchKeyword, // คำค้นหา
      page: pageNumber, // เลขหน้า
      limit: itemsPerPage, // จำนวนรายการต่อหน้า
    },
  })

  // ส่งข้อมูลที่ได้กลับไป
  return apiResponse.data
}
