'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { ChevronLeft, ChevronRight, Star, Edit, Clock, Trash2, ArrowLeft, PanelLeft, PanelRight, ChevronDown, ChevronUp, MessageSquare, Filter, Search, ArrowUpDown } from 'lucide-react'
import RoundStatusBadge from '@/components/rounds/RoundStatusBadge'
import { getInitials, formatTimeLeft, formatDate } from '@/lib/utils'
import { getPhotoPublicUrl } from '@/lib/supabase'
import VoteChart from './VoteChart'
import { getStatsPublished } from '@/lib/settings'
import { getVoteStats, getCandidates } from '@/lib/candidates'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

export default function CandidateView({
  pnm,
  currentRound,
  userVote,
  comments: initialComments,
  voteStats: initialVoteStats,
  userId,
  isAdmin,
  prevId,
  nextId
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sortField = searchParams.get('sortField') || 'name'
  const sortOrder = searchParams.get('sortOrder') || 'asc'
  const supabase = createClientComponentClient()

  const [comment, setComment] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [comments, setComments] = useState(initialComments || [])
  const [vote, setVote] = useState(userVote?.score || 0)
  const [timeLeft, setTimeLeft] = useState(null)
  const [statsPublished, setStatsPublished] = useState(false)
  const [voteStats, setVoteStats] = useState(initialVoteStats || null)
  const [isPanelOpen, setIsPanelOpen] = useState(() => {
    const panelOpen = searchParams.get('panelOpen')
    return panelOpen === 'true'
  })
  const [allCandidates, setAllCandidates] = useState([])
  const [userVotes, setUserVotes] = useState([])
  const totalVotes = voteStats?.count !== undefined ? voteStats.count : voteStats?.total

  // State for comment editing
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editBody, setEditBody] = useState('')
  const [editAnon, setEditAnon] = useState(false)

  const { toast } = useToast()

  const fullName = `${pnm.first_name || ''} ${pnm.last_name || ''}`.trim()
  const initials = getInitials(pnm.first_name, pnm.last_name)
  const imageUrl = pnm.photo_url ? getPhotoPublicUrl(pnm.photo_url) : null
  const isRoundOpen = currentRound?.status === 'open'
  const [localSearchTerm, setLocalSearchTerm] = useState(searchParams.get('searchTerm') || '')

  // Sync isPanelOpen with URL param changes
  useEffect(() => {
    const open = searchParams.get('panelOpen') === 'true'
    setIsPanelOpen(open)
  }, [searchParams])

  // Toggle body class for navbar shift
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isPanelOpen) {
        document.body.classList.add('panel-open')
      } else {
        document.body.classList.remove('panel-open')
      }
    }
  }, [isPanelOpen])

  // Real-time comments updates
  useEffect(() => {
    if (!pnm?.id) return

    const channel = supabase
      .channel(`comments:${pnm.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `pnm_id=eq.${pnm.id}`
        },
        payload => {
          const data = payload.eventType === 'DELETE' ? payload.old : payload.new
          if (payload.eventType === 'INSERT') {
            addCommentRealtime(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            updateCommentRealtime(payload.new)
          } else if (payload.eventType === 'DELETE') {
            deleteCommentRealtime(payload.old.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pnm?.id, supabase])

  // Listen for round status change broadcasts
  useEffect(() => {
    const client = createClientComponentClient()

    const subscription = client.realtime
      .channel('rounds-channel')
      .on('broadcast', { event: 'ROUND_STATUS_CHANGE' }, () => {
        router.refresh()
      })
      .subscribe()

    return () => {
      client.removeChannel(subscription)
    }
  }, [router])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        // TODO: Navigate to previous PNM
      } else if (e.key === 'ArrowRight') {
        // TODO: Navigate to next PNM
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fetch global stats flag and (if published) live vote stats
  useEffect(() => {
    async function fetchSettingsAndStats() {
      try {
        const published = await getStatsPublished()
        setStatsPublished(published)

        if (pnm?.id) {
          const stats = await getVoteStats(pnm.id)
          setVoteStats(stats)
        }
      } catch (e) {
        console.error('Failed to fetch settings / stats', e)
      }
    }

    fetchSettingsAndStats()
  }, [pnm?.id])

  // Load all candidates for the panel
  useEffect(() => {
    async function loadCandidates() {
      try {
        const candidates = await getCandidates()

        // Fetch vote stats for each candidate in parallel
        const candidatesWithStats = await Promise.all(
          (candidates || []).map(async (candidate) => {
            try {
              const stats = await getVoteStats(candidate.id)
              return { ...candidate, vote_stats: stats }
            } catch (err) {
              console.error(`Failed to fetch vote stats for candidate ${candidate.id}`, err)
              return { ...candidate, vote_stats: { average: 0, count: 0 } }
            }
          })
        )

        setAllCandidates(candidatesWithStats)
      } catch (error) {
        console.error('Error loading candidates:', error)
      }
    }
    loadCandidates()
  }, [])

  // Sort candidates based on sortField and sortOrder
  const sortedCandidates = [...allCandidates].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'name': {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase()
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase()
        comparison = nameA.localeCompare(nameB)
        break
      }
      case 'avgScore': {
        const scoreA = a.vote_stats?.average || 0
        const scoreB = b.vote_stats?.average || 0
        comparison = scoreA - scoreB
        break
      }
      case 'totalVotes': {
        const votesA = a.vote_stats?.count || 0
        const votesB = b.vote_stats?.count || 0
        comparison = votesA - votesB
        break
      }
      default:
        comparison = 0
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })

  // Get URL parameters
  const searchTerm = searchParams.get('searchTerm') || ''
  const votingFilter = searchParams.get('votingFilter') || 'all'

  // Filter candidates based on search term and voting status
  const filteredCandidates = sortedCandidates.filter(candidate => {
    // Apply search filter
    const term = searchTerm.toLowerCase()
    const matchesSearch = (
      (candidate.first_name || "").toLowerCase().includes(term) ||
      (candidate.last_name || "").toLowerCase().includes(term) ||
      (candidate.major || "").toLowerCase().includes(term) ||
      (candidate.year || "").toLowerCase().includes(term)
    )

    // Apply voting status filter
    if (votingFilter === 'all') return matchesSearch
    const hasVoted = userVotes.some(v => v.pnm_id === candidate.id)
    return matchesSearch && (votingFilter === 'voted' ? hasVoted : !hasVoted)
  })

  // Find current index and calculate prev/next IDs
  const currentIndex = filteredCandidates.findIndex(c => c.id === pnm.id)
  const prevCandidate = filteredCandidates[currentIndex - 1]
  const nextCandidate = filteredCandidates[currentIndex + 1]

  // Update navigation to use sorted order
  const handlePrevious = () => {
    if (prevCandidate) {
      const params = new URLSearchParams(window.location.search)
      params.set('panelOpen', isPanelOpen)
      router.push(`/candidate/${prevCandidate.id}?${params.toString()}`)
    }
  }

  const handleNext = () => {
    if (nextCandidate) {
      const params = new URLSearchParams(window.location.search)
      params.set('panelOpen', isPanelOpen)
      router.push(`/candidate/${nextCandidate.id}?${params.toString()}`)
    }
  }

  // Update the candidate links in the panel to preserve panel state
  const getCandidateUrl = (candidateId) => {
    const params = new URLSearchParams(window.location.search)
    params.set('panelOpen', isPanelOpen)
    return `/candidate/${candidateId}?${params.toString()}`
  }

  const handleVote = async (score) => {
    if (!isRoundOpen) return

    try {
      const { data, error } = await supabase
        .from('votes')
        .upsert({
          brother_id: userId,
          pnm_id: pnm.id,
          round_id: currentRound.id,
          score
        })
        .select()

      if (error) throw error

      setVote(score)
      toast({
        title: 'Vote submitted',
        description: `You gave ${pnm.first_name} a score of ${score}/5`,
      })

      // Refresh vote statistics if visible
      if (statsPublished || isAdmin) {
        try {
          const stats = await getVoteStats(pnm.id)
          setVoteStats(stats)
        } catch (err) {
          console.error('Failed to refresh vote stats', err)
        }
      }
    } catch (error) {
      console.error('Error voting:', error)
      toast({
        title: 'Error',
        description: 'There was an error submitting your vote',
        variant: 'destructive',
      })
    }
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!comment.trim() || !isRoundOpen) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pnmId: pnm.id,
          roundId: currentRound.id,
          body: comment,
          isAnon: isAnonymous
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit comment')
      }

      // Clear form (comments will be updated via real-time subscription)
      setComment('')
      setIsAnonymous(false)

      toast({
        title: 'Comment submitted',
        description: 'Your comment has been added',
      })

      // Refresh the page
      router.refresh()
    } catch (error) {
      console.error('Error submitting comment:', error)
      toast({
        title: 'Error',
        description: error.message || 'There was an error submitting your comment',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      const response = await fetch(`/api/comment/${commentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete comment')
      }

      // Comments will be updated via real-time subscription
      toast({
        title: 'Comment deleted',
        description: 'The comment has been removed',
      })
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast({
        title: 'Error',
        description: error.message || 'There was an error deleting the comment',
        variant: 'destructive',
      })
    }
  }

  const handleEditComment = async (commentId, updatedBody, isAnon) => {
    try {
      const response = await fetch(`/api/comment/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: updatedBody,
          isAnon: isAnon
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update comment')
      }

      // Comments will be updated via real-time subscription
      toast({
        title: 'Comment updated',
        description: 'Your comment has been updated',
      })
    } catch (error) {
      console.error('Error updating comment:', error)
      toast({
        title: 'Error',
        description: error.message || 'There was an error updating the comment',
        variant: 'destructive',
      })
    }
  }

  const canEditComment = (comment) => {
    return isRoundOpen && comment.brother_id === userId
  }

  const canDeleteComment = (comment) => {
    return isAdmin || (isRoundOpen && comment.brother_id === userId)
  }

  const startEditing = (comment) => {
    setEditingCommentId(comment.id)
    setEditBody(comment.body)
    setEditAnon(comment.is_anon)
  }

  const cancelEditing = () => {
    setEditingCommentId(null)
    setEditBody('')
    setEditAnon(false)
  }

  // Helper: convert flat comments array to threaded structure
  const groupComments = (flatComments = []) => {
    const map = new Map()
    flatComments.forEach(c => {
      map.set(c.id, { ...c, replies: [] })
    })
    const roots = []
    flatComments.forEach(c => {
      if (c.parent_id) {
        const parent = map.get(c.parent_id)
        if (parent) {
          parent.replies.push(map.get(c.id))
        } else {
          // orphan reply, treat as top-level
          roots.push(map.get(c.id))
        }
      } else {
        roots.push(map.get(c.id))
      }
    })
    // sort roots by created_at desc, replies asc
    roots.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    roots.forEach(r => r.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
    return roots
  }

  // Initialize threaded comments
  useEffect(() => {
    setComments(groupComments(initialComments || []))
  }, [initialComments])

  // Utility functions to update comments state in real-time
  const addCommentRealtime = (newComment) => {
    setComments(prev => {
      // If it's a reply, find parent and append
      if (newComment.parent_id) {
        return prev.map(root => {
          if (root.id === newComment.parent_id) {
            return { ...root, replies: [...(root.replies || []), newComment] }
          }
          return root
        })
      }
      // top-level comment
      return [{ ...newComment, replies: [] }, ...prev]
    })
  }

  const updateCommentRealtime = (updated) => {
    setComments(prev => prev.map(root => {
      if (root.id === updated.id) {
        return { ...root, ...updated }
      }
      const updatedReplies = root.replies?.map(r => (r.id === updated.id ? { ...r, ...updated } : r)) || []
      return { ...root, replies: updatedReplies }
    }))
  }

  const deleteCommentRealtime = (deletedId) => {
    setComments(prev => prev.reduce((acc, root) => {
      if (root.id === deletedId) {
        // skip this root comment entirely
        return acc
      }
      const updatedReplies = root.replies?.filter(r => r.id !== deletedId) || []
      acc.push({ ...root, replies: updatedReplies })
      return acc
    }, []))
  }

  // Load user's votes
  useEffect(() => {
    async function loadUserVotes() {
      if (!userId) return
      const { data: votes } = await supabase
        .from('votes')
        .select('*')
        .eq('brother_id', userId)
      setUserVotes(votes || [])
    }
    loadUserVotes()
  }, [userId, supabase])

  // Add this component for rendering a single comment with its replies
  function CommentThread({ comment, onReply, onEdit, onDelete, canEdit, canDelete, userId, isRoundOpen, isAdmin }) {
    const [isExpanded, setIsExpanded] = useState(true)
    const [isReplying, setIsReplying] = useState(false)
    const [replyText, setReplyText] = useState('')
    const [isAnonymous, setIsAnonymous] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const handleReplySubmit = async (e) => {
      e.preventDefault()
      if (!replyText.trim() || !isRoundOpen) return

      setIsSubmitting(true)
      try {
        const response = await fetch('/api/comment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pnmId: comment.pnm_id,
            roundId: comment.round_id,
            body: replyText,
            isAnon: isAnonymous,
            parentId: comment.id
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to submit reply')
        }

        setReplyText('')
        setIsAnonymous(false)
        setIsReplying(false)

        // Refresh the page
        router.refresh()
      } catch (error) {
        console.error('Error submitting reply:', error)
        toast({
          title: 'Error',
          description: error.message || 'There was an error submitting your reply',
          variant: 'destructive',
        })
      } finally {
        setIsSubmitting(false)
      }
    }

    return (
      <div className="space-y-2">
        <Card className="shadow-none border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    {comment.is_anon ? (
                      <span className="text-sm">👤</span>
                    ) : (
                      <span className="text-sm">{getInitials(comment.brother?.first_name, comment.brother?.last_name)}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {comment.is_anon
                        ? 'Anonymous'
                        : `${comment.brother?.first_name || ''} ${comment.brother?.last_name || ''}`.trim() || 'Unknown Brother'}
                      {comment.brother_id === userId && <span className="text-xs text-gray-500 ml-2">(You)</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(comment.created_at)}
                      {comment.updated_at !== comment.created_at &&
                        <span className="ml-2">(edited)</span>}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(comment)}
                  >
                    <Edit className="h-4 w-4 text-gray-500" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(comment.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            </div>

            <p className="mt-2 whitespace-pre-wrap">{comment.body}</p>

            {isRoundOpen && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsReplying(!isReplying)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Reply
                </Button>
              </div>
            )}

            {isReplying && (
              <form onSubmit={handleReplySubmit} className="mt-4 space-y-4">
                <Textarea
                  placeholder="Write your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  disabled={!isRoundOpen || isSubmitting}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`reply-anon-${comment.id}`}
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                    disabled={!isRoundOpen || isSubmitting}
                  />
                  <label
                    htmlFor={`reply-anon-${comment.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Reply anonymously
                  </label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsReplying(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    type="submit"
                    disabled={!replyText.trim() || !isRoundOpen || isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Reply'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-8 space-y-2 border-l-2 border-gray-200 pl-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="ml-1">
                  {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                </span>
              </Button>
            </div>

            {isExpanded && (
              <div className="space-y-2">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="border rounded-md bg-gray-50 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                            {reply.is_anon ? (
                              <span className="text-xs">👤</span>
                            ) : (
                              <span className="text-xs">{getInitials(reply.brother?.first_name, reply.brother?.last_name)}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {reply.is_anon
                                ? 'Anonymous'
                                : `${reply.brother?.first_name || ''} ${reply.brother?.last_name || ''}`.trim() || 'Unknown Brother'}
                              {reply.brother_id === userId && (
                                <span className="text-xs text-gray-500 ml-2">(You)</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(reply.created_at)}
                              {reply.updated_at !== reply.created_at &&
                                <span className="ml-2">(edited)</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {(isRoundOpen && reply.brother_id === userId) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(reply)}
                          >
                            <Edit className="h-4 w-4 text-gray-500" />
                          </Button>
                        )}
                        {(isAdmin || (isRoundOpen && reply.brother_id === userId)) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(reply.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{reply.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Update URL when filters change
  const updateFilters = (newSearchTerm, newVotingFilter, newSortField, newSortOrder) => {
    const params = new URLSearchParams(window.location.search)
    if (newSearchTerm !== undefined) params.set('searchTerm', newSearchTerm)
    if (newVotingFilter !== undefined) params.set('votingFilter', newVotingFilter)
    if (newSortField !== undefined) params.set('sortField', newSortField)
    if (newSortOrder !== undefined) params.set('sortOrder', newSortOrder)
    router.push(`/candidate/${pnm.id}?${params.toString()}`)
  }

  // Handle search input
  const handleSearchChange = (e) => {
    setLocalSearchTerm(e.target.value)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    updateFilters(localSearchTerm, undefined, undefined, undefined)
  }

  return (
    <div className="relative min-h-screen">
      {/* Main Content Container */}
      <div className={`transition-all duration-300 ease-in-out ${isPanelOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Navigation Bar */}
        <div className="flex items-center gap-4 p-4 border-b bg-background">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              const params = new URLSearchParams(window.location.search)
              const searchTerm = params.get('searchTerm') || ''
              const votingFilter = params.get('votingFilter') || 'all'
              router.push(`/gallery?searchTerm=${encodeURIComponent(searchTerm)}&votingFilter=${votingFilter}`)
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Gallery
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <RoundStatusBadge/>
            {isRoundOpen && (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-3 w-3 mr-1" />
                <span>{timeLeft}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Card className="overflow-hidden">
                <div className="relative aspect-square w-full bg-gray-100">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={fullName}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-200">
                      <span className="text-8xl font-semibold text-gray-500">{initials}</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{fullName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Major</p>
                      <p className="font-medium">{pnm.major || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Year</p>
                      <p className="font-medium">{pnm.year || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">GPA</p>
                      <p className="font-medium">{pnm.gpa || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium truncate">{pnm.email || 'N/A'}</p>
                    </div>
                  </div>

                  {(voteStats || isRoundOpen) && (
                    <>
                      <div className="border-t pt-4">
                        {isRoundOpen && (
                          <div className="mb-4 space-y-2">
                            <h3 className="font-medium text-lg mb-2">Voting</h3>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-500">Your Rating:</p>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((score) => (
                                  <button
                                    key={score}
                                    className="focus:outline-none"
                                    onClick={() => handleVote(score)}
                                    aria-label={`Rate ${score} star`}
                                  >
                                    <Star
                                      className={`h-5 w-5 ${vote >= score
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                        }`}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {(voteStats && (statsPublished || isAdmin) && voteStats.count > 0) && (
                          <div>
                            <div className="flex flex-col md:flex-row gap-4 w-full mt-2">
                              <div className="flex-1 bg-secondary p-4 rounded-lg text-center shadow-sm">
                                <p className="text-xs text-muted-foreground mb-1 tracking-wide uppercase">Avg. Score</p>
                                <p className="text-3xl font-bold text-primary" aria-label="Average score">
                                  {Number(voteStats.average).toFixed(2)}
                                </p>
                              </div>
                              <div className="flex-1 bg-secondary p-4 rounded-lg text-center shadow-sm">
                                <p className="text-xs text-muted-foreground mb-1 tracking-wide uppercase">Total Votes</p>
                                <p className="text-3xl font-bold text-primary" aria-label="Total votes cast">
                                  {voteStats.count}
                                </p>
                              </div>
                            </div>
                            {/* Per-Round Breakdown */}
                            {voteStats.roundStats && Object.keys(voteStats.roundStats).length > 0 && (
                              <div>
                                <h4 className="text-lg font-medium mb-4">Round Breakdown</h4>
                                <div className="space-y-4">
                                  {Object.entries(voteStats.roundStats).map(([roundName, stats]) => (
                                    <div key={roundName} className="bg-background border rounded-lg p-4 shadow-sm">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium text-gray-800 truncate" title={roundName}>{roundName}</span>
                                        <span className="text-sm text-muted-foreground">
                                          {stats.count} {stats.count === 1 ? 'vote' : 'votes'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                                          <div
                                            className="h-full transition-all"
                                            style={{
                                              width: `${(stats.average / 5) * 100}%`,
                                              backgroundColor: `rgb(${255 - (stats.average / 5) * 255}, ${(stats.average / 5) * 255}, 0)`
                                            }}
                                            aria-label={`${stats.average.toFixed(2)} out of 5`}
                                          />
                                        </div>
                                        <span className="text-sm font-medium w-12 text-right">
                                          {stats.average.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {isRoundOpen && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add a Comment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCommentSubmit} className="space-y-4">
                      <Textarea
                        placeholder="Write your comment here..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        disabled={!isRoundOpen || isSubmitting}
                      />
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="anonymous"
                          checked={isAnonymous}
                          onCheckedChange={setIsAnonymous}
                          disabled={!isRoundOpen || isSubmitting}
                        />
                        <label
                          htmlFor="anonymous"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Post anonymously
                        </label>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={!comment.trim() || !isRoundOpen || isSubmitting}
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Comment'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-xl font-bold mb-4">Comments</h2>
            {comments.length === 0 ? (
               <Card className="bg-muted/50 shadow-none">
                 <CardContent className="p-6 text-center">
                   <p className="text-gray-500">No comments yet.</p>
                 </CardContent>
               </Card>
             ) : (
               <div className="space-y-4">
                 {comments.map((comment) => (
                   <CommentThread
                     key={comment.id}
                     comment={comment}
                     onReply={() => {}}
                     onEdit={startEditing}
                     onDelete={handleDeleteComment}
                     canEdit={canEditComment(comment)}
                     canDelete={canDeleteComment(comment)}
                     userId={userId}
                     isRoundOpen={isRoundOpen}
                     isAdmin={isAdmin}
                   />
                 ))}
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className={`fixed left-0 top-0 bottom-0 w-64 bg-background border-r transform transition-transform duration-300 ease-in-out z-40 ${isPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b space-y-2">
          <h2 className="font-semibold">All Candidates</h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search candidates..."
                value={localSearchTerm}
                onChange={handleSearchChange}
                className="pl-8 h-8 text-sm"
              />
            </form>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8">
                  <Filter className="h-3 w-3" />
                  <span className="flex-1 text-left">
                    {votingFilter === 'all' ? 'All PNMs' : 
                     votingFilter === 'voted' ? 'Voted' : 'Not Voted'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuLabel>Filter by Voting Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => updateFilters(undefined, 'all', undefined, undefined)}>
                  All PNMs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateFilters(undefined, 'voted', undefined, undefined)}>
                  Voted
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateFilters(undefined, 'not-voted', undefined, undefined)}>
                  Not Voted
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8">
                  <ArrowUpDown className="h-3 w-3" />
                  <span className="flex-1 text-left">
                    {sortField === 'name' ? 'Name' : 
                     sortField === 'avgScore' ? 'Average Score' : 'Total Votes'} 
                    ({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => updateFilters(undefined, undefined, 'name', 'asc')}>
                  Name (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateFilters(undefined, undefined, 'name', 'desc')}>
                  Name (Z-A)
                </DropdownMenuItem>
                {statsPublished && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => updateFilters(undefined, undefined, 'avgScore', 'desc')}>
                      Average Score (High to Low)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateFilters(undefined, undefined, 'avgScore', 'asc')}>
                      Average Score (Low to High)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => updateFilters(undefined, undefined, 'totalVotes', 'desc')}>
                      Total Votes (High to Low)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateFilters(undefined, undefined, 'totalVotes', 'asc')}>
                      Total Votes (Low to High)
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="p-2 space-y-2">
            {filteredCandidates.map((candidate) => (
              <Link
                key={candidate.id}
                href={getCandidateUrl(candidate.id)}
                className={`block p-2 rounded-lg transition-colors ${
                  candidate.id === pnm.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    {candidate.photo_url ? (
                      <Image
                        src={getPhotoPublicUrl(candidate.photo_url)}
                        alt={`${candidate.first_name} ${candidate.last_name}`}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs">
                        {getInitials(candidate.first_name, candidate.last_name)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {`${candidate.first_name} ${candidate.last_name}`}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {candidate.major || 'No major'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Navigation Buttons */}
      <div className={`fixed left-0 top-0 bottom-0 w-16 flex items-center justify-center z-10 ${isPanelOpen ? 'left-64' : ''}`}>
        <button
          onClick={handlePrevious}
          className="h-full w-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
          aria-label="Previous candidate"
          disabled={!prevCandidate}
        >
          <ChevronLeft className={`h-8 w-8 ${prevCandidate ? 'text-gray-400' : 'text-gray-200'}`} />
        </button>
      </div>
      <div className="fixed right-0 top-0 bottom-0 w-16 flex items-center justify-center z-10">
        <button
          onClick={handleNext}
          className="h-full w-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
          aria-label="Next candidate"
          disabled={!nextCandidate}
        >
          <ChevronRight className={`h-8 w-8 ${nextCandidate ? 'text-gray-400' : 'text-gray-200'}`} />
        </button>
      </div>
    </div>
  )
} 