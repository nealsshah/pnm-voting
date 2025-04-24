"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCandidates } from "@/lib/candidates";
import { Spinner } from "@/components/ui/spinner";

export default function DefaultCandidatePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function redirectToFirstCandidate() {
      try {
        const candidates = await getCandidates();
        
        if (candidates && candidates.length > 0) {
          // Redirect to the first candidate
          router.push(`/candidate/${candidates[0].id}`);
        } else {
          // No candidates found, set loading to false to show message
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching candidates:", error);
        setLoading(false);
      }
    }

    redirectToFirstCandidate();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="large" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 text-center">
      <h1 className="text-2xl font-bold mb-4">No Candidates Found</h1>
      <p>There are no potential new members in the system yet.</p>
    </div>
  );
} 