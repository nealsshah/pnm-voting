import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET /api/delibs/stats?pnmId=...&roundId=...
export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const pnmId = searchParams.get('pnmId')
    const roundId = searchParams.get('roundId')
    if (!pnmId || !roundId) {
        return NextResponse.json({ error: 'Missing query params' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient(
        { cookies },
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: currentCycle } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'current_cycle_id')
        .single()

    let q = supabase
        .from('delibs_votes')
        .select('decision', { count: 'exact', head: false })
        .eq('pnm_id', pnmId)
        .eq('round_id', roundId)
    if (currentCycle?.value?.id) q = q.eq('cycle_id', currentCycle.value.id)

    const { data, error } = await q

    if (error) {
        console.error('stats error', error)
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }

    const yes = data.filter(r => r.decision).length
    const no = data.filter(r => !r.decision).length
    return NextResponse.json({ yes, no })
}
