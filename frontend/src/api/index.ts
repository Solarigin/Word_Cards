import api from './client'

export const login = async (username: string, password: string) => {
  const res = await api.post('/auth/login', { username, password })
  return res.data
}

export const register = async (username: string, password: string) => {
  const res = await api.post('/auth/register', { username, password })
  return res.data
}

export const fetchToday = async () => {
  const res = await api.get('/words/today')
  return res.data
}

export const reviewWord = async (id: number, quality: number) => {
  const res = await api.post(`/review/${id}`, { quality })
  return res.data
}

export const searchWord = async (q: string) => {
  const res = await api.get('/search', { params: { q } })
  return res.data
}

export const statsOverview = async () => {
  const res = await api.get('/stats/overview')
  return res.data
}
