import axios from 'axios'
import { useAuth } from '../store/auth'

const api = axios.create({
  baseURL: 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
