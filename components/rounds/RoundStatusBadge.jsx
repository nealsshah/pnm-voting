export default function RoundStatusBadge({ status }) {
  const getStatusColor = () => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'open':
        return 'Open'
      case 'closed':
        return 'Closed'
      case 'pending':
        return 'Pending'
      default:
        return 'Unknown'
    }
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusColor()}`}
    >
      {getStatusText()}
    </span>
  )
} 