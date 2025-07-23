
"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Image as ImageIcon, Edit } from "lucide-react";
import CsvTemplateButton from "@/components/CsvTemplateButton";
import CsvUploadDropzone from "@/components/CsvUploadDropzone";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Spinner } from "@/components/ui/spinner";
import { useDropzone } from "react-dropzone";
import { useToast } from "@/components/ui/use-toast";
import PNMCard from "@/components/pnms/AdminPNMCards";

interface Pnm {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    major: string;
    year: string;
    gpa: number;
    photo_url?: string;
}

export default function AdminPnms() {
    const [pnms, setPnms] = useState<Pnm[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [uploadingPnmId, setUploadingPnmId] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingPnmId, setDeletingPnmId] = useState<string | null>(null);
    const [editingPnm, setEditingPnm] = useState<Pnm | null>(null);
    const supabase = createClientComponentClient();
    const { toast } = useToast();

    const fetchPnms = async () => {
        try {
            const { data, error } = await supabase
                .from("pnms")
                .select("*")
                .order("last_name");

            if (error) throw error;
            setPnms((data as Pnm[]) || []);
        } catch (error) {
            console.error("Error fetching PNMs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPnms();

        const channel = supabase
            .channel("pnms-changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "pnms",
                },
                () => {
                    fetchPnms();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const onDrop = async (acceptedFiles: File[]) => {
        if (!uploadingPnmId || !acceptedFiles.length) return;

        const file = acceptedFiles[0];
        const fileExt = file.name.split(".").pop();
        const fileName = `${uploadingPnmId}.${fileExt}`;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const { data, error } = await supabase.storage
                .from("pnm-photos")
                .upload(fileName, file, {
                    cacheControl: "3600",
                    upsert: true,
                });

            if (error) throw error;

            const { error: updateError } = await supabase
                .from("pnms")
                .update({ photo_url: fileName })
                .eq("id", uploadingPnmId);

            if (updateError) throw updateError;

            toast({
                title: "Photo Uploaded",
                description: "PNM photo has been uploaded successfully.",
            });

            setUploadingPnmId(null);
        } catch (error: any) {
            console.error("Error uploading photo:", error);
            toast({
                title: "Upload Failed",
                description:
                    error.message || "An error occurred during photo upload.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: {
            "image/*": [".jpeg", ".jpg", ".png", ".gif"],
        },
        maxFiles: 1,
        disabled: isUploading || !uploadingPnmId,
    });

    const filteredPnms = pnms.filter((pnm) => {
        const term = searchTerm.toLowerCase();
        return (
            pnm.first_name?.toLowerCase().includes(term) ||
            pnm.last_name?.toLowerCase().includes(term) ||
            pnm.email?.toLowerCase().includes(term) ||
            pnm.major?.toLowerCase().includes(term)
        );
    });

    const handleDeletePnm = async (id: string) => {
        if (
            !window.confirm(
                "Are you sure you want to delete this PNM? This will remove all associated votes and comments."
            )
        )
            return;
        setDeletingPnmId(id);
        try {
            const { error } = await supabase.from("pnms").delete().eq("id", id);

            if (error) throw error;

            toast({
                title: "PNM Deleted",
                description: "The PNM has been removed from the directory.",
            });

            fetchPnms();
        } catch (err: any) {
            console.error("Error deleting PNM:", err);
            toast({
                title: "Error",
                description: err.message || "Failed to delete PNM.",
                variant: "destructive",
            });
        } finally {
            setDeletingPnmId(null);
        }
    };

    const handleEditPnm = async () => {
        if (!editingPnm) return;

        try {
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

            if (error) throw error;

            toast({
                title: "PNM Updated",
                description: "PNM information has been updated successfully.",
            });

            setEditingPnm(null);
            fetchPnms();
        } catch (error: any) {
            console.error("Error updating PNM:", error);
            toast({
                title: "Update Failed",
                description:
                    error.message || "An error occurred while updating the PNM.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">PNM Management</h1>
                <p className="mt-2 text-muted-foreground">
                    Manage your Potential New Members directory.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Upload PNMs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">
                                Import PNM data using a CSV file.
                            </p>
                            <CsvUploadDropzone />
                            <div className="mt-4">
                                <CsvTemplateButton />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>PNM Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-lg font-semibold">{pnms.length}</h3>
                                <p className="text-sm text-gray-500">Total PNMs</p>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">
                                    {(
                                        pnms.reduce(
                                            (sum, pnm) => sum + (Number(pnm.gpa) || 0),
                                            0
                                        ) / (pnms.length || 1)
                                    ).toFixed(2)}
                                </h3>
                                <p className="text-sm text-gray-500">Average GPA</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>PNM Directory</CardTitle>
                    <CardDescription>
                        Browse, edit, and manage your PNMs.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search PNMs..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Spinner size="large" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredPnms.map((pnm) => (
                                <div key={pnm.id} className="relative group">
                                    <PNMCard pnm={pnm} />
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            onClick={() => setEditingPnm(pnm)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {filteredPnms.length === 0 && (
                                <div className="col-span-full text-center py-8 text-gray-500">
                                    No PNMs found. Upload CSV data to get started.
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div key={editingPnm ? editingPnm.id : "modal"}>
                {editingPnm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]">
                        <Card className="w-full max-w-md">
                            <CardHeader>
                                <CardTitle>Edit PNM</CardTitle>
                                <CardDescription>Update PNM information</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div className="flex justify-center">
                                        <div className="relative group">
                                            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100">
                                                {editingPnm.photo_url ? (
                                                    <img
                                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pnm-photos/${editingPnm.photo_url}`}
                                                        alt={`${editingPnm.first_name} ${editingPnm.last_name}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <ImageIcon className="h-8 w-8" />
                                                    </div>
                                                )}
                                            </div>
                                            <div
                                                {...getRootProps()}
                                                className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                            >
                                                <input {...getInputProps()} />
                                                <div className="text-white text-center">
                                                    {isUploading ? (
                                                        <>
                                                            <Spinner size="small" className="mx-auto mb-2" />
                                                            <p className="text-sm">{uploadProgress}%</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ImageIcon className="h-6 w-6 mx-auto mb-1" />
                                                            <p className="text-sm">Change Photo</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="first_name">First Name</Label>
                                                <Input
                                                    id="first_name"
                                                    value={editingPnm.first_name || ""}
                                                    onChange={(e) =>
                                                        setEditingPnm({
                                                            ...editingPnm,
                                                            first_name: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="last_name">Last Name</Label>
                                                <Input
                                                    id="last_name"
                                                    value={editingPnm.last_name || ""}
                                                    onChange={(e) =>
                                                        setEditingPnm({
                                                            ...editingPnm,
                                                            last_name: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                value={editingPnm.email || ""}
                                                disabled
                                                className="bg-gray-100"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="major">Major</Label>
                                                <Input
                                                    id="major"
                                                    value={editingPnm.major || ""}
                                                    onChange={(e) =>
                                                        setEditingPnm({
                                                            ...editingPnm,
                                                            major: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="year">Year</Label>
                                                <Input
                                                    id="year"
                                                    value={editingPnm.year || ""}
                                                    onChange={(e) =>
                                                        setEditingPnm({
                                                            ...editingPnm,
                                                            year: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="gpa">GPA</Label>
                                            <Input
                                                id="gpa"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="4.0"
                                                value={editingPnm.gpa || ""}
                                                onChange={(e) =>
                                                    setEditingPnm({
                                                        ...editingPnm,
                                                        gpa: Number(e.target.value),
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button
                                    variant="outline"
                                    onClick={() => setEditingPnm(null)}
                                >
                                    Cancel
                                </Button>
                                <div className="flex space-x-2">
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            if (editingPnm) {
                                                setEditingPnm(null);
                                                handleDeletePnm(editingPnm.id);
                                            }
                                        }}
                                    >
                                        Delete
                                    </Button>
                                    <Button onClick={handleEditPnm}>Save Changes</Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
} 