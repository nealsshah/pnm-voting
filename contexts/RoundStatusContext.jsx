'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useQueryClient } from '@tanstack/react-query'

// Create the context
const RoundStatusContext = createContext({
  currentRound: null,
  isLoadingRound: true,
  roundChanged: false,
})

export function RoundStatusProvider({ children }) {
  const [currentRound, setCurrentRound] = useState(null)
  const [isLoadingRound, setIsLoadingRound] = useState(true)
  const [roundChanged, setRoundChanged] = useState(false)
  const supabase = createClientComponentClient()
  const queryClient = useQueryClient()
  
  // Function to fetch the current round
  const fetchCurrentRound = async () => {
    setIsLoadingRound(true)
    try {
      const { data, error } = await supabase
        .from('rounds')
        .select('*, event:event_id(*)')
        .eq('status', 'open')
        .limit(1)
        .single()
      
      if (error) {
        console.error('Error fetching current round:', error)
        setCurrentRound(null)
      } else {
        setCurrentRound(data)
        setRoundChanged(true)
        
        // Reset the changed flag after 3 seconds
        setTimeout(() => {
          setRoundChanged(false)
        }, 3000)
      }
    } catch (error) {
      console.error('Error fetching current round:', error)
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
        if (queryClient) {
          queryClient.invalidateQueries('currentRound')
        }
      })
      .subscribe()
    
    return () => {
      channel.unsubscribe()
    }
  }, [supabase, queryClient])
  
  return (
    <RoundStatusContext.Provider
      value={{ currentRound, isLoadingRound, roundChanged }}
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