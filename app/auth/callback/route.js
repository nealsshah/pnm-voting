import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient(
      { cookies },
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await supabase.auth.exchangeCodeForSession(code)

    // After signing in, set up user metadata if it doesn't exist
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (user && !authError) {
      // Check if user metadata exists
      const { data: existingMetadata } = await supabase
        .from('users_metadata')
        .select()
        .eq('id', user.id)
        .single()

      // If not, create it with 'pending' role
      if (!existingMetadata) {
        await supabase.from('users_metadata').insert({
          id: user.id,
          role: 'pending',
          email: user.email
        })
      }
    }
  }

  // URL to redirect to after sign in process completes
  const redirectUrl = `${requestUrl.origin}/login?verified=1`
  return NextResponse.redirect(redirectUrl)
}

export const dynamic = 'force-dynamic' 