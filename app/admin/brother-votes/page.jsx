'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default function BrotherVotesPage() {
  const [brothers, setBrothers] = useState([])
  const [rounds, setRounds] = useState([])
  const [votes, setVotes] = useState({})
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadData() {
      try {
        // Get all brothers
        const { data: brothersData, error: brothersError } = await supabase
          .from('users_metadata')
          .select('id, email, first_name, last_name')
          .eq('role', 'brother')
          .order('last_name')

        if (brothersError) throw brothersError

        // Get all rounds
        const { data: roundsData, error: roundsError } = await supabase
          .from('rounds')
          .select('id, name, type')
          .order('created_at')

        if (roundsError) throw roundsError

        // Get all votes (for traditional rounds)
        const { data: votesData, error: votesError } = await supabase
          .from('votes')
          .select('*')

        if (votesError) throw votesError

        // Get all interactions (for DNI rounds)
        const { data: interactionsData, error: interactionsError } = await supabase
          .from('interactions')
          .select('*')

        if (interactionsError) throw interactionsError

        // Process votes and interactions into a more usable format
        const votesByBrother = {}

        // Process traditional votes
        votesData.forEach(vote => {
          if (!votesByBrother[vote.brother_id]) {
            votesByBrother[vote.brother_id] = {}
          }
          if (!votesByBrother[vote.brother_id][vote.round_id]) {
            votesByBrother[vote.brother_id][vote.round_id] = 0
          }
          votesByBrother[vote.brother_id][vote.round_id]++
        })

        // Process DNI interactions
        interactionsData.forEach(interaction => {
          if (!votesByBrother[interaction.brother_id]) {
            votesByBrother[interaction.brother_id] = {}
          }
          if (!votesByBrother[interaction.brother_id][interaction.round_id]) {
            votesByBrother[interaction.brother_id][interaction.round_id] = 0
          }
          votesByBrother[interaction.brother_id][interaction.round_id]++
        })

        setBrothers(brothersData)
        setRounds(roundsData)
        setVotes(votesByBrother)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase])

  const exportToCsv = () => {
    // Create CSV content
    const csvRows = []

    // Add header row
    const headers = ['Brother Name', ...rounds.map(round => round.name)]
    csvRows.push(headers)

    // Add data rows
    brothers.forEach(brother => {
      const row = [
        `${brother.first_name || ''} ${brother.last_name || ''}`.trim() || brother.email,
        ...rounds.map(round => votes[brother.id]?.[round.id] || 0)
      ]
      csvRows.push(row)
    })

    // Convert to CSV string
    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `brother_votes_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="large" className="text-primary" />
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Brother Votes</h1>
        <Button onClick={exportToCsv}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Voting Activity by Brother</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brother</TableHead>
                  {rounds.map(round => (
                    <TableHead key={round.id}>
                      {round.name}
                      {round.type === 'did_not_interact' && (
                        <span className="text-xs text-gray-500 block">(DNI)</span>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {brothers.map(brother => (
                  <TableRow key={brother.id}>
                    <TableCell className="font-medium">
                      {`${brother.first_name || ''} ${brother.last_name || ''}`.trim() || brother.email}
                    </TableCell>
                    {rounds.map(round => (
                      <TableCell key={round.id}>
                        {votes[brother.id]?.[round.id] || 0}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 