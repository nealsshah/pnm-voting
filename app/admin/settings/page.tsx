
// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { getStatsPublished, getDniStatsPublished, listRecruitmentCycles, getCurrentCycleId, createRecruitmentCycle, activateRecruitmentCycle, archiveRecruitmentCycle, updateRecruitmentCycle } from "@/lib/settings";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AdminSettings() {
    const [statsPublished, setStatsPublished] = useState(false);
    const [dniPublished, setDniPublished] = useState(false);
    const [hasDniRound, setHasDniRound] = useState(false);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [cycles, setCycles] = useState([]);
    const [currentCycleId, setCurrentCycleIdState] = useState<string | null>(null);
    const [newCycleName, setNewCycleName] = useState("");
    const [creatingCycle, setCreatingCycle] = useState(false);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const published = await getStatsPublished();
                setStatsPublished(published);

                const dni = await getDniStatsPublished();
                setDniPublished(dni);

                // Check if any did_not_interact round exists
                const supabase = createClientComponentClient();
                const { data: dniRounds } = await supabase
                    .from('rounds')
                    .select('id')
                    .eq('type', 'did_not_interact')
                    .limit(1);
                setHasDniRound((dniRounds || []).length > 0);

                // Load cycles
                const [cs, currId] = await Promise.all([
                    listRecruitmentCycles(),
                    getCurrentCycleId()
                ])
                setCycles(cs || [])
                setCurrentCycleIdState(currId)
            } catch (e) {
                console.error("Failed to fetch settings", e);
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    const handleToggleStats = async (checked: boolean) => {
        // Optimistically update UI
        setStatsPublished(checked);

        try {
            const res = await fetch("/api/settings/stats-published", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ published: checked }),
            });

            if (!res.ok) throw new Error("Request failed");

            toast({
                title: checked ? "Voting statistics published" : "Voting statistics hidden",
                description: checked
                    ? "All users can now see candidate averages and vote counts."
                    : "Voting statistics are no longer visible to regular users.",
            });
        } catch (e) {
            // Revert on failure
            setStatsPublished(!checked);
            toast({
                title: "Error",
                description: "Unable to update visibility of voting statistics.",
                variant: "destructive",
            });
        }
    };

    const handleCreateCycle = async () => {
        const name = newCycleName.trim()
        if (!name) return
        setCreatingCycle(true)
        try {
            const newCycle = await createRecruitmentCycle({ name, status: 'planned' })
            setCycles(prev => [newCycle, ...prev])
            setNewCycleName("")
            toast({ title: 'Cycle created', description: name })
        } catch (e) {
            toast({ title: 'Error creating cycle', description: e.message, variant: 'destructive' })
        } finally {
            setCreatingCycle(false)
        }
    }

    const handleActivateCycle = async (id: string) => {
        try {
            await activateRecruitmentCycle(id)
            setCurrentCycleIdState(id)
            setCycles(prev => prev.map(c => c.id === id ? { ...c, status: 'active', started_at: new Date().toISOString(), ended_at: null } : { ...c, status: c.status === 'active' ? 'archived' : c.status }))
            toast({ title: 'Cycle activated' })
        } catch (e) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' })
        }
    }

    const handleArchiveCycle = async (id: string) => {
        try {
            await archiveRecruitmentCycle(id)
            setCycles(prev => prev.map(c => c.id === id ? { ...c, status: 'archived', ended_at: new Date().toISOString() } : c))
            if (currentCycleId === id) setCurrentCycleIdState(null)
            toast({ title: 'Cycle archived' })
        } catch (e) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' })
        }
    }

    // Lightweight client-side component for preview selection (read-only filter)
    // (Removed preview cycle selector feature)

    // Card for a single cycle – clean and action-focused
    const CycleCard = ({ cycle, isCurrent, onActivate, onArchive, onRename }: any) => {
        const [editing, setEditing] = useState(false)
        const [nameInput, setNameInput] = useState(cycle.name)
        const [busy, setBusy] = useState(false)

        const save = async () => {
            if (!nameInput.trim() || nameInput === cycle.name) { setEditing(false); return }
            setBusy(true)
            try {
                await onRename(nameInput.trim())
            } finally {
                setBusy(false)
                setEditing(false)
            }
        }

        return (
            <div className={`border rounded-lg p-4 ${isCurrent ? 'border-accent-teal' : 'border-muted'}`}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        {editing ? (
                            <input
                                className="border rounded px-2 py-1 w-full bg-background text-foreground placeholder:text-muted-foreground"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') save() }}
                                autoFocus
                            />
                        ) : (
                            <div className="font-semibold truncate">
                                {cycle.name}
                                {isCurrent && <span className="ml-2 text-xs rounded bg-accent-teal/10 text-accent-teal px-2 py-0.5 align-middle">Current</span>}
                            </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1 capitalize">{cycle.status}</div>
                        {cycle.started_at && (
                            <div className="text-xs text-muted-foreground mt-1">Started {new Date(cycle.started_at).toLocaleDateString()}</div>
                        )}
                        {cycle.ended_at && (
                            <div className="text-xs text-muted-foreground">Ended {new Date(cycle.ended_at).toLocaleDateString()}</div>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                        {editing ? (
                            <>
                                <button className="h-8 px-3 rounded bg-accent-teal text-white hover:opacity-90 disabled:opacity-50" onClick={save} disabled={busy}>Save</button>
                                <button className="h-8 px-3 rounded border" onClick={() => { setEditing(false); setNameInput(cycle.name) }} disabled={busy}>Cancel</button>
                            </>
                        ) : (
                            <>
                                <button className="h-8 px-3 rounded border" onClick={() => setEditing(true)}>Rename</button>
                                {cycle.status !== 'active' && (
                                    <button className="h-8 px-3 rounded bg-accent-teal text-white hover:opacity-90" onClick={onActivate}>Activate</button>
                                )}
                                {cycle.status !== 'archived' && (
                                    <button className="h-8 px-3 rounded border" onClick={onArchive}>Archive</button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const handleToggleDni = async (checked: boolean) => {
        setDniPublished(checked);
        try {
            const res = await fetch("/api/settings/dni-stats-published", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ published: checked }),
            });
            if (!res.ok) throw new Error("Request failed");
            toast({
                title: checked ? "DNI statistics published" : "DNI statistics hidden",
            });
        } catch (e) {
            setDniPublished(!checked);
            toast({ title: "Error", description: "Unable to update DNI visibility.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="mt-2 text-muted-foreground">
                    Manage application-wide settings.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Voting Statistics</CardTitle>
                    <CardDescription>
                        Control the visibility of voting statistics for all users.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Switch id="stats-published" checked={statsPublished} onCheckedChange={handleToggleStats} />
                                <Label htmlFor="stats-published">{statsPublished ? "Published" : "Hidden"}</Label>
                            </div>
                            {statsPublished && (
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="dni-published"
                                        checked={dniPublished}
                                        disabled={!hasDniRound}
                                        onCheckedChange={handleToggleDni}
                                    />
                                    <Label htmlFor="dni-published" className={hasDniRound ? '' : 'text-muted-foreground'}>
                                        {dniPublished ? "DNI Results Published" : "DNI Results Hidden"}
                                        {!hasDniRound && " (No DNI round yet)"}
                                    </Label>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Recruitment Cycles</CardTitle>
                    <CardDescription>
                        Scope all PNMs, rounds, votes, comments and attendance to a single cycle. Activate a new cycle at the start of each recruitment.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Current + Create row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="border rounded-lg p-5 bg-muted/30">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Current Cycle</div>
                            <div className="text-lg font-semibold">
                                {currentCycleId ? (cycles.find(c => c.id === currentCycleId)?.name || '—') : 'None active'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Only one cycle can be active. Activating another will not modify archived data.
                            </div>
                        </div>

                        <div className="lg:col-span-2 border rounded-lg p-5">
                            <div className="flex flex-col md:flex-row md:items-end gap-3">
                                <div className="flex-1">
                                    <Label className="text-sm">Create New Cycle</Label>
                                    <input
                                        className="mt-1 border rounded px-3 py-2 w-full bg-background text-foreground placeholder:text-muted-foreground"
                                        placeholder="e.g., Fall 2025"
                                        value={newCycleName}
                                        onChange={(e) => setNewCycleName(e.target.value)}
                                    />
                                </div>
                                <button
                                    className="h-10 px-4 rounded bg-accent-teal text-white hover:opacity-90 disabled:opacity-50"
                                    onClick={handleCreateCycle}
                                    disabled={creatingCycle || !newCycleName.trim()}
                                >
                                    {creatingCycle ? 'Creating…' : 'Create Cycle'}
                                </button>
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">Tip: Use season + year, e.g., “Spring 2026”. You can rename later.</div>
                        </div>
                    </div>

                    {/* Cycles board */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">All Cycles</Label>
                            <div className="text-xs text-muted-foreground">Activate to make a cycle current; archive when finished.</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {cycles.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No cycles found.</div>
                            ) : (
                                cycles.map(cycle => (
                                    <CycleCard
                                        key={cycle.id}
                                        cycle={cycle}
                                        isCurrent={cycle.id === currentCycleId}
                                        onActivate={() => handleActivateCycle(cycle.id)}
                                        onArchive={() => handleArchiveCycle(cycle.id)}
                                        onRename={async (name) => {
                                            const updated = await updateRecruitmentCycle(cycle.id, { name })
                                            setCycles(prev => prev.map(c => c.id === cycle.id ? updated : c))
                                        }}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Preview cycle selector removed */}
                </CardContent>
            </Card>
        </div>
    );
} 