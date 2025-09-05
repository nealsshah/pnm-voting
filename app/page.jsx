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
    // Send brothers to the candidate index so client can choose the first
    // candidate according to current sort/filter (and avoid RLS issues).
    let qs = ''
    try {
      if (searchParams && Object.keys(searchParams || {}).length > 0) {
        const usp = new URLSearchParams(searchParams)
        const str = usp.toString()
        qs = str ? `?${str}` : ''
      }
    } catch (_e) {
      qs = ''
    }
    redirect(`/candidate${qs}`);
  }

  return <HomeServer />;
}
