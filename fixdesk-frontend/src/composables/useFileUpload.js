import { ref } from 'vue'
import Swal from 'sweetalert2'

// Composable สำหรับการจัดการการอัปโหลดไฟล์ (drag & drop + preview)
// รับไฟล์, ตรวจความถูกต้อง, เก็บ preview และลบไฟล์
export function useFileUpload(API_BASE_URL, options = {}) {
  const MAX_FILE_COUNT = options.maxCount ?? 5
  const MAX_FILE_SIZE = options.maxSize ?? 50 * 1024 * 1024

  const isDragOver = ref(false)
  const filePreviewList = ref([]) // รายการที่ใช้แสดง preview ทั้งจาก client และ server
  const existingFileList = ref([]) // path ที่มีอยู่บน server
  const uploadedFileList = ref([]) // File objects ที่ยังไม่ได้อัปโหลด

  /* ================= Upload Events ================= */

  function onFileUpload(event) {
    const fileList = Array.from(event.target.files)
    processFileList(fileList)
  }

  function onDragOver(event) {
    event.preventDefault()
    isDragOver.value = true
  }

  function onDragLeave(event) {
    event.preventDefault()
    isDragOver.value = false
  }

  function onDrop(event) {
    event.preventDefault()
    isDragOver.value = false
    const fileList = Array.from(event.dataTransfer.files)
    if (fileList.length) processFileList(fileList)
  }

  /* ================= Validation ================= */

  function processFileList(fileList) {
    if (uploadedFileList.value.length + fileList.length > MAX_FILE_COUNT) {
      toast('ไฟล์เกินกำหนด', `อัปโหลดได้สูงสุด ${MAX_FILE_COUNT} ไฟล์`, 'warning')
      return
    }

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4']

    if (fileList.some((f) => !allowed.includes(f.type))) {
      toast('ไฟล์ที่แนบมาไม่รองรับ', `รองรับเฉพาะ JPG PNG MP4`, 'error')
      return
    }

    if (fileList.some((f) => f.size > MAX_FILE_SIZE)) {
      toast('ไฟล์ใหญ่เกินไป', 'ขนาดต้องไม่เกิน 50MB', 'error')
      return
    }

    fileList.forEach((file) => {
      uploadedFileList.value.push(file)

      const reader = new FileReader()
      reader.onload = (e) => {
        filePreviewList.value.push({
          name: file.name,
          size: file.size,
          type: file.type,
          url: e.target.result,
          isImage: file.type.startsWith('image/'),
          isVideo: file.type.startsWith('video/'),
          fromServer: false,
          serverPath: null,
          fileRef: file,
        })
      }
      reader.readAsDataURL(file)
    })
  }

  /* ================= Existing Files ================= */

  function setExistingFiles(pathList = []) {
    existingFileList.value = pathList
    filePreviewList.value = []

    pathList.forEach((path) => {
      const name = path.split('/').pop()
      const isVideo = /\.(mp4|avi|mov|wmv)$/i.test(path)

      filePreviewList.value.push({
        name,
        size: null,
        type: isVideo ? 'video/*' : 'image/*',
        url: `${API_BASE_URL}${path}`,
        isImage: !isVideo,
        isVideo,
        fromServer: true,
        serverPath: path,
        fileRef: null,
      })
    })
  }

  /* ================= Delete ================= */

  function deleteFile(index) {
    const item = filePreviewList.value[index]

    if (item?.fromServer && item.serverPath) {
      const filename = item.serverPath.split('/').pop()
      fetch(`${API_BASE_URL}/delete-file/${filename}`, { method: 'DELETE' })
      existingFileList.value = existingFileList.value.filter((p) => p !== item.serverPath)
    }

    if (!item?.fromServer && item.fileRef) {
      uploadedFileList.value = uploadedFileList.value.filter((f) => f !== item.fileRef)
    }

    filePreviewList.value.splice(index, 1)
  }

  /* ================= Helper ================= */

  function toast(title, text, icon) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      timer: 2500,
      showConfirmButton: false,
      title,
      text,
      icon,
    })
  }

  return {
    isDragOver,
    filePreviewList,
    existingFileList,
    uploadedFileList,

    onFileUpload,
    onDragOver,
    onDragLeave,
    onDrop,
    deleteFile,
    setExistingFiles,
  }
}
