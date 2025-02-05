import { supabase } from './supabase'

export async function getCandidates() {
  try {
    const { data, error } = await supabase
      .from('pnm_candidates')
      .select('*')
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log('Response data:', data);
    return data;
  } catch (err) {
    console.error('Failed to fetch candidates:', err);
    throw err;
  }
}

export async function getCandidate(id) {
  const { data, error } = await supabase
    .from('pnm_candidates')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function submitVote(candidateId, vote, userId) {
  const { data, error } = await supabase
    .from('votes')
    .insert([
      {
        candidate_id: candidateId,
        vote,
        user_id: userId
      }
    ])
  
  if (error) throw error
  return data
}

export async function submitComment(candidateId, comment, userId, isAnonymous) {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      candidate_id: candidateId,
      comment,
      user_id: userId,
      is_anonymous: isAnonymous
    })
  
  if (error) throw error
  return data
}

export async function getComments(candidateId) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getVoteStats(candidateId) {
  const { data, error } = await supabase
    .from('votes')
    .select('vote')
    .eq('candidate_id', candidateId)
  
  if (error) throw error
  
  // Calculate average and count
  const votes = data.map(v => v.vote)
  const average = votes.length > 0 ? votes.reduce((a, b) => a + b) / votes.length : 0
  
  return {
    average,
    count: votes.length
  }
} 