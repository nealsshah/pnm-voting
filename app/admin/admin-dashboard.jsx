"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminCandidateView } from "./gallery"
import { getCandidates } from "@/lib/candidates"
import { useAuth } from "../auth/auth-context"
import { Spinner } from "@/components/ui/spinner"
import { motion, AnimatePresence } from "framer-motion"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from "next/navigation"
import { Users, Calendar, Clock, ChevronRight, Eye, EyeOff } from 'lucide-react'
import RoundStatusBadge from '@/components/rounds/RoundStatusBadge'
import { getStatsPublished, setStatsPublished } from '@/lib/settings'

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

export function AdminDashboard({ pnmCount, pendingUserCount, rounds, currentRound, userId }) {
  const [candidates, setCandidates] = useState([])
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processingRound, setProcessingRound] = useState(false)
  const [statsPublished, setStatsPublishedState] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)
  const { signOut } = useAuth()
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    async function loadCandidates() {
      try {
        setError(null)
        const data = await getCandidates()
        setCandidates(data)
      } catch (error) {
        console.error('Error loading candidates:', error)
        setError(error instanceof Error ? error.message : 'Failed to load candidates')
        toast({
          title: "Error",
          description: "Failed to load candidates. Please try refreshing the page.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadCandidates()
  }, [toast])

  // Load global stats published flag
  useEffect(() => {
    async function fetchStatsFlag() {
      try {
        const published = await getStatsPublished()
        setStatsPublishedState(published)
      } catch (e) {
        console.error('Failed to fetch stats_published flag', e)
      } finally {
        setStatsLoading(false)
      }
    }
    fetchStatsFlag()
  }, [])

  const toggleStatsPublished = async () => {
    try {
      const newValue = !statsPublished
      await setStatsPublished(newValue)
      setStatsPublishedState(newValue)
      toast({
        title: newValue ? 'Voting statistics published' : 'Voting statistics hidden',
        description: newValue
          ? 'All users can now see candidate averages and vote counts.'
          : 'Voting statistics are no longer visible to regular users.'
      })
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Unable to update visibility of voting statistics.',
        variant: 'destructive'
      })
    }
  }

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
        description: `Round ${roundToOpen.name} has been started`,
      })
      
      // Refresh the page
      router.refresh()
    } catch (error) {
      console.error('Error starting round:', error)
      toast({
        title: "Error",
        description: "Failed to start the round. Please try again.",
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
        description: `Round ${currentRound.name} has been ended`,
      })
      
      // Refresh the page
      router.refresh()
    } catch (error) {
      console.error('Error ending round:', error)
      toast({
        title: "Error",
        description: "Failed to end the round. Please try again.",
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => router.refresh()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {currentRound ? "Active Round" : "Start a New Round"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {currentRound ? (
                <div className="text-lg font-semibold truncate">
                  {currentRound.name}
                </div>
              ) : (
                <div className="text-lg font-semibold truncate">
                  {rounds?.find(r => r.status === 'pending')?.name || "No active rounds"}
                </div>
              )}
              <Link href="/admin/rounds">
                <Button size="sm" variant="ghost">
                  View <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Voting Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="flex items-center space-x-2">
                {statsPublished ? (
                  <>
                    <Eye className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Published</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Hidden</span>
                  </>
                )}
              </div>
              <Button size="sm" onClick={toggleStatsPublished} disabled={statsLoading}>
                {statsPublished ? 'Unpublish' : 'Publish'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
} 