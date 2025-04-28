'use client'

import { useState, useEffect } from 'react'
import { differenceInSeconds, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { RotateCw, Clock, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoundStatus } from './RoundStatusProvider'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function RoundStatusBadge({ withTimer = true }) {
  const { currentRound, isLoadingRound, roundChanged } = useRoundStatus()
  const [countdown, setCountdown] = useState('')
  const [nextRound, setNextRound] = useState(null)
  
  // Fetch the next round if we have a current one
  useEffect(() => {
    if (currentRound) {
      const fetchNextRound = async () => {
        const supabase = createClientComponentClient()
        const { data } = await supabase
          .from('rounds')
          .select('*, event:event_id(*)')
          .eq('status', 'pending')
          .order('event.starts_at', { ascending: true })
          .limit(1)
          .single()
          .catch(() => ({ data: null }))
        
        setNextRound(data)
      }
      
      fetchNextRound()
    }
  }, [currentRound])
  
  // Set up countdown timer
  useEffect(() => {
    if (currentRound && nextRound) {
      const timer = setInterval(() => {
        const nextEventStart = nextRound?.event?.starts_at ? 
          new Date(nextRound.event.starts_at) : null
        
        if (nextEventStart) {
          const secondsRemaining = differenceInSeconds(nextEventStart, new Date())
          
          if (secondsRemaining <= 0) {
            setCountdown('Closing soon...')
          } else {
            const hours = Math.floor(secondsRemaining / 3600)
            const minutes = Math.floor((secondsRemaining % 3600) / 60)
            const seconds = secondsRemaining % 60
            
            setCountdown(
              `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            )
          }
        } else {
          setCountdown('')
        }
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [currentRound, nextRound])
  
  if (isLoadingRound) {
    return (
      <Badge variant="outline" className="px-3 py-1">
        <RotateCw className="h-3 w-3 mr-1 animate-spin" />
        Loading...
      </Badge>
    )
  }
  
  if (!currentRound) {
    return (
      <Badge variant="outline" className="px-3 py-1">
        <AlertCircle className="h-3 w-3 mr-1" />
        No Active Round
      </Badge>
    )
  }
  
  return (
    <AnimatePresence>
      <motion.div
        key={currentRound.id}
        initial={roundChanged ? { opacity: 0, scale: 0.9 } : false}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <Card className="px-3 py-2 bg-primary text-primary-foreground rounded-md shadow-sm flex items-center">
          <div className="flex flex-col">
            <div className="text-sm font-medium flex items-center">
              Current Round: {currentRound.event.name}
            </div>
            
            {withTimer && countdown && (
              <div className="text-xs mt-0.5 flex items-center opacity-80">
                <Clock className="h-3 w-3 mr-1" />
                Voting closes in: <span className="font-mono ml-1">{countdown}</span>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
} 