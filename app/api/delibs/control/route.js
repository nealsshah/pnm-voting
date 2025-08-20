import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// PATCH /api/delibs/control
// Body: { roundId, currentPnmId?, votingOpen?, resultsRevealed?, sealedPnmIds?, sealedResults? }
// Admin-only endpoint to control live Delibs voting state.
export async function PATCH(request) {
    try {
        const { roundId, currentPnmId, votingOpen, resultsRevealed, sealedPnmIds, sealedResults } = await request.json()

        if (!roundId) {
            return NextResponse.json({ error: 'roundId is required' }, { status: 400 })
        }

        const supabase = createRouteHandlerClient(
            { cookies },
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

        // Verify admin role
        const { data: me } = await supabase
            .from('users_metadata')
            .select('role')
            .eq('id', user.id)
            .single()
        if (!me || me.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Update the rounds row with provided fields (only if not undefined)
        const updatePayload = {}
        if (currentPnmId !== undefined) updatePayload.current_pnm_id = currentPnmId
        if (votingOpen !== undefined) updatePayload.voting_open = votingOpen
        if (resultsRevealed !== undefined) updatePayload.results_revealed = resultsRevealed
        if (sealedPnmIds !== undefined) updatePayload.sealed_pnm_ids = sealedPnmIds
        if (sealedResults !== undefined) updatePayload.sealed_results = sealedResults

        if (Object.keys(updatePayload).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
        }

        const { data: currentCycle } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'current_cycle_id')
            .single()

        const { data, error } = await supabase
            .from('rounds')
            .update(updatePayload)
            .eq('id', roundId)
            .eq(currentCycle?.value?.id ? 'cycle_id' : 'id', currentCycle?.value?.id || roundId)
            .select()
            .single()

        if (error) {
            console.error('Delibs control update error', error)
            return NextResponse.json({
                error: 'Failed to update round',
                details: error.message,
                code: error.code,
                updatePayload
            }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (err) {
        console.error('Delibs control PATCH error', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
