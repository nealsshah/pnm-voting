import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { RoundsManager } from './rounds-manager'

export default async function RoundsPage() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Get user role
  const { data: userRole } = await supabase
    .from('users_metadata')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only allow admins to access this page
  if (!userRole || userRole.role !== 'admin') {
    redirect('/')
  }

  // Get current cycle id
  const { data: currentCycle } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'current_cycle_id')
    .single()

  // Get current round (if any)
  let currentRound = null
  try {
    let q = supabase
      .from('rounds')
      .select('*')
      .eq('status', 'open')
      .limit(1)
      .single()
    if (currentCycle?.value?.id) q = q.eq('cycle_id', currentCycle.value.id)
    const { data, error } = await q

    if (!error) {
      currentRound = data
    }
  } catch (error) {
    console.error('Error fetching current round:', error)
  }

  // Get a pending round (optional, may be null)
  let nextRound = null
  try {
    let q = supabase
      .from('rounds')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    if (currentCycle?.value?.id) q = q.eq('cycle_id', currentCycle.value.id)
    const { data, error } = await q
    if (!error) {
      nextRound = data
    }
  } catch (error) {
    console.error('Error fetching next round:', error)
  }

  // Get all rounds within current cycle
  let roundsQ = supabase
    .from('rounds')
    .select('*')
    .order('created_at', { ascending: true })
  if (currentCycle?.value?.id) roundsQ = roundsQ.eq('cycle_id', currentCycle.value.id)
  const { data: rounds } = await roundsQ

  return (
    <RoundsManager
      rounds={rounds || []}
      currentRound={currentRound}
      nextRound={nextRound}
      userId={user.id}
    />
  )
} 