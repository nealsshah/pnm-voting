import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Update a comment
export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const { body, isAnon } = await request.json()
    
    if (!body) {
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
    
    // Get the comment to verify ownership & round status
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('*, round:round_id(status)')
      .eq('id', id)
      .single()
    
    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }
    
    // Author can only update if round is still open
    if (comment.brother_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Not authorized to edit this comment' },
        { status: 403 }
      )
    }
    
    if (comment.round.status !== 'open') {
      return NextResponse.json(
        { error: 'Round is closed - comments cannot be modified' },
        { status: 403 }
      )
    }
    
    // Update the comment
    const { data, error } = await supabase
      .from('comments')
      .update({
        body,
        is_anon: isAnon !== undefined ? isAnon : comment.is_anon,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
    
    if (error) {
      console.error('Error updating comment:', error)
      return NextResponse.json(
        { error: 'Failed to update comment' },
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
    console.error('Error in comment PATCH handler:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete a comment
export async function DELETE(request, { params }) {
  try {
    const { id } = params
    
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
    
    // Get user role to check if admin
    const { data: userData } = await supabase
      .from('users_metadata')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    const isAdmin = userData?.role === 'admin'
    
    // Get the comment to verify ownership & round status
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('*, round:round_id(status)')
      .eq('id', id)
      .single()
    
    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }
    
    // Admin can delete anytime, author can only delete if round is still open
    if (!isAdmin && comment.brother_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this comment' },
        { status: 403 }
      )
    }
    
    if (!isAdmin && comment.round.status !== 'open') {
      return NextResponse.json(
        { error: 'Round is closed - comments cannot be deleted' },
        { status: 403 }
      )
    }
    
    // Delete the comment
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting comment:', error)
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error in comment DELETE handler:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 