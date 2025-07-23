import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import CandidateView from '@/components/candidates/CandidateView'

export default async function CandidatePage({ params }) {
  // Await the params object as required by Next.js 15 dynamic API changes
  const { id: pnmId } = await params
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Get user role
  const { data: userRole } = await supabase
    .from('users_metadata')
    .select('role')
    .eq('id', session.user.id)
    .single()

  // If user is pending approval, redirect to pending page
  if (userRole?.role === 'pending') {
    redirect('/pending')
  }

  // Get the PNM details
  const { data: pnm, error: pnmError } = await supabase
    .from('pnms')
    .select('*')
    .eq('id', pnmId)
    .single()

  if (pnmError || !pnm) {
    // PNM not found, redirect to gallery
    redirect('/')
  }
  else {
    // PNM found; continue processing
  }

  // Get the current round (no events join in simplified schema)
  const { data: currentRound } = await supabase
    .from('rounds')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Get the user's vote or interaction for the current round
  let userVote = null
  let userInteraction = null

  if (currentRound) {
    if (currentRound.type === 'did_not_interact') {
      const { data: interaction } = await supabase
        .from('interactions')
        .select('*')
        .eq('brother_id', session.user.id)
        .eq('pnm_id', pnmId)
        .eq('round_id', currentRound.id)
        .limit(1)
        .single()

      userInteraction = interaction
    } else {
      const { data: vote } = await supabase
        .from('votes')
        .select('*')
        .eq('brother_id', session.user.id)
        .eq('pnm_id', pnmId)
        .eq('round_id', currentRound.id)
        .limit(1)
        .single()

      userVote = vote
    }
  }

  // Get comments for the PNM
  // First get the comments
  const { data: comments } = await supabase
    .from('comments')
    .select('*')
    .eq('pnm_id', pnmId)
    .order('created_at', { ascending: false })

  // Get user data for comments
  let commentsWithUsers = []
  if (comments && comments.length > 0) {
    const brotherIds = [...new Set(comments.map(c => c.brother_id))]

    const { data: users } = await supabase
      .from('users_metadata')
      .select('*')
      .in('id', brotherIds)

    commentsWithUsers = comments.map(comment => {
      const user = users?.find(u => u.id === comment.brother_id)
      return {
        ...comment,
        brother: user || null
      }
    })
  }

  // For a closed round, get vote statistics
  let voteStats = null
  if (currentRound && currentRound.status === 'closed') {
    const { data: votes } = await supabase
      .from('votes')
      .select('score')
      .eq('pnm_id', pnmId)
      .eq('round_id', currentRound.id)

    if (votes && votes.length > 0) {
      const total = votes.reduce((sum, vote) => sum + vote.score, 0)
      const average = (total / votes.length).toFixed(2)
      const distribution = [0, 0, 0, 0, 0]  // For scores 1-5

      votes.forEach(vote => {
        distribution[vote.score - 1]++
      })

      voteStats = {
        total: votes.length,
        average,
        distribution
      }
    }
  }

  // Get all PNMs for navigation
  const { data: allPnms } = await supabase
    .from('pnms')
    .select('id')
    .order('created_at', { ascending: true })

  const currentIndex = allPnms?.findIndex(p => p.id === pnmId) || 0
  const prevId = currentIndex > 0 ? allPnms[currentIndex - 1].id : allPnms[allPnms.length - 1].id
  const nextId = currentIndex < allPnms.length - 1 ? allPnms[currentIndex + 1].id : allPnms[0].id

  return (
    <CandidateView
      pnm={pnm}
      currentRound={currentRound || null}
      userVote={userVote}
      userInteraction={userInteraction}
      comments={commentsWithUsers}
      voteStats={voteStats}
      userId={session.user.id}
      isAdmin={userRole?.role === 'admin'}
      prevId={prevId}
      nextId={nextId}
    />
  )
} 