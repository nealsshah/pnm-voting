import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

/**
 * POST /api/attendance
 * Body: { eventName: string, emails: string[] }
 *
 * – Ensures user is admin
 * – Matches each email to a PNM
 * – Inserts attendance rows (pnm_id, event_name)
 * – Returns counts and list of unmatched emails for UI feedback
 */
export async function POST(request) {
  try {
    const { eventName, emails } = await request.json()

    if (!eventName || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'eventName and emails are required' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Auth check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userRole } = await supabase
      .from('users_metadata')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admins only.' }, { status: 403 })
    }

    // Fetch matching PNMs by email
    const { data: pnms, error: pnmsErr } = await supabase
      .from('pnms')
      .select('id, email')
      .in('email', emails.map(e => e.toLowerCase()))

    if (pnmsErr) throw pnmsErr

    const matchedEmailsSet = new Set(pnms.map(p => p.email.toLowerCase()))
    const unmatchedEmails = emails.filter(e => !matchedEmailsSet.has(e.toLowerCase()))

    // Insert attendance records for matched PNMs (ignore duplicates)
    if (pnms.length > 0) {
      const rows = pnms.map(p => ({ pnm_id: p.id, event_name: eventName }))
      const { error: insertErr } = await supabase
        .from('pnm_attendance')
        .upsert(rows, { onConflict: 'pnm_id,event_name' })
      if (insertErr) throw insertErr
    }

    return NextResponse.json({
      success: true,
      recorded: pnms.length,
      unmatchedEmails,
    })
  } catch (err) {
    console.error('Attendance upload error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}