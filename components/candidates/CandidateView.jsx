'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { ChevronLeft, ChevronRight, Star, Edit, Clock, Trash2, MessageSquare, ThumbsUp, Filter, Search, ArrowUpDown, Send, ChevronDown, ChevronUp, Menu, X, LogOut, User as UserIcon, CheckCircle, Tag, HelpCircle, RotateCcw, Flag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import RoundStatusBadge from '@/components/rounds/RoundStatusBadge'
import { getInitials, formatTimeLeft, formatDate, getScoreColor } from '@/lib/utils'
import { getPhotoPublicUrl } from '@/lib/supabase'
import { getStatsPublished, getDniStatsPublished } from '@/lib/settings'
import { getCandidatesWithVoteStats, getInteractionStats, getVoteStats } from '@/lib/candidates'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'

export default function CandidateView({
  pnm,
  currentRound,
  userVote,
  userInteraction,
  comments: initialComments,
  attendance = [],
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
  const isDidNotInteract = currentRound?.type === 'did_not_interact'
  const [vote, setVote] = useState(userVote?.score || 0)
  const [interaction, setInteraction] = useState(userInteraction?.interacted)
  const [timeLeft, setTimeLeft] = useState(null)
  const [statsPublished, setStatsPublished] = useState(false)
  const [dniPublished, setDniPublished] = useState(false)
  const [voteStats, setVoteStats] = useState(initialVoteStats || null)
  const [interactionStats, setInteractionStats] = useState(null)
  const [allCandidates, setAllCandidates] = useState([])
  const [userVotes, setUserVotes] = useState([])
  const [myRoundVotes, setMyRoundVotes] = useState({})
  const [userMetadata, setUserMetadata] = useState(null)
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true)
  const touchStartX = useRef(null)

  // Map of candidate id -> array of tag colors (for sidebar filtering)
  const [candidateTagsMap, setCandidateTagsMap] = useState({})
  // Map of commentId -> array of likes rows
  const [likesMap, setLikesMap] = useState({})

  // Candidate tags (red, yellow, green)
  const [tags, setTags] = useState([])
  const colorClasses = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-400',
    green: 'bg-green-500'
  }

  // Prefetch adjacent candidate routes to speed up navigation
  useEffect(() => {
    if (prevId) {
      router.prefetch(`/candidate/${prevId}`)
    }
    if (nextId) {
      router.prefetch(`/candidate/${nextId}`)
    }
  }, [prevId, nextId, router])
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
    // setIsPanelOpen(open) // Removed as per edit hint
  }, [searchParams])

  // No longer shifting navbar; remove body panel-open toggling
  // (kept empty useEffect to avoid unused warnings if desired)

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

        const dniPub = await getDniStatsPublished()
        setDniPublished(dniPub)

        if (pnm?.id) {
          // Always fetch vote stats (for traditional rounds)
          const stats = await getVoteStats(pnm.id)
          setVoteStats(stats)

          // Fetch interaction stats aggregated across all DNI rounds
          if (dniPub || isAdmin) {
            const iStats = await getInteractionStats(pnm.id)
            setInteractionStats(iStats)
          }
        }
      } catch (e) {
        console.error('Failed to fetch settings / stats', e)
      }
    }

    fetchSettingsAndStats()
  }, [pnm?.id])

  // --- Candidate List Caching ---
  const CACHE_KEY = "candidatePanelCache"
  const CACHE_TIME_KEY = "candidatePanelCacheTime"
  const CACHE_TTL = 1000 * 60 * 5 // 5 minutes

  // Load all candidates for the panel (with caching)
  useEffect(() => {
    async function loadCandidates() {
      let usedCache = false
      setIsLoadingCandidates(true)

      // Try cache first
      if (typeof window !== 'undefined') {
        try {
          const cachedStr = localStorage.getItem(CACHE_KEY)
          const cachedTimeStr = localStorage.getItem(CACHE_TIME_KEY)
          if (cachedStr && cachedTimeStr) {
            const age = Date.now() - parseInt(cachedTimeStr, 10)
            if (age < CACHE_TTL) {
              setAllCandidates(JSON.parse(cachedStr))
              usedCache = true
              setIsLoadingCandidates(false)
            }
          }
        } catch (e) {
          console.warn('Failed to read candidate panel cache', e)
        }
      }

      if (!usedCache) {
        try {
          const candidates = await getCandidatesWithVoteStats()
          setAllCandidates(candidates)

          // Write cache
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify(candidates))
              localStorage.setItem(CACHE_TIME_KEY, Date.now().toString())
            } catch (e) {
              console.warn('Failed to write candidate panel cache', e)
            }
          }
        } catch (error) {
          console.error('Error loading candidates:', error)
        } finally {
          setIsLoadingCandidates(false)
        }
      }
    }
    loadCandidates()
  }, [])

  // Fetch tags for all candidates in panel
  useEffect(() => {
    async function loadAllTags() {
      if (!allCandidates || allCandidates.length === 0) return
      try {
        const ids = allCandidates.map(c => c.id)
        const { data, error } = await supabase
          .from('candidate_tags')
          .select('pnm_id, color')
          .in('pnm_id', ids)
        if (!error) {
          const map = {}
          data.forEach(row => {
            if (!map[row.pnm_id]) map[row.pnm_id] = []
            map[row.pnm_id].push(row.color)
          })
          setCandidateTagsMap(map)
        }
      } catch (err) {
        console.error('Failed to load candidate tags map', err)
      }
    }
    loadAllTags()
  }, [allCandidates, supabase])

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
      case 'bayesScore': {
        const bA = a.vote_stats?.bayesian || 0
        const bB = b.vote_stats?.bayesian || 0
        comparison = bA - bB
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
  const tagFilter = searchParams.get('tagFilter') || 'all'

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
    if (votingFilter !== 'all') {
      const hasVoted = userVotes.some(v => v.pnm_id === candidate.id)
      if (!(votingFilter === 'voted' ? hasVoted : !hasVoted)) return false
    }

    // Apply tag filter
    if (tagFilter !== 'all') {
      const tagsArr = candidateTagsMap[candidate.id] || []
      if (!tagsArr.includes(tagFilter)) return false
    }

    return matchesSearch
  })

  // Find current index and calculate prev/next IDs
  const currentIndex = filteredCandidates.findIndex(c => c.id === pnm.id)
  const prevCandidate = filteredCandidates[currentIndex - 1]
  const nextCandidate = filteredCandidates[currentIndex + 1]

  // --- Photo Preloading (after prev/next are available) ---
  useEffect(() => {
    if (!prevCandidate && !nextCandidate) return

    const urls = []
    if (prevCandidate?.photo_url) urls.push(getPhotoPublicUrl(prevCandidate.photo_url))
    if (nextCandidate?.photo_url) urls.push(getPhotoPublicUrl(nextCandidate.photo_url))

    const images = urls.map((src) => {
      if (typeof window === 'undefined') return null
      const img = new window.Image()
      img.src = src
      return img
    })

    return () => images.forEach((img) => (img.onload = null))
  }, [prevCandidate?.photo_url, nextCandidate?.photo_url])

  // Update navigation to use sorted order
  const handlePrevious = () => {
    if (prevCandidate) {
      const params = new URLSearchParams(window.location.search)
      router.push(`/candidate/${prevCandidate.id}?${params.toString()}`)
    }
  }

  const handleNext = () => {
    if (nextCandidate) {
      const params = new URLSearchParams(window.location.search)
      router.push(`/candidate/${nextCandidate.id}?${params.toString()}`)
    }
  }

  // Update the candidate links in the panel to preserve panel state
  const getCandidateUrl = (candidateId) => {
    const params = new URLSearchParams(window.location.search)
    return `/candidate/${candidateId}?${params.toString()}`
  }

  // Helper function to get the appropriate score value based on current sort field
  const getScoreValue = (candidate) => {
    switch (sortField) {
      case 'avgScore':
        return candidate.vote_stats?.average || 0
      case 'bayesScore':
        return candidate.vote_stats?.bayesian || 0
      case 'totalVotes':
        return candidate.vote_stats?.count || 0
      default:
        return candidate.vote_stats?.average || 0
    }
  }

  const handleVote = async (score) => {
    if (!isRoundOpen) return

    // Prevent admins from voting
    if (isAdmin) {
      toast({
        title: 'Admin Access Restricted',
        description: 'Administrators are not allowed to submit votes.',
        variant: 'destructive',
      })
      return
    }

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
      if (((statsPublished && dniPublished) || isAdmin) && (isDidNotInteract || !isDidNotInteract)) {
        try {
          const stats = await getVoteStats(pnm.id)
          setVoteStats(stats)
        } catch (err) {
          console.error('Failed to refresh vote stats', err)
        }
      }

      // Update local myRoundVotes for current round display
      if (currentRound) {
        const rn = currentRound.name || `Round ${currentRound.id}`
        setMyRoundVotes(prev => ({ ...prev, [rn]: score }))
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

  // Interaction handler for did_not_interact rounds
  const handleInteraction = async (didInteract) => {
    if (!isRoundOpen || interaction === didInteract) return

    // Prevent admins from submitting interactions
    if (isAdmin) {
      toast({
        title: 'Admin Access Restricted',
        description: 'Administrators are not allowed to submit interactions.',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pnmId: pnm.id,
          roundId: currentRound.id,
          interacted: didInteract,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit interaction')
      }

      setInteraction(didInteract)
      toast({
        title: 'Recorded',
        description: didInteract ? `Marked as INTERACTED` : `Marked as DID NOT INTERACT`,
      })

      // Refresh stats if visible
      if ((dniPublished && statsPublished) || isAdmin) {
        try {
          const iStats = await getInteractionStats(pnm.id)
          setInteractionStats(iStats)
        } catch (err) {
          console.error('Failed to refresh interaction stats', err)
        }
      }

      // Auto-advance to next candidate after short delay
      setTimeout(() => {
        handleNext()
      }, 500)
    } catch (err) {
      console.error('Error submitting interaction', err)
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Toggle candidate tag (admin only)
  const handleToggleTag = async (color) => {
    if (!isAdmin || !pnm?.id) return

    try {
      if (tags.includes(color)) {
        // Remove the flag
        const { error } = await supabase
          .from('candidate_tags')
          .delete()
          .eq('pnm_id', pnm.id)
          .eq('color', color)

        if (error) throw error

        // Optimistic update
        setTags((prev) => prev.filter((t) => t !== color))
      } else {
        // Remove all existing flags first, then add the new one
        const { error: deleteError } = await supabase
          .from('candidate_tags')
          .delete()
          .eq('pnm_id', pnm.id)

        if (deleteError) {
          console.error('Failed to remove existing tags', deleteError)
          toast({ title: 'Error', description: 'Failed to update tag', variant: 'destructive' })
          return
        }

        // Add the new flag
        const { error: insertError } = await supabase
          .from('candidate_tags')
          .insert({ pnm_id: pnm.id, color, created_by: userId })

        if (insertError) throw insertError

        // Optimistic update - replace all flags with just this one
        setTags([color])
      }

      toast({
        title: 'Flag updated',
        description: `${color.charAt(0).toUpperCase() + color.slice(1)} flag ${tags.includes(color) ? 'removed' : 'added'}`,
      })
    } catch (error) {
      console.error('Failed to toggle tag', error)
      toast({
        title: 'Error',
        description: 'Failed to update flag',
        variant: 'destructive'
      })
    }
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return

    setIsSubmitting(true)
    try {
      // If there's no current round, get the most recent round
      let roundId = currentRound?.id
      if (!roundId) {
        const { data: recentRound } = await supabase
          .from('rounds')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!recentRound) {
          throw new Error('No rounds available for commenting')
        }
        roundId = recentRound.id
      }

      const response = await fetch('/api/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pnmId: pnm.id,
          roundId: roundId,
          body: comment,
          isAnon: isAnonymous
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit comment')
      }

      const newComment = await response.json()
      // Update UI instantly
      addCommentRealtime(newComment)

      // Clear form inputs
      setComment('')
      setIsAnonymous(false)

      toast({
        title: 'Comment submitted',
        description: 'Your comment has been added',
      })
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

      // Remove comment locally
      deleteCommentRealtime(commentId)
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

      const updatedComment = await response.json()
      updateCommentRealtime(updatedComment)
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
    return comment.brother_id === userId
  }

  const canDeleteComment = (comment) => {
    return isAdmin || comment.brother_id === userId
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

  // ---------------------------------------------
  // Bulk fetch likes for all comments
  useEffect(() => {
    // Gather all comment ids (including replies)
    const ids = []
    const collectIds = (c) => {
      ids.push(c.id)
      if (c.replies && c.replies.length) {
        c.replies.forEach(collectIds)
      }
    }
    comments.forEach(collectIds)
    if (ids.length === 0) return

    const fetchLikesBulk = async () => {
      try {
        const res = await fetch(`/api/comment/likes?ids=${ids.join(',')}`)
        if (!res.ok) return
        const rows = await res.json()
        // Build mapping commentId -> array of likes rows
        const map = {}
        rows.forEach(row => {
          if (!map[row.comment_id]) map[row.comment_id] = []
          map[row.comment_id].push(row)
        })
        setLikesMap(map)
      } catch (e) {
        console.error('Error fetching bulk likes', e)
      }
    }
    fetchLikesBulk()
  }, [comments])

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

  // Load user's votes or interactions for sidebar progress / filters (current round only)
  useEffect(() => {
    async function loadUserMarks() {
      if (!userId || !currentRound?.id) return

      if (isDidNotInteract) {
        // Did-Not-Interact rounds use the interactions table
        const { data: interactions } = await supabase
          .from('interactions')
          .select('pnm_id')
          .eq('brother_id', userId)
          .eq('round_id', currentRound.id)

        setUserVotes(interactions || []) // contains objects with pnm_id for this round only
      } else {
        // Traditional voting rounds use the votes table
        const { data: votes } = await supabase
          .from('votes')
          .select('pnm_id')
          .eq('brother_id', userId)
          .eq('round_id', currentRound.id)

        setUserVotes(votes || [])
      }
    }
    loadUserMarks()
  }, [userId, supabase, isDidNotInteract, currentRound?.id])

  // Fetch user's votes for this candidate across all rounds (for breakdown display)
  useEffect(() => {
    async function loadMyRoundVotes() {
      if (!userId || !pnm?.id) return
      try {
        const { data: votesData } = await supabase
          .from('votes')
          .select('score, round_id, rounds(name)')
          .eq('brother_id', userId)
          .eq('pnm_id', pnm.id)

        const map = {}
          ; (votesData || []).forEach(v => {
            const rn = v.rounds?.name || `Round ${v.round_id}`
            map[rn] = v.score
          })
        setMyRoundVotes(map)
      } catch (err) {
        console.error('Failed to load user round votes', err)
      }
    }
    loadMyRoundVotes()
  }, [userId, pnm?.id, supabase])

  // Fetch user metadata for avatar
  useEffect(() => {
    async function fetchUserMetadata() {
      if (!userId) return
      try {
        const { data, error } = await supabase
          .from('users_metadata')
          .select('*')
          .eq('id', userId)
          .single()
        if (!error && data) {
          setUserMetadata(data)
        }
      } catch (err) {
        console.error('Failed to fetch user metadata', err)
      }
    }
    fetchUserMetadata()
  }, [userId, supabase])

  // Fetch candidate tags and subscribe for realtime updates
  useEffect(() => {
    if (!pnm?.id) return

    const fetchTags = async () => {
      const { data, error } = await supabase
        .from('candidate_tags')
        .select('color')
        .eq('pnm_id', pnm.id)
      if (!error) {
        setTags(data.map(t => t.color))
      }
    }

    fetchTags()

    const tagChannel = supabase
      .channel(`candidate_tags:${pnm.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_tags',
          filter: `pnm_id=eq.${pnm.id}`
        },
        () => {
          fetchTags()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tagChannel)
    }
  }, [pnm?.id, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // Add this component for rendering a single comment with its replies
  function CommentThread({ comment, onReply, onEdit, onDelete, canEdit, canDelete, userId, isRoundOpen, isAdmin, initialLikes, likesMap }) {
    const [isExpanded, setIsExpanded] = useState(true)
    const [isReplying, setIsReplying] = useState(false)
    const [replyText, setReplyText] = useState('')
    const [isAnonymous, setIsAnonymous] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showLikesPopover, setShowLikesPopover] = useState(false)
    const [likesWithUsers, setLikesWithUsers] = useState([])
    const [isLoadingLikes, setIsLoadingLikes] = useState(false)
    const router = useRouter()

    // Likes state
    const [likes, setLikes] = useState(initialLikes || [])
    const [isLiking, setIsLiking] = useState(false)

    // Sync likes state when parent updates likesMap (e.g., after bulk fetch or toggle from another component)
    useEffect(() => {
      setLikes(initialLikes || [])
    }, [initialLikes])

    // Fetch user details when popover is opened
    useEffect(() => {
      if (showLikesPopover && likes.length > 0) {
        fetchLikesWithUsers()
      }
    }, [showLikesPopover, likes.length])

    // Fetch user details for likes when popover is opened
    const fetchLikesWithUsers = async () => {
      if (likes.length === 0) return

      setIsLoadingLikes(true)
      try {
        const brotherIds = likes.map(like => like.brother_id)
        const { data: users } = await supabase
          .from('users_metadata')
          .select('id, first_name, last_name')
          .in('id', brotherIds)

        const likesWithUserData = likes.map(like => {
          const user = users?.find(u => u.id === like.brother_id)
          return {
            ...like,
            user: user || null
          }
        })
        setLikesWithUsers(likesWithUserData)
      } catch (error) {
        console.error('Error fetching likes with users:', error)
      } finally {
        setIsLoadingLikes(false)
      }
    }

    // -----------------------------------------
    // Nested reply item with like support
    function ReplyItem({ reply }) {
      const [likesR, setLikesR] = useState(likesMap[reply.id] || [])
      const [isLikingR, setIsLikingR] = useState(false)
      const [showLikesPopoverR, setShowLikesPopoverR] = useState(false)
      const [likesWithUsersR, setLikesWithUsersR] = useState([])
      const [isLoadingLikesR, setIsLoadingLikesR] = useState(false)

      useEffect(() => { setLikesR(likesMap[reply.id] || []) }, [likesMap, reply.id])

      const userLikedR = likesR.some(l => l.brother_id === userId)

      // Fetch user details for reply likes when popover is opened
      const fetchLikesWithUsersR = async () => {
        if (likesR.length === 0) return

        setIsLoadingLikesR(true)
        try {
          const brotherIds = likesR.map(like => like.brother_id)
          const { data: users } = await supabase
            .from('users_metadata')
            .select('id, first_name, last_name')
            .in('id', brotherIds)

          const likesWithUserData = likesR.map(like => {
            const user = users?.find(u => u.id === like.brother_id)
            return {
              ...like,
              user: user || null
            }
          })
          setLikesWithUsersR(likesWithUserData)
        } catch (error) {
          console.error('Error fetching reply likes with users:', error)
        } finally {
          setIsLoadingLikesR(false)
        }
      }

      // Fetch user details when popover is opened
      useEffect(() => {
        if (showLikesPopoverR && likesR.length > 0) {
          fetchLikesWithUsersR()
        }
      }, [showLikesPopoverR, likesR.length])

      const toggleLikeReply = async () => {
        if (isLikingR) return
        setIsLikingR(true)
        try {
          const res = await fetch(`/api/comment/${reply.id}/likes`, { method: 'POST' })
          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || 'Failed to like')
          }
          const { liked } = await res.json()
          setLikesR(prev => {
            if (liked) return [...prev, { brother_id: userId }]
            return prev.filter(l => l.brother_id !== userId)
          })
        } catch (e) {
          toast({ title: 'Error', description: e.message, variant: 'destructive' })
        } finally {
          setIsLikingR(false)
        }
      }

      return (
        <div key={reply.id} className="border rounded-md bg-secondary p-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                  {reply.is_anon ? (
                    <span className="text-xs">👤</span>
                  ) : (
                    <span className="text-xs">{getInitials(reply.brother?.first_name, reply.brother?.last_name)}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {reply.is_anon ? 'Anonymous' : `${reply.brother?.first_name || ''} ${reply.brother?.last_name || ''}`.trim() || 'Unknown Brother'}
                    {reply.brother_id === userId && <span className="text-xs text-muted-foreground ml-1">(You)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(reply.created_at)}
                    {reply.updated_at !== reply.created_at && <span className="ml-1">(edited)</span>}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              {(reply.brother_id === userId) && (
                <Button variant="ghost" size="icon" onClick={() => onEdit(reply)}>
                  <Edit className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
              {(isAdmin || (reply.brother_id === userId)) && (
                <Button variant="ghost" size="icon" onClick={() => onDelete(reply.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm whitespace-pre-wrap">{reply.body}</p>
          <div className="mt-2 flex items-center gap-2">
            {/* Like Button - Primary Action */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLikeReply}
              disabled={isLikingR}
              className={`transition-colors ${userLikedR ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <ThumbsUp className={`h-4 w-4 mr-1 transition-transform ${userLikedR ? 'fill-current' : ''}`} />
              {likesR.length}
            </Button>

            {/* View Likes Button - Secondary Action */}
            {likesR.length > 0 && (
              <Popover open={showLikesPopoverR} onOpenChange={setShowLikesPopoverR}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground transition-colors underline decoration-border hover:decoration-foreground"
                  >
                    <span className="text-xs">likes</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm text-foreground">Liked by {likesR.length} {likesR.length === 1 ? 'person' : 'people'}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLikesPopoverR(false)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {isLoadingLikesR ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600"></div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {likesWithUsersR.map((like, index) => (
                          <div key={like.brother_id} className="flex items-center gap-3 py-2 hover:bg-secondary rounded-md px-2 -mx-2 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-muted-foreground">
                                {like.user ? getInitials(like.user.first_name, like.user.last_name) : '👤'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-foreground">
                                {like.user
                                  ? `${like.user.first_name || ''} ${like.user.last_name || ''}`.trim() || 'Unknown Brother'
                                  : 'Unknown Brother'
                                }
                                {like.brother_id === userId && (
                                  <span className="text-xs text-primary ml-2 font-normal">(You)</span>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      )
    }

    const userLiked = likes.some(like => like.brother_id === userId)

    const handleToggleLike = async () => {
      if (isLiking) return
      setIsLiking(true)
      try {
        const res = await fetch(`/api/comment/${comment.id}/likes`, { method: 'POST' })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to toggle like')
        }
        const { liked } = await res.json()
        setLikes(prev => {
          if (liked) {
            return [...prev, { brother_id: userId }]
          }
          return prev.filter(l => l.brother_id !== userId)
        })
      } catch (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' })
      } finally {
        setIsLiking(false)
      }
    }

    const handleReplySubmit = async (e) => {
      e.preventDefault()
      if (!replyText.trim()) return

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

        const newReply = await response.json()
        addCommentRealtime(newReply)

        setReplyText('')
        setIsAnonymous(false)
        setIsReplying(false)
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
        <Card className="shadow-sm border border-muted">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
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
                      {comment.brother_id === userId && <span className="text-xs text-muted-foreground ml-2">(You)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
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
                    size="icon"
                    onClick={() => onEdit(comment)}
                  >
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(comment.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            </div>

            <p className="mt-2 whitespace-pre-wrap">{comment.body}</p>

            <div className="mt-2 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(!isReplying)}
                className="text-muted-foreground hover:text-muted-foreground"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Reply
              </Button>

              {/* Like Button - Primary Action */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleLike}
                disabled={isLiking}
                className={`transition-colors ${userLiked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <ThumbsUp className={`h-4 w-4 mr-1 transition-transform ${userLiked ? 'fill-current' : ''}`} />
                {likes.length}
              </Button>

              {/* View Likes Button - Secondary Action */}
              {likes.length > 0 && (
                <Popover open={showLikesPopover} onOpenChange={setShowLikesPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground transition-colors underline decoration-border hover:decoration-foreground"
                    >
                      <span className="text-xs">likes</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm text-foreground">Liked by {likes.length} {likes.length === 1 ? 'person' : 'people'}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowLikesPopover(false)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {isLoadingLikes ? (
                        <div className="flex items-center justify-center py-6">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600"></div>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {likesWithUsers.map((like, index) => (
                            <div key={like.brother_id} className="flex items-center gap-3 py-2 hover:bg-secondary rounded-md px-2 -mx-2 transition-colors">
                              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-medium text-muted-foreground">
                                  {like.user ? getInitials(like.user.first_name, like.user.last_name) : '👤'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-foreground">
                                  {like.user
                                    ? `${like.user.first_name || ''} ${like.user.last_name || ''}`.trim() || 'Unknown Brother'
                                    : 'Unknown Brother'
                                  }
                                  {like.brother_id === userId && (
                                    <span className="text-xs text-primary ml-2 font-normal">(You)</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {isReplying && (
              <form onSubmit={handleReplySubmit} className="mt-4 space-y-4">
                <Textarea
                  placeholder="Write your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  disabled={isSubmitting}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`reply-anon-${comment.id}`}
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                    disabled={isSubmitting}
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
                    disabled={!replyText.trim() || isSubmitting}
                  >
                    <Send className="mr-2 h-4 w-4" />
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
                className="text-muted-foreground hover:text-muted-foreground"
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
                  <ReplyItem key={reply.id} reply={reply} onEdit={onEdit} onDelete={onDelete} isRoundOpen={isRoundOpen} isAdmin={isAdmin} userId={userId} likesMap={likesMap} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Update URL when filters change
  const updateFilters = (newSearchTerm, newVotingFilter, newSortField, newSortOrder, newTagFilter) => {
    const params = new URLSearchParams(window.location.search)
    if (newSearchTerm !== undefined) params.set('searchTerm', newSearchTerm)
    if (newVotingFilter !== undefined) params.set('votingFilter', newVotingFilter)
    if (newSortField !== undefined) params.set('sortField', newSortField)
    if (newSortOrder !== undefined) params.set('sortOrder', newSortOrder)
    if (newTagFilter !== undefined) params.set('tagFilter', newTagFilter)
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

  const handleClearFilters = () => {
    setLocalSearchTerm('')
    router.push(`/candidate/${pnm.id}`)
  }

  return (
    <div className="relative min-h-screen pb-24 md:pb-0"> {/* Added extra bottom padding so content isn't hidden behind mobile action bar */}
      {/* Main Content */}
      <div className="relative isolate p-4 md:p-6 md:ml-0 lg:ml-80">
        <div className="absolute inset-x-0 top-0 h-[400px] -z-10 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 md:from-blue-600/10 md:via-purple-600/10 md:to-pink-600/10 blur-3xl pointer-events-none" />
        {/* Desktop Navigation Bar */}
        <div className="hidden lg:flex items-center justify-between mb-6 p-4 bg-secondary/40 border border-border rounded-lg shadow-md backdrop-blur">
          {/* Left: Previous button */}
          <div className="flex items-center gap-4">
            {prevCandidate ? (
              <Button variant="outline" size="sm" onClick={handlePrevious} className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden xl:inline">Previous</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden xl:inline">Previous</span>
              </Button>
            )}
          </div>

          {/* Center: Current Round Status */}
          <div className="flex items-center gap-3">
            <RoundStatusBadge />
          </div>

          {/* Right: Next button */}
          <div className="flex items-center gap-4">
            {nextCandidate ? (
              <Button variant="outline" size="sm" onClick={handleNext} className="flex items-center gap-2">
                <span className="hidden xl:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled className="flex items-center gap-2">
                <span className="hidden xl:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation context */}
        <div className="flex items-center mb-6 text-sm text-muted-foreground lg:hidden">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 px-2 py-1 hover:text-foreground"
            onClick={() => setIsSidePanelOpen(true)}
          >
            <Menu className="h-4 w-4" />
            <span>Candidates</span>
          </Button>
        </div>

        <div className={`grid gap-4 md:gap-6 ${(isRoundOpen || (voteStats && ((statsPublished && (!isDidNotInteract)) || isAdmin) && voteStats.count > 0)) ? 'lg:grid-cols-7' : 'lg:grid-cols-1'}`}>
          <div className={`space-y-4 md:space-y-6 ${(isRoundOpen || (voteStats && ((statsPublished && (!isDidNotInteract)) || isAdmin) && voteStats.count > 0)) ? 'lg:col-span-4' : 'lg:col-span-1'}`}>
            <Card className="overflow-hidden rounded-2xl shadow-lg">
              <div className="relative aspect-[3/4] w-full max-w-[400px] mx-auto bg-secondary">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={fullName}
                    fill
                    sizes="(max-width: 768px) 100vw, 66vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-secondary">
                    <span className="text-6xl md:text-8xl font-semibold text-muted-foreground">{initials}</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl md:text-2xl">{fullName}</CardTitle>
                  {tags.includes('red') && <span className={`h-3 w-3 rounded-full ${colorClasses.red}`}></span>}
                  {tags.includes('yellow') && <span className={`h-3 w-3 rounded-full ${colorClasses.yellow}`}></span>}
                  {tags.includes('green') && <span className={`h-3 w-3 rounded-full ${colorClasses.green}`}></span>}

                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="p-1 h-auto w-auto">
                          <Flag className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {['red', 'yellow', 'green'].map((color) => (
                          <DropdownMenuItem key={color} onClick={() => handleToggleTag(color)}>
                            <span className={`h-3 w-3 rounded-full ${colorClasses[color]} mr-2`}></span>
                            {color.charAt(0).toUpperCase() + color.slice(1)}
                            {tags.includes(color) && <CheckCircle className="h-4 w-4 ml-auto" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Major</p>
                    <p className="font-medium">{pnm.major || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Year</p>
                    <p className="font-medium">{pnm.year || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">GPA</p>
                    <p className="font-medium">{pnm.gpa || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium truncate">{pnm.email || 'N/A'}</p>
                  </div>
                </div>

                {/* Attendance */}
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-1">Events Attended</p>
                  {attendance.length === 0 ? (
                    <p className="text-sm font-medium">None recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {attendance.map((a) => (
                        <div key={`${a.event_name || a.attendance_events?.name}-${a.created_at}`} className="text-sm">
                          <div className="font-medium">
                            {a.attendance_events?.name || a.event_name}
                          </div>
                          {a.attendance_events?.event_date && (
                            <div className="text-xs text-muted-foreground">
                              {formatDate(a.attendance_events.event_date)}
                            </div>
                          )}
                          {a.attendance_events?.description && (
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {a.attendance_events.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right section: Voting / Interaction & Stats */}
          <div className={`space-y-4 md:space-y-6 ${(isRoundOpen || (voteStats && ((statsPublished && (!isDidNotInteract)) || isAdmin) && voteStats.count > 0)) ? 'lg:col-span-3' : 'hidden'}`}>
            {/* Only show voting/interaction card if round is open OR if there are stats to show */}
            {(isRoundOpen || (voteStats && ((statsPublished && (!isDidNotInteract)) || isAdmin) && voteStats.count > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{isDidNotInteract ? 'Interaction' : 'Voting'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* ----- Voting / Interaction ----- */}
                  {isRoundOpen && (
                    isDidNotInteract ? (
                      <div className="space-y-4">
                        <h3 className="font-medium text-base">Did you interact with {pnm.first_name}?</h3>
                        <div className="flex gap-4">
                          <Button
                            variant={interaction === true ? 'accent' : 'outline'}
                            className="flex-1 py-6 text-xl"
                            onClick={() => handleInteraction(true)}
                          >
                            Yes
                          </Button>
                          <Button
                            variant={interaction === false ? 'accent' : 'outline'}
                            className="flex-1 py-6 text-xl"
                            onClick={() => handleInteraction(false)}
                          >
                            No
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold mb-2">Rate {pnm.first_name}</h3>
                          <p className="text-sm text-gray-600 mb-4">How would you rate this candidate?</p>
                        </div>

                        <div className="grid grid-cols-5 gap-3">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              className={`relative group transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent-teal focus:ring-offset-2 rounded-lg p-4 border ${vote === score
                                ? 'bg-accent-teal text-accent-teal-foreground shadow-lg scale-105 border-accent-teal'
                                : 'bg-secondary/70 hover:bg-secondary text-foreground border-border'
                                }`}
                              onClick={() => handleVote(score)}
                              aria-label={`Rate ${score} out of 5`}
                            >
                              <div className="text-center">
                                <div className="text-2xl font-bold mb-1">{score}</div>
                                <div className="hidden sm:block text-[11px] sm:text-xs opacity-80 leading-tight">
                                  {score === 1 ? 'Poor' :
                                    score === 2 ? 'Fair' :
                                      score === 3 ? 'Good' :
                                        score === 4 ? 'Very Good' : 'Excellent'}
                                </div>
                              </div>

                              {/* Visual feedback */}
                              {vote === score && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent-teal rounded-full flex items-center justify-center">
                                  <CheckCircle className="h-4 w-4 text-accent-teal-foreground" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  )}

                  {/* ----- Stats ----- */}
                  {(voteStats && ((statsPublished && (!isDidNotInteract)) || isAdmin) && voteStats.count > 0) && (
                    <div className="space-y-6">
                      <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4">Vote Statistics</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-secondary p-4 rounded-lg text-center shadow-sm">
                          <p className="text-xs text-muted-foreground mb-1 tracking-wide uppercase">Avg. Score</p>
                          <p className="text-3xl font-bold text-primary" aria-label="Average score">
                            {Number(voteStats.average).toFixed(2)}
                          </p>
                        </div>
                        {voteStats.bayesian !== undefined && (
                          <div className="bg-secondary p-4 rounded-lg text-center shadow-sm">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <p className="text-xs text-muted-foreground tracking-wide uppercase">Weighted Avg</p>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                                    <HelpCircle className="h-3 w-3" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 text-sm">
                                  <div className="space-y-2">
                                    <h4 className="font-medium">Weighted Average</h4>
                                    <p className="text-muted-foreground">
                                      This weighted average uses a Bayesian approach to adjust scores based on the number of votes received.
                                      Candidates with fewer votes are adjusted toward the overall average to account
                                      for small sample sizes, while candidates with many votes retain scores closer
                                      to their raw average. This provides a more reliable comparison across all candidates.
                                    </p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <p className="text-3xl font-bold text-primary" aria-label="Weighted average score">
                              {Number(voteStats.bayesian).toFixed(2)}
                            </p>
                          </div>
                        )}
                        <div className="bg-secondary p-4 rounded-lg text-center shadow-sm">
                          <p className="text-xs text-muted-foreground mb-1 tracking-wide uppercase">Total Votes</p>
                          <p className="text-3xl font-bold text-primary" aria-label="Total votes cast">
                            {voteStats.count}
                          </p>
                        </div>
                      </div>

                      {voteStats.roundStats && Object.keys(voteStats.roundStats).length > 0 && (
                        <div>
                          <h4 className="text-lg font-medium mb-4">Round Breakdown</h4>
                          <div className="space-y-3">
                            {Object.entries(voteStats.roundStats).map(([roundName, stats]) => (
                              <div key={roundName} className="bg-background border rounded-lg p-4 shadow-sm">
                                {/* Round Header */}
                                <div className="flex justify-between items-center mb-3">
                                  <span className="font-semibold text-foreground truncate" title={roundName}>{roundName}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                      {stats.count === 0 ? 'No votes' : `${stats.count} ${stats.count === 1 ? 'vote' : 'votes'}`}
                                    </span>
                                    {myRoundVotes[roundName] !== undefined && (
                                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                        You: {myRoundVotes[roundName]}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Score Display */}
                                {stats.count > 0 ? (
                                  <div className="space-y-3">
                                    {/* Regular Average */}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-muted-foreground">Raw Average</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="w-20 h-2 rounded-full bg-secondary overflow-hidden">
                                          <div
                                            className="h-full transition-all"
                                            style={{
                                              width: `${(stats.average / 5) * 100}%`,
                                              backgroundColor: getScoreColor(stats.average)
                                            }}
                                          />
                                        </div>
                                        <span className="text-sm font-bold text-foreground min-w-[3rem] text-right">
                                          {stats.average.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Weighted Average */}
                                    {stats.bayesian !== undefined && (
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-muted-foreground">Weighted Average</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="w-20 h-2 rounded-full bg-secondary overflow-hidden">
                                            <div
                                              className="h-full transition-all"
                                              style={{
                                                width: `${(stats.bayesian / 5) * 100}%`,
                                                backgroundColor: getScoreColor(stats.bayesian)
                                              }}
                                            />
                                          </div>
                                          <span className="text-sm font-bold text-foreground min-w-[3rem] text-right">
                                            {stats.bayesian.toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center py-4">
                                    <span className="text-sm text-muted-foreground">No votes casted</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {interactionStats && interactionStats.roundStats && Object.keys(interactionStats.roundStats).length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-lg font-medium mb-4">DNI Round Breakdown</h4>
                          <div className="space-y-4">
                            {Object.entries(interactionStats.roundStats).map(([rName, s]) => (
                              <div key={rName} className="bg-background border rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium text-gray-800 truncate" title={rName}>{rName}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {(s.percent || 0).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                                    <div
                                      className="h-full"
                                      style={{
                                        width: `${s.percent || 0}%`,
                                        backgroundColor: getScoreColor((s.percent || 0) / 20)
                                      }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium w-20 text-right">
                                    {s.yes}/{s.yes + s.no}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!isDidNotInteract && (
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
                      disabled={isSubmitting}
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="anonymous"
                        checked={isAnonymous}
                        onCheckedChange={setIsAnonymous}
                        disabled={isSubmitting}
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
                      variant="accent"
                      className="w-full"
                      disabled={!comment.trim() || isSubmitting}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {isSubmitting ? 'Submitting...' : 'Submit Comment'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Comments Section */}
        {!isDidNotInteract && (
          <div className="mt-4 md:mt-6">
            <h2 className="text-xl font-bold mb-4">Comments</h2>
            {comments.length === 0 ? (
              <Card className="bg-muted/50 shadow-none">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No comments yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    onReply={() => { }}
                    onEdit={startEditing}
                    onDelete={handleDeleteComment}
                    canEdit={canEditComment(comment)}
                    canDelete={canDeleteComment(comment)}
                    userId={userId}
                    isRoundOpen={isRoundOpen}
                    isAdmin={isAdmin}
                    likesMap={likesMap}
                    initialLikes={likesMap[comment.id] || []}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Overlay when side panel is open */}
      {isSidePanelOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsSidePanelOpen(false)}
        />
      )}

      {/* Side Panel */}
      <aside
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
        onTouchMove={(e) => { if (touchStartX.current !== null) { const diff = e.touches[0].clientX - touchStartX.current; if (diff < -70) { setIsSidePanelOpen(false); touchStartX.current = null } } }}
        className={`fixed left-0 top-14 bottom-0 w-[280px] md:w-80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-r shadow-lg z-50 transform transition-transform duration-200 lg:translate-x-0 ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:z-30 flex flex-col`}
      >
        <div className="p-4 space-y-4 flex-1 overflow-hidden">
          {/* Close button for mobile */}
          <div className="flex justify-between items-center lg:hidden">
            <h2 className="font-semibold">Candidates</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidePanelOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search + filters */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              value={localSearchTerm}
              onChange={handleSearchChange}
              className="pl-10 h-9 text-sm rounded-full bg-secondary/50 focus:bg-background"
            />
          </form>

          {/* Clear filters button - only show if any filters are active */}
          {(searchTerm || votingFilter !== 'all' || tagFilter !== 'all' || sortField !== 'name' || sortOrder !== 'asc') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="w-full gap-2 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              Clear Filters
            </Button>
          )}

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 gap-2 rounded-full">
                  <Filter className="h-4 w-4" />
                  <span className="hidden md:inline">{votingFilter === 'all' ? 'All' : votingFilter === 'voted' ? 'Voted' : 'Not Voted'}</span>
                  <span className="md:hidden">{votingFilter === 'all' ? 'All' : votingFilter === 'voted' ? '✓' : '×'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[180px]">
                <DropdownMenuItem onClick={() => updateFilters(undefined, 'all', undefined, undefined)}>All PNMs</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateFilters(undefined, 'voted', undefined, undefined)}>Voted</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateFilters(undefined, 'not-voted', undefined, undefined)}>Not Voted</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tag filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 gap-2 rounded-full">
                  <Tag className="h-4 w-4" />
                  <span className="hidden md:inline">{tagFilter === 'all' ? 'Flags' : tagFilter.charAt(0).toUpperCase() + tagFilter.slice(1)}</span>
                  <span className="md:hidden">{tagFilter === 'all' ? 'All' : tagFilter.charAt(0).toUpperCase()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[180px]">
                <DropdownMenuItem onClick={() => updateFilters(undefined, undefined, undefined, undefined, 'all')}>All Flags</DropdownMenuItem>
                {['red', 'yellow', 'green'].map((color) => (
                  <DropdownMenuItem key={color} onClick={() => updateFilters(undefined, undefined, undefined, undefined, color)}>
                    <span className={`h-3 w-3 rounded-full ${colorClasses[color]} mr-2`}></span>
                    {color.charAt(0).toUpperCase() + color.slice(1)}
                    {tagFilter === color && <CheckCircle className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={isSortMenuOpen} onOpenChange={setIsSortMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-full">
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">
                    {sortField === 'name' ? 'Name' :
                      sortField === 'avgScore' ? 'Score' :
                        sortField === 'bayesScore' ? 'Weighted' :
                          sortField === 'totalVotes' ? 'Votes' : 'Sort'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[220px]">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">SORT BY</DropdownMenuLabel>

                {/* Name sorting */}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    updateFilters(undefined, undefined, 'name', sortField === 'name' && sortOrder === 'asc' ? 'desc' : 'asc')
                  }}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${sortField === 'name' ? 'bg-primary' : 'bg-muted'}`} />
                    <span className="font-medium">Name</span>
                  </div>
                  {sortField === 'name' && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">
                        {sortOrder === 'asc' ? 'A to Z' : 'Z to A'}
                      </span>
                      <ChevronUp className={`h-3 w-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    </div>
                  )}
                </DropdownMenuItem>

                {statsPublished && (
                  <>
                    <DropdownMenuSeparator />

                    {/* Score sorting */}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault()
                        updateFilters(undefined, undefined, 'avgScore', sortField === 'avgScore' && sortOrder === 'desc' ? 'asc' : 'desc')
                      }}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${sortField === 'avgScore' ? 'bg-primary' : 'bg-muted'}`} />
                        <span className="font-medium">Average Score</span>
                      </div>
                      {sortField === 'avgScore' && (
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-muted-foreground">
                            {sortOrder === 'desc' ? 'High to Low' : 'Low to High'}
                          </span>
                          <ChevronUp className={`h-3 w-3 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                        </div>
                      )}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault()
                        updateFilters(undefined, undefined, 'bayesScore', sortField === 'bayesScore' && sortOrder === 'desc' ? 'asc' : 'desc')
                      }}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${sortField === 'bayesScore' ? 'bg-primary' : 'bg-muted'}`} />
                        <span className="font-medium">Weighted Score</span>
                      </div>
                      {sortField === 'bayesScore' && (
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-muted-foreground">
                            {sortOrder === 'desc' ? 'High to Low' : 'Low to High'}
                          </span>
                          <ChevronUp className={`h-3 w-3 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                        </div>
                      )}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault()
                        updateFilters(undefined, undefined, 'totalVotes', sortField === 'totalVotes' && sortOrder === 'desc' ? 'asc' : 'desc')
                      }}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${sortField === 'totalVotes' ? 'bg-primary' : 'bg-muted'}`} />
                        <span className="font-medium">Total Votes</span>
                      </div>
                      {sortField === 'totalVotes' && (
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-muted-foreground">
                            {sortOrder === 'desc' ? 'Most to Least' : 'Least to Most'}
                          </span>
                          <ChevronUp className={`h-3 w-3 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                        </div>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Candidate list */}
          <ScrollArea className="h-[calc(100vh-12rem)] pr-2">
            <div className="space-y-1">
              {isLoadingCandidates ? (
                // Skeleton loading state
                Array.from({ length: 12 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-lg px-3 py-2">
                    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <Skeleton className="h-4 w-24" />
                      {statsPublished && (
                        <div className="flex items-center gap-1.5">
                          <Skeleton className="h-3.5 w-3.5 rounded" />
                          <Skeleton className="h-3 w-8" />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No candidates found</p>
                </div>
              ) : (
                filteredCandidates.map((candidate) => (
                  <Link
                    key={candidate.id}
                    href={getCandidateUrl(candidate.id)}
                    onClick={() => setIsSidePanelOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 md:px-3 md:py-2 transition-colors group min-h-[48px] ${candidate.id === pnm.id ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/80 hover:shadow-sm'
                      }`}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary flex-shrink-0 shadow-inner">
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
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {`${candidate.first_name} ${candidate.last_name}`}
                        </p>
                        {/* Flag indicator */}
                        {candidateTagsMap[candidate.id] && candidateTagsMap[candidate.id].length > 0 && (
                          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${colorClasses[candidateTagsMap[candidate.id][0]]}`}></span>
                        )}
                      </div>
                      {statsPublished && (
                        <div className="flex items-center gap-1.5">
                          <Star
                            className={`h-3.5 w-3.5 ${getScoreValue(candidate) >= 1
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                              }`}
                          />
                          <span className="text-xs font-medium text-muted-foreground">
                            {sortField === 'totalVotes'
                              ? getScoreValue(candidate).toString()
                              : getScoreValue(candidate).toFixed(1) || '—'
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Mobile Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-background border-t shadow-lg">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Prev Candidate */}
          {prevCandidate ? (
            <Button variant="ghost" size="icon" onClick={handlePrevious}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          ) : (
            <div className="w-10" />
          )}

          {/* Current Round Info */}
          <div className="flex-1 flex flex-col items-center min-w-0 px-2">
            <RoundStatusBadge />
          </div>

          {/* Next Candidate */}
          {nextCandidate ? (
            <Button variant="ghost" size="icon" onClick={handleNext}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>
    </div>
  )
}