'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useQueryClient } from '@tanstack/react-query'
import type { Database } from '@/lib/database.types'

type Round = Database['public']['Tables']['rounds']['Row']

interface RoundStatusContextType {
  currentRound: Round | null
  isLoadingRound: boolean
  roundChanged: boolean
  error: Error | null
}

interface RoundStatusProviderProps {
  children: ReactNode
}

// Create the context with default values
const RoundStatusContext = createContext<RoundStatusContextType>({
  currentRound: null,
  isLoadingRound: true,
  roundChanged: false,
  error: null,
})

export function RoundStatusProvider({ children }: RoundStatusProviderProps) {
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [isLoadingRound, setIsLoadingRound] = useState(true)
  const [roundChanged, setRoundChanged] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClientComponentClient<Database>()
  const queryClient = useQueryClient()
  
  // Function to fetch the current round
  const fetchCurrentRound = async () => {
    setIsLoadingRound(true)
    setError(null)
    
    try {
      console.log('Fetching current round...')
      const { data, error: supabaseError } = await supabase
        .from('rounds')
        .select('*')
        .eq('status', 'open')
        .limit(1)
        .maybeSingle()
      
      console.log('Supabase response:', { data, error: supabaseError })
      
      if (supabaseError) {
        const error = new Error(supabaseError.message || 'Failed to fetch current round')
        console.error('Error fetching current round:', {
          message: error.message,
          details: supabaseError,
          code: supabaseError.code
        })
        setError(error)
        setCurrentRound(null)
        return
      }
      
      if (!data) {
        console.log('No current round found')
        setCurrentRound(null)
        return
      }
      
      console.log('Setting current round:', data)
      setCurrentRound(data as Round)
      setRoundChanged(true)
      
      // Reset the changed flag after 3 seconds
      setTimeout(() => {
        setRoundChanged(false)
      }, 3000)
    } catch (err) {
      console.error('Unexpected error in fetchCurrentRound:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      })
      const error = err instanceof Error ? err : new Error('An unexpected error occurred')
      setError(error)
      setCurrentRound(null)
    } finally {
      setIsLoadingRound(false)
    }
  }
  
  // Initial fetch
  useEffect(() => {
    fetchCurrentRound()
  }, [])
  
  useEffect(() => {
    // Subscribe to round changes
    const channel = supabase
      .channel('rounds-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rounds'
      }, () => {
        fetchCurrentRound()
        queryClient?.invalidateQueries({ queryKey: ['currentRound'] })
      })
      .subscribe()
    
    return () => {
      channel.unsubscribe()
    }
  }, [supabase, queryClient])
  
  return (
    <RoundStatusContext.Provider
      value={{ currentRound, isLoadingRound, roundChanged, error }}
    >
      {children}
    </RoundStatusContext.Provider>
  )
}

// Custom hook for consuming the context
export function useRoundStatus() {
  const context = useContext(RoundStatusContext)
  
  if (context === undefined) {
    throw new Error('useRoundStatus must be used within a RoundStatusProvider')
  }
  
  return context
} 