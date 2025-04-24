'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { ChevronLeft, ChevronRight, Star, Edit, Clock, Trash2, ArrowLeft } from 'lucide-react'
import RoundStatusBadge from '@/components/rounds/RoundStatusBadge'
import { getInitials, formatTimeLeft, formatDate } from '@/lib/utils'
import { getPhotoPublicUrl } from '@/lib/supabase'
import VoteChart from './VoteChart'

export default function CandidateView({ 
  pnm, 
  currentRound, 
  userVote, 
  comments: initialComments, 
  voteStats, 
  userId,
  isAdmin
}) {
  const [comment, setComment] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [comments, setComments] = useState(initialComments || [])
  const [vote, setVote] = useState(userVote?.score || 0)
  const [timeLeft, setTimeLeft] = useState(currentRound?.event?.starts_at ? formatTimeLeft(currentRound.event.starts_at) : null)
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const fullName = `${pnm.first_name || ''} ${pnm.last_name || ''}`.trim()
  const initials = getInitials(pnm.first_name, pnm.last_name)
  const imageUrl = pnm.photo_url ? getPhotoPublicUrl(pnm.photo_url) : null
  const isRoundOpen = currentRound?.status === 'open'

  // Update time left every second
  useEffect(() => {
    if (!currentRound?.event?.starts_at) return

    const timer = setInterval(() => {
      setTimeLeft(formatTimeLeft(currentRound.event.starts_at))
    }, 1000)

    return () => clearInterval(timer)
  }, [currentRound])

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
      const { data, error } = await supabase
        .from('comments')
        .insert({
          brother_id: userId,
          pnm_id: pnm.id,
          round_id: currentRound.id,
          body: comment,
          is_anonymous: isAnonymous
        })
        .select('*, brother:brother_id(*)')

      if (error) throw error

      setComments(prev => [data[0], ...prev])
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
        description: 'There was an error submitting your comment',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      setComments(prev => prev.filter(c => c.id !== commentId))
      
      toast({
        title: 'Comment deleted',
        description: 'The comment has been removed',
      })
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast({
        title: 'Error',
        description: 'There was an error deleting the comment',
        variant: 'destructive',
      })
    }
  }

  const canDeleteComment = (comment) => {
    return isAdmin || comment.brother_id === userId
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Gallery
        </Button>
        
        {currentRound && (
          <div className="ml-auto flex items-center gap-2">
            <RoundStatusBadge status={currentRound.status} />
            <span className="text-sm font-medium">{currentRound.event?.name}</span>
            {isRoundOpen && (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-3 w-3 mr-1" />
                <span>{timeLeft}</span>
              </div>
            )}
          </div>
        )}
      </div>

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
                    <h3 className="font-medium text-lg mb-2">Voting</h3>
                    
                    {isRoundOpen ? (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
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
                                  className={`h-5 w-5 ${
                                    vote >= score
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : voteStats ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-500">Average Score:</p>
                          <p className="font-medium">{voteStats.average}/5</p>
                          <p className="text-sm text-gray-500 ml-2">({voteStats.total} votes)</p>
                        </div>
                        {voteStats.distribution && <VoteChart distribution={voteStats.distribution} />}
                      </div>
                    ) : null}
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

      <div>
        <h2 className="text-xl font-bold mb-4">Comments</h2>
        {comments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">No comments yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {comment.is_anonymous ? 'Anonymous' : comment.brother?.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(comment.created_at)}
                      </p>
                    </div>
                    {canDeleteComment(comment) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap">{comment.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 