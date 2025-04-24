"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminCandidateView } from "./candidates"
import { getCandidates } from "@/lib/candidates"
import { useAuth } from "../auth/auth-context"
import { Spinner } from "@/components/ui/spinner"
import { motion, AnimatePresence } from "framer-motion"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export function AdminDashboard() {
  const [currentRound, setCurrentRound] = useState(1)
  const [isRoundActive, setIsRoundActive] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const { signOut } = useAuth()

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
  }

  const endRound = () => {
    setIsRoundActive(false)
    setCurrentRound((prevRound) => prevRound + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="large" className="text-primary" />
      </div>
    )
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 p-6"
    >
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Current Round: {currentRound}</h3>
                <p className="text-sm text-gray-500">
                  Status: {isRoundActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="space-x-4">
                <Button
                  onClick={isRoundActive ? endRound : startRound}
                  variant={isRoundActive ? "destructive" : "default"}
                >
                  {isRoundActive ? 'End Round' : 'Start Round'}
                </Button>
                <Button onClick={signOut} variant="outline">Sign Out</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence mode="wait">
        {candidates.length > 0 && (
          <motion.div
            key={currentCandidateIndex}
            variants={item}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <AdminCandidateView
              candidateId={candidates[currentCandidateIndex]?.id}
              onPrevious={() => setCurrentCandidateIndex((prev) => Math.max(0, prev - 1))}
              onNext={() => setCurrentCandidateIndex((prev) => Math.min(candidates.length - 1, prev + 1))}
              currentRound={currentRound}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
} 