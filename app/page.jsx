"use client"

import { useState, useEffect } from "react"
import { Candidate } from "./candidates/candidate-view"
import { Gallery } from "./candidates/gallery"
import Login from "./auth/login"
import { useAuth, AuthProvider } from "./auth/auth-context"
import { Button } from "@/components/ui/button"
import { getCandidates } from "@/lib/candidates"
import { useRouter } from "next/navigation"

function Home() {
  const [view, setView] = useState("candidate")
  const { user, signOut, isAdmin } = useAuth()
  const [candidates, setCandidates] = useState([])
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (user && isAdmin) {
      router.push('/(admin)')
      return
    }

    async function loadCandidates() {
      try {
        const data = await getCandidates()
        if (data && data.length > 0) {
          setCandidates(data)
          setCurrentCandidateIndex(0)
        }
      } catch (error) {
        console.error('Error loading candidates:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadCandidates()
    } else {
      setLoading(false)
    }
  }, [user, isAdmin, router])

  if (!user) {
    return <Login />
  }

  if (loading) {
    return <div className="text-center p-4">Loading candidates...</div>
  }

  if (candidates.length === 0) {
    return <div className="text-center p-4">No candidates available</div>
  }

  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Business Fraternity Candidate Voting</h1>
        <Button onClick={signOut}>Sign Out</Button>
      </div>
      <div className="mb-4 flex space-x-4">
        <Button
          onClick={() => setView("candidate")}
          variant={view === "candidate" ? "default" : "outline"}
        >
          Candidate View
        </Button>
        <Button
          onClick={() => setView("gallery")}
          variant={view === "gallery" ? "default" : "outline"}
        >
          Gallery View
        </Button>
      </div>
      {view === "candidate" ? (
        <Candidate
          candidateId={candidates[currentCandidateIndex].id}
          onPrevious={() => setCurrentCandidateIndex((prev) => prev > 0 ? prev - 1 : candidates.length - 1)}
          onNext={() => setCurrentCandidateIndex((prev) => prev < candidates.length - 1 ? prev + 1 : 0)}
          currentRound={1}
        />
      ) : (
        <Gallery />
      )}
    </main>
  )
}

export default function HomeWrapper() {
  return (
    <AuthProvider>
      <Home />
    </AuthProvider>
  )
}

