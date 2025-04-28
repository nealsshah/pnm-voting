import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { ScheduleManager } from './schedule-manager'

export default async function SchedulePage() {
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
  
  // Get all events ordered by start time
  const { data: events } = await supabase
    .from('events')
    .select('*, rounds(*)')
    .order('starts_at', { ascending: true })
  
  return (
    <ScheduleManager 
      events={events || []}
      userId={session.user.id}
    />
  )
} 