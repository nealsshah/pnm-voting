import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { supabase as serverSupabase } from './supabase'

// This function creates a client-side Supabase client
const getSupabaseClient = () => {
  // We're in a client component
  if (typeof window !== 'undefined') {
    return createClientComponentClient()
  }
  // We're in a server component
  return serverSupabase
}

export async function getCandidates() {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('pnms')
      .select('*')
      .order('last_name')
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
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
    
    // Need to get the current open round
    const { data: rounds, error: roundError } = await supabase
      .from('rounds')
      .select('id')
      .eq('status', 'open')
      .limit(1)
      .single()
    
    if (roundError) {
      console.error('Failed to get current round:', roundError)
      throw new Error('Could not find an open round for commenting')
    }
    
    const { data, error } = await supabase
      .from('comments')
      .insert({
        pnm_id: candidateId,
        body: comment,
        brother_id: userId,
        is_anon: isAnonymous,
        round_id: rounds.id
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
    
    // First get the comments
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('pnm_id', candidateId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    if (!comments || comments.length === 0) return []
    
    // Now get the user data for each comment
    const brotherIds = [...new Set(comments.map(c => c.brother_id))]
    
    const { data: users, error: usersError } = await supabase
      .from('users_metadata')
      .select('id, email, first_name, last_name, role')
      .in('id', brotherIds)
    
    if (usersError) {
      console.error('Failed to get user data:', usersError)
      return comments
    }
    
    // Join the data
    const commentsWithUsers = comments.map(comment => {
      const user = users.find(u => u.id === comment.brother_id)
      return {
        ...comment,
        brother: user || null
      }
    })
    
    return commentsWithUsers
  } catch (err) {
    console.error('Failed to get comments:', err);
    throw err;
  }
}

export async function getVoteStats(candidateId) {
  try {
    const supabase = getSupabaseClient()
    
    // Fetch votes with round information
    const { data, error } = await supabase
      .from('votes')
      .select('score, round_id, rounds(name)')
      .eq('pnm_id', candidateId)
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      return {
        average: 0,
        count: 0,
        roundStats: {}
      }
    }

    // Overall stats
    const scores = data.map(v => v.score)
    const average = scores.reduce((a, b) => a + b, 0) / scores.length
    const count = scores.length

    // Per-round breakdown
    const roundStats = {}
    data.forEach(vote => {
      const roundName = vote.rounds?.name || `Round ${vote.round_id}`
      if (!roundStats[roundName]) {
        roundStats[roundName] = { count: 0, sum: 0 }
      }
      roundStats[roundName].count += 1
      roundStats[roundName].sum += vote.score
    })

    // Convert sum to average
    Object.keys(roundStats).forEach(key => {
      const { count: c, sum } = roundStats[key]
      roundStats[key].average = sum / c
      delete roundStats[key].sum
    })

    return {
      average,
      count,
      roundStats
    }
  } catch (err) {
    console.error('Failed to get vote stats:', err);
    return { average: 0, count: 0, roundStats: {} };
  }
}

export async function deleteCandidate(id) {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('pnms')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Failed to delete candidate ${id}:`, err);
    throw err;
  }
} 