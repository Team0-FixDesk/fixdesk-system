/**
 * =====================================================================
 * @file            useRepairFormValidation.js
 * @layer           Composable (Form Validation Layer)
 * @version         1.0.0
 * @since           2026-02-09
 * @author          พชร ไพศรีสกุล
 * @contributors
 * @lastModified    2026-02-20
 * @lastModifiedBy  ปฏิพัทธ์ จงนันทพันธ์กุล
 * ---------------------------------------------------------------------
 * @description
 *  Composable สำหรับตรวจสอบความถูกต้องของฟอร์มสร้าง/แก้ไขใบแจ้งซ่อม
 *   - ตรวจสอบข้อมูลทั้งฟอร์มก่อนส่งบันทึก (validateFormData)
 *   - ตรวจสอบเฉพาะฟิลด์เมื่อมีการเปลี่ยนแปลง (validateField)
 *   - จัดการข้อความ Error ของแต่ละฟิลด์ผ่าน errorData
 *   - รีเซ็ตข้อความ Error ทั้งหมด (resetErrors)
 *
 *  ฟิลด์ที่ตรวจสอบ:
 *   - repairType
 *   - building
 *   - floor
 *   - room
 *   - problemDetail
 *   - issueDescription
 *
 * @requires
 *   - vue (ref)
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - แก้ไขข้อความแจ้งเตือน  [2026-02-20, ปฏิพัทธ์ จงนันทพันธ์กุล]
 * =====================================================================
 */

import { ref } from 'vue'
// Composable สำหรับตรวจสอบความถูกต้องของฟอร์มสร้าง/แก้ไขใบแจ้งซ่อม
// คืนค่า: errorData, validateFormData, validateField, resetErrors
export function useRepairFormValidation(repairFormData) {
  const errorData = ref({
    repairType: '',
    building: '',
    floor: '',
    room: '',
    problemDetail: '',
    issueDescription: '',
    urgency: '',
  })

  /* ================= Validate All ================= */

  function validateFormData() {
    let isValid = true

    resetErrors()

    if (!repairFormData.value.repairType) {
      errorData.value.repairType = 'กรุณาเลือกประเภทงานซ่อม'
      isValid = false
    }

    if (!repairFormData.value.building) {
      errorData.value.building = 'กรุณาเลือกอาคาร'
      isValid = false
    }

    if (!repairFormData.value.floor) {
      errorData.value.floor = 'กรุณาเลือกชั้น'
      isValid = false
    }

    if (!repairFormData.value.room) {
      errorData.value.room = 'กรุณาเลือกห้อง'
      isValid = false
    }

    if (!repairFormData.value.problemDetail?.trim()) {
      errorData.value.problemDetail = 'กรุณากรอกปัญหา หรือเหตุที่ต้องการแจ้ง'
      isValid = false
    }

    if (!repairFormData.value.issueDescription?.trim()) {
      errorData.value.issueDescription = 'กรุณากรอกสาเหตุ/อาการเสีย'
      isValid = false
    }

    return isValid
  }

  /* ================= Validate Single Field ================= */

  function validateField(fieldName) {
    switch (fieldName) {
      case 'repairType':
        errorData.value.repairType = repairFormData.value.repairType
          ? ''
          : 'กรุณาเลือกประเภทงานซ่อม'
        break

      case 'building':
        errorData.value.building = repairFormData.value.building ? '' : 'กรุณาเลือกอาคาร'
        break

      case 'floor':
        errorData.value.floor = repairFormData.value.floor ? '' : 'กรุณาเลือกชั้น'
        break

      case 'room':
        errorData.value.room = repairFormData.value.room ? '' : 'กรุณาเลือกห้อง'
        break

      case 'problemDetail':
        errorData.value.problemDetail = repairFormData.value.problemDetail?.trim()
          ? ''
          : 'กรุณากรอกหัวข้อปัญหา'
        break

      case 'issueDescription':
        errorData.value.issueDescription = repairFormData.value.issueDescription?.trim()
          ? ''
          : 'กรุณากรอกสาเหตุ/อาการเสีย'
        break
    }
  }

  /* ================= Helper ================= */

  function resetErrors() {
    Object.keys(errorData.value).forEach((key) => {
      errorData.value[key] = ''
    })
  }

  return {
    errorData,
    validateFormData,
    validateField,
    resetErrors,
  }
}
