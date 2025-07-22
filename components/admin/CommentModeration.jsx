'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Trash2, Search, Filter, MoveDiagonal } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function CommentModeration({ initialComments }) {
  const [comments, setComments] = useState(initialComments || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPnm, setSelectedPnm] = useState('')
  const [selectedRound, setSelectedRound] = useState('')
  const [pnmOptions, setPnmOptions] = useState([])
  const [roundOptions, setRoundOptions] = useState([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState(null)
  const [expandedComment, setExpandedComment] = useState(null)

  const supabase = createClientComponentClient()
  const { toast } = useToast()

  // Extract filter options from comments
  useEffect(() => {
    if (!initialComments?.length) return

    // Extract unique PNMs
    const pnms = Array.from(
      new Map(
        initialComments
          .filter(c => c.pnm)
          .map(c => [c.pnm_id, { id: c.pnm_id, name: `${c.pnm.first_name} ${c.pnm.last_name}` }])
      ).values()
    )

    // Extract unique rounds
    const rounds = Array.from(
      new Map(
        initialComments
          .filter(c => c.round)
          .map(c => [c.round_id, { id: c.round_id, name: c.round.name }])
      ).values()
    )

    setPnmOptions(pnms)
    setRoundOptions(rounds)
  }, [initialComments])

  // Set up real-time listening for comments
  useEffect(() => {
    const channel = supabase
      .channel('admin-comments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        payload => {
          if (payload.eventType === 'INSERT') {
            // Fetch the full comment with relations
            fetchComment(payload.new.id)
          } else if (payload.eventType === 'UPDATE') {
            setComments(prev =>
              prev.map(comment =>
                comment.id === payload.new.id ? { ...comment, ...payload.new } : comment
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setComments(prev =>
              prev.filter(comment => comment.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Fetch a single comment with all relations (used for real-time updates)
  const fetchComment = async (commentId) => {
    // Get the comment
    const { data: comment, error } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single()

    if (error || !comment) {
      console.error('Error fetching comment:', error)
      return
    }

    // Get related data
    const [pnmResponse, brotherResponse, roundResponse] = await Promise.all([
      // Get PNM
      supabase
        .from('pnms')
        .select('id, first_name, last_name')
        .eq('id', comment.pnm_id)
        .single(),

      // Get brother
      supabase
        .from('users_metadata')
        .select('id, email, role')
        .eq('id', comment.brother_id)
        .single(),

      // Get round
      supabase
        .from('rounds')
        .select('id, status, event_id')
        .eq('id', comment.round_id)
        .single()
    ])

    const pnm = pnmResponse.data
    const brother = brotherResponse.data
    const round = roundResponse.data

    // If round has event_id, get the event
    let event = null
    if (round?.event_id) {
      const { data: eventData } = await supabase
        .from('events')
        .select('id, name')
        .eq('id', round.event_id)
        .single()

      event = eventData
    }

    // Combine all data
    const commentWithData = {
      ...comment,
      pnm,
      brother,
      round: round ? {
        ...round,
        event
      } : null
    }

    setComments(prev => [commentWithData, ...prev])
  }

  const confirmDelete = (comment) => {
    setCommentToDelete(comment)
    setDeleteDialogOpen(true)
  }

  const handleDeleteComment = async () => {
    if (!commentToDelete) return

    try {
      const response = await fetch(`/api/comment/${commentToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete comment')
      }

      // Comment will be removed via real-time subscription
      toast({
        title: 'Comment deleted',
        description: 'The comment has been permanently removed',
      })

      setDeleteDialogOpen(false)
      setCommentToDelete(null)
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast({
        title: 'Error',
        description: error.message || 'There was an error deleting the comment',
        variant: 'destructive',
      })
    }
  }

  // Filter and search comments
  const filteredComments = comments.filter(comment => {
    // Apply PNM filter
    if (selectedPnm && comment.pnm_id !== selectedPnm) return false

    // Apply Round filter
    if (selectedRound && comment.round_id !== selectedRound) return false

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        comment.body?.toLowerCase().includes(query) ||
        comment.brother?.email?.toLowerCase().includes(query) ||
        comment.pnm?.first_name?.toLowerCase().includes(query) ||
        comment.pnm?.last_name?.toLowerCase().includes(query)
      )
    }

    return true
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comment Moderation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label htmlFor="search">Search Comments</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
                <Input
                  id="search"
                  placeholder="Search by content or user..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pnm-filter">Filter by PNM</Label>
              <select
                id="pnm-filter"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedPnm}
                onChange={(e) => setSelectedPnm(e.target.value)}
              >
                <option value="">All PNMs</option>
                {pnmOptions.map(pnm => (
                  <option key={pnm.id} value={pnm.id}>{pnm.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="round-filter">Filter by Round</Label>
              <select
                id="round-filter"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
              >
                <option value="">All Rounds</option>
                {roundOptions.map(round => (
                  <option key={round.id} value={round.id}>{round.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredComments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">No comments found matching your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PNM</TableHead>
                  <TableHead>Round</TableHead>
                  <TableHead>Brother</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComments.map(comment => (
                  <TableRow key={comment.id}>
                    <TableCell className="font-medium">
                      {comment.pnm ? `${comment.pnm.first_name} ${comment.pnm.last_name}` : 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {comment.round?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {comment.is_anon
                        ? 'Anonymous'
                        : `${comment.brother?.first_name || ''} ${comment.brother?.last_name || ''}`.trim() || 'Unknown'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(comment.created_at)}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate">
                        {comment.body}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedComment(comment)}
                        >
                          <MoveDiagonal className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this comment?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {commentToDelete && (
            <div className="p-4 bg-gray-100 rounded-md">
              <p className="text-sm text-gray-500">
                By {commentToDelete.is_anon
                  ? 'Anonymous'
                  : `${commentToDelete.brother?.first_name || ''} ${commentToDelete.brother?.last_name || ''}`.trim() || 'Unknown'} on{' '}
                {formatDate(commentToDelete.created_at)}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{commentToDelete.body}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setCommentToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteComment}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!expandedComment} onOpenChange={() => setExpandedComment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comment Details</DialogTitle>
          </DialogHeader>
          {expandedComment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">PNM</h4>
                  <p className="mt-1">
                    {expandedComment.pnm
                      ? `${expandedComment.pnm.first_name} ${expandedComment.pnm.last_name}`
                      : 'Unknown'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Round</h4>
                  <p className="mt-1">
                    {expandedComment.round?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Author</h4>
                  <p className="mt-1">
                    {expandedComment.is_anon
                      ? 'Anonymous'
                      : `${expandedComment.brother?.first_name || ''} ${expandedComment.brother?.last_name || ''}`.trim() || 'Unknown'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Created</h4>
                  <p className="mt-1">{formatDate(expandedComment.created_at)}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Comment</h4>
                <p className="mt-1 whitespace-pre-wrap">{expandedComment.body}</p>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => {
                setCommentToDelete(expandedComment)
                setDeleteDialogOpen(true)
                setExpandedComment(null)
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Comment
            </Button>
            <Button
              variant="outline"
              onClick={() => setExpandedComment(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 