
export function usePhoneFormat() {
  /**
   * แปลงเบอร์เป็นตัวเลขล้วน (สำหรับ validate / ส่ง API)
   * เช่น "063-908-8998" → "0639088998"
   */
  function toRaw(value) {
    return value ? value.replace(/\D/g, '').slice(0, 10) : ''
  }

  /**
   * แปลงให้เป็น format แสดงผล 063-908-8998
   * ใช้ตอน fetch มาแสดงบนหน้า หรือเปิด modal/view
   */
  function toDisplay(value) {
    const digits = toRaw(value)
    if (!digits) return ''

    let out = ''
    if (digits.length > 0) out = digits.slice(0, 3)
    if (digits.length > 3) out += '-' + digits.slice(3, 6)
    if (digits.length > 6) out += '-' + digits.slice(6, 10)
    return out
  }

  /**
   * Mask ระหว่างผู้ใช้พิมพ์ใน input
   * ผูกกับ @input ได้เลย
   */
  function maskInput(refValue) {
    const digits = toRaw(refValue.value)

    let out = ''
    if (digits.length > 0) out = digits.slice(0, 3)
    if (digits.length > 3) out += '-' + digits.slice(3, 6)
    if (digits.length > 6) out += '-' + digits.slice(6, 10)

    refValue.value = out // อัปเดตค่าใน input
  }

  return {
    toRaw,
    toDisplay,
    maskInput,
  }
}
