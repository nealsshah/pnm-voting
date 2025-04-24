import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

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