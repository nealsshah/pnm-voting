import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import HomeServer from './components/HomeServer';

export default async function Page({ searchParams }) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // No email verification flow; ignore verification query params

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  // Get user role from users_metadata table
  const { data: userRole } = await supabase
    .from('users_metadata')
    .select('role')
    .eq('id', user.id)
    .single();

  // Redirect based on role
  if (userRole?.role === 'admin') {
    redirect('/admin');
  } else if (userRole?.role === 'pending') {
    redirect('/pending');
  } else if (userRole?.role === 'brother') {
    // Determine active recruitment cycle to avoid redirect loops
    const { data: currentCycleSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'current_cycle_id')
      .single();

    const activeCycleId = currentCycleSetting?.value?.id || null;

    // Fetch the first visible PNM in the active cycle for brothers
    let query = supabase
      .from('pnms')
      .select('id, hidden, cycle_id')
      .eq('hidden', false)
      .order('last_name')
      .limit(1);

    if (activeCycleId) {
      query = query.eq('cycle_id', activeCycleId);
    }

    const { data: firstVisiblePnm } = await query.single();

    if (firstVisiblePnm?.id) {
      redirect(`/candidate/${firstVisiblePnm.id}`);
    }

    // Fallback to the candidate route which will handle empty state gracefully
    redirect('/candidate');
  }

  return <HomeServer />;
}
