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
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Get user role
  const { data: userRole } = await supabase
    .from('users_metadata')
    .select('role')
    .eq('id', user.id)
    .single()

  // If user is pending approval, redirect to pending page
  if (userRole?.role === 'pending') {
    redirect('/pending')
  }

  // Get the PNM details (include hidden)
  // Determine active recruitment cycle
  const { data: currentCycleSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'current_cycle_id')
    .single()

  const activeCycleId = currentCycleSetting?.value?.id || null

  const { data: pnm, error: pnmError } = await supabase
    .from('pnms')
    .select('id, first_name, last_name, photo_url, major, minor, pronouns, year, gpa, email, hidden, cycle_id')
    .eq('id', pnmId)
    .single()

  if (pnmError || !pnm) {
    // PNM not accessible or not found, redirect to candidate list
    redirect('/candidate')
  }
  else {
    // PNM found; continue processing
  }

  // If PNM belongs to a non-active cycle, block access
  if (activeCycleId && pnm?.cycle_id && pnm.cycle_id !== activeCycleId) {
    redirect('/candidate')
  }

  // If PNM is hidden and user is not admin, redirect away
  const isAdmin = userRole?.role === 'admin'
  if (pnm?.hidden && !isAdmin) {
    redirect('/candidate')
  }

  // Get the current round (no events join in simplified schema)
  let currentRoundQuery = supabase
    .from('rounds')
    .select('id, status, type, name, created_at, current_pnm_id, voting_open, results_revealed, sealed_pnm_ids, sealed_results')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
  if (activeCycleId) currentRoundQuery = currentRoundQuery.eq('cycle_id', activeCycleId)
  const { data: currentRound } = await currentRoundQuery.single()

  // Get the user's vote or interaction for the current round
  let userVote = null
  let userInteraction = null

  if (currentRound) {
    if (currentRound.type === 'did_not_interact') {
      const { data: interaction } = await supabase
        .from('interactions')
        .select('*')
        .eq('brother_id', user.id)
        .eq('pnm_id', pnmId)
        .eq('round_id', currentRound.id)
        .limit(1)
        .single()

      userInteraction = interaction
    } else if (currentRound.type === 'delibs') {
      const { data: delibsVote } = await supabase
        .from('delibs_votes')
        .select('*')
        .eq('brother_id', user.id)
        .eq('pnm_id', pnmId)
        .eq('round_id', currentRound.id)
        .limit(1)
        .single()

      userVote = delibsVote
    } else {
      const { data: vote } = await supabase
        .from('votes')
        .select('*')
        .eq('brother_id', user.id)
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
      .select('id, email, first_name, last_name, role')
      .in('id', brotherIds)

    commentsWithUsers = comments.map(comment => {
      const user = users?.find(u => u.id === comment.brother_id)
      return {
        ...comment,
        brother: user
      }
    })
  }

  // For a closed round, get vote statistics
  let voteStats = null
  if (currentRound && currentRound.status === 'closed') {
    if (currentRound.type === 'delibs') {
      // For delibs rounds, get yes/no counts
      const { data: delibsVotes } = await supabase
        .from('delibs_votes')
        .select('decision')
        .eq('pnm_id', pnmId)
        .eq('round_id', currentRound.id)

      if (delibsVotes && delibsVotes.length > 0) {
        const yes = delibsVotes.filter(vote => vote.decision).length
        const no = delibsVotes.filter(vote => !vote.decision).length

        voteStats = {
          yes,
          no,
          count: yes + no
        }
      }
    } else {
      // For regular voting rounds
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
  }

  // Get all PNMs for navigation
  let allPnmsQuery = supabase
    .from('pnms')
    .select('id')
    .eq('hidden', false)
    .order('created_at', { ascending: true })
  if (activeCycleId) allPnmsQuery = allPnmsQuery.eq('cycle_id', activeCycleId)
  const { data: allPnms } = await allPnmsQuery

  const currentIndex = allPnms?.findIndex(p => p.id === pnmId) || 0
  const prevId = currentIndex > 0 ? allPnms[currentIndex - 1].id : allPnms[allPnms.length - 1].id
  const nextId = currentIndex < allPnms.length - 1 ? allPnms[currentIndex + 1].id : allPnms[0].id

  // Fetch attendance records for this PNM with event details
  const { data: attendance } = await supabase
    .from('pnm_attendance')
    .select(`
      created_at,
      event_name,
      attendance_events:event_id (
        id,
        name,
        description,
        event_date
      )
    `)
    .eq('pnm_id', pnmId)
    .order('created_at', { ascending: false })

  return (
    <CandidateView
      pnm={pnm}
      currentRound={currentRound || null}
      userVote={userVote}
      userInteraction={userInteraction}
      comments={commentsWithUsers}
      voteStats={voteStats}
      userId={user.id}
      isAdmin={userRole?.role === 'admin'}
      prevId={prevId}
      nextId={nextId}
      attendance={attendance || []}
    />
  )
} 