import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    await supabase.auth.exchangeCodeForSession(code)
    
    // After signing in, set up user metadata if it doesn't exist
    const {
      data: { session },
    } = await supabase.auth.getSession()
    
    if (session) {
      // Check if user metadata exists
      const { data: existingMetadata } = await supabase
        .from('users_metadata')
        .select()
        .eq('id', session.user.id)
        .single()
      
      // If not, create it with 'pending' role
      if (!existingMetadata) {
        await supabase.from('users_metadata').insert({
          id: session.user.id,
          role: 'pending',
          email: session.user.email
        })
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin)
}

export const dynamic = 'force-dynamic' 