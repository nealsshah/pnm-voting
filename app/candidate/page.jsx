"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCandidatesWithVoteStats } from "@/lib/candidates";
import { Spinner } from "@/components/ui/spinner";

export default function DefaultCandidatePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function redirectToFirstCandidate() {
      try {
        const sortField = searchParams.get('sortField') || 'name';
        const sortOrder = searchParams.get('sortOrder') || 'asc';

        // Use enriched data so we can sort by averages/votes when requested
        const candidates = await getCandidatesWithVoteStats();
        const visible = (candidates || []).filter(c => !c.hidden);

        // Apply sorting consistent with CandidateView
        const sorted = [...visible].sort((a, b) => {
          let comparison = 0;
          switch (sortField) {
            case 'name': {
              const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
              const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
              comparison = nameA.localeCompare(nameB);
              break;
            }
            case 'avgScore': {
              const scoreA = a.vote_stats?.average || 0;
              const scoreB = b.vote_stats?.average || 0;
              comparison = scoreA - scoreB;
              break;
            }
            case 'bayesScore': {
              const bA = a.vote_stats?.bayesian || 0;
              const bB = b.vote_stats?.bayesian || 0;
              comparison = bA - bB;
              break;
            }
            case 'totalVotes': {
              const votesA = a.vote_stats?.count || 0;
              const votesB = b.vote_stats?.count || 0;
              comparison = votesA - votesB;
              break;
            }
            default:
              comparison = 0;
          }
          return sortOrder === 'asc' ? comparison : -comparison;
        });

        if (sorted && sorted.length > 0) {
          // Preserve current query params (sort, filters) on redirect
          const params = new URLSearchParams(searchParams.toString());
          router.push(`/candidate/${sorted[0].id}?${params.toString()}`);
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
  }, [router, searchParams]);

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