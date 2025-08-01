import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// POST /api/delibs/vote
// Body: { pnmId: UUID, roundId: UUID, decision: boolean }
// Authenticated brothers can upsert a yes/no vote for the current Delibs candidate.
export async function POST(request) {
    try {
        const { pnmId, roundId, decision } = await request.json()

        if (!pnmId || !roundId || decision === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Check auth session
        const {
            data: { session }
        } = await supabase.auth.getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Fetch the round row to validate Delibs state
        const { data: round, error: roundErr } = await supabase
            .from('rounds')
            .select('*')
            .eq('id', roundId)
            .single()

        if (roundErr || !round) {
            return NextResponse.json({ error: 'Round not found' }, { status: 404 })
        }

        if (round.type !== 'delibs' || round.status !== 'open') {
            return NextResponse.json({ error: 'Round not open for Delibs voting' }, { status: 403 })
        }

        if (!round.voting_open || round.current_pnm_id !== pnmId) {
            return NextResponse.json({ error: 'Voting not open for this candidate' }, { status: 403 })
        }

        // Upsert the vote (decision: true = yes, false = no)
        const { data, error } = await supabase
            .from('delibs_votes')
            .upsert({
                brother_id: session.user.id,
                pnm_id: pnmId,
                round_id: roundId,
                decision
            })
            .select()

        if (error) {
            console.error('Delibs vote upsert error', error)
            return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 })
        }

        return NextResponse.json(data[0])
    } catch (err) {
        console.error('Delibs vote POST error', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
