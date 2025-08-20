import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

/**
 * POST /api/attendance
 * Body: { eventName: string, emails: string[] }
 *
 * – Ensures user is admin
 * – Gets (or creates) an event with the given name
 * – Matches each email to an existing PNM
 * – Inserts a row into pnm_attendance (pnm_id, event_id) for each match
 */
export async function POST(request) {
    try {
        const body = await request.json()
        const { eventName, emails } = body || {}

        if (!eventName || !Array.isArray(emails) || emails.length === 0) {
            return NextResponse.json({ error: 'eventName and emails are required' }, { status: 400 })
        }

        const supabase = createRouteHandlerClient(
            { cookies },
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
        }

        const { data: userRole } = await supabase
            .from('users_metadata')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userRole || userRole.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden. Admins only.' }, { status: 403 })
        }

        // Find matching PNMs
        const { data: pnms, error: pnmsErr } = await supabase
            .from('pnms')
            .select('id, email')
            .in('email', emails.map(e => e.toLowerCase()))

        if (pnmsErr) throw pnmsErr

        if (!pnms || pnms.length === 0) {
            return NextResponse.json({ error: 'No PNMs matched the provided emails.' }, { status: 400 })
        }

        // Create attendance records (ignore duplicates)
        const records = pnms.map(p => ({ pnm_id: p.id, event_name: eventName }))
        const { error: insertErr } = await supabase.from('pnm_attendance').upsert(records, { onConflict: 'pnm_id,event_name' })
        if (insertErr) throw insertErr

        return NextResponse.json({ success: true, matched: pnms.length, recorded: records.length })
    } catch (err) {
        console.error('Attendance upload error:', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
} 