"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function CandidateDefaultLoading() {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="space-y-4 w-full max-w-md p-8 animate-pulse">
                <Skeleton className="h-8 w-3/4 mx-auto" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    );
} 