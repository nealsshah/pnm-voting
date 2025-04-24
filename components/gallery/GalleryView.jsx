'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Star, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { formatTimeLeft } from '@/lib/utils'
import RoundStatusBadge from '@/components/rounds/RoundStatusBadge'
import PNMCard from '@/components/pnms/PNMCard'

export default function GalleryView({ pnms: initialPnms, currentRound, userVotes, userId }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [pnms, setPnms] = useState(initialPnms)
  const [filteredPNMs, setFilteredPNMs] = useState(initialPnms)
  const [timeLeft, setTimeLeft] = useState(currentRound?.event?.starts_at ? formatTimeLeft(currentRound.event.starts_at) : null)
  const [votes, setVotes] = useState(userVotes || [])
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Subscribe to pnms table changes
  useEffect(() => {
    const channel = supabase
      .channel('gallery-pnms-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pnms' 
      }, async () => {
        // Refresh pnms data
        const { data } = await supabase
          .from('pnms')
          .select('*')
          .order('last_name')
        
        if (data) {
          setPnms(data)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Filter PNMs based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPNMs(pnms)
      return
    }

    const searchTermLower = searchTerm.toLowerCase()
    const filtered = pnms.filter(pnm => {
      return (
        pnm.first_name?.toLowerCase().includes(searchTermLower) ||
        pnm.last_name?.toLowerCase().includes(searchTermLower) ||
        pnm.major?.toLowerCase().includes(searchTermLower)
      )
    })
    setFilteredPNMs(filtered)
  }, [searchTerm, pnms])

  // Update time left every second
  useEffect(() => {
    if (!currentRound?.event?.starts_at) return

    const timer = setInterval(() => {
      setTimeLeft(formatTimeLeft(currentRound.event.starts_at))
    }, 1000)

    return () => clearInterval(timer)
  }, [currentRound])

  // Listen for round status change broadcasts
  useEffect(() => {
    // Create a stable supabase client only once for the lifetime of this component
    const client = createClientComponentClient()

    const subscription = client.realtime
      .channel('rounds-channel')
      // Only listen for the specific ROUND_STATUS_CHANGE event to avoid unnecessary refresh cycles
      .on('broadcast', { event: 'ROUND_STATUS_CHANGE' }, () => {
        router.refresh()
      })
      .subscribe()

    // Cleanup the subscription on unmount
    return () => {
      client.removeChannel(subscription)
    }
  }, [router])

  // Handle voting
  const handleVote = async (pnmId, score) => {
    if (!currentRound || currentRound.status !== 'open') return
    
    try {
      const { data } = await supabase
        .from('votes')
        .upsert({
          brother_id: userId,
          pnm_id: pnmId,
          round_id: currentRound.id,
          score
        })
        .select()
      
      // Update local votes state
      setVotes(prev => {
        const existing = prev.findIndex(v => v.pnm_id === pnmId)
        if (existing >= 0) {
          return [...prev.slice(0, existing), data[0], ...prev.slice(existing + 1)]
        }
        return [...prev, data[0]]
      })
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  // Find vote for a specific PNM
  const findVote = (pnmId) => {
    return votes.find(v => v.pnm_id === pnmId)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">PNM Gallery</h1>
          {currentRound && (
            <div className="flex items-center gap-2">
              <RoundStatusBadge status={currentRound.status} />
              <span className="text-sm font-medium">
                {currentRound.event?.name}
              </span>
              {currentRound.status === 'open' && (
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{timeLeft}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search PNMs..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {!currentRound && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">No active voting round at this time.</p>
          </CardContent>
        </Card>
      )}

      {filteredPNMs.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">No PNMs found matching your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPNMs.map((pnm) => (
            <Link href={`/candidate/${pnm.id}`} key={pnm.id}>
              <PNMCard 
                pnm={pnm} 
                vote={findVote(pnm.id)} 
                onVote={handleVote}
                isVotingEnabled={currentRound?.status === 'open'}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
} 