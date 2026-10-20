import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPullLocation } from '@/lib/location/pull-location-policy'

const LOCATION_RESTRICTED_MESSAGE =
  'Siyarwa Pull is currently available only in Abuja/FCT, Kano, Kaduna, Zamfara, Katsina, and Sokoto, Nigeria.'

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json(
    {
      error: code,
      message,
    },
    { status },
  )
}

export async function POST(request: NextRequest) {
  // Vercel supplies these headers for the incoming request. The location
  // utility denies unknown locations by default in production.
  const location = getPullLocation(request)

  if (!location.allowed) {
    return jsonError(
      LOCATION_RESTRICTED_MESSAGE,
      403,
      'LOCATION_RESTRICTED',
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid request body.', 400, 'INVALID_REQUEST')
  }

  if (!body || typeof body !== 'object') {
    return jsonError('Invalid request body.', 400, 'INVALID_REQUEST')
  }

  const payload = body as {
    email?: unknown
    password?: unknown
  }

  const email = typeof payload.email === 'string'
    ? payload.email.trim().toLowerCase()
    : ''
  const password = typeof payload.password === 'string'
    ? payload.password
    : ''

  if (!email || !password) {
    return jsonError(
      'Email and password are required.',
      400,
      'INVALID_REQUEST',
    )
  }

  // Keep basic validation here so malformed requests do not reach Supabase.
  if (email.length > 254 || !email.includes('@')) {
    return jsonError('Enter a valid email address.', 400, 'INVALID_EMAIL')
  }

  if (password.length < 8) {
    return jsonError(
      'Password must be at least 8 characters.',
      400,
      'WEAK_PASSWORD',
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
    },
  })

  if (error) {
    return jsonError(error.message, 400, 'SIGNUP_FAILED')
  }

  return NextResponse.json(
    {
      user: data.user,
      session: data.session,
    },
    { status: 200 },
  )
}
