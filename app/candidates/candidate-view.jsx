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
        const [candidateData, commentsData, statsData] = await Promise.all([
          getCandidate(candidateId),
          getComments(candidateId),
          getVoteStats(candidateId)
        ])
        setCandidate(candidateData)
        setComments(commentsData)
        setVoteStats(statsData)
      } catch (error) {
        console.error('Error loading candidate data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [candidateId])

  const handleVote = async () => {
    if (!vote || submitting) return
    
    setSubmitting(true)
    try {
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
    if (!comment.trim() || submitting) return
    
    setSubmitting(true)
    try {
      await submitComment(candidateId, comment, user.id, isAnonymous)
      const newComments = await getComments(candidateId)
      setComments(newComments)
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
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
              <Button variant="ghost" size="icon" onClick={onPrevious}>
                <ChevronLeft className="h-8 w-8" />
              </Button>
            </div>
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
              <Button variant="ghost" size="icon" onClick={onNext}>
                <ChevronRight className="h-8 w-8" />
              </Button>
            </div>
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
                </div>
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
          <button
            onClick={onPrevious}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={submitting}
          >
            Previous
          </button>
          <button
            onClick={onNext}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            disabled={submitting}
          >
            Next
          </button>
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
  )
}

