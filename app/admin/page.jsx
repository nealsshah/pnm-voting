"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AdminCandidateView } from "./candidates"
import { Gallery } from "../candidates/gallery"
import { AccountManagement } from "../auth/account-management"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCandidates } from "@/lib/candidates"

function AdminView() {
  const [currentRound, setCurrentRound] = useState(1)
  const [isRoundActive, setIsRoundActive] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCandidates() {
      try {
        const data = await getCandidates()
        setCandidates(data)
      } catch (error) {
        console.error('Error loading candidates:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCandidates()
  }, [])

  const startRound = () => {
    setIsRoundActive(true)
    // TODO: Implement logic to start a new round
  }

  const endRound = () => {
    setIsRoundActive(false)
    setCurrentRound((prevRound) => prevRound + 1)
    // TODO: Implement logic to end the current round
  }

  const refreshPNMData = async () => {
    try {
      const response = await fetch('/api/refresh-pnm', {
        method: 'POST',
      })
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message)
      }
      
      // Reload candidates after refresh
      const updatedCandidates = await getCandidates()
      setCandidates(updatedCandidates)
      
      // Show success message to user
      alert('PNM data refreshed successfully')
    } catch (error) {
      console.error('Error refreshing PNM data:', error)
      alert('Failed to refresh PNM data')
    }
  }

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

  if (loading) {
    return <div className="text-center">Loading candidates...</div>
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="candidate">Candidate View</TabsTrigger>
          <TabsTrigger value="gallery">Gallery View</TabsTrigger>
          <TabsTrigger value="accounts">Account Management</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Round Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Current Round: {currentRound}</span>
                {isRoundActive ? (
                  <Button onClick={endRound} variant="destructive" size="lg">
                    End Round {currentRound}
                  </Button>
                ) : (
                  <Button onClick={startRound} size="lg">
                    Start Round {currentRound}
                  </Button>
                )}
              </div>
              <Button onClick={refreshPNMData} variant="outline" className="w-full">
                Refresh PNM Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="candidate" className="mt-6">
          {candidates.length > 0 ? (
            <AdminCandidateView
              candidateId={candidates[currentCandidateIndex].id}
              onPrevious={handlePreviousCandidate}
              onNext={handleNextCandidate}
              currentRound={currentRound}
            />
          ) : (
            <div className="text-center">No candidates available</div>
          )}
        </TabsContent>
        <TabsContent value="gallery" className="mt-6">
          <Gallery />
        </TabsContent>
        <TabsContent value="accounts" className="mt-6">
          <AccountManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminView;

