import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Use getSession() as recommended; this refreshes the session only once and returns the user if available
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  const user = session?.user

  // If Supabase indicates the refresh token is invalid, purge auth cookies to stop further refresh attempts
  if (sessionError?.status === 400 /* Invalid refresh token */) {
    // Clear the cookies so subsequent requests don't keep retrying
    res.cookies.set('sb-access-token', '', { path: '/', maxAge: 0 })
    res.cookies.set('sb-refresh-token', '', { path: '/', maxAge: 0 })
    // Redirect the client to login so they can establish a fresh session
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // For /login path, if user is already logged in, redirect to home
  if (req.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/api/auth']
  const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path))

  // If the user is not logged in and the path is not public, redirect to login
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // If user is logged in, check roles for protected routes
  if (user) {
    // Get user's role from users_metadata table (kept in sync with rest of app)
    const { data: userRole } = await supabase
      .from('users_metadata')
      .select('role')
      .eq('id', user.id)
      .single()

    // Admin-only routes
    const adminPaths = ['/admin', '/api/admin']
    const isAdminPath = adminPaths.some(path => req.nextUrl.pathname.startsWith(path))

    // Redirect non-admin users trying to access admin routes
    if (isAdminPath && (!userRole || userRole.role !== 'admin')) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Handle pending users - only allow them to access the pending page
    if (userRole?.role === 'pending' && req.nextUrl.pathname !== '/pending') {
      return NextResponse.redirect(new URL('/pending', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg).*)'],
} 