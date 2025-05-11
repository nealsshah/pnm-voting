"use client";
import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getCandidate, submitVote, submitComment, getComments, getVoteStats } from "@/lib/candidates"
import { useAuth } from "../auth/auth-context"
import { Spinner } from "@/components/ui/spinner"
import { motion, AnimatePresence } from "framer-motion"

export function Candidate({
  candidateId,
  onPrevious,
  onNext,
  currentRound
}) {
  const { user } = useAuth()
  const [candidate, setCandidate] = useState(null)
  const [vote, setVote] = useState("")
  const [comment, setComment] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [comments, setComments] = useState([])
  const [voteStats, setVoteStats] = useState({ average: 0, count: 0 })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        console.log('Loading data for candidateId:', candidateId);
        const [candidateData, commentsData, statsData] = await Promise.all([
          getCandidate(candidateId),
          getComments(candidateId),
          getVoteStats(candidateId)
        ]);
        console.log('Candidate data:', candidateData);
        console.log('Comments data:', commentsData);
        console.log('Stats data:', statsData);
        
        setCandidate(candidateData)
        setComments(commentsData || [])
        setVoteStats(statsData)
      } catch (error) {
        console.error('Error loading candidate data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (candidateId) {
      loadData()
    }
  }, [candidateId])

  const handleVote = async () => {
    if (!vote || submitting || !user?.id) return
    
    setSubmitting(true)
    try {
      console.log('Submitting vote:', {
        candidateId,
        vote: parseInt(vote),
        userId: user.id
      });
      await submitVote(candidateId, parseInt(vote), user.id)
      const newStats = await getVoteStats(candidateId)
      setVoteStats(newStats)
    } catch (error) {
      console.error('Error submitting vote:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleComment = async () => {
    if (!comment.trim() || submitting || !user?.id) return
    
    setSubmitting(true)
    try {
      console.log('Submitting comment:', {
        candidateId,
        comment,
        userId: user.id,
        isAnonymous
      });
      await submitComment(candidateId, comment, user.id, isAnonymous)
      const newComments = await getComments(candidateId)
      setComments(newComments || [])
      setComment("")
      setIsAnonymous(false)
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="large" className="text-primary" />
      </div>
    )
  }

  if (!candidate) {
    return <div className="text-center">No candidate found</div>
  }

  return (
    <div className="relative px-16">
      {/* Navigation Arrows */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
        <button
          onClick={onPrevious}
          className="p-3 rounded-full bg-white/90 hover:bg-white shadow-lg transition-colors border border-gray-200"
          aria-label="Previous candidate"
        >
          <ChevronLeft className="h-8 w-8 text-gray-700" />
        </button>
      </div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
        <button
          onClick={onNext}
          className="p-3 rounded-full bg-white/90 hover:bg-white shadow-lg transition-colors border border-gray-200"
          aria-label="Next candidate"
        >
          <ChevronRight className="h-8 w-8 text-gray-700" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={candidateId}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative">
              <Card className="w-full max-w-3xl mx-auto">
                <CardHeader>
                  <div className="text-center mb-4">
                    <span className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-sm font-semibold">
                      Round {currentRound}
                    </span>
                  </div>
                  <CardTitle className="text-2xl text-center">
                    {`${candidate.first_name} ${candidate.last_name}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-center">
                    <Image
                      src={candidate.photo_url || "/placeholder.jpg"}
                      alt={`${candidate.first_name} ${candidate.last_name}`}
                      width={300}
                      height={300}
                      className="rounded-lg"
                    />
                  </div>
                  <div className="grid gap-2">
                    <p><strong>Year:</strong> {candidate.year}</p>
                    <p><strong>Major:</strong> {candidate.major}</p>
                    <p><strong>GPA:</strong> {candidate.gpa}</p>
                    {/* Only display events if they exist in the schema */}
                    {(candidate.info_session || candidate.bp || candidate.deib || 
                      candidate.lw || candidate.mtb || candidate.rr || candidate.sn) && (
                      <>
                        <p><strong>Events Attended:</strong></p>
                        <ul className="list-disc list-inside">
                          {candidate.info_session && <li>Information Session</li>}
                          {candidate.bp && <li>Business Professional</li>}
                          {candidate.deib && <li>DEIB</li>}
                          {candidate.lw && <li>Leadership Workshop</li>}
                          {candidate.mtb && <li>Meet the Brothers</li>}
                          {candidate.rr && <li>Resume Review</li>}
                          {candidate.sn && <li>Social Night</li>}
                        </ul>
                      </>
                    )}
                  </div>

                  {/* Display comments section if there are any comments */}
                  {comments && comments.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-3">Comments</h3>
                      <ScrollArea className="h-[200px] rounded-md border p-4">
                        <div className="space-y-4">
                          {comments.map((comment) => (
                            <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex justify-between items-start">
                                <p className="text-sm font-medium">
                                  {comment.is_anonymous 
                                    ? "Anonymous"
                                    : comment.brother?.email || "Unknown Brother"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <p className="mt-1 text-sm">{comment.body}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Vote (1-5)</h3>
                <RadioGroup
                  value={vote}
                  onValueChange={setVote}
                  className="flex space-x-4"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <div key={value} className="flex items-center space-x-2">
                      <RadioGroupItem value={value.toString()} id={`vote-${value}`} />
                      <Label htmlFor={`vote-${value}`}>{value}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="flex items-center justify-between">
                <Button onClick={handleVote} disabled={!vote || submitting}>
                  Submit Vote
                </Button>
                {voteStats.count > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Average: {voteStats.average.toFixed(1)} ({voteStats.count} votes)
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="space-y-4">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="comment">Leave a comment</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Your comment here..."
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                />
                <Label htmlFor="anonymous">Post anonymously</Label>
              </div>
              <Button onClick={handleComment} disabled={!comment.trim() || submitting}>
                Submit Comment
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-between mt-6"
          >
            <Button
              onClick={onPrevious}
              variant="outline"
              disabled={submitting}
            >
              Previous
            </Button>
            <Button
              onClick={onNext}
              disabled={submitting}
            >
              Next
            </Button>
          </motion.div>

          {submitting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 flex items-center justify-center bg-black/50"
            >
              <Spinner size="large" className="text-white" />
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

