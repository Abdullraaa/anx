// Thin wrapper around the Expo Push API.
// Failures are swallowed and logged — push delivery must never block a request.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export async function sendPushNotification({ to, title, body, data }) {
  if (!to) return

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, title, body, sound: 'default', data }),
    })

    if (!res.ok) {
      console.error(`Expo push failed: ${res.status} ${res.statusText}`)
    }
  } catch (err) {
    console.error('Expo push error:', err)
  }
}
