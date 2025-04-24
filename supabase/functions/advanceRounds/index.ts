import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'

// Create a Supabase client with the service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    const now = new Date()
    
    // 1. Find currently open round (if any)
    const { data: openRound, error: openRoundError } = await supabase
      .from('rounds')
      .select('id, event_id')
      .eq('status', 'open')
      .order('id')
      .limit(1)
      .single()
      
    if (openRoundError && !openRoundError.message.includes('No rows found')) {
      throw openRoundError
    }
    
    // 2. Find the next event that should start (closest to current time but in future)
    const { data: nextEvent, error: nextEventError } = await supabase
      .from('events')
      .select('id, starts_at')
      .gte('starts_at', now.toISOString())
      .order('starts_at')
      .limit(1)
      .single()
      
    if (nextEventError && !nextEventError.message.includes('No rows found')) {
      throw nextEventError
    }
    
    // 3. Find events that have passed but their rounds are still pending
    const { data: pastEvents, error: pastEventsError } = await supabase
      .from('events')
      .select('id, name, starts_at')
      .lt('starts_at', now.toISOString())
      .order('starts_at', { ascending: false })
    
    if (pastEventsError) {
      throw pastEventsError
    }
    
    // Get pending rounds for past events
    const { data: pendingRounds, error: pendingRoundsError } = await supabase
      .from('rounds')
      .select('id, event_id')
      .eq('status', 'pending')
      .in('event_id', pastEvents?.map(e => e.id) || [])
    
    if (pendingRoundsError) {
      throw pendingRoundsError
    }
    
    const updates = []
    
    // If there are pending rounds for past events, open the most recent one
    if (pendingRounds?.length) {
      // Sort past events to find the most recent one
      const sortedPastEvents = pastEvents?.sort((a, b) => 
        new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
      )
      
      // Find the round for the most recent past event
      const mostRecentEventId = sortedPastEvents[0].id
      const roundToOpen = pendingRounds.find(r => r.event_id === mostRecentEventId)
      
      if (roundToOpen) {
        // If there's an open round, close it first
        if (openRound) {
          const { error: closeError } = await supabase
            .from('rounds')
            .update({ 
              status: 'closed',
              closed_at: now.toISOString() 
            })
            .eq('id', openRound.id)
            
          if (closeError) throw closeError
          
          updates.push(`Closed round ${openRound.id}`)
          
          // Broadcast the change
          await supabase.realtime.broadcast('rounds', { 
            event: 'ROUND_CLOSED', 
            roundId: openRound.id 
          })
        }
        
        // Open the new round
        const { error: openError } = await supabase
          .from('rounds')
          .update({ 
            status: 'open',
            opened_at: now.toISOString() 
          })
          .eq('id', roundToOpen.id)
          
        if (openError) throw openError
        
        updates.push(`Opened round ${roundToOpen.id} for event ${mostRecentEventId}`)
        
        // Broadcast the change
        await supabase.realtime.broadcast('rounds', { 
          event: 'ROUND_OPENED', 
          roundId: roundToOpen.id 
        })
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      updates,
      current_time: now.toISOString(),
      open_round: openRound || null,
      next_event: nextEvent || null,
      pending_rounds: pendingRounds || []
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
}) 