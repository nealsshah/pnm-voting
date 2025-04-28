"use client";

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCandidate, getComments, getVoteStats } from "@/lib/candidates"

export function AdminCandidateView({
  candidateId,
  onPrevious,
  onNext,
  currentRound
}) {
  const [candidate, setCandidate] = useState(null)
  const [comments, setComments] = useState([])
  const [voteStats, setVoteStats] = useState({ average: 0, count: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
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

    if (candidateId) {
      loadData()
    }
  }, [candidateId])

  if (loading) {
    return <div className="text-center">Loading candidate information...</div>
  }

  if (!candidate) {
    return <div className="text-center">No candidate found</div>
  }

  // Format round display text
  const roundDisplay = currentRound ? 
    (typeof currentRound === 'object' ? currentRound.event?.name : `Round ${currentRound}`) : 
    'No active round';

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-0 top-1/2 transform -translate-y-1/2"
        onClick={onPrevious}
      >
        <ChevronLeft className="h-8 w-8" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-0 top-1/2 transform -translate-y-1/2"
        onClick={onNext}
      >
        <ChevronRight className="h-8 w-8" />
      </Button>
      <Card className="w-full max-w-3xl mx-auto shadow-lg">
        <CardHeader className="text-center">
          <div className="mb-4">
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
              {roundDisplay}
            </span>
          </div>
          <CardTitle className="text-3xl">
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
              className="rounded-lg shadow-md"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 text-lg">
            <p><strong>Year:</strong> {candidate.year}</p>
            <p><strong>Major:</strong> {candidate.major}</p>
            <p><strong>GPA:</strong> {candidate.gpa}</p>
            <p><strong>Email:</strong> {candidate.email}</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Events Attended</h3>
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
          <div>
            <h3 className="text-xl font-semibold mb-2">Voting Statistics</h3>
            <div className="bg-secondary p-4 rounded-lg">
              <p className="text-lg">Average Vote: {voteStats.average.toFixed(1)}</p>
              <p className="text-lg">Total Votes: {voteStats.count}</p>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Comments</h3>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              {comments.length === 0 ? (
                <p className="text-center text-gray-500">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="mb-4 p-3 bg-secondary rounded-md">
                    <p className="font-medium">{comment.body}</p>
                    <p className="text-sm text-muted-foreground">
                      By: {comment.is_anon ? "Anonymous" : comment.brother?.email}
                    </p>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

