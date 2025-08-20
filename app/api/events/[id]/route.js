import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function PATCH(request, { params }) {
  const { id } = params
  const { name, startsAt } = await request.json()

  // Validate the request
  if (!id || (!name && !startsAt)) {
    return NextResponse.json(
      { error: 'Invalid request. Provide event ID and at least one field to update.' },
      { status: 400 }
    )
  }

  const supabase = createRouteHandlerClient(
    { cookies },
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Check if user is authenticated and is an admin
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    )
  }

  // Verify user is an admin
  const { data: userRole } = await supabase
    .from('users_metadata')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userRole || userRole.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden. Only admins can update events.' },
      { status: 403 }
    )
  }
  
  try {
    // Get the event to check if it's in the past
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('starts_at')
      .eq('id', id)
      .single()
    
    if (fetchError) throw fetchError
    
    // Check if the event is in the past
    if (new Date(event.starts_at) <= new Date()) {
      return NextResponse.json(
        { error: 'Cannot update past events.' },
        { status: 400 }
      )
    }
    
    // Prepare update data
    const updateData = {}
    if (name) updateData.name = name
    if (startsAt) {
      // Validate that the new start time is in the future
      if (new Date(startsAt) <= new Date()) {
        return NextResponse.json(
          { error: 'Event must be scheduled in the future.' },
          { status: 400 }
        )
      }
      updateData.starts_at = startsAt
    }
    
    // Update the event
    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true,
      event: data[0]
    })
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: 'Invalid request. Provide event ID.' },
      { status: 400 }
    )
  }

  const supabase = createRouteHandlerClient(
    { cookies },
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Check if user is authenticated and is an admin
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    )
  }

  // Verify user is an admin
  const { data: userRole } = await supabase
    .from('users_metadata')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userRole || userRole.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden. Only admins can delete events.' },
      { status: 403 }
    )
  }
  
  try {
    // Get the event to check if it's in the past
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('starts_at')
      .eq('id', id)
      .single()
    
    if (fetchError) throw fetchError
    
    // Check if the event is in the past
    if (new Date(event.starts_at) <= new Date()) {
      return NextResponse.json(
        { error: 'Cannot delete past events.' },
        { status: 400 }
      )
    }
    
    // Delete the event (will cascade to delete the round)
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true,
      message: 'Event deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
} 