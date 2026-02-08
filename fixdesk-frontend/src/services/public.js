import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE

export const searchRepair = async (keyword, page, limit) => {
  const response = await axios.get(`${API_BASE}/public/search`, {
    params: {
      keyword,
      page,
      limit,
    },
  })

  return response.data
}
