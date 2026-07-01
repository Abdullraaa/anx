import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { formatNaira, statusColors, statusLabel } from '../lib/format'

function StatusBadge({ status }) {
  const colors = statusColors[status] || statusColors.pending
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{statusLabel(status)}</Text>
    </View>
  )
}

function JobCard({ job, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.customer}>{job.customer_name}</Text>
        <StatusBadge status={job.status} />
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Pickup</Text>
        <Text style={styles.rowValue}>{job.pickup_address}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Dropoff</Text>
        <Text style={styles.rowValue}>{job.dropoff_address}</Text>
      </View>
      {job.package_description ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Package</Text>
          <Text style={styles.rowValue}>{job.package_description}</Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.fee}>{formatNaira(job.delivery_fee)}</Text>
        <Text style={styles.payment}>{job.payment_method}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function JobsScreen({ onOpenJob }) {
  const { user, logout } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await api.get('/api/rider/jobs')
      setJobs(res.data.jobs)
    } catch (err) {
      setError('Failed to load jobs')
    }
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>Active jobs</Text>
          {user && <Text style={styles.subtitle}>Signed in as {user.name}</Text>}
        </View>
        <TouchableOpacity onPress={logout} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={jobs.length === 0 ? styles.emptyContainer : styles.listContainer}
          renderItem={({ item }) => <JobCard job={item} onPress={() => onOpenJob(item)} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{error || 'No active jobs'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  flex: { flex: 1 },
  title: { fontSize: 18, fontWeight: '600', color: '#111827' },
  subtitle: { marginTop: 2, fontSize: 13, color: '#6b7280' },
  signOut: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  signOutText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText: { color: '#6b7280', fontSize: 15 },
  listContainer: { padding: 16, gap: 12 },
  emptyContainer: { flexGrow: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  customer: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  row: { flexDirection: 'row', marginBottom: 6 },
  rowLabel: { width: 64, fontSize: 13, color: '#6b7280' },
  rowValue: { flex: 1, fontSize: 14, color: '#374151' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  fee: { fontSize: 16, fontWeight: '600', color: '#111827' },
  payment: { fontSize: 13, color: '#6b7280', textTransform: 'capitalize' },
})
