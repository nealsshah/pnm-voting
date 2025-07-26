import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  let session = null
  let sessionError = null

  try {
    const result = await supabase.auth.getSession()
    session = result.data.session
    sessionError = result.error
  } catch (err) {
    // getSession itself can throw on 400/429; normalise that into our handling flow
    if (err?.status || err?.code) {
      sessionError = err
    } else {
      throw err // unknown unexpected problem – re-throw so we see it in logs
    }
  }

  const user = session?.user

  // If Supabase indicates the refresh token is invalid *or* we have hit the refresh-token rate-limit,
  // purge ALL Supabase auth cookies to stop further refresh attempts.
  // The Supabase Auth helpers store cookies with names that start with `sb-<project-ref>-…` so we
  // cannot rely on hard-coded names.
  const refreshErrors = ['refresh_token_not_found', 'over_request_rate_limit']
  if (
    sessionError &&
    (sessionError.status === 400 || // invalid / expired refresh token
      sessionError.status === 429 || // rate-limited while refreshing
      refreshErrors.includes(sessionError.code))
  ) {
    // Remove every cookie whose name starts with `sb-` (covers access & refresh tokens for this project)
    for (const { name } of req.cookies.getAll()) {
      if (name.startsWith('sb-')) {
        res.cookies.delete(name, { path: '/' })
      }
    }

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