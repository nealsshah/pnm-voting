"use client";

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCandidate, getComments, getVoteStats, deleteCandidate } from "@/lib/candidates"

export function AdminCandidateView({
  candidateId,
  onPrevious,
  onNext,
  currentRound,
  onDeleteCandidate
}) {
  const [candidate, setCandidate] = useState(null)
  const [comments, setComments] = useState([])
  const [voteStats, setVoteStats] = useState({ average: 0, count: 0 })
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

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

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this candidate? This action cannot be undone.")) return;
    setDeleting(true)
    try {
      await deleteCandidate(candidateId)
      if (onDeleteCandidate) onDeleteCandidate(candidateId)
    } catch (error) {
      alert("Failed to delete candidate. See console for details.")
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="text-center">Loading candidate information...</div>
  }

  if (!candidate) {
    return <div className="text-center">No candidate found</div>
  }

  // Format round display text
  const roundDisplay = currentRound ? 
    (typeof currentRound === 'object' ? currentRound.event?.name : `${currentRound}`) : 
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
            <div className="grid gap-6">
              {/* Overall Statistics */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 bg-secondary p-6 rounded-lg text-center shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2 tracking-wide">Overall Average</p>
                  <p className="text-4xl font-bold text-primary" aria-label="Overall average score">
                    {voteStats.average.toFixed(2)}
                  </p>
                </div>
                <div className="flex-1 bg-secondary p-6 rounded-lg text-center shadow-sm">
                  <p className="text-sm text-muted-foreground mb-2 tracking-wide">Total Votes</p>
                  <p className="text-4xl font-bold text-primary" aria-label="Total votes cast">
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
                      By: {comment.is_anon 
                        ? "Anonymous" 
                        : `${comment.brother?.first_name || ''} ${comment.brother?.last_name || ''}`.trim() || "Unknown Brother"}
                    </p>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
          <div className="flex justify-end">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Candidate"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
