import axios from 'axios'
import { Alert } from 'react-native'
import { supabase } from './supabase'

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
})

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// A rider deactivated mid-session keeps a valid token, so the backend answers
// 403 instead. Sign out so Root falls back to LoginScreen, and say why.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.data?.error === 'Account deactivated') {
      Alert.alert(
        'Account deactivated',
        'Your account has been deactivated. Contact your administrator.',
      )
      await supabase.auth.signOut()
    }
    return Promise.reject(error)
  },
)
