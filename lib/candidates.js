import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { supabase as serverSupabase } from './supabase'

// This function creates a client-side Supabase client
const getSupabaseClient = () => {
  // We're in a client component
  if (typeof window !== 'undefined') {
    console.log("Using client component client")
    return createClientComponentClient()
  }
  // We're in a server component
  console.log("Using server client")
  return serverSupabase
}

export async function getCandidates() {
  console.log("getCandidates function called")
  try {
    const supabase = getSupabaseClient()
    console.log("Supabase client created, fetching candidates")
    
    const { data, error } = await supabase
      .from('pnms')
      .select('*')
      .order('last_name')
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} candidates`);
    return data || [];
  } catch (err) {
    console.error('Failed to fetch candidates:', err);
    throw err;
  }
}

export async function getCandidate(id) {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('pnms')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  } catch (err) {
    console.error(`Failed to fetch candidate ${id}:`, err);
    throw err;
  }
}

export async function submitVote(candidateId, vote, userId) {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('votes')
      .insert([
        {
          pnm_id: candidateId,
          score: vote,
          brother_id: userId
        }
      ])
    
    if (error) throw error
    return data
  } catch (err) {
    console.error('Failed to submit vote:', err);
    throw err;
  }
}

export async function submitComment(candidateId, comment, userId, isAnonymous) {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('comments')
      .insert({
        pnm_id: candidateId,
        body: comment,
        brother_id: userId,
        is_anonymous: isAnonymous
      })
    
    if (error) throw error
    return data
  } catch (err) {
    console.error('Failed to submit comment:', err);
    throw err;
  }
}

export async function getComments(candidateId) {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('comments')
      .select('*, brother:brother_id(*)')
      .eq('pnm_id', candidateId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Failed to get comments:', err);
    throw err;
  }
}

export async function getVoteStats(candidateId) {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('votes')
      .select('score')
      .eq('pnm_id', candidateId)
    
    if (error) throw error
    
    // Calculate average and count
    const votes = data.map(v => v.score)
    const average = votes.length > 0 ? votes.reduce((a, b) => a + b) / votes.length : 0
    
    return {
      average,
      count: votes.length
    }
  } catch (err) {
    console.error('Failed to get vote stats:', err);
    return { average: 0, count: 0 };
  }
} 