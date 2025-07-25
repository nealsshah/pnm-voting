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

export async function getCandidatesWithVoteStats() {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('pnms')
      .select(`
        *,
        votes (
          score
        )
      `)
      .order('last_name')

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Now process the data to calculate stats
    const candidatesWithStats = (data || []).map(candidate => {
      const scores = candidate.votes.map(v => v.score);
      const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const count = scores.length;

      delete candidate.votes;

      return {
        ...candidate,
        vote_stats: {
          average,
          count
        }
      };
    });

    return candidatesWithStats;
  } catch (err) {
    console.error('Failed to fetch candidates with vote stats:', err);
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
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('score, round_id, rounds(name)')
      .eq('pnm_id', candidateId)

    if (votesError) throw votesError

    // Get all rounds to include those with zero votes
    const { data: allRounds, error: roundsError } = await supabase
      .from('rounds')
      .select('id, name')
      .eq('type', 'traditional')
      .order('created_at')

    if (roundsError) throw roundsError

    // Overall stats
    const scores = (votes || []).map(v => v.score)
    const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const count = scores.length

    // Per-round breakdown - include all rounds
    const roundStats = {}

      // Initialize all rounds with zero votes
      ; (allRounds || []).forEach(round => {
        roundStats[round.name] = { count: 0, average: 0 }
      })

      // Add actual vote data
      ; (votes || []).forEach(vote => {
        const roundName = vote.rounds?.name || `Round ${vote.round_id}`
        if (!roundStats[roundName]) {
          roundStats[roundName] = { count: 0, sum: 0 }
        }
        roundStats[roundName].count += 1
        roundStats[roundName].sum = (roundStats[roundName].sum || 0) + vote.score
      })

    // Convert sum to average for rounds with votes
    Object.keys(roundStats).forEach(key => {
      const stats = roundStats[key]
      if (stats.sum !== undefined) {
        stats.average = stats.sum / stats.count
        delete stats.sum
      }
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

// ---------------------------------------
// Interaction statistics for Did-Not-Interact rounds
// Returns { interacted: number, notInteracted: number, total: number, percentInteracted: number }
// If roundId is provided, restrict to that round – otherwise aggregates across all rounds.
export async function getInteractionStats(candidateId, roundId = null) {
  try {
    const supabase = getSupabaseClient()

    let selectCols = 'interacted'
    if (!roundId) {
      // need round info for breakdown
      selectCols += ', round_id, rounds(name)'
    }

    let query = supabase
      .from('interactions')
      .select(selectCols)
      .eq('pnm_id', candidateId)

    if (roundId) query = query.eq('round_id', roundId)

    const { data, error } = await query

    if (error) throw error

    const interacted = (data || []).filter(i => i.interacted).length
    const notInteracted = (data || []).filter(i => !i.interacted).length
    const total = interacted + notInteracted
    const percentInteracted = total === 0 ? 0 : (interacted / total) * 100

    // Per-round stats when not filtering by round
    let roundStats = undefined
    if (!roundId) {
      roundStats = {}
        ; (data || []).forEach(row => {
          const roundName = row.rounds?.name || row.round_id
          if (!roundStats[roundName]) {
            roundStats[roundName] = { yes: 0, no: 0 }
          }
          row.interacted ? roundStats[roundName].yes++ : roundStats[roundName].no++
        })
      Object.keys(roundStats).forEach(k => {
        const { yes, no } = roundStats[k]
        roundStats[k].percent = yes + no === 0 ? 0 : (yes / (yes + no)) * 100
      })
    }

    return { interacted, notInteracted, total, percentInteracted, roundStats }
  } catch (err) {
    console.error('Failed to get interaction stats:', err)
    return { interacted: 0, notInteracted: 0, total: 0, percentInteracted: 0 }
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