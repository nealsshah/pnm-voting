import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { AdminDashboard } from './admin-dashboard'

export default async function AdminPage() {
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
  const { data: userRole, error: roleError } = await supabase
    .from('users_metadata')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (roleError) {
    console.error('Error fetching user role:', roleError)
    redirect('/login')
  }
  
  // Only allow admins to access this page
  if (!userRole || userRole.role !== 'admin') {
    redirect('/')
  }
  
  // Get statistics for dashboard
  const [
    { data: pnmCount, error: pnmError },
    { data: eventCount, error: eventError },
    { data: pendingUsers, error: pendingError },
    { data: rounds, error: roundsError }
  ] = await Promise.all([
    supabase
      .from('pnms')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('users_metadata')
      .select('id')
      .eq('role', 'pending'),
    supabase
      .from('rounds')
      .select('*, event:event_id(*)')
      .order('event.starts_at', { ascending: true })
  ])

  // Get current round with error handling
  let currentRound = null
  try {
    const { data } = await supabase
      .from('rounds')
      .select('*, event:event_id(*)')
      .eq('status', 'open')
      .limit(1)
      .single()
    currentRound = data
  } catch (error) {
    console.error('Error fetching current round:', error)
  }

  // Check for any errors in the parallel requests
  const dashboardErrors = [pnmError, eventError, pendingError, roundsError].filter(err => err && err.message)
  if (dashboardErrors.length > 0) {
    console.error('[Server] Error fetching dashboard data:', dashboardErrors)
    // Continue rendering with default values rather than failing completely
  }
  
  return (
    <AdminDashboard 
      pnmCount={pnmCount?.count || 0}
      eventCount={eventCount?.count || 0}
      pendingUserCount={pendingUsers?.length || 0}
      currentRound={currentRound}
      rounds={rounds || []}
      userId={user.id}
    />
  )
}

