import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import CommentModeration from '@/components/admin/CommentModeration'

export const metadata = {
  title: 'Comment Moderation - PNM Voting Platform',
  description: 'Moderate and manage comments in the PNM voting platform',
}

export default async function AdminCommentsPage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from('users_metadata')
    .select('role')
    .eq('id', session.user.id)
    .single()
  
  if (userData?.role !== 'admin') {
    redirect('/')
  }
  
  // Get all comments
  const { data: comments } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  
  // Get all necessary related data
  let commentsWithData = []
  
  if (comments && comments.length > 0) {
    // Get unique IDs for related data
    const pnmIds = [...new Set(comments.map(c => c.pnm_id))]
    const brotherIds = [...new Set(comments.map(c => c.brother_id))]
    const roundIds = [...new Set(comments.map(c => c.round_id))]
    
    // Fetch PNMs
    const { data: pnms } = await supabase
      .from('pnms')
      .select('id, first_name, last_name')
      .in('id', pnmIds)
    
    // Fetch brothers (users metadata)
    const { data: brothers } = await supabase
      .from('users_metadata')
      .select('id, email, role')
      .in('id', brotherIds)
    
    // Fetch rounds
    const { data: rounds } = await supabase
      .from('rounds')
      .select('id, status, event_id')
      .in('id', roundIds)
    
    // Get event ids from rounds
    const eventIds = [...new Set(rounds.filter(r => r.event_id).map(r => r.event_id))]
    
    // Fetch events
    const { data: events } = await supabase
      .from('events')
      .select('id, name')
      .in('id', eventIds)
    
    // Join all data
    commentsWithData = comments.map(comment => {
      const pnm = pnms?.find(p => p.id === comment.pnm_id)
      const brother = brothers?.find(b => b.id === comment.brother_id)
      const round = rounds?.find(r => r.id === comment.round_id)
      const event = round?.event_id ? events?.find(e => e.id === round.event_id) : null
      
      return {
        ...comment,
        pnm,
        brother,
        round: round ? {
          ...round,
          event
        } : null
      }
    })
  }
  
  return (
    <div className="container mx-auto py-6">
      <CommentModeration initialComments={commentsWithData || []} />
    </div>
  )
} 