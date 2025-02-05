"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { getCandidates } from "@/lib/candidates"

export function Gallery() {
  const [candidates, setCandidates] = useState([])
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

  if (loading) {
    return <div className="text-center">Loading candidates...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {candidates.map((candidate, index) => (
        <Card 
          key={candidate.id || `candidate-${index}`} 
          className="overflow-hidden"
        >
          <CardContent className="p-4">
            <Image
              src={candidate.photo_url || "/placeholder.jpg"}
              alt={`${candidate.first_name} ${candidate.last_name}`}
              width={100}
              height={100}
              className="rounded-full mx-auto"
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <p className="font-semibold">{`${candidate.first_name} ${candidate.last_name}`}</p>
            <Link href={`/candidate/${candidate.id}`} className="text-blue-500 hover:underline">
              View
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

