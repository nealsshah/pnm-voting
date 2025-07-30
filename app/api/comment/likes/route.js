import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET /api/comment/likes?ids=id1,id2,...
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const idsParam = searchParams.get('ids')
        if (!idsParam) {
            return NextResponse.json([], { status: 200 })
        }

        const ids = idsParam.split(',').filter(Boolean)
        if (ids.length === 0) {
            return NextResponse.json([], { status: 200 })
        }

        const cookieStore = await cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        const { data, error } = await supabase
            .from('comment_likes')
            .select('comment_id, brother_id')
            .in('comment_id', ids)

        if (error) {
            console.error('Error fetching bulk likes:', error)
            return NextResponse.json({ error: 'Failed to fetch likes' }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error in bulk likes GET handler:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 