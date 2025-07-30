import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { supabase as serverSupabase } from './supabase'

// ------------------------------
// Helper: median of a numeric array – returns 0 if array empty.
function median(arr = []) {
  if (!arr || arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}
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
      .select('id, first_name, last_name, photo_url, major, year, gpa, email')
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

    // 1) Get the base candidate list (with *all* votes nested so existing stats keep working)
    const { data, error } = await supabase
      .from('pnms')
      .select(`
        id,
        first_name,
        last_name,
        photo_url,
        major,
        year,
        gpa,
        email,
        created_at,
        votes (
          score,
          round_id
        )
      `)
      .order('last_name')

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // 2) Determine the currently *open* round (fallback: null)
    const { data: currentRound } = await supabase
      .from('rounds')
      .select('id, name')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 3) Gather vote aggregates depending on whether a round is open.
    let roundVotes = []
    if (currentRound) {
      const { data: rv } = await supabase
        .from('votes')
        .select('pnm_id, score')
        .eq('round_id', currentRound.id)
      roundVotes = rv || []
    } else {
      // No open round – use ALL votes for Bayesian calculation
      const { data: rv } = await supabase
        .from('votes')
        .select('pnm_id, score')
      roundVotes = rv || []
    }

    // Build helper maps for whichever vote set we have (open round or global)
    const countsMap = {}
    const sumsMap = {}
    roundVotes.forEach(v => {
      countsMap[v.pnm_id] = (countsMap[v.pnm_id] || 0) + 1
      sumsMap[v.pnm_id] = (sumsMap[v.pnm_id] || 0) + v.score
    })

    const countsArr = Object.values(countsMap)
    const C = median(countsArr) // weight constant

    const overallRoundAvg = roundVotes.length
      ? roundVotes.reduce((s, v) => s + v.score, 0) / roundVotes.length
      : 0

    // 4) Process each candidate row, injecting simple + Bayesian stats
    const candidatesWithStats = (data || []).map(candidate => {
      const scoresAll = candidate.votes.map(v => v.score)
      const average = scoresAll.length > 0 ? scoresAll.reduce((a, b) => a + b, 0) / scoresAll.length : 0
      const count = scoresAll.length

      // Current round specific data
      const roundCount = countsMap[candidate.id] || 0
      const roundSum = sumsMap[candidate.id] || 0
      const roundAvg = roundCount > 0 ? roundSum / roundCount : 0

      // Bayesian average – use roundAvg (open round) or overallAvg if no open round
      const numerator = roundAvg * roundCount + C * overallRoundAvg
      const denominator = roundCount + C
      const bayesian = denominator === 0 ? 0 : numerator / denominator

      // Clean up – we don't need the nested votes array any more
      delete candidate.votes

      return {
        ...candidate,
        vote_stats: {
          average,
          count,
          bayesian, // Bayesian average (current round if open, else overall)
          current_round: {
            average: roundAvg,
            count: roundCount,
            bayesian,
            round_id: currentRound ? currentRound.id : null,
            round_name: currentRound ? currentRound.name : null,
          },
        },
      }
    })

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
      .select('id, first_name, last_name, photo_url, major, year, gpa, email')
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
      .select('id, body, brother_id, created_at, parent_id, is_anon, pnm_id, round_id')
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

    // ------------------------------
    // Build global per-round aggregates so we can compute Bayesian stats for *each* round.
    const { data: allVotes } = await supabase
      .from('votes')
      .select('pnm_id, round_id, score')

    // Build global counts and sum of scores (across all rounds)
    const globalCountsMap = {}
    let allScoresSum = 0
    let allScoresCount = 0
    allVotes?.forEach(v => {
      globalCountsMap[v.pnm_id] = (globalCountsMap[v.pnm_id] || 0) + 1
      allScoresSum += v.score
      allScoresCount += 1
    })

    const roundAggregates = {}
    allVotes?.forEach(v => {
      if (!roundAggregates[v.round_id]) {
        roundAggregates[v.round_id] = { sum: 0, count: 0, countsPerCandidate: {} }
      }
      const agg = roundAggregates[v.round_id]
      agg.sum += v.score
      agg.count += 1
      agg.countsPerCandidate[v.pnm_id] = (agg.countsPerCandidate[v.pnm_id] || 0) + 1
    })

    // Pre-compute per-round overall averages and medians of counts
    const roundStatsGlobals = {}
    Object.entries(roundAggregates).forEach(([rid, agg]) => {
      const countsArray = Object.values(agg.countsPerCandidate)
      roundStatsGlobals[rid] = {
        globalAvg: agg.count === 0 ? 0 : agg.sum / agg.count,
        medianCount: median(countsArray),
      }
    })

    // Overall stats across *all* rounds for this candidate (simple average)
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

        // Compute Bayesian average for this round using global stats
        const glob = roundStatsGlobals[allRounds.find(r => r.name === key)?.id]
        if (glob) {
          const bayesNumerator = stats.average * stats.count + glob.medianCount * glob.globalAvg
          const bayesDenominator = stats.count + glob.medianCount
          stats.bayesian = bayesDenominator === 0 ? 0 : bayesNumerator / bayesDenominator
        } else {
          stats.bayesian = stats.average
        }

        delete stats.sum
      }
    })

    // Top-level Bayesian:
    //   – Always compute Bayesian across ALL rounds using overall stats.
    //   – This provides a true weighted average that treats each vote equally.
    const C_overall = median(Object.values(globalCountsMap))
    const globalAvgOverall = allScoresCount === 0 ? 0 : allScoresSum / allScoresCount

    const numer = average * count + C_overall * globalAvgOverall
    const denom = count + C_overall
    const bayesian = denom === 0 ? 0 : numer / denom

    return {
      average,
      count,
      bayesian,
      roundStats
    }
  } catch (err) {
    console.error('Failed to get vote stats:', err);
    return { average: 0, count: 0, bayesian: 0, roundStats: {} };
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