import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { AdminDashboard } from './admin-dashboard'
import UserApproval from '@/app/admin/userapproval/page'

export default async function AdminPage() {
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
  const { data: userRole, error: roleError } = await supabase
    .from('users_metadata')
    .select('role')
    .eq('id', user.id)
    .single()

  if (roleError) {
    console.error('Error fetching user role:', roleError)
    redirect('/login')
  }

  // Only allow admins to access this page
  if (!userRole || userRole.role !== 'admin') {
    redirect('/')
  }

  const fetchDashboardData = async () => {
    try {
      // Current cycle
      const { data: currentCycleSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'current_cycle_id')
        .single()
      const currentCycleId = currentCycleSetting?.value?.id || null

      // Get total PNM count
      let pnmsCountQ = supabase.from('pnms').select('*', { count: 'exact', head: true })
      if (currentCycleId) pnmsCountQ = pnmsCountQ.eq('cycle_id', currentCycleId)
      const { count: pnmCount, error: countError } = await pnmsCountQ

      if (countError) throw countError;

      // Get current round
      let currentRoundQ = supabase
        .from('rounds')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (currentCycleId) currentRoundQ = currentRoundQ.eq('cycle_id', currentCycleId)
      const { data: currentRound, error: roundError } = await currentRoundQ;

      if (roundError && roundError.code !== 'PGRST116') throw roundError;

      // Get stats_published setting
      const { data: statsSetting, error: statsError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'stats_published')
        .single();

      if (statsError && statsError.code !== 'PGRST116') throw statsError;

      const statsPublished = (() => {
        if (!statsSetting) return false;
        const val = statsSetting.value;
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') return val === 'true';
        return false;
      })();

      // Get vote count for current round
      let voteCount = 0;
      if (currentRound) {
        let votesQ = supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .eq('round_id', currentRound.id)
        if (currentCycleId) votesQ = votesQ.eq('cycle_id', currentCycleId)
        const { count: votes, error: voteError } = await votesQ

        if (!voteError) {
          voteCount = votes || 0;
        }
      }

      // Fetch cycle info for display
      let currentCycle = null
      if (currentCycleId) {
        const { data: cycleRow } = await supabase
          .from('recruitment_cycles')
          .select('id, name, status')
          .eq('id', currentCycleId)
          .single()
        currentCycle = cycleRow || null
      }

      return {
        pnmCount: pnmCount || 0,
        currentRound: currentRound || null,
        statsPublished,
        voteCount,
        currentCycle,
      };
    } catch (error) {
      console.error('[Server] Error fetching dashboard data:', error);
      return {
        pnmCount: 0,
        currentRound: null
      };
    }
  };

  const { pnmCount, currentRound, statsPublished, voteCount, currentCycle } = await fetchDashboardData()

  return (
    <div>
      <AdminDashboard
        pnmCount={pnmCount}
        currentRound={currentRound}
        userId={user.id}
        statsPublished={statsPublished}
        voteCount={voteCount}
        currentCycle={currentCycle}
      />
    </div>
  )
}
