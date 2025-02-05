"use client"

import { useState, useEffect } from "react"
import { Candidate } from "./candidate"
import { Gallery } from "./gallery"
import { AdminView } from "./admin"
import { Login } from "./login"
import { useAuth, AuthProvider } from "./auth"
import { Button } from "@/components/ui/button"
import { getCandidates } from "@/lib/candidates"

function Home() {
  const [view, setView] = useState("candidate")
  const { user, logout } = useAuth()
  const [candidates, setCandidates] = useState([])
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCandidates() {
      try {
        const data = await getCandidates()
        if (data && data.length > 0) {
          setCandidates(data)
          setCurrentCandidateIndex(0) // Ensure we start with the first candidate
        }
      } catch (error) {
        console.error('Error loading candidates:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCandidates()
  }, [])

  const handlePreviousCandidate = () => {
    setCurrentCandidateIndex((prev) => 
      prev > 0 ? prev - 1 : candidates.length - 1
    )
  }

  const handleNextCandidate = () => {
    setCurrentCandidateIndex((prev) => 
      prev < candidates.length - 1 ? prev + 1 : 0
    )
  }

  if (!user) {
    return <Login />;
  }

  if (loading) {
    return <div className="text-center p-4">Loading candidates...</div>
  }

  if (candidates.length === 0) {
    return <div className="text-center p-4">No candidates available</div>
  }

  if (user.role === "admin") {
    return (
      <main className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button onClick={logout}>Logout</Button>
        </div>
        <AdminView />
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Business Fraternity Candidate Voting</h1>
        <Button onClick={logout}>Logout</Button>
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
          onPrevious={handlePreviousCandidate}
          onNext={handleNextCandidate}
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

