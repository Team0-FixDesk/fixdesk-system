import { ref, computed } from 'vue'
import { useAuthToken } from '@/composables/useAuthToken'
import { createRepairDescriptionHtml } from '@/utils/repairRow.util'

const API_BASE = import.meta.env.VITE_API_BASE

// useMyRepairs: centralize load/delete/filter logic for "My repairs" list
export function useMyRepairs() {
  const { token, userId, isAuthenticated, logout } = useAuthToken()

  // data
  const tableRows = ref([])
  const isLoading = ref(false)
  const errorMessage = ref(null)

  // filters (kept here so UI can bind directly)
  const search = ref('')
  const selectedStatuses = ref([])
  const selectedUrgencies = ref([])
  const selectedDate = ref('')

  async function loadMyRepairs() {
    if (!isAuthenticated.value) {
      logout()
      return
    }

    isLoading.value = true
    errorMessage.value = null

    try {
      const res = await fetch(`${API_BASE}/my-repairs/${userId.value}`, {
        headers: { Authorization: `Bearer ${token.value}` },
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'LOAD_FAILED')

      // normalize row shape for TableComponent
      tableRows.value = data.map((repair) => ({
        row: [
          repair.rf_code,
          repair.tt_name,
          createRepairDescriptionHtml(repair),
          repair.rf_urgency,
          repair.rf_user_status,
          '',
        ],
        createdDate: repair.rf_create_at,
      }))
    } catch (err) {
      errorMessage.value = err.message || String(err)
      console.error('useMyRepairs.loadMyRepairs:', err)
    } finally {
      isLoading.value = false
    }
  }

  // delete a repair and update local rows
  async function deleteRepair(repairCode) {
    if (!isAuthenticated.value) {
      logout()
      return { ok: false, message: 'NOT_AUTHENTICATED' }
    }

    try {
      const res = await fetch(`${API_BASE}/my-repairs/${repairCode}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
        },
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'DELETE_FAILED')

      tableRows.value = tableRows.value.filter((row) => row[0] !== repairCode)
      return { ok: true }
    } catch (err) {
      console.error('useMyRepairs.deleteRepair:', err)
      return { ok: false, message: err.message || String(err) }
    }
  }

  function resetFilters() {
    search.value = ''
    selectedStatuses.value = []
    selectedUrgencies.value = []
    selectedDate.value = ''
  }

  const filteredRows = computed(() => {
    const q = String(search.value || '').toLowerCase()

    return tableRows.value
      .filter((item) => {
        const row = item.row

        const code = String(row[0] || '').toLowerCase()
        const type = String(row[1] || '').toLowerCase()
        const location = String(row[2] || '').toLowerCase()
        const urgency = row[3]
        const status = row[4]

        const matchesSearch = code.includes(q) || type.includes(q) || location.includes(q)

        const matchesUrgency =
          selectedUrgencies.value.length === 0 || selectedUrgencies.value.includes(urgency)

        const matchesStatus =
          selectedStatuses.value.length === 0 || selectedStatuses.value.includes(status)

        const matchesDate =
          !selectedDate.value || toLocalYmd(item.createdDate) === selectedDate.value

        return matchesSearch && matchesUrgency && matchesStatus && matchesDate
      })
      .map((item) => item.row) // สำคัญมาก
  })

  function toLocalYmd(date) {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return ''

    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')

    return `${y}-${m}-${day}`
  }

  return {
    tableRows,
    isLoading,
    errorMessage,
    // filters
    search,
    selectedStatuses,
    selectedUrgencies,
    selectedDate,
    // actions
    loadMyRepairs,
    deleteRepair,
    resetFilters,
    filteredRows,
  }
}
