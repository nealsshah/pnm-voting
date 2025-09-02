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

        // Find matching PNMs and current cycle
        const { data: currentCycle } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'current_cycle_id')
            .single()
        const currentCycleId = currentCycle?.value?.id || null

        // Ensure an attendance event exists for this name (create if needed)
        let eventRow = null
        {
            const { data: existingEvent } = await supabase
                .from('attendance_events')
                .select('id')
                .eq('name', eventName)
                .maybeSingle()
            if (existingEvent && existingEvent.id) {
                eventRow = existingEvent
            } else {
                const { data: createdEvent, error: createEventErr } = await supabase
                    .from('attendance_events')
                    .insert({
                        name: eventName,
                        ...(currentCycleId ? { cycle_id: currentCycleId } : {}),
                        created_by: user.id,
                    })
                    .select('id')
                    .single()
                if (createEventErr) throw createEventErr
                eventRow = createdEvent
            }
        }

        let pnmsQ = supabase
            .from('pnms')
            .select('id, email')
            .in('email', emails.map(e => e.toLowerCase()))
        if (currentCycleId) pnmsQ = pnmsQ.eq('cycle_id', currentCycleId)
        const { data: pnms, error: pnmsErr } = await pnmsQ

        if (pnmsErr) throw pnmsErr

        if (!pnms || pnms.length === 0) {
            return NextResponse.json({ error: 'No PNMs matched the provided emails.' }, { status: 400 })
        }

        // Create attendance records (ignore duplicates via pnm_id,event_id unique constraint)
        const records = pnms.map(p => ({
            pnm_id: p.id,
            event_id: eventRow.id,
            event_name: eventName, // kept for backward compatibility
            ...(currentCycleId ? { cycle_id: currentCycleId } : {}),
        }))
        const { error: insertErr } = await supabase
            .from('pnm_attendance')
            .upsert(records, { onConflict: 'pnm_id,event_id' })
        if (insertErr) throw insertErr

        return NextResponse.json({ success: true, matched: pnms.length, recorded: records.length })
    } catch (err) {
        console.error('Attendance upload error:', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
} 