import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { api } from './api'

// Show notifications while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

// Request permission, fetch the Expo push token, and store it on the user's
// profile. Best-effort: any failure (e.g. no projectId configured, denied
// permission, simulator) is logged and swallowed so it never blocks login.
export async function registerForPushNotifications() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return null

    const { data: token } = await Notifications.getExpoPushTokenAsync()
    if (token) {
      await api.patch('/api/rider/push-token', { expo_push_token: token })
    }
    return token
  } catch (err) {
    console.warn('Push registration failed:', err?.message || err)
    return null
  }
}
