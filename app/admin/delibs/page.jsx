'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Separator } from '@/components/ui/separator'
import { Search, Users, Vote, Eye, EyeOff, Play, Square, RefreshCw, Lock, Unlock, Trash2 } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function DelibsManager() {
    const supabase = createClientComponentClient()
    const { toast } = useToast()

    const [currentRound, setCurrentRound] = useState(null)
    const [allPnms, setAllPnms] = useState([])
    const [filteredPnms, setFilteredPnms] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedPnmId, setSelectedPnmId] = useState('')
    const [liveResults, setLiveResults] = useState({ yes: 0, no: 0, total: 0 })
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [sealedResults, setSealedResults] = useState({})

    // Initial data load for round and PNMs
    useEffect(() => {
        async function loadData() {
            setIsLoading(true)
            try {
                const { data: round } = await supabase
                    .from('rounds')
                    .select('*')
                    .eq('status', 'open')
                    .eq('type', 'delibs')
                    .single()

                if (round) {
                    setCurrentRound(round)
                    // Set initial PNM if one was already active
                    if (round.current_pnm_id) {
                        setSelectedPnmId(round.current_pnm_id)
                    }
                    setSealedResults(round.sealed_results || {})
                }

                const { data: pnms } = await supabase
                    .from('pnms')
                    .select('id, first_name, last_name, email')
                    .order('first_name')

                setAllPnms(pnms || [])
                setFilteredPnms(pnms || [])
            } catch (error) {
                console.error('Error loading data:', error)
                toast({ title: 'Error', description: 'Failed to load initial data.', variant: 'destructive' })
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [supabase, toast])

    // Filter PNMs based on search term
    useEffect(() => {
        const filtered = searchTerm
            ? allPnms.filter(pnm =>
                `${pnm.first_name} ${pnm.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pnm.email.toLowerCase().includes(searchTerm.toLowerCase())
            )
            : allPnms
        setFilteredPnms(filtered)
    }, [searchTerm, allPnms])

    // Load vote results when the active PNM changes
    useEffect(() => {
        if (selectedPnmId) {
            manualRefresh()
        } else {
            // Clear results when no PNM is selected
            setLiveResults({ yes: 0, no: 0, total: 0 })
        }
    }, [selectedPnmId])


    const manualRefresh = async () => {
        if (!currentRound || !selectedPnmId) return

        setIsRefreshing(true)
        try {
            const { data: votes, error } = await supabase
                .from('delibs_votes')
                .select('decision')
                .eq('round_id', currentRound.id)
                .eq('pnm_id', selectedPnmId)

            if (error) throw error

            const yes = votes?.filter(v => v.decision).length || 0
            const no = votes?.filter(v => !v.decision).length || 0
            setLiveResults({ yes, no, total: yes + no })

        } catch (error) {
            console.error('Error refreshing results:', error)
            toast({ title: 'Error', description: 'Failed to fetch latest vote counts.', variant: 'destructive' })
        } finally {
            setIsRefreshing(false)
        }
    }

    const updateRound = async (updates) => {
        if (!currentRound) return

        try {
            const response = await fetch('/api/delibs/control', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roundId: currentRound.id, ...updates })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.details || errorData.error || 'Failed to update round')
            }

            const updatedRound = await response.json()
            setCurrentRound(updatedRound) // Update local state with the returned fresh data
            toast({ title: 'Success', description: 'Round updated successfully.' })
            return updatedRound
        } catch (error) {
            console.error('Error updating round:', error)
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    }

    const setActivePnm = async (pnmId) => {
        if (pnmId === selectedPnmId) return // Avoid unnecessary updates
        await updateRound({ currentPnmId: pnmId })
        setSelectedPnmId(pnmId)
    }

    const toggleVoting = async () => await updateRound({ votingOpen: !currentRound?.voting_open })
    const toggleResults = async () => await updateRound({ resultsRevealed: !currentRound?.results_revealed })

    const toggleSeal = async () => {
        const currentSealedIds = currentRound?.sealed_pnm_ids || []
        const isCurrentlySealed = currentSealedIds.includes(selectedPnmId)

        if (isCurrentlySealed) {
            // Unseal: Remove PNM from sealed list
            const newSealedIds = currentSealedIds.filter(id => id !== selectedPnmId)
            const newSealedResults = { ...sealedResults }
            delete newSealedResults[selectedPnmId]
            const updatedRound = await updateRound({ sealedPnmIds: newSealedIds, sealedResults: newSealedResults })
            if (updatedRound) setSealedResults(updatedRound.sealed_results)
        } else {
            // Seal: Add PNM to sealed list with current results
            if (liveResults.total === 0) {
                toast({ title: 'Cannot Seal', description: 'There are no votes to seal for this candidate.', variant: 'destructive' })
                return
            }
            const newSealedIds = [...currentSealedIds, selectedPnmId]
            const newSealedResults = {
                ...sealedResults,
                [selectedPnmId]: { ...liveResults, timestamp: new Date().toISOString() }
            }
            const updatedRound = await updateRound({ sealedPnmIds: newSealedIds, sealedResults: newSealedResults })
            if (updatedRound) setSealedResults(updatedRound.sealed_results)
        }
    }

    const clearResults = async () => {
        if (!selectedPnmId || !currentRound?.id) return

        try {
            const response = await fetch('/api/delibs/clear-results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pnmId: selectedPnmId, roundId: currentRound.id })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to clear results')
            }
            setLiveResults({ yes: 0, no: 0, total: 0 })
            toast({
                title: 'Results Cleared',
                description: `All votes for the selected candidate have been cleared.`,
            })
        } catch (error) {
            console.error('Error clearing results:', error)
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    }

    const selectedPnm = allPnms.find(p => p.id === selectedPnmId)
    const isSealed = (currentRound?.sealed_pnm_ids || []).includes(selectedPnmId)

    if (isLoading) {
        return <div className="p-6 text-center text-lg font-medium">Loading Delibs Manager...</div>
    }

    if (!currentRound) {
        return (
            <div className="p-6">
                <Card className="max-w-lg mx-auto">
                    <CardContent className="p-8 text-center">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h2 className="mt-4 text-xl font-semibold">No Active Delibs Round</h2>
                        <p className="mt-2 text-muted-foreground">Create a Delibs round from the Rounds Manager to use this panel.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                <h1 className="text-2xl md:text-3xl font-bold">Delibs Control Panel</h1>
                <Badge variant={currentRound.status === 'open' ? 'default' : 'secondary'} className="self-start md:self-center">
                    Round is {currentRound.status}
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Left Column: Candidate List */}
                <Card className="lg:col-span-1 h-fit sticky top-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Users className="h-5 w-5" />
                            Candidates
                        </CardTitle>
                        <div className="relative pt-2">
                            <Search className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-[60vh] overflow-y-auto space-y-2 -mr-2 pr-2">
                            {filteredPnms.map((pnm) => {
                                const isListItemSealed = (currentRound?.sealed_pnm_ids || []).includes(pnm.id)
                                const sealedResult = sealedResults[pnm.id]
                                return (
                                    <div
                                        key={pnm.id}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${selectedPnmId === pnm.id
                                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                            : isListItemSealed ? 'bg-secondary/50 hover:bg-secondary' : 'hover:bg-secondary'
                                            }`}
                                        onClick={() => setActivePnm(pnm.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-semibold">{pnm.first_name} {pnm.last_name}</div>
                                                <div className="text-xs opacity-70">{pnm.email}</div>
                                            </div>
                                            {isListItemSealed && (
                                                <div className="text-right flex items-center gap-2">
                                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                                    {sealedResult && (
                                                        <span className="text-xs font-mono bg-background/50 px-1.5 py-0.5 rounded">
                                                            {sealedResult.yes}Y/{sealedResult.no}N
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column: Main Content */}
                <div className="lg:col-span-3 space-y-6">
                    {!selectedPnmId ? (
                        <Card className="flex items-center justify-center h-full min-h-[300px] lg:min-h-[500px]">
                            <CardContent className="text-center p-8">
                                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-medium">Select a Candidate</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Choose a candidate from the list to view results and manage voting.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <Card>
                                <CardHeader className="flex flex-row items-start justify-between">
                                    <div>
                                        <CardTitle className="text-2xl">
                                            Results: {selectedPnm.first_name} {selectedPnm.last_name}
                                        </CardTitle>
                                        <CardDescription>Live vote counts for the active candidate.</CardDescription>
                                    </div>
                                    <Button variant="outline" size="icon" onClick={manualRefresh} disabled={isRefreshing}>
                                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                        <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                            <div className="text-4xl font-bold text-green-600 dark:text-green-400">{liveResults.yes}</div>
                                            <div className="text-sm font-medium text-green-700 dark:text-green-300">Yes Votes</div>
                                        </div>
                                        <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                            <div className="text-4xl font-bold text-red-600 dark:text-red-400">{liveResults.no}</div>
                                            <div className="text-sm font-medium text-red-700 dark:text-red-300">No Votes</div>
                                        </div>
                                        <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{liveResults.total}</div>
                                            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Votes</div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="relative h-3 w-full bg-secondary rounded-full overflow-hidden">
                                            {liveResults.total > 0 && (
                                                <div
                                                    className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-300"
                                                    style={{ width: `${(liveResults.yes / liveResults.total) * 100}%` }}
                                                />
                                            )}
                                        </div>
                                        <div className="flex justify-between text-xs mt-2 text-muted-foreground">
                                            <span>{liveResults.total > 0 ? `${Math.round((liveResults.yes / liveResults.total) * 100)}% Yes` : 'No "Yes" votes'}</span>
                                            <span>{liveResults.total > 0 ? `${Math.round((liveResults.no / liveResults.total) * 100)}% No` : 'No "No" votes'}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Vote className="h-5 w-5" />Controls</CardTitle>
                                    <CardDescription>Manage the voting session for the active candidate.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-4 border rounded-lg space-y-2 flex flex-col justify-between">
                                            <div className="flex items-center justify-between">
                                                <label className="font-medium">Voting</label>
                                                <Badge variant={currentRound.voting_open ? 'default' : 'secondary'}>
                                                    {currentRound.voting_open ? 'Open' : 'Closed'}
                                                </Badge>
                                            </div>
                                            <Button onClick={toggleVoting} className="w-full">
                                                {currentRound.voting_open ? <><Square className="h-4 w-4 mr-2" />Close Voting</> : <><Play className="h-4 w-4 mr-2" />Open Voting</>}
                                            </Button>
                                        </div>
                                        <div className="p-4 border rounded-lg space-y-2 flex flex-col justify-between">
                                            <div className="flex items-center justify-between">
                                                <label className="font-medium">Results</label>
                                                <Badge variant={currentRound.results_revealed ? 'default' : 'secondary'}>
                                                    {currentRound.results_revealed ? 'Visible' : 'Hidden'}
                                                </Badge>
                                            </div>
                                            <Button onClick={toggleResults} className="w-full">
                                                {currentRound.results_revealed ? <><EyeOff className="h-4 w-4 mr-2" />Hide Results</> : <><Eye className="h-4 w-4 mr-2" />Show Results</>}
                                            </Button>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-4 border rounded-lg space-y-2 bg-secondary/30 flex flex-col justify-between">
                                            <div className="flex items-center justify-between">
                                                <label className="font-medium">Seal Results</label>
                                                <Badge variant={isSealed ? 'destructive' : 'secondary'}>{isSealed ? 'Sealed' : 'Unsealed'}</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Locks in the current vote count for this candidate.</p>
                                            <Button onClick={toggleSeal} variant={isSealed ? 'secondary' : 'outline'} className="w-full mt-auto">
                                                {isSealed ? <><Unlock className="h-4 w-4 mr-2" />Unseal</> : <><Lock className="h-4 w-4 mr-2" />Seal</>}
                                            </Button>
                                        </div>
                                        <div className="p-4 border rounded-lg space-y-2 bg-secondary/30 flex flex-col justify-between">
                                            <label className="font-medium">Clear Votes</label>
                                            <p className="text-xs text-muted-foreground">Permanently removes all votes for this candidate.</p>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" className="w-full mt-auto" disabled={liveResults.total === 0}>
                                                        <Trash2 className="h-4 w-4 mr-2" />Clear All Votes
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete all <strong>{liveResults.total} votes</strong> for {selectedPnm.first_name} {selectedPnm.last_name}. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={clearResults} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                            Yes, Clear Votes
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
