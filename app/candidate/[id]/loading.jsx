"use client";

import { Skeleton } from "@/components/ui/skeleton";

// Skeleton loader shown while candidate data is fetched / route is streaming
export default function CandidateLoading() {
    return (
        <div className="relative min-h-screen">
            {/* Navigation Bar Skeleton */}
            <div className="flex items-center gap-4 p-4 border-b bg-background sticky top-0 z-50">
                <Skeleton className="h-8 w-32" />
                <div className="flex-1" />
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </div>

            {/* Main Content */}
            <div className="p-4 md:p-6 md:ml-0 lg:ml-80">
                {/* Navigation context skeleton */}
                <div className="flex items-center justify-between mb-6">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                </div>

                <div className="grid lg:grid-cols-7 gap-4 md:gap-6">
                    <div className="lg:col-span-4 space-y-4 md:space-y-6">
                        {/* Photo skeleton */}
                        <Skeleton className="aspect-[3/4] w-full max-w-[400px] mx-auto" />

                        {/* Details skeleton */}
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-48" />
                            <div className="grid grid-cols-2 gap-4">
                                {Array.from({ length: 4 }).map((_, idx) => (
                                    <div key={idx}>
                                        <Skeleton className="h-4 w-16 mb-2" />
                                        <Skeleton className="h-5 w-full" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right section skeleton */}
                    <div className="lg:col-span-3 space-y-4 md:space-y-6">
                        <div className="space-y-4">
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    </div>
                </div>

                {/* Comments skeleton */}
                <div className="mt-4 md:mt-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="space-y-4">
                        {Array.from({ length: 2 }).map((_, idx) => (
                            <div key={idx} className="space-y-2">
                                <Skeleton className="h-4 w-1/4" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Side Panel Skeleton */}
            <aside className="fixed left-0 top-14 bottom-0 w-[280px] md:w-80 bg-background border-r shadow-lg z-40 lg:z-30 flex flex-col">
                <div className="p-4 space-y-4 flex-1 overflow-hidden">
                    <div className="flex justify-between items-center lg:hidden">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-8 w-8" />
                    </div>
                    <Skeleton className="h-9 w-full" />
                    <div className="flex gap-2">
                        <Skeleton className="h-9 flex-1" />
                        <Skeleton className="h-9 w-9" />
                    </div>
                    <div className="space-y-1">
                        {Array.from({ length: 8 }).map((_, idx) => (
                            <div key={idx} className="flex items-center gap-3 rounded-lg px-3 py-2">
                                <Skeleton className="w-8 h-8 rounded-full" />
                                <div className="min-w-0 flex-1">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-12 mt-1" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>
        </div>
    );
} 