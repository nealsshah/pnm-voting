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
import { AlertCircle, CheckCircle, X, Clock, AlertTriangle, Plus, MoreHorizontal, Download, Lock, Unlock, Trash2 } from 'lucide-react'
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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

export function RoundsManager({ rounds, currentRound, nextRound, userId }) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, round: null })
  const [newRoundDialog, setNewRoundDialog] = useState({ open: false, name: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
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
      } else if (action === 'delete') {
        // Delete the round
        const { error } = await supabase
          .from('rounds')
          .delete()
          .eq('id', roundId)
 
        if (error) throw error
 
        toast({
          title: "Round deleted",
          description: "The voting round has been deleted",
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
  
  // Function to export round data to CSV
  const exportRoundData = async (round) => {
    if (isExporting) return
    setIsExporting(true)

    try {
      // Fetch all votes for this round
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('*, pnm:pnm_id(*)')
        .eq('round_id', round.id)

      if (votesError) throw votesError

      // Get all brother IDs from votes
      const brotherIds = [...new Set(votes.map(v => v.brother_id))]
      
      // Fetch brother details
      const { data: brothers, error: brothersError } = await supabase
        .from('users_metadata')
        .select('id, first_name, last_name, email')
        .in('id', brotherIds)

      if (brothersError) throw brothersError

      // Create a map of brother details
      const brotherMap = brothers.reduce((acc, brother) => {
        acc[brother.id] = brother
        return acc
      }, {})

      // Fetch all comments for this round
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('*, pnm:pnm_id(*)')
        .eq('round_id', round.id)

      if (commentsError) throw commentsError

      // Helper function to safely format dates
      const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        try {
          return format(parseISO(dateString), 'yyyy-MM-dd HH:mm:ss')
        } catch (e) {
          console.warn('Invalid date:', dateString)
          return 'Invalid Date'
        }
      }

      // Create CSV content
      const csvRows = []

      // Add round info
      csvRows.push(['Round Information'])
      csvRows.push(['Name', round.name])
      csvRows.push(['Status', round.status])
      csvRows.push(['Created At', formatDate(round.created_at)])
      csvRows.push(['Opened At', formatDate(round.opened_at)])
      csvRows.push(['Closed At', formatDate(round.closed_at)])
      csvRows.push([])

      // Add votes
      csvRows.push(['Votes'])
      csvRows.push(['PNM Name', 'Brother Name', 'Brother Email', 'Score', 'Voted At'])
      votes.forEach(vote => {
        const brother = brotherMap[vote.brother_id]
        const pnmName = vote.pnm ? `${vote.pnm.first_name || ''} ${vote.pnm.last_name || ''}`.trim() : 'Unknown PNM'
        csvRows.push([
          pnmName,
          brother ? `${brother.first_name || ''} ${brother.last_name || ''}`.trim() : 'Unknown',
          brother?.email || 'N/A',
          vote.score,
          formatDate(vote.created_at)
        ])
      })
      csvRows.push([])

      // Add comments
      csvRows.push(['Comments'])
      csvRows.push(['PNM Name', 'Brother Name', 'Brother Email', 'Comment', 'Anonymous', 'Created At'])
      comments.forEach(comment => {
        const brother = brotherMap[comment.brother_id]
        const pnmName = comment.pnm ? `${comment.pnm.first_name || ''} ${comment.pnm.last_name || ''}`.trim() : 'Unknown PNM'
        csvRows.push([
          pnmName,
          comment.is_anon ? 'Anonymous' : (brother ? `${brother.first_name || ''} ${brother.last_name || ''}`.trim() : 'Unknown'),
          comment.is_anon ? 'N/A' : (brother?.email || 'N/A'),
          comment.body || '',
          comment.is_anon ? 'Yes' : 'No',
          formatDate(comment.created_at)
        ])
      })

      // Convert to CSV string
      const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `round_${round.name}_${format(new Date(), 'yyyy-MM-dd')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export Complete",
        description: `Round data has been exported to CSV`,
      })
    } catch (error) {
      console.error('Error exporting round data:', error)
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Voting Rounds</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportRoundData(currentRound)}
            disabled={!currentRound || isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Current Round'}
          </Button>
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
      </div>
      
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
              <Lock className="h-4 w-4 mr-2" />
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

      {/* All Rounds Table */}
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isOpen && (
                              <DropdownMenuItem onClick={() => setConfirmDialog({ open: true, action: 'close', round: round })}>
                                <Lock className="h-4 w-4 mr-2" />
                                Close
                              </DropdownMenuItem>
                            )}
                            {isPending && (
                              <DropdownMenuItem onClick={() => setConfirmDialog({ open: true, action: 'open', round: round })}>
                                <Unlock className="h-4 w-4 mr-2" />
                                Open
                              </DropdownMenuItem>
                            )}
                            {round.status === 'closed' && (
                              <DropdownMenuItem onClick={() => setConfirmDialog({ open: true, action: 'reopen', round: round })}>
                                <Unlock className="h-4 w-4 mr-2" />
                                Reopen
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => exportRoundData(round)}
                              disabled={isExporting}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {isExporting ? 'Exporting...' : 'Export Data'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setConfirmDialog({ open: true, action: 'delete', round: round })}
                              className="text-red-600 focus:bg-red-50 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
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
                : confirmDialog.action === 'close' 
                  ? "Close Voting Round" 
                  : "Delete Voting Round"
              }
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
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
                ) : confirmDialog.action === 'close' ? (
                  <div>
                    You are about to close the voting round for 
                    "<strong>{confirmDialog.round?.name}</strong>".
                    Brothers will no longer be able to submit or edit votes.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      You are about to <span className="font-semibold">permanently delete</span> the voting round for 
                      "<strong>{confirmDialog.round?.name}</strong>".
                    </div>
                    <div className="text-red-600">
                      This action cannot be undone and will remove all associated votes.
                    </div>
                  </div>
                )}
              </div>
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