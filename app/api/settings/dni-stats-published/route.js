import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request) {
    const { published } = await request.json()
    if (typeof published !== 'boolean') {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const {
        data: { session },
    } = await supabase.auth.getSession()

    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: user } = await supabase
        .from('users_metadata')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const { error } = await supabaseAdmin
            .from('settings')
            .upsert({ key: 'dni_stats_published', value: published }, { onConflict: 'key' })

        if (error) throw error

        await supabaseAdmin.channel('settings-channel').send({
            type: 'broadcast',
            event: 'DNI_STATS_PUBLISH_TOGGLE',
            payload: { published },
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Failed to update dni_stats_published:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
} 