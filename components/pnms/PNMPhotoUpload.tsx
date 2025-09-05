"use client";

import { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/components/ui/use-toast';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

interface PNMPhotoUploadProps {
    pnmId: string;
    onUploadComplete?: (newFileName: string) => void;
    photoUrl?: string | null;
    fallbackText?: string;
}

export default function PNMPhotoUpload({ pnmId, onUploadComplete, photoUrl, fallbackText }: PNMPhotoUploadProps) {
    const supabase = createClientComponentClient();
    const { toast } = useToast();

    const [uploading, setUploading] = useState(false);
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

    const displayImageUrl = useMemo(() => {
        return localPreviewUrl || photoUrl || null;
    }, [localPreviewUrl, photoUrl]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (!pnmId || acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        const previewUrl = URL.createObjectURL(file);
        setLocalPreviewUrl(previewUrl);
        setUploading(true);

        const fileExt = file.name.split('.').pop();
        const fileName = `${pnmId}.${fileExt}`;

        try {
            // Try upload with upsert. Some deployments may still throw conflict on existing file.
            let { error: uploadError } = await supabase.storage
                .from('pnm-photos')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true,
                });

            // Fallback to update if conflict occurs
            if (uploadError && /exists|409/i.test(uploadError.message || '')) {
                const { error: updateErr } = await supabase.storage
                    .from('pnm-photos')
                    .update(fileName, file, { cacheControl: '3600', upsert: true });
                if (updateErr) throw updateErr;
                uploadError = null as any;
            }

            if (uploadError) throw uploadError;

            const { error: updateError } = await supabase
                .from('pnms')
                .update({ photo_url: fileName })
                .eq('id', pnmId);

            if (updateError) throw updateError;

            toast({
                title: 'Photo uploaded',
                description: 'We updated their profile photo.',
            });

            onUploadComplete?.(fileName);
        } catch (error: any) {
            toast({
                title: 'Upload failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
            // Allow the preview to remain; parent will refresh actual data/image
            // Revoke object URL after a short delay to avoid flicker on refresh
            setTimeout(() => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
            }, 4000);
        }
    }, [pnmId, supabase, toast, onUploadComplete]);

    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
        onDrop,
        // Support common image types including HEIC/HEIF from iOS
        accept: {
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
            'image/heic': ['.heic'],
            'image/heif': ['.heif'],
        },
        multiple: false,
        maxSize: 10 * 1024 * 1024,
        disabled: uploading,
        onDropRejected: (rejections) => {
            const first = rejections?.[0];
            if (first) {
                const reason = first.errors?.map(e => e.message).join(', ') || 'File rejected';
                toast({ title: 'Unsupported file', description: reason, variant: 'destructive' });
            }
        }
    });

    return (
        <div
            {...getRootProps({
                className: 'relative group w-32 h-32 rounded-full overflow-hidden border-2 border-dashed border-muted-foreground/30 cursor-pointer select-none',
            })}
            title={uploading ? 'Uploading...' : 'Click or drop to upload a photo'}
        >
            <input {...getInputProps()} />

            {displayImageUrl ? (
                <img src={displayImageUrl} alt="PNM photo" className="object-cover w-full h-full" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
            )}

            {/* Hover overlay */}
            <div className={`absolute inset-0 flex items-center justify-center text-center transition ${uploading ? 'bg-background/70' : 'opacity-0 group-hover:opacity-100 bg-background/50'}`}>
                {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                        <span className="text-xs">Uploading…</span>
                    </div>
                ) : (
                    <span className="px-2 text-xs">Drop or click to upload</span>
                )}
            </div>
        </div>
    );
}