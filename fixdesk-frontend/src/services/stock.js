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

const API_BASE = import.meta.env.VITE_API_BASE

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
})

export const getAllProducts = async (token) => {
  const res = await fetch(`${API_BASE}/show-stock`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Fetch products failed')
  return res.json()
}

export const getAllStockForms = async (token) => {
  const res = await fetch(`${API_BASE}/stock-forms`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error('Fetch stock forms failed')
  return res.json()
}