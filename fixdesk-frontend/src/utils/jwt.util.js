// ฟังก์ชันสำหรับถอดรหัส Token (เพื่อดูข้อมูลข้างใน เช่น ชื่อใคร, หมดอายุเมื่อไหร่)
export function decodeJwtToken(encodedJwtToken) {
  try {
    // 1. Token เหมือนขนมชั้น มี 3 ชั้นคั่นด้วยจุด (.) เราจะดึงเอาชั้นกลาง (Payload) มาใช้
    const payloadPart = encodedJwtToken.split('.')[1]

    // 2. แปลงตัวอักษรที่ URL ไม่ชอบ (-, _) ให้กลับเป็นตัวมาตรฐาน (+, /) ก่อน
    const standardBase64String = payloadPart.replace(/-/g, '+').replace(/_/g, '/')

    // 3. เริ่มกระบวนการแปลรหัส (Base64) ให้เป็นข้อความปกติ
    // [Logic] ตรงนี้เป็นสูตรแปลงภาษาต่างดาวให้รองรับภาษาไทย (UTF-8)
    const decodedUriString = atob(standardBase64String)
      .split('')
      .map((character) => {
        return '%' + ('00' + character.charCodeAt(0).toString(16)).slice(-2)
      })
      .join('')

    // 4. แปลงข้อความที่ได้ ให้กลายเป็นข้อมูล (Object) ที่พร้อมใช้งาน
    const decodedJsonData = decodeURIComponent(decodedUriString)

    return JSON.parse(decodedJsonData)

  } catch (error) {
    console.error('ไม่สามารถ decode token ได้:', error)
    return {}
  }
}
