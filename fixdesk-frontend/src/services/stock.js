const API_BASE_URL = import.meta.env.VITE_API_BASE

// ช่วยลดโค้ดซ้ำ เวลาต้องใส่ Token ในหลายๆ ฟังก์ชัน
const createAuthHeaders = (userAuthenticationToken) => ({
  Authorization: `Bearer ${userAuthenticationToken}`,
})

// 1. ฟังก์ชันดึงใบเบิกสินค้า (มีระบบสำรองถ้าไม่เจอ)
export async function getStockForms(userAuthenticationToken, targetUserId) {
  // ลองดึงใบเบิกของ User คนนี้ก่อน
  let apiResponse = await fetch(`${API_BASE_URL}/stock-forms/${targetUserId}`, {
    headers: createAuthHeaders(userAuthenticationToken),
  })

  // ถ้าเซิร์ฟเวอร์บอกว่าไม่พบข้อมูลของคนนี้ (404) ให้เปลี่ยนไปดึง "ใบเบิกทั้งหมด" มาแสดงแทน
  if (!apiResponse.ok && apiResponse.status === 404) {
    apiResponse = await fetch(`${API_BASE_URL}/stock-forms`, {
      headers: createAuthHeaders(userAuthenticationToken),
    })
  }

  // ถ้าสุดท้ายยังดึงไม่ได้ (Error) ให้แจ้งเตือน
  if (!apiResponse.ok) {
    throw new Error('Fetch stock failed')
  }

  return apiResponse.json()
}

// 2. ฟังก์ชันดึงรายการสินค้าทั้งหมดในสต็อก
export async function getAllProductList(userAuthenticationToken) {
  // ดึงข้อมูลสินค้าทั้งหมด โดยแนบ Token ยืนยันตัวตนไปด้วย
  const apiResponse = await fetch(`${API_BASE_URL}/show-stock`, {
    headers: createAuthHeaders(userAuthenticationToken),
  })

  if (!apiResponse.ok) {
    throw new Error('Fetch products failed')
  }

  return apiResponse.json()
}

// 3. ฟังก์ชันดึงใบเบิกสินค้าทั้งหมด (แบบเจาะจง)
export async function getAllStockFormList(userAuthenticationToken) {
  // ดึงข้อมูลใบเบิกทั้งหมดทันที
  const apiResponse = await fetch(`${API_BASE_URL}/stock-forms`, {
    headers: createAuthHeaders(userAuthenticationToken),
  })

  if (!apiResponse.ok) {
    throw new Error('Fetch stock forms failed')
  }

  return apiResponse.json()
}
