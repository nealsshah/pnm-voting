import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
  const { id } = params
  const { action } = await request.json()

  // Validate the request
  if (!id || !action || !['open', 'close'].includes(action)) {
    return NextResponse.json(
      { error: 'Invalid request. Provide round id and action (open/close)' },
      { status: 400 }
    )
  }

  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  // Check if user is authenticated and is an admin
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Verify user is an admin
  const { data: userRole } = await supabase
    .from('users_metadata')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!userRole || userRole.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden. Only admins can override rounds.' },
      { status: 403 }
    )
  }
  
  try {
    if (action === 'open') {
      // Find any open rounds and close them first
      const { data: openRound } = await supabase
        .from('rounds')
        .select('id')
        .eq('status', 'open')
        .single()
        .catch(() => ({ data: null }))
      
      if (openRound) {
        // Close the currently open round
        const { error: closeError } = await supabase
          .from('rounds')
          .update({ 
            status: 'closed',
            closed_at: new Date().toISOString() 
          })
          .eq('id', openRound.id)
        
        if (closeError) throw closeError
      }
      
      // Open the requested round
      const { error } = await supabase
        .from('rounds')
        .update({ 
          status: 'open',
          opened_at: new Date().toISOString() 
        })
        .eq('id', id)
      
      if (error) throw error
    } else if (action === 'close') {
      // Close the round
      const { error } = await supabase
        .from('rounds')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString() 
        })
        .eq('id', id)
      
      if (error) throw error
    }
    
    // Broadcast the change to realtime subscribers
    const broadcastChannel = supabase.channel('rounds')
    await broadcastChannel.send({
      type: 'broadcast',
      event: 'status-change',
      payload: { 
        roundId: id,
        action,
        timestamp: new Date().toISOString()
      }
    })
    
    return NextResponse.json({ 
      success: true,
      message: `Round ${action === 'open' ? 'opened' : 'closed'} successfully` 
    })
  } catch (error) {
    console.error('Error overriding round:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
} 