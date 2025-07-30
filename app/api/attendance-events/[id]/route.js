import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

/**
 * GET /api/attendance-events/[id]
 * Returns attendance event details with list of attendees
 */
export async function GET(request, { params }) {
  try {
    const { id } = params

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

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('attendance_events')
      .select('*')
      .eq('id', id)
      .single()

    if (eventError) throw eventError
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Get attendance list with PNM details
    const { data: attendance, error: attendanceError } = await supabase
      .from('pnm_attendance')
      .select(`
        id,
        created_at,
        pnms:pnm_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('event_id', id)
      .order('created_at', { ascending: false })

    if (attendanceError) throw attendanceError

    return NextResponse.json({
      event,
      attendance: attendance || [],
      attendeeCount: attendance?.length || 0
    })
  } catch (err) {
    console.error('Attendance event details fetch error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/attendance-events/[id]
 * Uploads attendance for a specific event
 * Body: { emails: string[] }
 */
export async function POST(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const { emails } = body || {}

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'emails array is required' }, { status: 400 })
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

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('attendance_events')
      .select('id, name')
      .eq('id', id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Clean and normalize emails
    const cleanEmails = emails
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0)

    if (cleanEmails.length === 0) {
      return NextResponse.json({ error: 'No valid emails provided' }, { status: 400 })
    }

    // Find matching PNMs
    const { data: pnms, error: pnmsError } = await supabase
      .from('pnms')
      .select('id, email')
      .in('email', cleanEmails)

    if (pnmsError) throw pnmsError

    if (!pnms || pnms.length === 0) {
      return NextResponse.json({
        error: 'No PNMs matched the provided emails.',
        matchedEmails: [],
        unmatchedEmails: cleanEmails
      }, { status: 400 })
    }

    // Create attendance records (ignore duplicates with upsert)
    const records = pnms.map(pnm => ({
      pnm_id: pnm.id,
      event_id: id,
      event_name: event.name // Keep for backward compatibility
    }))

    const { error: insertError } = await supabase
      .from('pnm_attendance')
      .upsert(records, { onConflict: 'pnm_id,event_id' })

    if (insertError) throw insertError

    // Get unmatched emails
    const matchedEmails = pnms.map(pnm => pnm.email)
    const unmatchedEmails = cleanEmails.filter(email => !matchedEmails.includes(email))

    return NextResponse.json({
      success: true,
      matched: pnms.length,
      recorded: records.length,
      matchedEmails,
      unmatchedEmails
    })
  } catch (err) {
    console.error('Attendance upload error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/attendance-events/[id]
 * Deletes an entire event and all its attendance records
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params

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

    // Verify event exists and get its name for confirmation
    const { data: event, error: eventError } = await supabase
      .from('attendance_events')
      .select('id, name')
      .eq('id', id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Delete the event (cascade will handle attendance records)
    const { error: deleteError } = await supabase
      .from('attendance_events')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: `Event "${event.name}" and all its attendance records have been deleted`
    })
  } catch (err) {
    console.error('Event deletion error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
} 