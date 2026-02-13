// Composable สำหรับจัดการรูปแบบเบอร์โทร: แปลงเป็นตัวเลข, ตัดความยาว, และแมสก์สำหรับแสดง
// คืนค่า: toRaw, toDisplay, maskInput
export function usePhoneNumberFormatter() {
  // ดึงเฉพาะตัวเลข
  function normalize(value) {
    return value.replace(/\D/g, '')
  }

  // จำกัดความยาวเบอร์โทรไม่เกิน 10 หลัก
  function clamp(digits) {
    return digits.slice(0, 10)
  }

  function toRaw(value) {
    if (!value) return ''
    return clamp(normalize(value))
  }

  function toDisplay(value) {
    const digits = toRaw(value)
    if (!digits) return ''

    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`

    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  // ใช้กับ @input ของ field: แปลงค่าใน ref ให้เป็นรูปแบบแสดง
  function maskInput(refValue) {
    const raw = normalize(refValue.value)
    const clamped = clamp(raw)
    refValue.value = toDisplay(clamped)
  }

  return {
    toRaw,
    toDisplay,
    maskInput,
  }
}
