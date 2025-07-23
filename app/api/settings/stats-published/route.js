import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request) {
    // Parse request payload
    const { published } = await request.json()

    if (typeof published !== 'boolean') {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Verify caller is authenticated and an admin
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const {
        data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userMetadata } = await supabase
        .from('users_metadata')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!userMetadata || userMetadata.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        // Upsert setting with service-role privileges
        const { error } = await supabaseAdmin
            .from('settings')
            .upsert({ key: 'stats_published', value: published }, { onConflict: 'key' })

        if (error) throw error

        // Broadcast change so subscribed clients update
        await supabaseAdmin.channel('settings-channel').send({
            type: 'broadcast',
            event: 'STATS_PUBLISH_TOGGLE',
            payload: { published },
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Failed to update stats_published:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
} 