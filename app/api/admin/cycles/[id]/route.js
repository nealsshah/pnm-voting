import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// DELETE /api/admin/cycles/[id]
// Deletes a recruitment cycle and ALL associated data (pnms, rounds, votes, comments, interactions, attendance, etc.)
export async function DELETE(request, { params }) {
    try {
        const { id: cycleId } = params || {}
        if (!cycleId) return NextResponse.json({ error: 'Missing cycle id' }, { status: 400 })

        const supabase = createRouteHandlerClient(
            { cookies },
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

        // Admin check
        const { data: me } = await supabase
            .from('users_metadata')
            .select('role')
            .eq('id', user.id)
            .single()
        if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        // Ensure cycle exists and is not active
        const { data: cycle, error: cycleErr } = await supabase
            .from('recruitment_cycles')
            .select('id, name, status')
            .eq('id', cycleId)
            .single()
        if (cycleErr || !cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
        if (cycle.status === 'active') return NextResponse.json({ error: 'Cannot delete an active cycle. Archive it first.' }, { status: 400 })

        // Delete in dependency order (guard tables that may not exist on some deployments)
        const deleteIfTable = async (table) => {
            const probe = await supabase.from(table).select('*', { count: 'exact', head: true }).limit(1)
            if (probe.error) return
            const { error: delError } = await supabase.from(table).delete().eq('cycle_id', cycleId)
            if (delError) throw delError
        }

        // child tables
        await deleteIfTable('delibs_votes')
        await deleteIfTable('votes')
        await deleteIfTable('interactions')
        await deleteIfTable('comments')
        await deleteIfTable('pnm_attendance')

        // parent-like tables (still scoped by cycle)
        await deleteIfTable('rounds')
        await deleteIfTable('attendance_events')
        await deleteIfTable('pnms')
        await deleteIfTable('events')

        // Finally, delete the cycle itself
        const { error: delErr } = await supabase
            .from('recruitment_cycles')
            .delete()
            .eq('id', cycleId)
        if (delErr) return NextResponse.json({ error: delErr.message || 'Failed to delete cycle' }, { status: 500 })

        // If the deleted cycle was current, clear current_cycle_id setting
        const { data: currentSetting } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'current_cycle_id')
            .single()
        if (currentSetting?.value?.id === cycleId) {
            await supabase
                .from('settings')
                .upsert({ key: 'current_cycle_id', value: null }, { onConflict: 'key' })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Cycle delete error:', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}

