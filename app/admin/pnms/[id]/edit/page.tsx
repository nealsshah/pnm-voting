'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import PNMPhotoUpload from '@/components/pnms/PNMPhotoUpload';
import { ImageIcon } from 'lucide-react';

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

export default function EditPnmPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;
    const supabase = createClientComponentClient();
    const { toast } = useToast();
    const [pnm, setPnm] = useState<Pnm | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPnm = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('pnms')
                    .select('*')
                    .eq('id', id as string)
                    .single();
                if (error) throw error;
                setPnm(data as Pnm);
            } catch (error) {
                console.error('Error fetching PNM:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to fetch PNM details.',
                    variant: 'destructive',
                });
            } finally {
                setLoading(false);
            }
        };
        fetchPnm();
    }, [id, supabase, toast]);

    const handleUpdatePnm = async () => {
        if (!pnm) return;
        try {
            const { error } = await supabase
                .from('pnms')
                .update({
                    first_name: pnm.first_name,
                    last_name: pnm.last_name,
                    major: pnm.major,
                    year: pnm.year,
                    gpa: pnm.gpa,
                })
                .eq('id', pnm.id);
            if (error) throw error;
            toast({
                title: 'PNM Updated',
                description: 'PNM details have been successfully updated.',
            });
            router.push('/admin/pnms');
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!pnm) {
        return <div>PNM not found.</div>;
    }

    return (
        <div className="p-4">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Edit PNM</CardTitle>
                    <CardDescription>Update the details for {pnm.first_name} {pnm.last_name}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100">
                                {pnm.photo_url ? (
                                    <img
                                        src={pnm.photo_url}
                                        alt={`${pnm.first_name} ${pnm.last_name}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <ImageIcon className="h-8 w-8" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <PNMPhotoUpload
                            pnmId={pnm.id}
                            onUploadComplete={() => {
                                const fetchPnm = async () => {
                                    if (!id) return;
                                    const { data } = await supabase
                                        .from('pnms')
                                        .select('*')
                                        .eq('id', id as string)
                                        .single();
                                    if (data) setPnm(data as Pnm);
                                };
                                fetchPnm();
                            }}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input id="first_name" value={pnm.first_name || ''} onChange={(e) => setPnm({ ...pnm, first_name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input id="last_name" value={pnm.last_name || ''} onChange={(e) => setPnm({ ...pnm, last_name: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="major">Major</Label>
                            <Input id="major" value={pnm.major || ''} onChange={(e) => setPnm({ ...pnm, major: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="year">Year</Label>
                            <Input id="year" value={pnm.year || ''} onChange={(e) => setPnm({ ...pnm, year: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gpa">GPA</Label>
                            <Input id="gpa" type="number" value={pnm.gpa || 0} onChange={(e) => setPnm({ ...pnm, gpa: Number(e.target.value) })} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => router.push('/admin/pnms')}>Cancel</Button>
                    <Button onClick={handleUpdatePnm}>Save Changes</Button>
                </CardFooter>
            </Card>
        </div>
    );
} 