import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

/**
 * DELETE /api/attendance-events/[id]/attendees/[attendeeId]
 * Removes a specific attendee from an event
 */
export async function DELETE(request, { params }) {
    try {
        const { id: eventId, attendeeId } = params

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

        // Verify the attendance record exists and belongs to the event
        const { data: currentCycle } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'current_cycle_id')
            .single()

        let findQ = supabase
            .from('pnm_attendance')
            .select(`
        id,
        pnms:pnm_id (
          first_name,
          last_name,
          email
        )
      `)
            .eq('id', attendeeId)
            .eq('event_id', eventId)
            .single()
        if (currentCycle?.value?.id) findQ = findQ.eq('cycle_id', currentCycle.value.id)
        const { data: attendanceRecord, error: findError } = await findQ

        if (findError || !attendanceRecord) {
            return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
        }

        // Delete the attendance record
        let delQ = supabase
            .from('pnm_attendance')
            .delete()
            .eq('id', attendeeId)
            .eq('event_id', eventId)
        if (currentCycle?.value?.id) delQ = delQ.eq('cycle_id', currentCycle.value.id)
        const { error: deleteError } = await delQ

        if (deleteError) throw deleteError

        return NextResponse.json({
            success: true,
            message: `Removed ${attendanceRecord.pnms?.first_name} ${attendanceRecord.pnms?.last_name} from event attendance`
        })
    } catch (err) {
        console.error('Attendance removal error:', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
} 