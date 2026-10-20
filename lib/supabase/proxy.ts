import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getPullLocation } from '@/lib/location/pull-location-policy'

const LOCATION_RESTRICTED_PATH = '/auth/location-restricted'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Keep this immediately after client creation so Supabase session refresh stays reliable.
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const location = getPullLocation(request)
  const isApiRequest = pathname.startsWith('/api/')
  const isHtmlRequest = request.headers.get('accept')?.includes('text/html') ?? false
  const isAuthEntry = pathname === '/auth/sign-up' || pathname === '/auth/login'

  if (pathname === LOCATION_RESTRICTED_PATH) return supabaseResponse

  // Guests may still browse the public dashboard, but cannot open signup/login
  // from a location that is not on the allowlist.
  if (!user && isAuthEntry && !location.allowed) {
    const url = request.nextUrl.clone()
    url.pathname = LOCATION_RESTRICTED_PATH
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Every authenticated request is location-gated. This covers dashboard use,
  // posting, comments, reactions, uploads, messaging, and other API calls.
  if (user && !location.allowed) {
    if (isApiRequest || !isHtmlRequest) {
      return NextResponse.json({ error: 'LOCATION_RESTRICTED', message: 'This location is not eligible for Siyarwa Pull.' }, { status: 403 })
    }

    const url = request.nextUrl.clone()
    url.pathname = LOCATION_RESTRICTED_PATH
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
