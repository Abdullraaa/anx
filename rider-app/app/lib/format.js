export const formatNaira = (amount) =>
  amount == null
    ? '—'
    : new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }).format(amount)

export const statusLabel = (status) => (status ? status.replace('_', ' ') : '')

// Background / text colours for each job status badge.
export const statusColors = {
  pending: { bg: '#fef9c3', text: '#854d0e' },
  assigned: { bg: '#dbeafe', text: '#1e40af' },
  picked_up: { bg: '#ffedd5', text: '#9a3412' },
  delivered: { bg: '#dcfce7', text: '#166534' },
  failed: { bg: '#fee2e2', text: '#991b1b' },
  cancelled: { bg: '#e5e7eb', text: '#374151' },
}
