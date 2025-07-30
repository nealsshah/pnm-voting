import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Get list of likes for a comment
export async function GET(request, context) {
    try {
        const { id: commentId } = await context.params
        const cookieStore = await cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Attempt to get session but don't fail GET if not authenticated – likes are public
        await supabase.auth.getSession()

        const { data, error } = await supabase
            .from('comment_likes')
            .select('*')
            .eq('comment_id', commentId)

        if (error) {
            console.error('Error fetching likes:', error)
            return NextResponse.json({ error: 'Failed to fetch likes' }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error in likes GET handler:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// Toggle like/unlike for the current user
export async function POST(request, context) {
    try {
        const { id: commentId } = await context.params
        const cookieStore = await cookies()
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

        // Authentication required
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = session.user.id

        // Check if like already exists
        const { data: existingLike, error: existingError } = await supabase
            .from('comment_likes')
            .select('*')
            .eq('comment_id', commentId)
            .eq('brother_id', userId)
            .maybeSingle()

        if (existingError) {
            console.error('Error checking existing like:', existingError)
            return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
        }

        let liked
        if (existingLike) {
            // Unlike (delete)
            const { error: deleteError } = await supabase
                .from('comment_likes')
                .delete()
                .eq('id', existingLike.id)

            if (deleteError) {
                console.error('Error deleting like:', deleteError)
                return NextResponse.json({ error: 'Failed to unlike comment' }, { status: 500 })
            }
            liked = false
        } else {
            // Like (insert)
            const { error: insertError } = await supabase
                .from('comment_likes')
                .insert({ comment_id: commentId, brother_id: userId })

            if (insertError) {
                console.error('Error inserting like:', insertError)
                return NextResponse.json({ error: 'Failed to like comment' }, { status: 500 })
            }
            liked = true
        }

        // Get new likes count
        const { count, error: countError } = await supabase
            .from('comment_likes')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', commentId)

        if (countError) {
            console.error('Error counting likes:', countError)
        }

        return NextResponse.json({ liked, likesCount: count || 0 })
    } catch (error) {
        console.error('Error in likes POST handler:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 