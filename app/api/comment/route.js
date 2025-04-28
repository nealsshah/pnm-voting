import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { pnmId, roundId, body, isAnon } = await request.json()
    
    if (!pnmId || !roundId || !body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Verify round is open
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('status')
      .eq('id', roundId)
      .single()
      
    if (roundError || !round || round.status !== 'open') {
      return NextResponse.json(
        { error: 'Round is not open for comments' },
        { status: 403 }
      )
    }
    
    // Create comment
    const { data, error } = await supabase
      .from('comments')
      .insert({
        brother_id: session.user.id,
        pnm_id: pnmId,
        round_id: roundId,
        body,
        is_anon: isAnon || false
      })
      .select()
    
    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json(
        { error: `Failed to create comment: ${error.message}` },
        { status: 500 }
      )
    }
    
    // Fetch user data separately
    const { data: userData, error: userError } = await supabase
      .from('users_metadata')
      .select('*')
      .eq('id', session.user.id)
      .single()
      
    if (userError) {
      console.error('Error fetching user data:', userError)
    }
    
    // Return the comment with user data
    return NextResponse.json({
      ...data[0],
      brother: userData || null
    })
    
  } catch (error) {
    console.error('Error in comment POST handler:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 