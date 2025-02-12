import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if we're on an admin route
  if (req.nextUrl.pathname.includes('/(admin)')) {
    if (!session) {
      // Redirect unauthenticated users to login page
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Check if user has admin role
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRole || userRole.role !== 'admin') {
      // Redirect non-admin users to home page
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
} 