import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Create a Supabase client with the service role key for admin operations
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''  // Use service role key for admin operations
)

// Keep the public client for client-side operations
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Client component client
export const createComponentClient = () => {
  return createClientComponentClient()
}

// Storage helper for PNM photos
export const STORAGE_BUCKET = 'pnm-photos'

// Get public URL for a PNM photo
export function getPhotoPublicUrl(fileName) {
  if (!fileName) return null
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${fileName}`
}

// Throw an error if the environment variables are not set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
}

// Database utilities

export async function getPNMs() {
  const { data, error } = await supabase
    .from('pnms')
    .select('*')
    .order('last_name')
  
  if (error) throw error
  return data
}

export async function getPNM(id) {
  const { data, error } = await supabase
    .from('pnms')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function updatePNM(id, updates) {
  const { data, error } = await supabase
    .from('pnms')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) throw error
  return data
}

export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('starts_at')
  
  if (error) throw error
  return data
}

export async function createEvent(event) {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
  
  if (error) throw error
  return data[0]
}

export async function updateEvent(id, updates) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) throw error
  return data[0]
}

export async function getCurrentRound() {
  const { data, error } = await supabase
    .from('rounds')
    .select('*, events(*)')
    .eq('status', 'open')
    .order('id')
    .limit(1)
    .single()
  
  if (error && !error.message.includes('No rows found')) throw error
  return data
}

export async function getRounds() {
  const { data, error } = await supabase
    .from('rounds')
    .select('*, events(*)')
    .order('events.starts_at')
  
  if (error) throw error
  return data
}

export async function updateRoundStatus(id, status) {
  const updates = { 
    status, 
    ...(status === 'open' ? { opened_at: new Date().toISOString() } : {}),
    ...(status === 'closed' ? { closed_at: new Date().toISOString() } : {})
  }
  
  const { data, error } = await supabase
    .from('rounds')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) throw error
  return data[0]
}

export async function submitVote(brotherId, pnmId, roundId, score) {
  const { data, error } = await supabase
    .from('votes')
    .upsert({
      brother_id: brotherId,
      pnm_id: pnmId,
      round_id: roundId,
      score
    })
    .select()
  
  if (error) throw error
  return data[0]
}

export async function getVotes(pnmId, roundId) {
  const { data, error } = await supabase
    .from('votes')
    .select('*, brother:brother_id(id, email)')
    .eq('pnm_id', pnmId)
    .eq('round_id', roundId)
  
  if (error) throw error
  return data
}

export async function getMyVote(brotherId, pnmId, roundId) {
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('brother_id', brotherId)
    .eq('pnm_id', pnmId)
    .eq('round_id', roundId)
    .single()
  
  if (error && !error.message.includes('No rows found')) throw error
  return data
}

export async function submitComment(brotherId, pnmId, roundId, body, isAnon = false) {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      brother_id: brotherId,
      pnm_id: pnmId,
      round_id: roundId,
      body,
      is_anon: isAnon
    })
    .select()
  
  if (error) throw error
  return data[0]
}

export async function getComments(pnmId, roundId, page = 0, pageSize = 10) {
  const from = page * pageSize
  const to = from + pageSize - 1
  
  // First get the top-level comments (those without parent_id)
  const { data: topLevelComments, error: topLevelError } = await supabase
    .from('comments')
    .select('*, brother:brother_id(id, email, first_name, last_name)')
    .eq('pnm_id', pnmId)
    .eq('round_id', roundId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .range(from, to)
  
  if (topLevelError) throw topLevelError
  
  if (!topLevelComments || topLevelComments.length === 0) {
    return []
  }

  // Get all replies for these comments
  const { data: replies, error: repliesError } = await supabase
    .from('comments')
    .select('*, brother:brother_id(id, email, first_name, last_name)')
    .in('parent_id', topLevelComments.map(c => c.id))
    .order('created_at', { ascending: true })

  if (repliesError) throw repliesError

  // Organize replies under their parent comments
  const commentsWithReplies = topLevelComments.map(comment => ({
    ...comment,
    replies: replies?.filter(reply => reply.parent_id === comment.id) || []
  }))
  
  return commentsWithReplies
}

export async function deleteComment(id) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  return true
}

export async function subscribeToRoundChanges(callback) {
  return supabase
    .channel('rounds-channel')
    .on('broadcast', { event: '*' }, payload => {
      callback(payload)
    })
    .subscribe()
}

// Users management
export async function getPendingUsers() {
  const { data, error } = await supabase
    .from('users_metadata')
    .select('*, user:id(id, email, created_at)')
    .eq('role', 'pending')
  
  if (error) throw error
  return data
}

export async function approveUser(userId, role = 'brother') {
  const { data, error } = await supabase
    .from('users_metadata')
    .update({ role })
    .eq('id', userId)
    .select()
  
  if (error) throw error
  return data[0]
}

export async function deleteUser(userId) {
  // Delete the user from auth.users
  // This is admin operation that requires service role key
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  
  if (error) throw error
  return true
}
