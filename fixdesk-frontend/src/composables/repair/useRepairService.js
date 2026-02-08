import { decodeJwt } from '@/utils/jwt.util'

export function useRepairService(API_BASE_URL) {
  async function fetchRepairDetail(repairCode) {
    const response = await fetch(`${API_BASE_URL}/repair-requests/${repairCode}`)
    if (!response.ok) {
      throw new Error('โหลดข้อมูลใบแจ้งซ่อมไม่สำเร็จ')
    }

    return await response.json()
  }

  async function updateRepair({ repairCode, repairFormData, uploadedFileList, existingFileList }) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    if (!token) {
      throw new Error('Token not found')
    }

    const userPayload = decodeJwt(token)

    const formDataToSend = new FormData()

    formDataToSend.append('us_id', userPayload.us_id)
    formDataToSend.append('phone_number', repairFormData.phoneNumber)
    formDataToSend.append('repair_type_id', repairFormData.repairType)
    formDataToSend.append('room_id', repairFormData.room)
    formDataToSend.append('asset_code', repairFormData.assetCode || '')
    formDataToSend.append('problem_detail', repairFormData.problemDetail)
    formDataToSend.append('issue_description', repairFormData.issueDescription)
    formDataToSend.append('urgency', repairFormData.urgency || 'medium')
    formDataToSend.append('existing_files', JSON.stringify(existingFileList || []))

    uploadedFileList.forEach((file) => {
      formDataToSend.append('files', file)
    })

    const response = await fetch(`${API_BASE_URL}/repair-requests-with-files/${repairCode}`, {
      method: 'PUT',
      body: formDataToSend,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'บันทึกข้อมูลไม่สำเร็จ')
    }

    return data
  }

  async function createRepair({ repairFormData, uploadedFileList }) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    if (!token) throw new Error('Token not found')

    const userPayload = decodeJwt(token)

    let response

    if (uploadedFileList.length > 0) {
      const formDataToSend = new FormData()

      formDataToSend.append('us_id', userPayload.us_id)
      formDataToSend.append('phone_number', repairFormData.phoneNumber)
      formDataToSend.append('repair_type_id', repairFormData.repairType)
      formDataToSend.append('room_id', repairFormData.room)
      formDataToSend.append('asset_code', repairFormData.assetCode || '')
      formDataToSend.append('problem_detail', repairFormData.problemDetail)
      formDataToSend.append('issue_description', repairFormData.issueDescription)
      formDataToSend.append('urgency', repairFormData.urgency || 'medium')

      uploadedFileList.forEach((file) => {
        formDataToSend.append('files', file)
      })

      response = await fetch(`${API_BASE_URL}/repair-requests-with-files`, {
        method: 'POST',
        body: formDataToSend,
      })
    } else {
      const bodyData = {
        us_id: userPayload.us_id,
        phone_number: repairFormData.phoneNumber,
        repair_type_id: repairFormData.repairType,
        room_id: repairFormData.room,
        asset_code: repairFormData.assetCode || null,
        problem_detail: repairFormData.problemDetail,
        issue_description: repairFormData.issueDescription,
        urgency: repairFormData.urgency || 'medium',
      }

      response = await fetch(`${API_BASE_URL}/repair-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      })
    }

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'สร้างใบแจ้งซ่อมไม่สำเร็จ')
    }

    return data
  }

  return {
    fetchRepairDetail,
    updateRepair,
    createRepair,
  }
}
