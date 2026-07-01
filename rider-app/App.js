import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from './app/hooks/useAuth'
import LoginScreen from './app/screens/LoginScreen'
import JobsScreen from './app/screens/JobsScreen'
import JobDetailScreen from './app/screens/JobDetailScreen'

function Root() {
  const { session, loading } = useAuth()
  // Lightweight navigation: the currently open job (null = jobs list).
  const [activeJob, setActiveJob] = useState(null)

  // Drop any open job when the session ends (logout).
  useEffect(() => {
    if (!session) setActiveJob(null)
  }, [session])

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!session) return <LoginScreen />

  if (activeJob) {
    return <JobDetailScreen job={activeJob} onBack={() => setActiveJob(null)} />
  }

  return <JobsScreen onOpenJob={setActiveJob} />
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
      <StatusBar style="auto" />
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },
})
