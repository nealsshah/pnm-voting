import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import CandidateView from '@/components/candidates/CandidateView'

export default async function CandidatePage({ params }) {
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
    .eq('id', params.id)
    .single()
  
  if (pnmError || !pnm) {
    console.log("pnm not found")
    console.log(pnmError)
    // PNM not found, redirect to gallery
    redirect('/')
  }
  else {
    console.log("pnm found")
  }
  
  // Get the current round
  const { data: currentRound } = await supabase
    .from('rounds')
    .select('*, event:event_id(id, name, starts_at)')
    .eq('status', 'open')
    .limit(1)
    .single()
  
  // Get the user's vote for the current round
  let userVote = null
  if (currentRound) {
    const { data: vote } = await supabase
      .from('votes')
      .select('*')
      .eq('brother_id', session.user.id)
      .eq('pnm_id', params.id)
      .eq('round_id', currentRound.id)
      .limit(1)
      .single()
    
    userVote = vote
  }
  
  // Get comments for the PNM
  const { data: comments } = await supabase
    .from('comments')
    .select('*, brother:brother_id(*)')
    .eq('pnm_id', params.id)
    .order('created_at', { ascending: false })
    .limit(20)  // Initial limit for comments
  
  // For a closed round, get vote statistics
  let voteStats = null
  if (currentRound && currentRound.status === 'closed') {
    const { data: votes } = await supabase
      .from('votes')
      .select('score')
      .eq('pnm_id', params.id)
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
  
  return (
    <CandidateView
      pnm={pnm}
      currentRound={currentRound || null}
      userVote={userVote}
      comments={comments || []}
      voteStats={voteStats}
      userId={session.user.id}
      isAdmin={userRole?.role === 'admin'}
    />
  )
} 