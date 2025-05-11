'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/components/ui/use-toast'
import { AlertCircle, CheckCircle, X, Clock, AlertTriangle, Plus } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function RoundsManager({ rounds, currentRound, nextRound, userId }) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, round: null })
  const [newRoundDialog, setNewRoundDialog] = useState({ open: false, name: '' })
  const [isCreating, setIsCreating] = useState(false)
  
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
      if (action === 'open' || action === 'reopen') {
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
          description: "The voting round has been opened",
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
          description: "The voting round has been closed",
        })
      }
      
      // Notify clients about the change
      const channel = supabase.channel('rounds-channel')
      await channel.send({
        type: 'broadcast',
        event: 'ROUND_STATUS_CHANGE',
        payload: { roundId }
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
  
  // Create a new round
  const createNewRound = async () => {
    if (isCreating || !newRoundDialog.name.trim()) return
    setIsCreating(true)
    
    try {
      // Create the new round
      const { error } = await supabase
        .from('rounds')
        .insert({
          name: newRoundDialog.name.trim(),
          status: 'open',
          opened_at: new Date().toISOString()
        })
      
      if (error) throw error
      
      // If there's a currently open round, close it
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
      
      toast({
        title: "Round Created",
        description: `Round "${newRoundDialog.name}" has been created and opened`,
      })
      
      // Notify clients about the change
      const channel = supabase.channel('rounds-channel')
      await channel.send({
        type: 'broadcast',
        event: 'ROUND_STATUS_CHANGE',
        payload: { roundId: currentRound?.id }
      })
      
      // Reset dialog and refresh
      setNewRoundDialog({ open: false, name: '' })
      router.refresh()
    } catch (error) {
      console.error('Error creating round:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
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
        <Dialog 
          open={newRoundDialog.open} 
          onOpenChange={(open) => setNewRoundDialog(prev => ({ ...prev, open }))}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Start New Round
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Round</DialogTitle>
              <DialogDescription>
                Create a new voting round. This will automatically close any currently open round.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="round-name">Round Name</Label>
                <Input
                  id="round-name"
                  value={newRoundDialog.name}
                  onChange={(e) => setNewRoundDialog(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter round name..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setNewRoundDialog({ open: false, name: '' })}
              >
                Cancel
              </Button>
              <Button 
                onClick={createNewRound}
                disabled={isCreating || !newRoundDialog.name.trim()}
              >
                {isCreating ? 'Creating...' : 'Create Round'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                  ? `Opened ${formatDistanceToNow(parseISO(currentRound.opened_at || currentRound.created_at), { addSuffix: true })}`
                  : "There is currently no open voting round"
                }
              </CardDescription>
            </CardHeader>
            
            {currentRound && (
              <CardContent>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{currentRound.name}</h3>
                  <p>
                    Started at {format(parseISO(currentRound.opened_at || currentRound.created_at), 'MMM d, yyyy • h:mm a')}
                  </p>
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
                  Close Round
                </Button>
              )}
            </CardFooter>
          </Card>
          
          {/* Round Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <TableHead>Round Name</TableHead>
                    <TableHead>Created At</TableHead>
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
                      const isOpen = round.status === 'open'
                      const isPending = round.status === 'pending'
                      
                      return (
                        <TableRow key={round.id}>
                          <TableCell className="font-medium">
                            {round.name}
                          </TableCell>
                          <TableCell>
                            {round.created_at ? format(parseISO(round.created_at), 'MMM d, yyyy • h:mm a') : '—'}
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
                                Close
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
                                Open
                              </Button>
                            )}

                            {round.status === 'closed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmDialog({
                                  open: true,
                                  action: 'reopen',
                                  round: round
                                })}
                              >
                                Reopen
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
              {confirmDialog.action === 'open' || confirmDialog.action === 'reopen'
                ? "Open Voting Round" 
                : "Close Voting Round"
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'open' || confirmDialog.action === 'reopen' ? (
                <div className="space-y-2">
                  <div>
                    You are about to {confirmDialog.action === 'reopen' ? 'reopen' : 'open'} the voting round for 
                    "<strong>{confirmDialog.round?.name}</strong>".
                  </div>
                  {currentRound && (
                    <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded flex items-start">
                      <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        This will automatically close the currently open round 
                        "<strong>{currentRound?.name}</strong>".
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  You are about to close the voting round for 
                  "<strong>{confirmDialog.round?.name}</strong>".
                  Brothers will no longer be able to submit or edit votes.
                </div>
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