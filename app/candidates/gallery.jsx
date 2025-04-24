"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { getCandidates } from "@/lib/candidates"
import { Spinner } from "@/components/ui/spinner"
import { motion, AnimatePresence } from "framer-motion"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

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

export function Gallery() {
  console.log("Gallery component rendering")
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  const loadCandidates = async () => {
    console.log("attempting to load candidates")
    try {
      console.log("Calling getCandidates()")
      const data = await getCandidates()
      console.log("Candidates data received:", data)
      setCandidates(data || [])
    } catch (error) {
      console.error('Error loading candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log("Gallery useEffect running")
    loadCandidates()

    // Subscribe to changes on the pnms table
    const channel = supabase
      .channel('pnms-gallery-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pnms' 
      }, () => {
        console.log("Realtime update received")
        loadCandidates()
      })
      .subscribe()

    return () => {
      console.log("Gallery component unmounting")
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (loading) {
    console.log("Gallery still loading...")
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="large" className="text-primary" />
      </div>
    )
  }

  console.log("Gallery rendering with candidates:", candidates)
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <AnimatePresence>
        {candidates && candidates.length > 0 ? (
          candidates.map((candidate, index) => (
            <motion.div
              key={candidate.id || `candidate-${index}`}
              variants={item}
              layout
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="overflow-hidden h-full">
                <CardContent className="p-4">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Image
                      src={candidate.photo_url || "/placeholder.jpg"}
                      alt={`${candidate.first_name} ${candidate.last_name}`}
                      width={100}
                      height={100}
                      className="rounded-full mx-auto transition-transform duration-200"
                    />
                  </motion.div>
                </CardContent>
                <CardFooter className="flex justify-between items-center p-4">
                  <p className="font-semibold">{`${candidate.first_name} ${candidate.last_name}`}</p>
                  <Link
                    href={`/candidate/${candidate.id}`}
                    className="text-blue-500 hover:text-blue-700 transition-colors duration-200"
                  >
                    View
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No PNMs found. Add PNMs through the admin interface.</p>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

