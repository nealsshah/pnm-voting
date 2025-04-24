"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "@/components/ui/use-toast";
import { Spinner } from "@/components/ui/spinner";

export default function CsvUploadDropzone() {
  const [uploading, setUploading] = useState(false);

  const uploadCsv = async (file) => {
    if (!file) return;
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/csv-import', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Upload successful",
          description: `${result.inserted} PNMs inserted, ${result.skipped} skipped.`,
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading the CSV.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    maxSize: 2 * 1024 * 1024, // 2MB
    onDropAccepted: files => uploadCsv(files[0]),
  });

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed p-8 rounded-lg transition-colors ${
        isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
      } cursor-pointer`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center text-center">
        {uploading ? (
          <>
            <Spinner className="mb-2" />
            <p className="text-sm text-gray-500">Uploading...</p>
          </>
        ) : (
          <>
            <p className="text-sm mb-1">
              {isDragActive ? 'Drop the file here...' : 'Drag and drop a CSV file here, or click to select'}
            </p>
            <p className="text-xs text-gray-500">
              Max size: 2MB - Only .csv files are accepted
            </p>
          </>
        )}
      </div>
    </div>
  );
} 