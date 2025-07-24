
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
import {
    Search,
    Edit,
    Image as ImageIcon,
    Loader2,
    Trash2,
} from "lucide-react";
import CsvTemplateButton from "@/components/CsvTemplateButton";
import CsvUploadDropzone from "@/components/CsvUploadDropzone";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useToast } from "@/components/ui/use-toast";
import { getInitials } from "@/lib/utils";
import { getPhotoPublicUrl } from "@/lib/supabase";
import PNMPhotoUpload from "@/components/pnms/PNMPhotoUpload";

interface Pnm {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    major: string;
    year: string;
    gpa: number;
    photo_url?: string | null;
}

export default function AdminPnms() {
    const supabase = createClientComponentClient();
    const { toast } = useToast();

    const [pnms, setPnms] = useState<Pnm[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [editingPnm, setEditingPnm] = useState<Pnm | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    // Used to force img cache-busting across the table after an upload
    const [refreshKey, setRefreshKey] = useState<number>(() => Date.now());

    // Fetch PNMs & subscribe to realtime changes
    useEffect(() => {
        const fetchPnms = async () => {
            const { data, error } = await supabase
                .from("pnms")
                .select("*")
                .order("last_name");
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

    /* ---------------------------------- Helpers --------------------------------- */
    const filteredPnms = pnms.filter((p) => {
        const term = search.toLowerCase();
        return (
            p.first_name.toLowerCase().includes(term) ||
            p.last_name.toLowerCase().includes(term) ||
            p.email.toLowerCase().includes(term) ||
            (p.major || "").toLowerCase().includes(term)
        );
    });

    const handleFieldChange = (field: keyof Pnm, value: any) => {
        if (!editingPnm) return;
        setEditingPnm({ ...editingPnm, [field]: value });
    };

    /* ----------------------------- Save / Delete ----------------------------- */
    const savePnm = async () => {
        if (!editingPnm) return;
        setSaving(true);
        const { error } = await supabase
            .from("pnms")
            .update({
                first_name: editingPnm.first_name,
                last_name: editingPnm.last_name,
                major: editingPnm.major,
                year: editingPnm.year,
                gpa: editingPnm.gpa,
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
                                <TableHead className="w-[60px]">Photo</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Major</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>GPA</TableHead>
                                <TableHead className="w-[70px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPnms.map((p) => (
                                <TableRow key={p.id} className="whitespace-nowrap">
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
                                    <TableCell>{p.email}</TableCell>
                                    <TableCell>{p.major}</TableCell>
                                    <TableCell>{p.year}</TableCell>
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
                <DialogContent className="max-w-lg">
                    {editingPnm && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Edit PNM</DialogTitle>
                                <DialogDescription>
                                    Update information or delete the PNM. Photo uploads are saved
                                    instantly.
                                </DialogDescription>
                            </DialogHeader>

                            {/* Photo */}
                            <div className="flex justify-center mb-6">
                                <div className="text-center space-y-2">
                                    <div className="w-32 h-32 rounded-full overflow-hidden bg-muted mx-auto relative">
                                        {editingPnm.photo_url ? (
                                            <img
                                                src={getPhotoPublicUrl(editingPnm.photo_url) + `?v=${editingPnm.id}${Date.now()}`}
                                                className="object-cover w-full h-full"
                                                alt="PNM photo"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <ImageIcon className="h-8 w-8" />
                                            </div>
                                        )}
                                    </div>
                                    <PNMPhotoUpload
                                        pnmId={editingPnm.id}
                                        onUploadComplete={async () => {
                                            // Immediately fetch the latest row so the new photo shows up without a full page refresh
                                            const { data } = await supabase
                                                .from("pnms")
                                                .select("*")
                                                .eq("id", editingPnm.id)
                                                .single();
                                            if (data) {
                                                setEditingPnm(data as any);
                                            }
                                            // Update refresh key so table thumbnails get a new query param
                                            setRefreshKey(Date.now());
                                        }}
                                    />
                                </div>
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