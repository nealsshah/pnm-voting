
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/components/ui/use-toast';
import { ImageIcon } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

interface PNMPhotoUploadProps {
    pnmId: string;
    onUploadComplete: () => void;
}

export default function PNMPhotoUpload({ pnmId, onUploadComplete }: PNMPhotoUploadProps) {
    const supabase = createClientComponentClient();
    const { toast } = useToast();

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (!pnmId || acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${pnmId}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('pnm-photos')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            // Store just the file name in the database. Components will
            // construct the public URL with getPhotoPublicUrl().
            const { error: updateError } = await supabase
                .from('pnms')
                .update({ photo_url: fileName })
                .eq('id', pnmId);

            if (updateError) throw updateError;

            toast({
                title: 'Photo Uploaded',
                description: 'PNM photo has been uploaded successfully.',
            });

            if (onUploadComplete) {
                onUploadComplete();
            }
        } catch (error: any) {
            toast({
                title: 'Upload Failed',
                description: error.message,
                variant: 'destructive',
            });
        }
    }, [pnmId, supabase, toast, onUploadComplete]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    return (
        <div {...getRootProps()} className="border-2 border-dashed border rounded-lg p-8 text-center cursor-pointer hover:bg-secondary">
            <input {...getInputProps()} />
            {isDragActive ? (
                <p>Drop the files here ...</p>
            ) : (
                <div className="flex flex-col items-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Drag a photo here, or click to select a file</p>
                </div>
            )}
        </div>
    );
} 