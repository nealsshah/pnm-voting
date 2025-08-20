import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const { pnmId, roundId, interacted } = await request.json()

        if (!pnmId || !roundId || interacted === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const supabase = createRouteHandlerClient(
            { cookies },
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
        }

        // Verify round is open and of correct type
        const { data: currentCycle } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'current_cycle_id')
            .single()

        const { data: round, error: roundError } = await supabase
            .from('rounds')
            .select('status, type')
            .eq('id', roundId)
            .eq(currentCycle?.value?.id ? 'cycle_id' : 'id', currentCycle?.value?.id || roundId)
            .single()

        if (roundError || !round) {
            return NextResponse.json(
                { error: 'Round not found' },
                { status: 404 }
            )
        }

        if (round.status !== 'open' || round.type !== 'did_not_interact') {
            return NextResponse.json(
                { error: 'Round is not open for interactions' },
                { status: 403 }
            )
        }

        // Upsert interaction
        const insertRow = {
            brother_id: user.id,
            pnm_id: pnmId,
            round_id: roundId,
            interacted,
        }
        if (currentCycle?.value?.id) insertRow.cycle_id = currentCycle.value.id

        const { data, error } = await supabase
            .from('interactions')
            .upsert(insertRow)
            .select()

        if (error) {
            console.error('Error upserting interaction:', error)
            return NextResponse.json(
                { error: `Failed to submit interaction: ${error.message}` },
                { status: 500 }
            )
        }

        return NextResponse.json(data[0])
    } catch (error) {
        console.error('Error in interaction POST handler:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 