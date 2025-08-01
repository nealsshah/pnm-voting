'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Search, Users, Vote, Eye, EyeOff, Play, Square, RefreshCw, Lock, Unlock } from 'lucide-react'

export default function DelibsManager() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const { toast } = useToast()

    const [currentRound, setCurrentRound] = useState(null)
    const [allPnms, setAllPnms] = useState([])
    const [filteredPnms, setFilteredPnms] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedPnmId, setSelectedPnmId] = useState('')
    const [liveResults, setLiveResults] = useState({ yes: 0, no: 0, total: 0 })
    const [brotherVotes, setBrotherVotes] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [sealedResults, setSealedResults] = useState({})

    // Load current round and PNMs
    useEffect(() => {
        async function loadData() {
            setIsLoading(true)
            try {
                // Get current Delibs round
                const { data: round } = await supabase
                    .from('rounds')
                    .select('*')
                    .eq('status', 'open')
                    .eq('type', 'delibs')
                    .single()

                if (round) {
                    setCurrentRound(round)
                    setSelectedPnmId(round.current_pnm_id || '')
                    setSealedResults(round.sealed_results || {})
                }

                // Get all PNMs
                const { data: pnms } = await supabase
                    .from('pnms')
                    .select('id, first_name, last_name, email')
                    .order('first_name')

                setAllPnms(pnms || [])
                setFilteredPnms(pnms || [])
            } catch (error) {
                console.error('Error loading data:', error)
                toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' })
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [supabase, toast])

    // Filter PNMs based on search
    useEffect(() => {
        if (!searchTerm) {
            setFilteredPnms(allPnms)
        } else {
            const filtered = allPnms.filter(pnm =>
                `${pnm.first_name} ${pnm.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pnm.email.toLowerCase().includes(searchTerm.toLowerCase())
            )
            setFilteredPnms(filtered)
        }
    }, [searchTerm, allPnms])

    // Load live results when active PNM changes
    useEffect(() => {
        if (!currentRound || !selectedPnmId) return

        async function loadResults(showRefreshSpinner = false) {
            try {
                if (showRefreshSpinner) setIsRefreshing(true)

                console.log('Loading results for:', { roundId: currentRound.id, pnmId: selectedPnmId })

                // Get vote counts - first try basic query
                const { data: votes, error } = await supabase
                    .from('delibs_votes')
                    .select('decision, brother_id')
                    .eq('round_id', currentRound.id)
                    .eq('pnm_id', selectedPnmId)

                console.log('Votes query result:', { votes, error })

                if (error) {
                    console.error('Error fetching votes:', error)
                    return
                }

                const yes = votes?.filter(v => v.decision).length || 0
                const no = votes?.filter(v => !v.decision).length || 0
                setLiveResults({ yes, no, total: yes + no })

                // Don't load individual vote details for privacy
                setBrotherVotes([])
            } catch (error) {
                console.error('Error loading results:', error)
            } finally {
                if (showRefreshSpinner) setIsRefreshing(false)
            }
        }

        loadResults()

        // No more real-time subscriptions, manual refresh only

        return () => {
            // cleanup if needed
        }
    }, [currentRound, selectedPnmId, supabase])

    // Manual refresh function for the button
    const manualRefresh = async () => {
        if (!currentRound || !selectedPnmId) return

        setIsRefreshing(true)
        try {
            console.log('Manual refresh for:', { roundId: currentRound.id, pnmId: selectedPnmId })

            const { data: votes, error } = await supabase
                .from('delibs_votes')
                .select('decision, brother_id')
                .eq('round_id', currentRound.id)
                .eq('pnm_id', selectedPnmId)

            if (error) {
                console.error('Error fetching votes:', error)
                return
            }

            const yes = votes?.filter(v => v.decision).length || 0
            const no = votes?.filter(v => !v.decision).length || 0
            setLiveResults({ yes, no, total: yes + no })
        } catch (error) {
            console.error('Error during manual refresh:', error)
        } finally {
            setIsRefreshing(false)
        }
    }

    const updateRound = async (updates) => {
        if (!currentRound) return

        try {
            console.log('Sending update:', { roundId: currentRound.id, ...updates })

            const response = await fetch('/api/delibs/control', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roundId: currentRound.id, ...updates })
            })

            if (!response.ok) {
                const errorData = await response.json()
                console.error('Update failed:', errorData)
                throw new Error(errorData.details || errorData.error || 'Failed to update round')
            }

            const updatedRound = await response.json()
            setCurrentRound(updatedRound)

            toast({ title: 'Updated', description: 'Round settings updated successfully' })
        } catch (error) {
            console.error('Error updating round:', error)
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    }

    const setActivePnm = async (pnmId) => {
        await updateRound({ currentPnmId: pnmId })
        setSelectedPnmId(pnmId)
    }

    const toggleVoting = async () => {
        await updateRound({ votingOpen: !currentRound?.voting_open })
    }

    const toggleResults = async () => {
        await updateRound({ resultsRevealed: !currentRound?.results_revealed })
    }

    const toggleSeal = async () => {
        const currentSealedIds = currentRound?.sealed_pnm_ids || []
        const isCurrentlySealed = currentSealedIds.includes(selectedPnmId)

        if (isCurrentlySealed) {
            // Unseal the current PNM
            const newSealedIds = currentSealedIds.filter(id => id !== selectedPnmId)
            const newSealedResults = { ...sealedResults }
            delete newSealedResults[selectedPnmId]

            await updateRound({
                sealedPnmIds: newSealedIds,
                sealedResults: newSealedResults
            })
            setSealedResults(newSealedResults)
        } else {
            // Seal the current PNM with current results
            const newSealedIds = [...currentSealedIds, selectedPnmId]

            // Ensure we have valid results to seal
            if (!liveResults || (liveResults.yes === 0 && liveResults.no === 0 && liveResults.total === 0)) {
                toast({
                    title: 'Warning',
                    description: 'No votes to seal. Load results first by selecting the candidate.',
                    variant: 'destructive'
                })
                return
            }

            const newSealedResults = {
                ...sealedResults,
                [selectedPnmId]: { ...liveResults, timestamp: new Date().toISOString() }
            }

            console.log('Sealing with results:', liveResults)

            await updateRound({
                sealedPnmIds: newSealedIds,
                sealedResults: newSealedResults
            })
            setSealedResults(newSealedResults)
        }
    }

    if (isLoading) {
        return <div className="p-6">Loading...</div>
    }

    if (!currentRound) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="p-6 text-center">
                        <h2 className="text-xl font-semibold mb-2">No Active Delibs Round</h2>
                        <p className="text-muted-foreground">Create a Delibs round from the Rounds Manager to use this panel.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const selectedPnm = allPnms.find(p => p.id === selectedPnmId)

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Delibs Control Panel</h1>
                <Badge variant={currentRound.status === 'open' ? 'default' : 'secondary'}>
                    Round {currentRound.status}
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PNM Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Select Active Candidate
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search candidates..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-1">
                            {filteredPnms.map((pnm) => {
                                const isSealed = (currentRound?.sealed_pnm_ids || []).includes(pnm.id)
                                const sealedResult = sealedResults[pnm.id]

                                return (
                                    <div
                                        key={pnm.id}
                                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedPnmId === pnm.id
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'hover:bg-secondary border-border'
                                            }`}
                                        onClick={() => setActivePnm(pnm.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium">{pnm.first_name} {pnm.last_name}</div>
                                                <div className="text-xs opacity-80">{pnm.email}</div>
                                            </div>
                                            {isSealed && sealedResult && (
                                                <div className="text-right">
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <Lock className="h-3 w-3" />
                                                        <span className="font-medium">
                                                            {sealedResult.yes}✓ / {sealedResult.no}✗
                                                        </span>
                                                    </div>
                                                    <div className="text-xs opacity-60">
                                                        {sealedResult.total} votes
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {selectedPnm && (
                            <div className="border-t pt-4">
                                <p className="text-sm text-muted-foreground">Currently Active:</p>
                                <p className="font-medium">{selectedPnm.first_name} {selectedPnm.last_name}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Vote className="h-5 w-5" />
                            Voting Controls
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Voting Status</p>
                                <Badge variant={currentRound.voting_open ? 'default' : 'secondary'}>
                                    {currentRound.voting_open ? 'Open' : 'Closed'}
                                </Badge>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Results</p>
                                <Badge variant={currentRound.results_revealed ? 'default' : 'secondary'}>
                                    {currentRound.results_revealed ? 'Revealed' : 'Hidden'}
                                </Badge>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Seal Status</p>
                                <Badge variant={(currentRound.sealed_pnm_ids || []).length > 0 ? 'destructive' : 'secondary'}>
                                    {(currentRound.sealed_pnm_ids || []).length} Sealed
                                </Badge>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Button
                                onClick={toggleVoting}
                                variant={currentRound.voting_open ? 'destructive' : 'default'}
                                className="w-full"
                                disabled={!selectedPnmId}
                            >
                                {currentRound.voting_open ? (
                                    <>
                                        <Square className="h-4 w-4 mr-2" />
                                        Close Voting
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-4 w-4 mr-2" />
                                        Open Voting
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={toggleResults}
                                variant="outline"
                                className="w-full"
                                disabled={!selectedPnmId}
                            >
                                {currentRound.results_revealed ? (
                                    <>
                                        <EyeOff className="h-4 w-4 mr-2" />
                                        Hide Results
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Reveal Results
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={toggleSeal}
                                variant={(currentRound.sealed_pnm_ids || []).includes(selectedPnmId) ? 'destructive' : 'outline'}
                                className="w-full"
                                disabled={!selectedPnmId}
                            >
                                {(currentRound.sealed_pnm_ids || []).includes(selectedPnmId) ? (
                                    <>
                                        <Unlock className="h-4 w-4 mr-2" />
                                        Unseal Round
                                    </>
                                ) : (
                                    <>
                                        <Lock className="h-4 w-4 mr-2" />
                                        Seal Round
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Live Results */}
                {selectedPnmId && (
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle>Results - {selectedPnm?.first_name} {selectedPnm?.last_name}</CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={manualRefresh}
                                disabled={isRefreshing}
                                className="h-8 w-8 p-0"
                            >
                                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{liveResults.yes}</div>
                                    <div className="text-sm text-green-600">Yes Votes</div>
                                </div>
                                <div className="text-center p-4 bg-red-50 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">{liveResults.no}</div>
                                    <div className="text-sm text-red-600">No Votes</div>
                                </div>
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">{liveResults.total}</div>
                                    <div className="text-sm text-blue-600">Total Votes</div>
                                </div>
                            </div>

                            <div className="text-center text-sm text-muted-foreground mt-4">
                                Individual votes are kept private to maintain anonymity.
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}