import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { ScheduleManager } from './schedule-manager'

export default async function SchedulePage() {
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
  
  // Get all events ordered by start time with rounds
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*, rounds(*)')
    .order('starts_at', { ascending: true })
  
  if (eventsError && eventsError.message) {
    console.error('[Server] Error fetching events for schedule page:', eventsError)
  }
  
  return (
    <ScheduleManager 
      events={events || []}
      userId={user.id}
    />
  )
} 