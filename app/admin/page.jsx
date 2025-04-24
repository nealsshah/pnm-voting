import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { AdminDashboard } from './admin-dashboard'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Get user role
  const { data: userRole } = await supabase
    .from('users_metadata')
    .select('role')
    .eq('id', session.user.id)
    .single()
  
  // Only allow admins to access this page
  if (!userRole || userRole.role !== 'admin') {
    redirect('/')
  }
  
  // Get statistics for dashboard
  const { data: pnmCount } = await supabase
    .from('pnms')
    .select('id', { count: 'exact', head: true })
  
  const { data: eventCount } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
  
  const { data: pendingUsers } = await supabase
    .from('users_metadata')
    .select('id')
    .eq('role', 'pending')
  
  const { data: currentRound } = await supabase
    .from('rounds')
    .select('*, event:event_id(*)')
    .eq('status', 'open')
    .limit(1)
    .single()
  
  // Get all rounds with events
  const { data: rounds } = await supabase
    .from('rounds')
    .select('*, event:event_id(*)')
    .order('event.starts_at', { ascending: true })
  
  return (
    <AdminDashboard 
      pnmCount={pnmCount?.count || 0}
      eventCount={eventCount?.count || 0}
      pendingUserCount={pendingUsers?.length || 0}
      currentRound={currentRound || null}
      rounds={rounds || []}
      userId={session.user.id}
    />
  )
}

