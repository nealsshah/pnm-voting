import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { name, startsAt } = await request.json()

  // Validate the request
  if (!name || !startsAt) {
    return NextResponse.json(
      { error: 'Invalid request. Both name and startsAt are required.' },
      { status: 400 }
    )
  }

  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  // Check if user is authenticated and is an admin
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Verify user is an admin
  const { data: userRole } = await supabase
    .from('users_metadata')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!userRole || userRole.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden. Only admins can create events.' },
      { status: 403 }
    )
  }
  
  try {
    // Check if the starts_at time is in the future
    if (new Date(startsAt) <= new Date()) {
      return NextResponse.json(
        { error: 'Event must be scheduled in the future.' },
        { status: 400 }
      )
    }
    
    // Create the event
    const { data, error } = await supabase
      .from('events')
      .insert([{
        name,
        starts_at: startsAt,
        created_by: session.user.id
      }])
      .select()
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true,
      event: data[0]
    })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
} 