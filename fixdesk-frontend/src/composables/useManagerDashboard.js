// Small composable to fetch manager dashboard data (repairs + technician types)
export function useManagerDashboard() {
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  }

  async function fetchDashboardData(apiBase) {
    const repairsRes = await fetch(`${apiBase}/admin/repairs`, { headers: getAuthHeaders() })
    if (!repairsRes.ok) throw new Error('Failed to fetch repair data')
    const repairs = await repairsRes.json()

    const techRes = await fetch(`${apiBase}/technician-types`)
    if (!techRes.ok) throw new Error('Failed to fetch technician types')
    const techTypes = await techRes.json()

    return { repairs, techTypes }
  }

  return { fetchDashboardData }
}
