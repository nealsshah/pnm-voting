'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export default function InteractionStatsPage() {
    const supabase = createClientComponentClient()
    const [loading, setLoading] = useState(true)
    const [candidates, setCandidates] = useState([])
    const [stats, setStats] = useState({}) // pnmId -> { interacted, notInteracted, percent }
    const [round, setRound] = useState(null)

    useEffect(() => {
        async function loadData() {
            try {
                // Get latest did_not_interact round (open or last closed)
                const { data: rounds } = await supabase
                    .from('rounds')
                    .select('*')
                    .eq('type', 'did_not_interact')
                    .order('opened_at', { ascending: false })
                    .limit(1)

                const latestRound = rounds?.[0] || null
                setRound(latestRound)

                // Fetch all candidates
                const { data: pnms } = await supabase
                    .from('pnms')
                    .select('id, first_name, last_name')
                    .order('last_name')

                setCandidates(pnms || [])

                if (latestRound) {
                    const { data: interactions } = await supabase
                        .from('interactions')
                        .select('pnm_id, interacted')
                        .eq('round_id', latestRound.id)

                    const statMap = {}
                    interactions.forEach(i => {
                        if (!statMap[i.pnm_id]) statMap[i.pnm_id] = { yes: 0, no: 0 }
                        i.interacted ? statMap[i.pnm_id].yes++ : statMap[i.pnm_id].no++
                    })

                    Object.keys(statMap).forEach(id => {
                        const { yes, no } = statMap[id]
                        statMap[id].percent = yes + no === 0 ? 0 : (yes / (yes + no)) * 100
                    })

                    setStats(statMap)
                }
            } catch (e) {
                console.error('Failed to load interaction stats', e)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [supabase])

    const exportCsv = () => {
        const csvRows = []
        csvRows.push(['Candidate', 'Interacted', 'Did Not Interact', 'Percent Interacted'])
        candidates.forEach(c => {
            const s = stats[c.id] || { yes: 0, no: 0, percent: 0 }
            csvRows.push([
                `${c.first_name} ${c.last_name}`.trim(),
                s.yes || 0,
                s.no || 0,
                `${(s.percent || 0).toFixed(0)}%`
            ])
        })

        const csvContent = csvRows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `interaction_stats_${new Date().toISOString().split('T')[0]}.csv`)
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
        <div className="container py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Interaction Stats {round ? `– ${round.name}` : ''}</h1>
                <Button onClick={exportCsv}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Candidate Interaction Rates</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Candidate</TableHead>
                                    <TableHead>Interacted</TableHead>
                                    <TableHead>Did Not Interact</TableHead>
                                    <TableHead>Percent Interacted</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {candidates.map(c => {
                                    const s = stats[c.id] || { yes: 0, no: 0, percent: 0 }
                                    return (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-medium">{`${c.first_name} ${c.last_name}`}</TableCell>
                                            <TableCell>{s.yes || 0}</TableCell>
                                            <TableCell>{s.no || 0}</TableCell>
                                            <TableCell>{(s.percent || 0).toFixed(0)}%</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 