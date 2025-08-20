import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  let res = NextResponse.next()

  // 🚫 Never refresh tokens in middleware
  const supabase = createMiddlewareClient(
    { req, res },
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
  )

  const { data, error } = await supabase.auth.getUser()
  const user = data?.user

  // Bad/expired JWT → clear cookies + send to login
  if (error && (error.status === 401 || error.status === 422)) {
    for (const { name } of req.cookies.getAll()) {
      if (name.startsWith('sb-')) res.cookies.delete(name, { path: '/' })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Already logged in → keep them out of /login
  if (req.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Public paths
  const publicPaths = ['/login', '/api/auth']
  const isPublic = publicPaths.some(p => req.nextUrl.pathname.startsWith(p))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // ❗ No DB calls here (role checks move to a layout/route)
  return res
}

export const config = {
  matcher: [
    // exclude Next internals & common assets so middleware runs less
    '/((?!_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp|mp4|webm|js|css|map|txt|woff2?)$).*)',
  ],
}
