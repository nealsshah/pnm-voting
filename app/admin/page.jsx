import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { AdminDashboard } from './admin-dashboard'
import UserApproval from '@/components/admin/UserApproval'

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
      // Get total PNM count
      const { count: pnmCount, error: countError } = await supabase
        .from('pnms')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // Get current round
      const { data: currentRound, error: roundError } = await supabase
        .from('rounds')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (roundError && roundError.code !== 'PGRST116') throw roundError;

      return {
        pnmCount: pnmCount || 0,
        currentRound: currentRound || null
      };
    } catch (error) {
      console.error('[Server] Error fetching dashboard data:', error);
      return {
        pnmCount: 0,
        currentRound: null
      };
    }
  };

  const { pnmCount, currentRound } = await fetchDashboardData()

  console.log('PNM Count:', pnmCount)
  console.log('Current Round:', currentRound)
  
  return (
    <div>
      <AdminDashboard 
        pnmCount={pnmCount}
        currentRound={currentRound}
        userId={user.id}
      />
      <UserApproval />
    </div>
  )
}
