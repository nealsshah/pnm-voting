'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Separator } from '@/components/ui/separator'
import { Search, Users, Vote, Eye, EyeOff, Play, Square, RefreshCw, Lock, Unlock, Trash2, CheckCircle, XCircle } from 'lucide-react'
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
    const [bulkHideEnabled, setBulkHideEnabled] = useState(false)
    const [pendingToggle, setPendingToggle] = useState(null) // 'on' | 'off' | null

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
                    if (round.current_pnm_id) {
                        setSelectedPnmId(round.current_pnm_id)
                    }
                    setSealedResults(round.sealed_results || {})
                }

                const { data: pnms } = await supabase
                    .from('pnms')
                    .select('id, first_name, last_name, email, hidden')
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
            setCurrentRound(updatedRound)
            toast({ title: 'Success', description: 'Round updated successfully.' })
            return updatedRound
        } catch (error) {
            console.error('Error updating round:', error)
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
    }

    const setActivePnm = async (pnmId) => {
        if (pnmId === selectedPnmId) return
        await updateRound({
            currentPnmId: pnmId,
            resultsRevealed: false // Default to hidden when switching candidates
        })
        setSelectedPnmId(pnmId)
    }

    const toggleVoting = async () => await updateRound({ votingOpen: !currentRound?.voting_open })
    const toggleResults = async () => await updateRound({ resultsRevealed: !currentRound?.results_revealed })

    const toggleSeal = async () => {
        const currentSealedIds = currentRound?.sealed_pnm_ids || []
        const isCurrentlySealed = currentSealedIds.includes(selectedPnmId)

        if (isCurrentlySealed) {
            const newSealedIds = currentSealedIds.filter(id => id !== selectedPnmId)
            const newSealedResults = { ...sealedResults }
            delete newSealedResults[selectedPnmId]
            const updatedRound = await updateRound({ sealedPnmIds: newSealedIds, sealedResults: newSealedResults })
            if (updatedRound) setSealedResults(updatedRound.sealed_results || {})
        } else {
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
            if (updatedRound) setSealedResults(updatedRound.sealed_results || {})
        }
    }

    // Hide all sealed candidates that did not receive a majority YES vote
    const computeLosers = () => {
        const sealedIds = currentRound?.sealed_pnm_ids || []
        return sealedIds.filter(id => {
            const res = sealedResults?.[id]
            if (!res) return false
            const yes = Number(res.yes || 0)
            const no = Number(res.no || 0)
            return yes <= no
        })
    }

    // Keep toggle in sync based on current data (all losers hidden => ON)
    useEffect(() => {
        const losers = computeLosers()
        if (losers.length === 0) {
            setBulkHideEnabled(false)
            return
        }
        const allHidden = losers.every(id => (allPnms.find(p => p.id === id)?.hidden))
        setBulkHideEnabled(allHidden)
    }, [allPnms, currentRound?.sealed_pnm_ids, sealedResults])

    const hideSealedNonMajority = async () => {
        try {
            const sealedIds = currentRound?.sealed_pnm_ids || []
            if (!sealedIds.length) {
                toast({ title: 'No sealed candidates', description: 'There are no sealed candidates to hide.' })
                return
            }

            // Determine which sealed candidates did not get majority YES
            const losers = computeLosers()

            if (losers.length === 0) {
                toast({ title: 'Nothing to hide', description: 'All sealed candidates have majority YES.' })
                return
            }

            const { error } = await supabase
                .from('pnms')
                .update({ hidden: true })
                .in('id', losers)

            if (error) throw error

            // Refresh PNM list to reflect hidden states
            const { data: pnms } = await supabase
                .from('pnms')
                .select('id, first_name, last_name, email, hidden')
                .order('first_name')
            setAllPnms(pnms || [])
            setFilteredPnms(pnms || [])

            toast({ title: 'Hidden', description: `Hidden ${losers.length} sealed candidate(s) without majority YES.` })
        } catch (err) {
            console.error('Failed to hide sealed candidates', err)
            toast({ title: 'Error', description: err.message || 'Failed to hide candidates', variant: 'destructive' })
        }
    }

    const unhideSealedNonMajority = async () => {
        try {
            const losers = computeLosers()
            if (losers.length === 0) {
                toast({ title: 'Nothing to unhide', description: 'No sealed non-majority candidates found.' })
                return
            }
            const { error } = await supabase
                .from('pnms')
                .update({ hidden: false })
                .in('id', losers)
            if (error) throw error

            const { data: pnms } = await supabase
                .from('pnms')
                .select('id, first_name, last_name, email, hidden')
                .order('first_name')
            setAllPnms(pnms || [])
            setFilteredPnms(pnms || [])

            toast({ title: 'Unhidden', description: `Unhid ${losers.length} sealed candidate(s) without majority YES.` })
        } catch (err) {
            console.error('Failed to unhide sealed candidates', err)
            toast({ title: 'Error', description: err.message || 'Failed to unhide candidates', variant: 'destructive' })
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
    const isSealed = (currentRound?.sealed_pnm_ids || []).some((id) => String(id) === String(selectedPnmId))
    const isVotingOpen = currentRound?.voting_open || false
    const effectiveResultsVisible = (currentRound?.results_revealed || isSealed)

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
                                            <div className="text-right flex items-center gap-2">
                                                {pnm.hidden && (
                                                    <Badge variant="destructive">Hidden</Badge>
                                                )}
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
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column: Main Content */}
                <div className="lg:col-span-3">
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
                        <Card>
                            <CardHeader>
                                <div className="flex flex-row items-start justify-between">
                                    <div>
                                        <CardTitle className="text-2xl">
                                            {selectedPnm.first_name} {selectedPnm.last_name}
                                        </CardTitle>
                                        <CardDescription>
                                            {isVotingOpen ? "Live voting is in progress." : "Voting is currently closed."}
                                        </CardDescription>
                                    </div>
                                    <Button variant="outline" size="icon" onClick={manualRefresh} disabled={isRefreshing}>
                                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Results */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                    <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-col">
                                        <div className="text-4xl font-bold text-green-600 dark:text-green-400">{liveResults.yes}</div>
                                        <div className="text-sm font-medium text-green-700 dark:text-green-300 mt-1">Yes Votes</div>
                                    </div>
                                    <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-col">
                                        <div className="text-4xl font-bold text-red-600 dark:text-red-400">{liveResults.no}</div>
                                        <div className="text-sm font-medium text-red-700 dark:text-red-300 mt-1">No Votes</div>
                                    </div>
                                    <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-col">
                                        <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{liveResults.total}</div>
                                        <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mt-1">Total Votes</div>
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

                            <CardFooter className="flex-col items-stretch space-y-6 pt-6">
                                {/* Main Action */}
                                <div className="text-center">
                                    {isSealed ? (
                                        <div className="space-y-3">
                                            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                                <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300 mb-2">
                                                    <Lock className="h-4 w-4" />
                                                    <span className="font-medium">Voting Controls Disabled</span>
                                                </div>
                                                <p className="text-sm text-amber-700/80 dark:text-amber-300/80 text-center">
                                                    Voting controls are locked while results are sealed. Unseal to modify voting status.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {isVotingOpen ? (
                                                <Button size="lg" onClick={toggleVoting} className="w-full max-w-xs mx-auto shadow-md bg-red-600 hover:bg-red-700 text-white">
                                                    <Square className="h-5 w-5 mr-2" />
                                                    Close Voting
                                                </Button>
                                            ) : (
                                                <Button size="lg" onClick={toggleVoting} className="w-full max-w-xs mx-auto shadow-md bg-green-600 hover:bg-green-700 text-white">
                                                    <Play className="h-5 w-5 mr-2" />
                                                    Open Voting
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>

                                <Separator />

                                {/* General & Advanced Controls */}
                                <div className="space-y-4">
                                    <div className="p-4 border rounded-lg flex items-center justify-between">
                                        <div>
                                            <label className="font-medium">Results Visibility</label>
                                            <p className="text-xs text-muted-foreground">Controls if brothers can see live vote counts.{isSealed ? ' (Sealed candidates are always visible.)' : ''}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={effectiveResultsVisible ? 'default' : 'secondary'}>{effectiveResultsVisible ? 'Visible' : 'Hidden'}</Badge>
                                            <Button onClick={toggleResults} variant="outline" size="icon" disabled={isSealed} title={isSealed ? 'Results are forced visible while sealed' : undefined}>
                                                {effectiveResultsVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-4 border rounded-lg space-y-2 bg-secondary/30 flex flex-col">
                                            <div className="flex items-center justify-between">
                                                <label className="font-medium">Seal Results</label>
                                                <Badge variant={isSealed ? 'destructive' : 'secondary'}>{isSealed ? 'Sealed' : 'Unsealed'}</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground flex-grow min-h-[40px]">Locks in the current vote count. Must be done when voting is closed.</p>
                                            <Button onClick={toggleSeal} variant={isSealed ? 'secondary' : 'outline'} className="w-full mt-2" disabled={isVotingOpen}>
                                                {isSealed ? <><Unlock className="h-4 w-4 mr-2" />Unseal</> : <><Lock className="h-4 w-4 mr-2" />Seal</>}
                                            </Button>
                                        </div>
                                        <div className="p-4 border rounded-lg space-y-2 bg-secondary/30 flex flex-col">
                                            <label className="font-medium">Clear Votes</label>
                                            <p className="text-xs text-muted-foreground flex-grow min-h-[40px]">Permanently removes all votes for this candidate.</p>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" className="w-full mt-2" disabled={liveResults.total === 0}>
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
                                </div>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            </div>

            {/* Bottom sticky controls */}
            <div className="sticky bottom-0 left-0 right-0 bg-background/80 backdrop-blur border-t mt-4">
                <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
                    <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                            <Switch
                                checked={bulkHideEnabled}
                                onCheckedChange={(checked) => {
                                    // Don’t immediately apply; ask for confirmation
                                    setPendingToggle(checked ? 'on' : 'off')
                                }}
                                aria-label="Hide sealed PNMs without majority YES"
                            />
                        </div>
                        <div>
                            <div className="font-medium">Hide sealed PNMs without majority YES</div>
                            <div className="text-sm text-muted-foreground max-w-xl">
                                Turn ON to hide every sealed PNM who did not receive a majority YES vote. Hidden PNMs will not appear in brother views. Turn OFF to unhide them again.
                            </div>
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Changes require confirmation
                    </div>
                </div>
            </div>

            {/* Confirm toggle dialog */}
            <AlertDialog open={pendingToggle !== null} onOpenChange={(open) => { if (!open) setPendingToggle(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{pendingToggle === 'on' ? 'Hide sealed PNMs without majority YES?' : 'Show them again?'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingToggle === 'on'
                                ? 'Turning ON hides all sealed PNMs who did not receive a majority YES. They will not appear for brothers.'
                                : 'Turning OFF shows those sealed PNMs again in brother views.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingToggle(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                            const enable = pendingToggle === 'on'
                            setPendingToggle(null)
                            if (enable) {
                                await hideSealedNonMajority()
                                setBulkHideEnabled(true)
                            } else {
                                await unhideSealedNonMajority()
                                setBulkHideEnabled(false)
                            }
                        }}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
