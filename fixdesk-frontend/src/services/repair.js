const API_BASE = import.meta.env.VITE_API_BASE

export const getRepairStats = async (userId, token) => {
  const res = await fetch(`${API_BASE}/repair-stats/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error('Load stats failed')

  return res.json()
}

export const getMyRepairs = async (userId, token) => {
  const res = await fetch(`${API_BASE}/my-repairs/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.message)

  return data
}

export const getRepairDetail = async (code) => {
  const res = await fetch(`${API_BASE}/repair-requests/${code}`)
  const data = await res.json()

  if (!res.ok) throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ')

  return data
}

export const getAdminRepairs = async (token) => {
  const API_BASE = import.meta.env.VITE_API_BASE

  const res = await fetch(`${API_BASE}/admin/repairs`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const payload = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(payload?.message || 'โหลดข้อมูลล้มเหลว')
  }

  return payload
}

export const getTechnicianRepairs = async (token) => {
  const API_BASE = import.meta.env.VITE_API_BASE

  const res = await fetch(`${API_BASE}/technician/repairs`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error('Fetch failed')

  return res.json()
}

