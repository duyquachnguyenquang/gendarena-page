import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getPostLoginPath } from '@/lib/auth/routing'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Fast-path bypass for high-concurrency public voting pages, APIs & offline FOH scoreboard
  // Prevents redundant Supabase Auth roundtrips during peak QR scan spikes or offline FOH operation
  if (
    pathname.startsWith('/vote') ||
    pathname.startsWith('/binh-chon') ||
    pathname.startsWith('/api/booth-vote') ||
    pathname.startsWith('/foh')
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    (pathname.startsWith('/dashboard') ||
      pathname.startsWith('/submissions') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/team/'))
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (pathname === '/login' || pathname === '/register')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const dest = getPostLoginPath(profile?.role)
    return NextResponse.redirect(new URL(dest, request.url))
  }

  if (user && pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      const dest = getPostLoginPath(profile?.role)
      return NextResponse.redirect(new URL(dest, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
