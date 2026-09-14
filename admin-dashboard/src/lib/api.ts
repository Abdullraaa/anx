import axios from 'axios'
import { supabase } from './supabase'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // A deactivated admin keeps a valid session, so the API answers 403.
    // Matched on the message, not the status, to leave requireAdmin's
    // 'Admin access required' to the normal error handling below.
    if (error.response?.data?.error === 'Account deactivated') {
      await supabase.auth.signOut()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
      return Promise.reject(error)
    }
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)
