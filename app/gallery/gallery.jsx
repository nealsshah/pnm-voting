"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, ArrowUpDown, ChevronDown, Filter } from "lucide-react"
import { getCandidates, getVoteStats } from "@/lib/candidates"
import { getStatsPublished } from "@/lib/settings"
import { Spinner } from "@/components/ui/spinner"
import { motion, AnimatePresence } from "framer-motion"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { getPhotoPublicUrl } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

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

export default function Gallery() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [statsPublished, setStatsPublished] = useState(false)
  const [votingFilter, setVotingFilter] = useState('all') // 'all', 'voted', 'not-voted'
  const [userVotes, setUserVotes] = useState([])
  const supabase = createClientComponentClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const loadCandidates = async () => {
    try {
      const data = await getCandidates()

      // Fetch vote statistics for each candidate in parallel
      const candidatesWithStats = await Promise.all(
        (data || []).map(async (candidate) => {
          try {
            const stats = await getVoteStats(candidate.id)
            return { ...candidate, vote_stats: stats }
          } catch (err) {
            console.error(`Failed to fetch vote stats for candidate ${candidate.id}`, err)
            return { ...candidate, vote_stats: { average: 0, count: 0 } }
          }
        })
      )

      setCandidates(candidatesWithStats)
    } catch (error) {
      console.error('Error loading candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCandidates()

    // Subscribe to changes on the pnms table
    const channel = supabase
      .channel('pnms-gallery-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pnms' 
      }, () => {
        loadCandidates()
      })
      .subscribe()

    // Initialize sort parameters from URL if present
    const urlSortField = searchParams.get('sortField')
    const urlSortOrder = searchParams.get('sortOrder')
    if (urlSortField) {
      setSortField(urlSortField)
    }
    if (urlSortOrder === 'asc' || urlSortOrder === 'desc') {
      setSortOrder(urlSortOrder)
    }

    async function fetchStatsPublished() {
      try {
        const published = await getStatsPublished()
        setStatsPublished(published)
      } catch (e) {
        console.error('Failed to fetch stats published flag', e)
      }
    }
    fetchStatsPublished()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, searchParams])

  // Load user's votes
  useEffect(() => {
    async function loadUserVotes() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: votes } = await supabase
          .from('votes')
          .select('*')
          .eq('brother_id', session.user.id)
        setUserVotes(votes || [])
      }
    }
    loadUserVotes()
  }, [supabase])

  const handleSort = (field, order) => {
    setSortField(field)
    setSortOrder(order)
    // Update URL with sort parameters
    const params = new URLSearchParams(searchParams)
    params.set('sortField', field)
    params.set('sortOrder', order)
    router.push(`?${params.toString()}`)
  }

  // Filter candidates based on search term and voting status
  const filtered = candidates.filter((c) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch = (
      (c.first_name || "").toLowerCase().includes(term) ||
      (c.last_name || "").toLowerCase().includes(term) ||
      (c.major || "").toLowerCase().includes(term) ||
      (c.year || "").toLowerCase().includes(term)
    )

    // Apply voting status filter
    if (votingFilter === 'all') return matchesSearch
    const hasVoted = userVotes.some(v => v.pnm_id === c.id)
    return matchesSearch && (votingFilter === 'voted' ? hasVoted : !hasVoted)
  })

  // Sort candidates based on sortField and sortOrder
  const sortedCandidates = [...filtered].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase()
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase()
        comparison = nameA.localeCompare(nameB)
        break;
      case 'avgScore':
        // Get vote stats for each candidate
        const scoreA = a.vote_stats?.average || 0
        const scoreB = b.vote_stats?.average || 0
        comparison = scoreA - scoreB
        break;
      case 'totalVotes':
        const votesA = a.vote_stats?.count || 0
        const votesB = b.vote_stats?.count || 0
        comparison = votesA - votesB
        break;
      default:
        comparison = 0
    }
    
    const result = sortOrder === 'asc' ? comparison : -comparison
    return result
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="large" className="text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search candidates..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {votingFilter === 'all' ? 'All PNMs' : 
                 votingFilter === 'voted' ? 'Voted' : 'Not Voted'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Voting Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setVotingFilter('all')}>
                All PNMs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setVotingFilter('voted')}>
                Voted
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setVotingFilter('not-voted')}>
                Not Voted
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                Sort by: {sortField === 'name' ? 'Name' : sortField === 'avgScore' ? 'Average Score' : 'Total Votes'}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleSort('name', 'asc')}>
                Name (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('name', 'desc')}>
                Name (Z-A)
              </DropdownMenuItem>
              {statsPublished ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleSort('avgScore', 'desc')}>
                    Average Score (High to Low)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort('avgScore', 'asc')}>
                    Average Score (Low to High)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleSort('totalVotes', 'desc')}>
                    Total Votes (High to Low)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort('totalVotes', 'asc')}>
                    Total Votes (Low to High)
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <AnimatePresence>
          {sortedCandidates && sortedCandidates.length > 0 ? (
            sortedCandidates.map((candidate, index) => (
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
                        src={candidate.photo_url ? getPhotoPublicUrl(candidate.photo_url) : "/placeholder.jpg"}
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
                      href={`/candidate/${candidate.id}?sortField=${sortField}&sortOrder=${sortOrder}`}
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
    </>
  )
}

