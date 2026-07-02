import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { formatNaira, statusColors, statusLabel } from '../lib/format'

const PHOTO_BUCKET = 'delivery-photos'

// Decode a base64 string to a byte array for Supabase Storage upload.
// (atob is available in Hermes; avoids pulling in an extra dependency.)
function base64ToBytes(base64) {
  const binary = global.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

export default function JobDetailScreen({ job: initialJob, onBack }) {
  const [job, setJob] = useState(initialJob)
  const [busy, setBusy] = useState(false)
  const [failModalVisible, setFailModalVisible] = useState(false)
  const [failureReason, setFailureReason] = useState('')

  const colors = statusColors[job.status] || statusColors.pending

  const openInMaps = (address) => {
    const query = encodeURIComponent(address)
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch((err) => {
      console.error(err)
      Alert.alert('Unable to open Maps')
    })
  }

  const patchStatus = async (body) => {
    const res = await api.patch(`/api/jobs/${job.id}/status`, body)
    setJob(res.data.job)
  }

  const markPickedUp = async () => {
    setBusy(true)
    try {
      await patchStatus({ status: 'picked_up' })
    } catch (err) {
      console.error(err)
      Alert.alert('Error', 'Could not update the job status. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const markDelivered = async () => {
    setBusy(true)
    try {
      // 1. Capture a delivery photo.
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Camera permission required', 'Allow camera access to mark as delivered.')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        base64: true,
      })
      if (result.canceled) return

      const asset = result.assets[0]

      // 2. Upload to Supabase Storage.
      const path = `${job.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, base64ToBytes(asset.base64), {
          contentType: 'image/jpeg',
        })
      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)

      // 3. Mark delivered with the photo URL.
      await patchStatus({ status: 'delivered', delivery_photo_url: publicData.publicUrl })
    } catch (err) {
      console.error(err)
      Alert.alert('Error', 'Could not mark this job as delivered. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const submitFailure = async () => {
    if (!failureReason.trim()) return
    setBusy(true)
    try {
      await patchStatus({ status: 'failed', failure_reason: failureReason.trim() })
      setFailModalVisible(false)
      setFailureReason('')
    } catch (err) {
      console.error(err)
      Alert.alert('Error', 'Could not update the job status. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const confirmCash = async () => {
    setBusy(true)
    try {
      const res = await api.patch(`/api/jobs/${job.id}/payment`, { payment_status: 'confirmed' })
      setJob(res.data.job)
    } catch (err) {
      console.error(err)
      Alert.alert('Error', 'Could not confirm payment. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const showCashButton =
    job.status === 'delivered' &&
    job.payment_method === 'cash' &&
    job.payment_status === 'pending'

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.back} disabled={busy}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{statusLabel(job.status)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.customer}>{job.customer_name}</Text>
        <Text style={styles.phone}>{job.customer_phone}</Text>

        <View style={styles.section}>
          <InfoRow label="Pickup address" value={job.pickup_address} />
          <InfoRow label="Dropoff address" value={job.dropoff_address} />
          <InfoRow label="Package" value={job.package_description} />
          <InfoRow label="Delivery fee" value={formatNaira(job.delivery_fee)} />
          <InfoRow label="Payment" value={job.payment_method} />
          <InfoRow label="Payment status" value={statusLabel(job.payment_status)} />
        </View>

        <View style={styles.mapsRow}>
          <TouchableOpacity
            style={[styles.mapButton, styles.flex]}
            onPress={() => openInMaps(job.pickup_address)}
          >
            <Text style={styles.mapButtonText}>Open Pickup in Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapButton, styles.flex]}
            onPress={() => openInMaps(job.dropoff_address)}
          >
            <Text style={styles.mapButtonText}>Open Dropoff in Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Status actions */}
        <View style={styles.actions}>
          {job.status === 'assigned' && (
            <TouchableOpacity
              style={[styles.primaryButton, busy && styles.disabled]}
              onPress={markPickedUp}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Mark as Picked Up</Text>
              )}
            </TouchableOpacity>
          )}

          {job.status === 'picked_up' && (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, busy && styles.disabled]}
                onPress={markDelivered}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Mark as Delivered</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dangerButton, busy && styles.disabled]}
                onPress={() => setFailModalVisible(true)}
                disabled={busy}
              >
                <Text style={styles.dangerButtonText}>Failed Delivery</Text>
              </TouchableOpacity>
            </>
          )}

          {showCashButton && (
            <TouchableOpacity
              style={[styles.primaryButton, busy && styles.disabled]}
              onPress={confirmCash}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Confirm Cash Collected</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Failure reason modal */}
      <Modal
        visible={failModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Failed delivery</Text>
            <Text style={styles.modalSubtitle}>Tell us why this delivery failed.</Text>
            <TextInput
              value={failureReason}
              onChangeText={setFailureReason}
              placeholder="Reason"
              multiline
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setFailModalVisible(false)}
                disabled={busy}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (!failureReason.trim() || busy) && styles.disabled]}
                onPress={submitFailure}
                disabled={!failureReason.trim() || busy}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  back: { paddingVertical: 4, paddingRight: 8 },
  backText: { fontSize: 16, color: '#2563eb', fontWeight: '500' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  body: { padding: 16 },
  customer: { fontSize: 22, fontWeight: '700', color: '#111827' },
  phone: { marginTop: 2, fontSize: 15, color: '#6b7280' },
  section: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  infoRow: { marginBottom: 12 },
  infoLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#111827', textTransform: 'capitalize' },
  mapsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  flex: { flex: 1 },
  mapButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  mapButtonText: { color: '#2563eb', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  actions: { marginTop: 24, gap: 12 },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  dangerButtonText: { color: '#dc2626', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  modalSubtitle: { marginTop: 4, fontSize: 14, color: '#6b7280' },
  modalInput: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: '#374151', fontSize: 15, fontWeight: '500' },
  modalConfirm: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
