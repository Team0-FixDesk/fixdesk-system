export const getStockForms = async (token, userId) => {
  const API_BASE = import.meta.env.VITE_API_BASE

  let res = await fetch(`${API_BASE}/stock-forms/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok && res.status === 404) {
    res = await fetch(`${API_BASE}/stock-forms`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  if (!res.ok) throw new Error('Fetch stock failed')

  return res.json()
}
