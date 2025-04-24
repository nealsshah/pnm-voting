'use client'

import { useState } from 'react'
import { createClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Play, Pause, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import RoundStatusBadge from '@/components/rounds/RoundStatusBadge'

export default function RoundManagement({ rounds, currentRound }) {
  const [loading, setLoading] = useState(false)
  const [operationInProgress, setOperationInProgress] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const handleOpenRound = async (roundId) => {
    if (operationInProgress) return
    if (currentRound) {
      if (!confirm(
        `Opening this round will close the current round "${currentRound.event.name}". Are you sure?`
      )) {
        return
      }
    }

    setOperationInProgress(true)
    try {
      // If there's an open round, close it first
      if (currentRound) {
        const { error: closeError } = await supabase
          .from('rounds')
          .update({ 
            status: 'closed',
            closed_at: new Date().toISOString() 
          })
          .eq('id', currentRound.id)
        
        if (closeError) throw closeError
      }

      // Now open the selected round
      const { error: openError } = await supabase
        .from('rounds')
        .update({
          status: 'open',
          opened_at: new Date().toISOString()
        })
        .eq('id', roundId)
      
      if (openError) throw openError
      
      toast({
        title: 'Round Opened',
        description: 'The voting round has been opened successfully.',
      })
      
      // Broadcast the change to all clients
      await supabase.realtime.broadcast('rounds', { 
        event: 'ROUND_STATUS_CHANGE'
      })
      
      // Reload the page
      window.location.reload()
    } catch (error) {
      console.error('Error opening round:', error)
      toast({
        title: 'Error',
        description: 'Failed to open the round.',
        variant: 'destructive',
      })
    } finally {
      setOperationInProgress(false)
    }
  }

  const handleCloseRound = async (roundId) => {
    if (operationInProgress) return
    if (!confirm('Are you sure you want to close this round?')) {
      return
    }

    setOperationInProgress(true)
    try {
      const { error } = await supabase
        .from('rounds')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString() 
        })
        .eq('id', roundId)
      
      if (error) throw error
      
      toast({
        title: 'Round Closed',
        description: 'The voting round has been closed successfully.',
      })

      // Broadcast the change to all clients
      await supabase.realtime.broadcast('rounds', { 
        event: 'ROUND_STATUS_CHANGE'
      })
      
      // Reload the page
      window.location.reload()
    } catch (error) {
      console.error('Error closing round:', error)
      toast({
        title: 'Error',
        description: 'Failed to close the round.',
        variant: 'destructive',
      })
    } finally {
      setOperationInProgress(false)
    }
  }

  const getUpcomingRounds = () => {
    return rounds.filter(
      round => round.status === 'pending' && new Date(round.event.starts_at) > new Date()
    ).sort((a, b) => new Date(a.event.starts_at) - new Date(b.event.starts_at))
  }

  const getPastRounds = () => {
    return rounds.filter(
      round => round.status === 'closed' || (round.status === 'pending' && new Date(round.event.starts_at) < new Date())
    ).sort((a, b) => new Date(b.event.starts_at) - new Date(a.event.starts_at))
  }

  return (
    <div className="space-y-6">
      {currentRound && (
        <Card className="border-green-300 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-green-600" />
              Current Active Round
            </CardTitle>
            <CardDescription>
              Manage the current voting round
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium">{currentRound.event.name}</h3>
                <p className="text-sm text-gray-500">
                  Started: {formatDate(currentRound.opened_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="destructive" 
                  onClick={() => handleCloseRound(currentRound.id)}
                  disabled={operationInProgress}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Close Round
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Round Management</CardTitle>
          <CardDescription>
            Control voting rounds for recruitment events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium mb-3">Upcoming Rounds</h3>
              {getUpcomingRounds().length === 0 ? (
                <p className="text-gray-500">No upcoming rounds scheduled.</p>
              ) : (
                <div className="space-y-4">
                  {getUpcomingRounds().map(round => (
                    <div 
                      key={round.id} 
                      className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 border rounded-md bg-white"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{round.event.name}</h4>
                          <RoundStatusBadge status={round.status} />
                        </div>
                        <p className="text-sm text-gray-500">
                          Scheduled: {formatDate(round.event.starts_at)}
                        </p>
                      </div>
                      <Button 
                        onClick={() => handleOpenRound(round.id)}
                        disabled={operationInProgress}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Open Round
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Past Rounds</h3>
              {getPastRounds().length === 0 ? (
                <p className="text-gray-500">No past rounds available.</p>
              ) : (
                <div className="space-y-4">
                  {getPastRounds().map(round => (
                    <div 
                      key={round.id} 
                      className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 border rounded-md bg-gray-50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{round.event.name}</h4>
                          <RoundStatusBadge status={round.status} />
                        </div>
                        <p className="text-sm text-gray-500">
                          {round.status === 'closed' 
                            ? `Closed: ${formatDate(round.closed_at)}` 
                            : `Scheduled: ${formatDate(round.event.starts_at)}`}
                        </p>
                      </div>
                      {round.status === 'pending' && new Date(round.event.starts_at) < new Date() && (
                        <Button 
                          onClick={() => handleOpenRound(round.id)}
                          disabled={operationInProgress}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Open Round
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-gray-500">
          Note: Only one round can be open at a time. Opening a new round will automatically close the current one.
        </CardFooter>
      </Card>
    </div>
  )
} 