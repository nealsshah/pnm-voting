"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminCandidateView } from "./candidates"
import { getCandidates } from "@/lib/candidates"
import { useAuth } from "../auth/auth-context"
import { Spinner } from "@/components/ui/spinner"
import { motion, AnimatePresence } from "framer-motion"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from "next/navigation"
import { Users, Calendar, Clock, ChevronRight } from 'lucide-react'
import RoundStatusBadge from '@/components/rounds/RoundStatusBadge'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export function AdminDashboard({ pnmCount, eventCount, pendingUserCount, rounds, currentRound, userId }) {
  const [candidates, setCandidates] = useState([])
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processingRound, setProcessingRound] = useState(false)
  const { signOut } = useAuth()
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    async function loadCandidates() {
      try {
        const data = await getCandidates()
        setCandidates(data)
      } catch (error) {
        console.error('Error loading candidates:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCandidates()
  }, [])

  const startRound = async () => {
    if (processingRound) return
    setProcessingRound(true)
    
    try {
      // Find the first pending round
      const pendingRounds = rounds?.filter(r => r.status === 'pending') || []
      if (pendingRounds.length === 0) {
        toast({
          title: "No pending rounds",
          description: "There are no pending rounds to start",
          variant: "destructive"
        })
        return
      }
      
      // Sort by start date and get the earliest one
      pendingRounds.sort((a, b) => new Date(a.event.starts_at) - new Date(b.event.starts_at))
      const roundToOpen = pendingRounds[0]
      
      // Update the round status
      const { error } = await supabase
        .from('rounds')
        .update({
          status: 'open',
          opened_at: new Date().toISOString()
        })
        .eq('id', roundToOpen.id)
      
      if (error) throw error
      
      // Broadcast the change
      const channel = supabase.channel('rounds-channel')
      await channel.send({
        type: 'broadcast',
        event: 'ROUND_STATUS_CHANGE',
        payload: { roundId: roundToOpen.id }
      })
      
      toast({
        title: "Round Started",
        description: `Round ${roundToOpen.event.name} has been started`,
      })
      
      // Refresh the page
      router.refresh()
    } catch (error) {
      console.error('Error starting round:', error)
      toast({
        title: "Error",
        description: "Failed to start the round",
        variant: "destructive"
      })
    } finally {
      setProcessingRound(false)
    }
  }

  const endRound = async () => {
    if (processingRound || !currentRound) return
    setProcessingRound(true)
    
    try {
      // Update the current round status
      const { error } = await supabase
        .from('rounds')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', currentRound.id)
      
      if (error) throw error
      
      // Broadcast the change
      const channel = supabase.channel('rounds-channel')
      await channel.send({
        type: 'broadcast',
        event: 'ROUND_STATUS_CHANGE',
        payload: { roundId: currentRound.id }
      })
      
      toast({
        title: "Round Ended",
        description: `Round ${currentRound.event.name} has been ended`,
      })
      
      // Refresh the page
      router.refresh()
    } catch (error) {
      console.error('Error ending round:', error)
      toast({
        title: "Error",
        description: "Failed to end the round",
        variant: "destructive"
      })
    } finally {
      setProcessingRound(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="large" className="text-primary" />
      </div>
    )
  }

  // Find pending and next rounds
  const pendingRounds = rounds?.filter(r => r.status === 'pending') || []
  const upcomingEvent = pendingRounds.length > 0 
    ? pendingRounds.sort((a, b) => new Date(a.event.starts_at) - new Date(b.event.starts_at))[0].event
    : null

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 p-6"
    >
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
            <CardDescription>
              Manage recruitment events, voting rounds, and candidates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Round Status</h3>
                <p className="text-sm text-gray-500">
                  {currentRound ? (
                    `Active Round: ${currentRound.event.name}`
                  ) : (
                    'No active round'
                  )}
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/admin/rounds">
                  <Button variant="outline">
                    Manage Rounds
                  </Button>
                </Link>
                <Button onClick={signOut} variant="outline">Sign Out</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Stats Card 1 - PNMs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total PNMs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <div className="text-3xl font-bold">{pnmCount}</div>
                <Users className="text-muted-foreground h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          {/* Stats Card 2 - Events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Scheduled Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold">{eventCount}</div>
                <Link href="/admin/schedule">
                  <Button variant="ghost" size="sm">
                    <Calendar className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card 3 - Current Round */}
          <Card className={currentRound ? "border-primary" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {currentRound ? "Active Round" : "Next Event"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="flex flex-col">
                  <div className="text-lg font-semibold line-clamp-1">
                    {currentRound ? currentRound.event.name : (upcomingEvent ? upcomingEvent.name : "None scheduled")}
                  </div>
                  {currentRound && (
                    <RoundStatusBadge withTimer={true} />
                  )}
                  {!currentRound && upcomingEvent && (
                    <div className="text-xs text-muted-foreground flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      Upcoming
                    </div>
                  )}
                </div>
                <Link href="/admin/rounds">
                  <Button size="sm" variant={currentRound ? "default" : "ghost"}>
                    View <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {candidates.length > 0 && (
          <motion.div
            key={currentCandidateIndex}
            variants={item}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <AdminCandidateView
              candidateId={candidates[currentCandidateIndex]?.id}
              onPrevious={() => setCurrentCandidateIndex((prev) => Math.max(0, prev - 1))}
              onNext={() => setCurrentCandidateIndex((prev) => Math.min(candidates.length - 1, prev + 1))}
              currentRound={currentRound?.id || null}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
} 