import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  let res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // --- Auth -----------------------------------------------------------------
  let user = null
  let authError = null
  try {
    const { data, error } = await supabase.auth.getUser()
    user = data?.user
    authError = error
  } catch (err) {
    if (err?.status || err?.code) authError = err
    else throw err
  }

  // purge bad JWTs
  const invalidTokenCodes = ['invalid_token', 'expired_token']
  if (
    authError &&
    (authError.status === 401 || authError.status === 422 ||
      invalidTokenCodes.includes(authError.code))
  ) {
    for (const { name } of req.cookies.getAll()) {
      if (name.startsWith('sb-')) res.cookies.delete(name, { path: '/' })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // redirect already-logged-in users away from /login
  if (req.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // public paths
  const publicPaths = ['/login', '/api/auth']
  const isPublic = publicPaths.some(p => req.nextUrl.pathname.startsWith(p))
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // role-based guards
  if (user) {
    const { data: userRole } = await supabase
      .from('users_metadata')
      .select('role')
      .eq('id', user.id)
      .single()

    const adminPaths = ['/admin', '/api/admin']
    const isAdminPath = adminPaths.some(p => req.nextUrl.pathname.startsWith(p))
    if (isAdminPath && userRole?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url))
    }

    if (userRole?.role === 'pending' && req.nextUrl.pathname !== '/pending') {
      return NextResponse.redirect(new URL('/pending', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|svg|png|jpg|jpeg)$).*)',
  ],
}