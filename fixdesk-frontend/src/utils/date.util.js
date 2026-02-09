const THAI_LOCALE_ID = 'th-TH'

// 1. ฟังก์ชันแปลงวันที่เป็นแบบสั้น (เช่น 01/01/2569)
export function formatThaiShortDate(inputDateString) {
  // ถ้าไม่มีข้อมูลส่งมา ให้ขีดละไว้
  if (!inputDateString) return '-'

  // แปลงวันที่เป็นรูปแบบไทย (วัน/เดือน/ปี)
  return new Date(inputDateString).toLocaleDateString(THAI_LOCALE_ID)
}

// 2. ฟังก์ชันดึง "วันที่" ออกจากข้อความยาวๆ (มักใช้ตอนแกะข้อมูลจาก Excel)
export function extractDateFromCellContent(cellContentText) {
  // แปลงข้อมูลเป็นข้อความ แล้วค้นหาคำว่า "วันที่แจ้ง:" ตามด้วยตัวเลขและเครื่องหมาย /
  const regexMatchResult = String(cellContentText).match(/วันที่แจ้ง:\s*([\d/]+)/)

  // ถ้าเจอ ให้ดึงเฉพาะตัววันที่ออกมา ถ้าไม่เจอให้ส่งค่าว่างกลับไป
  return regexMatchResult ? regexMatchResult[1] : null
}

// 3. ฟังก์ชันแสดง "วันที่ + เวลา" แบบละเอียด (เช่น 1 มกราคม 2569 เวลา 12:30)
export function formatThaiDateTime(rawDateValue) {
  // ถ้าไม่มีข้อมูล ให้ส่งค่าว่างกลับไปเลย (ไม่ต้องทำต่อ)
  if (!rawDateValue) return null

  // สร้างตัวแปร Date ก้อนเดียว แล้วใช้ซ้ำ (ประหยัดทรัพยากร)
  const dateObject = new Date(rawDateValue)

  // ส่วนวันที่: ขอแบบ ปี(เลข) เดือน(เต็ม) วัน(เลข)
  const datePart = dateObject.toLocaleDateString(THAI_LOCALE_ID, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // ส่วนเวลา: ขอแบบ ชม:นาที (24 ชั่วโมง ไม่เอา AM/PM)
  const timePart = dateObject.toLocaleTimeString(THAI_LOCALE_ID, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  // เอา วันที่ และ เวลา มาต่อกันด้วยคำว่า "เวลา"
  return `${datePart} เวลา ${timePart}`
}

// 4. ฟังก์ชันแสดงวันที่แบบเต็ม (เช่น 1 มกราคม 2569)
export function formatThaiLongDate(inputDateValue) {
  if (!inputDateValue) return '-'

  // แปลงเป็นวันที่ไทย แบบชื่อเดือนเต็ม
  return new Date(inputDateValue).toLocaleDateString(THAI_LOCALE_ID, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
