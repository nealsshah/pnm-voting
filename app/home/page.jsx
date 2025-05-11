"use client";

import { useState, useEffect } from "react";
import { Candidate } from "../gallery/candidate-view";
import { Gallery } from "../gallery/gallery";
import { useAuth, AuthProvider } from "../auth/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCandidates } from "@/lib/candidates";
import { useRouter } from "next/navigation";

function CandidateViewSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="aspect-[3/4] w-full max-w-md mx-auto">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex justify-between mt-8">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

function GalleryViewSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function Home() {
  const [view, setView] = useState("candidate");
  const { user, signOut, isAdmin } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (user && isAdmin) {
      router.push("/admin");
      return;
    }

    async function loadCandidates() {
      try {
        const data = await getCandidates();
        if (data && data.length > 0) {
          setCandidates(data);
          setCurrentCandidateIndex(0);
        }
      } catch (error) {
        console.error("Error loading candidates:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCandidates();
  }, [user, isAdmin, router]);

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="mb-4 flex space-x-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        {view === "candidate" ? <CandidateViewSkeleton /> : <GalleryViewSkeleton />}
      </div>
    );
  }

  if (candidates.length === 0) {
    return <div className="text-center p-4">No candidates available</div>;
  }

  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">
          Business Fraternity Candidate Voting
        </h1>
        <Button onClick={signOut}>Sign Out</Button>
      </div>
      <div className="mb-4 flex space-x-4">
        <Button
          onClick={() => setView("candidate")}
          variant={view === "candidate" ? "default" : "outline"}
        >
          Candidate View
        </Button>
        <Button
          onClick={() => setView("gallery")}
          variant={view === "gallery" ? "default" : "outline"}
        >
          Gallery View
        </Button>
      </div>
      {view === "candidate" ? (
        <Candidate
          candidateId={candidates[currentCandidateIndex].id}
          onPrevious={() =>
            setCurrentCandidateIndex((prev) =>
              prev > 0 ? prev - 1 : candidates.length - 1
            )
          }
          onNext={() =>
            setCurrentCandidateIndex((prev) =>
              prev < candidates.length - 1 ? prev + 1 : 0
            )
          }
          currentRound={1}
        />
      ) : (
        <Gallery />
      )}
    </main>
  );
}

export default function HomeWrapper() {
  return (
    <AuthProvider>
      <Home />
    </AuthProvider>
  );
}
