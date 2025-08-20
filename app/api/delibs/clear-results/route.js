import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const { pnmId, roundId } = await request.json()

        if (!pnmId || !roundId) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
        }

        const supabase = createRouteHandlerClient(
            { cookies },
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Verify user is admin
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
        }

        // Check if user is admin
        const { data: userMetadata } = await supabase
            .from('users_metadata')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userMetadata || userMetadata.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        // Verify the round exists and is a delibs round
        const { data: round, error: roundError } = await supabase
            .from('rounds')
            .select('id, type, status')
            .eq('id', roundId)
            .single()

        if (roundError || !round) {
            return NextResponse.json({ error: 'Round not found' }, { status: 404 })
        }

        if (round.type !== 'delibs') {
            return NextResponse.json({ error: 'Only delibs rounds are supported' }, { status: 400 })
        }

        // Delete all votes for this PNM in this round
        const { error: deleteError } = await supabase
            .from('delibs_votes')
            .delete()
            .eq('pnm_id', pnmId)
            .eq('round_id', roundId)

        if (deleteError) {
            console.error('Error deleting votes:', deleteError)
            return NextResponse.json({ error: 'Failed to clear votes' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'All votes cleared successfully'
        })

    } catch (error) {
        console.error('Error in clear-results:', error)
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 })
    }
} 