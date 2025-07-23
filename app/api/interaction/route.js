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

        const cookieStore = cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Check authentication
        const {
            data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify round is open and of correct type
        const { data: round, error: roundError } = await supabase
            .from('rounds')
            .select('status, type')
            .eq('id', roundId)
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
        const { data, error } = await supabase
            .from('interactions')
            .upsert({
                brother_id: session.user.id,
                pnm_id: pnmId,
                round_id: roundId,
                interacted,
            })
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