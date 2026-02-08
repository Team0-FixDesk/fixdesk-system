const API_BASE = import.meta.env.VITE_API_BASE

export const login = async (username, password) => {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_name: username,
      password: password,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'LOGIN_FAILED')
  }

  return data
}
