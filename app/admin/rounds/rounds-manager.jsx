'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format, parseISO, differenceInSeconds, formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/components/ui/use-toast'
import { AlertCircle, CheckCircle, X, Clock, AlertTriangle } from 'lucide-react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function RoundsManager({ rounds, currentRound, nextRound, userId }) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const [countdown, setCountdown] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, round: null })
  
  useEffect(() => {
    // Set up countdown timer
    if (currentRound) {
      const timer = setInterval(() => {
        const nextEventStart = nextRound?.event?.starts_at ? 
          new Date(nextRound.event.starts_at) : null
        
        if (nextEventStart) {
          const secondsRemaining = differenceInSeconds(nextEventStart, new Date())
          
          if (secondsRemaining <= 0) {
            setCountdown('Round closing soon...')
          } else {
            const hours = Math.floor(secondsRemaining / 3600)
            const minutes = Math.floor((secondsRemaining % 3600) / 60)
            const seconds = secondsRemaining % 60
            
            setCountdown(
              `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            )
          }
        } else {
          setCountdown('No next event scheduled')
        }
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [currentRound, nextRound])
  
  useEffect(() => {
    // Subscribe to round status changes
    const channel = supabase.channel('rounds-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rounds'
      }, (payload) => {
        router.refresh()
      })
      .subscribe()
      
    return () => {
      channel.unsubscribe()
    }
  }, [supabase, router])
  
  // Handle manual override - force open or close a round
  const handleRoundOverride = async (roundId, action) => {
    try {
      if (action === 'open') {
        // If there's a currently open round, close it first
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
        
        // Open the selected round
        const { error } = await supabase
          .from('rounds')
          .update({ 
            status: 'open',
            opened_at: new Date().toISOString()
          })
          .eq('id', roundId)
        
        if (error) throw error
        
        toast({
          title: "Round opened",
          description: "The voting round has been manually opened",
        })
      } else if (action === 'close') {
        // Close the selected round
        const { error } = await supabase
          .from('rounds')
          .update({ 
            status: 'closed',
            closed_at: new Date().toISOString()
          })
          .eq('id', roundId)
        
        if (error) throw error
        
        toast({
          title: "Round closed",
          description: "The voting round has been manually closed",
        })
      }
      
      // Notify clients about the change
      await supabase.realtime.broadcast('rounds', { 
        event: 'status-change',
        ts: new Date().toISOString() 
      })
      
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setConfirmDialog({ open: false, action: null, round: null })
    }
  }
  
  // Split rounds by status
  const pendingRounds = rounds.filter(r => r.status === 'pending')
  const openRounds = rounds.filter(r => r.status === 'open')
  const closedRounds = rounds.filter(r => r.status === 'closed')
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Voting Rounds</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="all-rounds">All Rounds</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Current Round */}
          <Card className={currentRound ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="mr-2">
                  {currentRound ? (
                    <Badge variant="default" className="mr-2">OPEN</Badge>
                  ) : (
                    <Badge variant="outline" className="mr-2">NO ACTIVE ROUND</Badge>
                  )}
                </div>
                Current Round
              </CardTitle>
              <CardDescription>
                {currentRound 
                  ? `Opened ${formatDistanceToNow(parseISO(currentRound.opened_at || currentRound.event.starts_at), { addSuffix: true })}`
                  : "There is currently no open voting round"
                }
              </CardDescription>
            </CardHeader>
            
            {currentRound && (
              <CardContent>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{currentRound.event.name}</h3>
                  <p>
                    Started at {format(parseISO(currentRound.event.starts_at), 'MMM d, yyyy • h:mm a')}
                  </p>
                  
                  {nextRound && (
                    <div className="mt-4 flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>
                        Closes in: <span className="font-mono">{countdown}</span>
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
            
            <CardFooter className="justify-end">
              {currentRound && (
                <Button 
                  variant="destructive" 
                  onClick={() => setConfirmDialog({
                    open: true,
                    action: 'close',
                    round: currentRound
                  })}
                >
                  Force Close Round
                </Button>
              )}
            </CardFooter>
          </Card>
          
          {/* Next Round */}
          {nextRound && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Badge variant="outline" className="mr-2">NEXT</Badge>
                  Next Round
                </CardTitle>
                <CardDescription>
                  Scheduled to open {formatDistanceToNow(parseISO(nextRound.event.starts_at), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{nextRound.event.name}</h3>
                  <p>
                    Opens at {format(parseISO(nextRound.event.starts_at), 'MMM d, yyyy • h:mm a')}
                  </p>
                </div>
              </CardContent>
              
              <CardFooter className="justify-end">
                <Button 
                  variant="default" 
                  onClick={() => setConfirmDialog({
                    open: true,
                    action: 'open',
                    round: nextRound
                  })}
                >
                  Force Open Round
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {/* Round Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Pending Rounds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingRounds.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Open Rounds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openRounds.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Completed Rounds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{closedRounds.length}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="all-rounds">
          <Card>
            <CardHeader>
              <CardTitle>All Rounds</CardTitle>
              <CardDescription>
                View all recruitment events and their associated voting rounds.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rounds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No events or rounds have been created yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rounds.map(round => {
                      const isPast = new Date(round.event.starts_at) < new Date()
                      const isOpen = round.status === 'open'
                      const isPending = round.status === 'pending'
                      
                      return (
                        <TableRow key={round.id}>
                          <TableCell className="font-medium">
                            {round.event.name}
                          </TableCell>
                          <TableCell>
                            {format(parseISO(round.event.starts_at), 'MMM d, yyyy • h:mm a')}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                round.status === 'open' ? 'default' :
                                round.status === 'closed' ? 'secondary' :
                                'outline'
                              }
                            >
                              {round.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isOpen && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmDialog({
                                  open: true,
                                  action: 'close',
                                  round: round
                                })}
                              >
                                Force Close
                              </Button>
                            )}
                            
                            {isPending && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmDialog({
                                  open: true,
                                  action: 'open',
                                  round: round
                                })}
                              >
                                Force Open
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'open' 
                ? "Open Voting Round" 
                : "Close Voting Round"
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'open' ? (
                <>
                  <p>
                    You are about to manually open the voting round for 
                    "<strong>{confirmDialog.round?.event?.name}</strong>".
                  </p>
                  {currentRound && (
                    <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded flex items-start">
                      <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <p>
                        This will automatically close the currently open round 
                        "<strong>{currentRound?.event?.name}</strong>".
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p>
                  You are about to manually close the voting round for 
                  "<strong>{confirmDialog.round?.event?.name}</strong>".
                  Brothers will no longer be able to submit or edit votes.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleRoundOverride(
                confirmDialog.round?.id, 
                confirmDialog.action
              )}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Toaster />
    </div>
  )
} 