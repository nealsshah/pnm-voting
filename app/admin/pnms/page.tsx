
// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Search,
    Edit,
    Loader2,
    Trash2,
    X,
} from "lucide-react";
import CsvTemplateButton from "@/components/CsvTemplateButton";
import CsvUploadDropzone from "@/components/CsvUploadDropzone";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useToast } from "@/components/ui/use-toast";
import { getInitials } from "@/lib/utils";
import { getPhotoPublicUrl } from "@/lib/supabase";
import { getCurrentCycleId } from "@/lib/settings";
import PNMPhotoUpload from "@/components/pnms/PNMPhotoUpload";

interface Pnm {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    major: string;
    year: string;
    gpa: number;
    pronouns?: string | null;
    minor?: string | null;
    photo_url?: string | null;
    hidden?: boolean;
}

export default function AdminPnms() {
    const supabase = createClientComponentClient();
    const { toast } = useToast();
    const [attendance, setAttendance] = useState<{ event_name: string, created_at: string }[]>([]);
    const [newEventName, setNewEventName] = useState("");

    const [pnms, setPnms] = useState<Pnm[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [editingPnm, setEditingPnm] = useState<Pnm | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    // Used to force img cache-busting across the table after an upload
    const [refreshKey, setRefreshKey] = useState<number>(() => Date.now());

    // Bulk selection state
    const [selectedPnms, setSelectedPnms] = useState<Set<string>>(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Fetch PNMs & subscribe to realtime changes
    useEffect(() => {
        const fetchPnms = async () => {
            const currentCycleId = await getCurrentCycleId().catch(() => null)
            let q = supabase
                .from("pnms")
                .select("*")
                .order("last_name");
            if (currentCycleId) q = q.eq('cycle_id', currentCycleId)
            const { data, error } = await q;
            if (error) {
                console.error(error);
                toast({
                    title: "Failed to load PNMs",
                    description: error.message,
                    variant: "destructive",
                });
            }
            setPnms((data as Pnm[]) || []);
            setLoading(false);
        };

        fetchPnms();

        const channel = supabase
            .channel("pnms-admin-page")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "pnms" },
                fetchPnms
            )
            .subscribe();

        return () => {
            // Supabase's removeChannel returns a promise, but React effect cleanups must be synchronous.
            // We fire and forget here to satisfy type expectations.
            supabase.removeChannel(channel);
        };
    }, [supabase, toast]);

    // Clear selection when search changes or PNMs are updated
    useEffect(() => {
        setSelectedPnms(new Set());
    }, [search, pnms]);

    /* ---------------------------------- Helpers --------------------------------- */
    const filteredPnms = pnms.filter((p) => {
        const term = search.toLowerCase();
        return (
            p.first_name.toLowerCase().includes(term) ||
            p.last_name.toLowerCase().includes(term) ||
            p.email.toLowerCase().includes(term) ||
            (p.major || "").toLowerCase().includes(term) ||
            (p.minor || "").toLowerCase().includes(term) ||
            (p.pronouns || "").toLowerCase().includes(term)
        );
    });

    const handleFieldChange = (field: keyof Pnm, value: any) => {
        if (!editingPnm) return;
        setEditingPnm({ ...editingPnm, [field]: value });
    };

    // Bulk selection helpers
    const togglePnmSelection = (pnmId: string) => {
        setSelectedPnms(prev => {
            const newSet = new Set(prev);
            if (newSet.has(pnmId)) {
                newSet.delete(pnmId);
            } else {
                newSet.add(pnmId);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedPnms.size === filteredPnms.length) {
            setSelectedPnms(new Set());
        } else {
            setSelectedPnms(new Set(filteredPnms.map(p => p.id)));
        }
    };

    const clearSelection = () => {
        setSelectedPnms(new Set());
    };

    /* ----------------------------- Save / Delete ----------------------------- */
    // Load attendance whenever editingPnm changes
    useEffect(() => {
        const loadAttendance = async () => {
            if (!editingPnm) { setAttendance([]); return; }
            const currentCycleId = await getCurrentCycleId().catch(() => null)
            let attendanceQ = supabase
                .from('pnm_attendance')
                .select('event_name, created_at')
                .eq('pnm_id', editingPnm.id)
                .order('created_at')
            if (currentCycleId) attendanceQ = attendanceQ.eq('cycle_id', currentCycleId)
            const { data } = await attendanceQ;
            setAttendance(data || []);
        };
        loadAttendance();
    }, [editingPnm, supabase]);

    const addAttendance = async () => {
        const ev = newEventName.trim();
        if (!ev || !editingPnm) return;
        const { error } = await supabase.from('pnm_attendance').upsert({ pnm_id: editingPnm.id, event_name: ev });
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            setNewEventName('');
            setAttendance(prev => [...prev, { event_name: ev, created_at: new Date().toISOString() }]);
        }
    };

    const deleteAttendance = async (eventName: string) => {
        if (!editingPnm) return;
        const { error } = await supabase
            .from('pnm_attendance')
            .delete()
            .eq('pnm_id', editingPnm.id)
            .eq('event_name', eventName);
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            setAttendance(prev => prev.filter(a => a.event_name !== eventName));
        }
    };

    const savePnm = async () => {
        if (!editingPnm) return;
        setSaving(true);
        const { error } = await supabase
            .from("pnms")
            .update({
                first_name: editingPnm.first_name,
                last_name: editingPnm.last_name,
                pronouns: editingPnm.pronouns,
                major: editingPnm.major,
                minor: editingPnm.minor,
                year: editingPnm.year,
                gpa: editingPnm.gpa,
                hidden: editingPnm.hidden || false,
            })
            .eq("id", editingPnm.id);

        setSaving(false);

        if (error) {
            toast({
                title: "Failed to save PNM",
                description: error.message,
                variant: "destructive",
            });
            return;
        }

        toast({ title: "PNM updated" });
        setEditingPnm(null);
    };

    const deletePnm = async () => {
        if (!editingPnm) return;
        if (!window.confirm("Delete this PNM? This action is irreversible.")) return;
        setDeleting(true);
        const { error } = await supabase.from("pnms").delete().eq("id", editingPnm.id);
        setDeleting(false);
        if (error) {
            toast({
                title: "Failed to delete PNM",
                description: error.message,
                variant: "destructive",
            });
            return;
        }
        toast({ title: "PNM deleted" });
        setEditingPnm(null);
    };

    const bulkDeletePnms = async () => {
        if (selectedPnms.size === 0) return;
        if (!window.confirm(`Delete ${selectedPnms.size} selected PNMs? This action is irreversible.`)) return;

        setBulkDeleting(true);
        const { error } = await supabase
            .from("pnms")
            .delete()
            .in("id", Array.from(selectedPnms));

        setBulkDeleting(false);

        if (error) {
            toast({
                title: "Failed to delete PNMs",
                description: error.message,
                variant: "destructive",
            });
            return;
        }

        toast({
            title: "PNMs deleted",
            description: `Successfully deleted ${selectedPnms.size} PNMs`
        });
        setSelectedPnms(new Set());
    };

    return (
        <div className="space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">PNM Management</h1>
                <p className="text-muted-foreground mt-1">
                    Import, browse, and edit Potential New Members.
                </p>
            </div>

            {/* Upload + Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-6 space-y-4">
                    <h2 className="font-semibold text-lg">Import PNMs</h2>
                    <CsvUploadDropzone />
                    <CsvTemplateButton />
                </div>
                <div className="md:col-span-2 border rounded-lg p-6 grid grid-cols-2 gap-4">
                    <div>
                        <h3 className="text-2xl font-bold">{pnms.length}</h3>
                        <p className="text-sm text-muted-foreground">Total PNMs</p>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold">
                            {(
                                pnms.reduce((sum, p) => sum + (Number(p.gpa) || 0), 0) /
                                (pnms.length || 1)
                            ).toFixed(2)}
                        </h3>
                        <p className="text-sm text-muted-foreground">Average GPA</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search PNMs…"
                    className="pl-10"
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                />
            </div>

            {/* Bulk Actions Bar */}
            {selectedPnms.size > 0 && (
                <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">
                            {selectedPnms.size} PNM{selectedPnms.size === 1 ? '' : 's'} selected
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={clearSelection}
                        >
                            <X className="h-4 w-4 mr-2" />
                            Clear selection
                        </Button>
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={bulkDeletePnms}
                        disabled={bulkDeleting}
                    >
                        {bulkDeleting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete {selectedPnms.size} PNM{selectedPnms.size === 1 ? '' : 's'}
                    </Button>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin h-8 w-8 text-gray-500" />
                </div>
            ) : filteredPnms.length === 0 ? (
                <p className="text-center text-muted-foreground">No PNMs found.</p>
            ) : (
                <div className="border rounded-lg overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={filteredPnms.length > 0 && selectedPnms.size === filteredPnms.length}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Select all PNMs"
                                    />
                                </TableHead>
                                <TableHead className="w-[60px]">Photo</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Pronouns</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Major</TableHead>
                                <TableHead>Minor</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>GPA</TableHead>
                                <TableHead className="w-[70px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPnms.map((p) => (
                                <TableRow key={p.id} className="whitespace-nowrap">
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedPnms.has(p.id)}
                                            onCheckedChange={() => togglePnmSelection(p.id)}
                                            aria-label={`Select ${p.first_name} ${p.last_name}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Avatar className="h-9 w-9">
                                            {p.photo_url ? (
                                                <AvatarImage
                                                    src={getPhotoPublicUrl(p.photo_url) + `?v=${refreshKey}`}
                                                    alt="photo"
                                                />
                                            ) : (
                                                <AvatarFallback>{getInitials(p.first_name, p.last_name)}</AvatarFallback>
                                            )}
                                        </Avatar>
                                    </TableCell>
                                    <TableCell>{`${p.first_name} ${p.last_name}`}</TableCell>
                                    <TableCell>{p.pronouns || ""}</TableCell>
                                    <TableCell>{p.email}</TableCell>
                                    <TableCell>
                                        <span
                                            className="truncate max-w-[15ch] inline-block align-bottom"
                                            title={p.major || ""}
                                        >
                                            {p.major}
                                        </span>
                                    </TableCell>
                                    <TableCell>{p.minor}</TableCell>
                                    <TableCell>
                                        <span
                                            className="truncate max-w-[15ch] inline-block align-bottom"
                                            title={p.year || ""}
                                        >
                                            {p.year}
                                        </span>
                                    </TableCell>
                                    <TableCell>{p.gpa?.toFixed?.(2)}</TableCell>
                                    <TableCell>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => setEditingPnm(p)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog
                open={Boolean(editingPnm)}
                onOpenChange={(open) => {
                    if (!open) setEditingPnm(null);
                }}
            >
                <DialogContent className="w-[90vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[85vh] overflow-y-auto">
                    {editingPnm && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Edit PNM</DialogTitle>
                                <DialogDescription>
                                    Update information or delete the PNM. Photo uploads are saved
                                    instantly.
                                </DialogDescription>
                            </DialogHeader>

                            {/* Photo Upload (unified avatar dropzone) */}
                            <div className="flex justify-center mb-6">
                                <PNMPhotoUpload
                                    pnmId={editingPnm.id}
                                    photoUrl={editingPnm.photo_url ? (getPhotoPublicUrl(editingPnm.photo_url) + `?v=${refreshKey}`) : null}
                                    onUploadComplete={async (newFileName) => {
                                        // Optimistically update dialog state and table thumbnails
                                        setEditingPnm({ ...editingPnm, photo_url: newFileName } as any);
                                        setRefreshKey(Date.now());

                                        // Also refetch in background to ensure server state is synced
                                        const { data } = await supabase
                                            .from("pnms")
                                            .select("*")
                                            .eq("id", editingPnm.id)
                                            .single();
                                        if (data) setEditingPnm(data as any);
                                    }}
                                />
                            </div>

                            {/* Form */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>First Name</Label>
                                        <Input
                                            value={editingPnm.first_name || ""}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("first_name", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Last Name</Label>
                                        <Input
                                            value={editingPnm.last_name || ""}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("last_name", e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label>Pronouns</Label>
                                    <Input
                                        placeholder="e.g. she/her, he/him, they/them"
                                        value={editingPnm.pronouns || ""}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("pronouns", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Email</Label>
                                    <Input value={editingPnm.email} disabled className="bg-muted" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Major</Label>
                                        <Input
                                            value={editingPnm.major || ""}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("major", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Minor</Label>
                                        <Input
                                            value={editingPnm.minor || ""}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("minor", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Year</Label>
                                        <Input
                                            value={editingPnm.year || ""}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("year", e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label>GPA</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="4"
                                        value={editingPnm.gpa ?? ""}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("gpa", Number(e.target.value))}
                                    />
                                </div>

                                <div className="space-y-1 flex items-center gap-2 pt-2">
                                    <Checkbox
                                        checked={!!editingPnm.hidden}
                                        onCheckedChange={(checked: boolean) => handleFieldChange('hidden', Boolean(checked))}
                                        aria-label="Hidden"
                                    />
                                    <Label className="!m-0">Hidden (exclude from brother views)</Label>
                                </div>

                                {/* Attendance Management */}
                                <div className="space-y-2 pt-4 border-t">
                                    <Label>Events Attended</Label>
                                    {attendance.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">None recorded</p>
                                    ) : (
                                        <ul className="list-disc list-inside text-sm space-y-1">
                                            {attendance.map(a => (
                                                <li key={a.event_name} className="flex items-center justify-between">
                                                    <span>{a.event_name}</span>

                                                </li>
                                            ))}
                                        </ul>
                                    )}


                                </div>
                            </div>

                            <DialogFooter className="mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => setEditingPnm(null)}
                                    disabled={saving || deleting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={deletePnm}
                                    disabled={deleting}
                                >
                                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                                <Button onClick={savePnm} disabled={saving}>
                                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
} 