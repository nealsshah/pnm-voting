import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import HomeServer from './components/HomeServer';

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

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
  } else if (userRole?.role === 'brother') {
    redirect('/gallery');
  }

  return <HomeServer />;
}
