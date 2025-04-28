'use client'

import { Badge } from '@/components/ui/badge'

export default function SimpleRoundStatusBadge({ status }) {
  const getVariant = () => {
    switch (status) {
      case 'open':
        return 'default' // primary color
      case 'closed':
        return 'secondary'
      case 'pending':
        return 'outline'
      default:
        return 'outline'
    }
  }

  return (
    <Badge variant={getVariant()}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
} 