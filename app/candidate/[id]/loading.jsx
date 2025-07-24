"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PanelLeft } from "lucide-react";
import { useEffect } from "react";

// Skeleton loader shown while candidate data is fetched / route is streaming
export default function CandidateLoading() {
    // Add panel-open class so navbar shifts while loading
    useEffect(() => {
        document.body.classList.add("panel-open");
        return () => document.body.classList.remove("panel-open");
    }, []);

    return (
        <>
            {/* Fixed side panel placeholder */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r p-4 overflow-y-auto animate-pulse z-40 hidden lg:block">
                <div className="flex items-center gap-2 mb-6 text-muted-foreground">
                    <PanelLeft className="h-4 w-4" />
                    <span className="text-sm font-medium">Candidates</span>
                </div>
                <div className="space-y-4">
                    {Array.from({ length: 12 }).map((_, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1">
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </aside>
            {/* Main candidate detail skeleton (offset by panel width) */}
            <main className="lg:ml-64 p-6 pt-[80px]">{/* push content right and below nav */}
                <div className="grid md:grid-cols-2 gap-6 animate-pulse">
                    {/* Photo */}
                    <Skeleton className="aspect-square w-full" />

                    {/* Details */}
                    <div className="space-y-6">
                        <Skeleton className="h-8 w-1/2" />

                        <div className="grid grid-cols-2 gap-4">
                            {Array.from({ length: 4 }).map((_, idx) => (
                                <div key={idx}>
                                    <Skeleton className="h-4 w-1/3 mb-2" />
                                    <Skeleton className="h-5 w-full" />
                                </div>
                            ))}
                        </div>

                        {/* Interaction / Voting section placeholder */}
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>

                {/* Comments placeholder */}
                <div className="mt-10 space-y-6 animate-pulse">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} className="space-y-2">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ))}
                </div>
            </main>
        </>
    );
} 