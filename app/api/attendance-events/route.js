import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

/**
 * GET /api/attendance-events
 * Returns all attendance events with attendance counts
 */
export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Auth check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRole } = await supabase
      .from('users_metadata')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admins only.' }, { status: 403 })
    }

    // Get all attendance events with attendance counts
    const { data: events, error: eventsError } = await supabase
      .from('attendance_events')
      .select(`
        *,
        attendance_count:pnm_attendance(count)
      `)
      .order('created_at', { ascending: false })

    if (eventsError) throw eventsError

    return NextResponse.json({ events: events || [] })
  } catch (err) {
    console.error('Attendance events fetch error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/attendance-events
 * Creates a new attendance event
 * Body: { name: string, description?: string, eventDate?: string }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { name, description, eventDate } = body || {}

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Auth check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRole } = await supabase
      .from('users_metadata')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admins only.' }, { status: 403 })
    }

    // Create the attendance event
    const { data: event, error: createError } = await supabase
      .from('attendance_events')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        event_date: eventDate || null,
        created_by: session.user.id
      })
      .select()
      .single()

    if (createError) {
      if (createError.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'An event with this name already exists' }, { status: 400 })
      }
      throw createError
    }

    return NextResponse.json({ success: true, event })
  } catch (err) {
    console.error('Attendance event creation error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
} 