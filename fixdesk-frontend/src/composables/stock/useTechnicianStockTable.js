import { computed } from 'vue'

export function useTechnicianStockTable(stockForms, router) {
  const stockTableRows = computed(() => {
    return stockForms.value.slice(0, 5).map((form) => {
      const items = form.items ? form.items.split('\n') : []

      return [
        form.sf_code,
        {
          date: new Date(form.sf_create_at).toLocaleString('th-TH', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          location: form.building_name || '-',
          rf_code: form.rf_code,
        },
        items,
        form.sf_status,
        '',
      ]
    })
  })

  function truncateItem(text, maxWords = 5) {
    if (!text) return ''

    const [name] = text.split(' x')
    const words = name.split(' ')

    return words.length > maxWords ? words.slice(0, maxWords).join(' ') + '...' : name
  }

  function extractQuantity(item) {
    if (!item) return 1

    const match = item.match(/x\s*(\d+)/i)
    return match ? Number(match[1]) : 1
  }

  function openDetail(rfCode) {
    if (!rfCode) return
    router.push(`/main/repair-detail/${rfCode}`)
  }

  return {
    stockTableRows,
    truncateItem,
    extractQuantity,
    openDetail,
  }
}
