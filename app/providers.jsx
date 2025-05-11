'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RoundStatusProvider } from '@/contexts/RoundStatusContext'
import TopLoadingBar from '@/components/layout/TopLoadingBar'

export default function Providers({ children }) {
  const queryClient = new QueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <RoundStatusProvider>
        <TopLoadingBar />
        {children}
      </RoundStatusProvider>
    </QueryClientProvider>
  )
} 