'use client'

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useQueryClient } from '@tanstack/react-query'
import type { Database } from '@/lib/database.types'

interface Round {
  id: string;
  name: string;
  status: 'open' | 'closed' | 'upcoming';
  [key: string]: any;
}

interface RoundStatusContextType {
  currentRound: Round | null;
  isLoading: boolean;
}

export const RoundStatusContext = createContext<RoundStatusContextType>({
  currentRound: null,
  isLoading: true,
});

interface RoundStatusProviderProps {
  children: ReactNode;
}

export const RoundStatusProvider = ({ children }: RoundStatusProviderProps) => {
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient<Database>();
  const queryClient = useQueryClient()

  const fetchCurrentRound = async () => {
    setIsLoading(true);
    try {
      // Ensure we have a valid session for RLS-protected tables
      await supabase.auth.getSession()

      const { data, error: supabaseError } = await supabase
        .from('rounds')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (supabaseError) {
        const error = new Error(supabaseError.message || 'Failed to fetch current round')
        console.error('Error fetching current round:', supabaseError)
        setCurrentRound(null)
      } else {
        setCurrentRound(data as Round);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentRound();

    const channel = supabase.channel('rounds-status-channel');
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds' }, () => {
        fetchCurrentRound();
        queryClient?.invalidateQueries({ queryKey: ['currentRound'] })
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  return (
    <RoundStatusContext.Provider value={{ currentRound, isLoading }}>
      {children}
    </RoundStatusContext.Provider>
  );
};

// Custom hook for consuming the context
export function useRoundStatus() {
  const context = React.useContext(RoundStatusContext)

  if (context === undefined) {
    throw new Error('useRoundStatus must be used within a RoundStatusProvider')
  }

  return context
} 