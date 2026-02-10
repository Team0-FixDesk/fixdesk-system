import { computed } from 'vue'
import { createBadgeHtml } from '@/utils/badgeHtml.util'
import { useTruncateText } from '@/composables/useTruncateText.js'

const { truncateSentences } = useTruncateText()

export function useTechnicianRepairTable(repairRequests, router) {
  const sortedRepairs = computed(() => {
    return [...repairRequests.value]
      .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate))
      .slice(0, 5)
  })

  const repairTableRows = computed(() => {
    return sortedRepairs.value.map((r) => [
      r.rf_code,
      truncateSentences(r.rf_problem) || '-',
      r.department_name || '-',
      `${r.building_name || ''} ${r.room_name || ''}`,
      createBadgeHtml(r.urgency, 'urgency'),
      createBadgeHtml(r.status, 'status'),
    ])
  })

  const repairTableRaw = computed(() => {
    return sortedRepairs.value.map((r) => ({
      ticketId: r.rf_code,
    }))
  })

  const onRepairRowClick = (item) => {
    const id = typeof item === 'object' ? item.ticketId : item

    if (!id) return

    router.push({
      path: `/main/repair-detail/${id}`,
      state: { fromTechnician: true },
    })
  }

  return {
    sortedRepairs,
    repairTableRows,
    repairTableRaw,
    onRepairRowClick,
  }
}
