'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RoundStatusProvider } from '@/contexts/RoundStatusContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import TopLoadingBar from '@/components/layout/TopLoadingBar'

export default function Providers({ children }) {
  const queryClient = new QueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RoundStatusProvider>
          <TopLoadingBar />
          {children}
        </RoundStatusProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
} 