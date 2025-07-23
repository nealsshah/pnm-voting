import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import HomeServer from './components/HomeServer';

export default async function Page({ searchParams }) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // Check for verification parameters
  const verified = searchParams?.verified;
  const token = searchParams?.token;
  const type = searchParams?.type;

  // If this is an email verification, redirect to login with verified flag
  if (token && type === 'signup') {
    redirect('/login?verified=1');
  }

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
