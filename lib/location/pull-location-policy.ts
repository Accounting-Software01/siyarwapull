import type { NextRequest } from 'next/server'

export const ALLOWED_COUNTRY = 'NG'

export const ALLOWED_REGIONS = new Set([
  'FC', // Abuja / FCT
  'KN', // Kano
  'ZA', // Zamfara
  'SO', // Sokoto
  'NI', // Niger
  'PL', // Plateau / Jos
  'LA', // Lagos
  'KD' // Kaduna
])

export const ALLOWED_REGION_NAMES = {
  FC: 'Abuja / FCT',
  KN: 'Kano',
  ZA: 'Zamfara',
  SO: 'Sokoto',
  NI: 'Niger',
  PL: 'Plateau / Jos',
  LA: 'Lagos',
  KD: 'Kaduna',
} as const


export type PullLocation = {
  country: string | null
  region: string | null
  regionName: string | null
  allowed: boolean
}

const normalise = (value: string | null) => value?.trim().toUpperCase() || null

export function getPullLocation(request: NextRequest): PullLocation {
  const country = normalise(request.headers.get('x-vercel-ip-country'))
  const rawRegion = normalise(request.headers.get('x-vercel-ip-country-region'))
  const region = rawRegion?.split('-').at(-1) || null

  // Vercel headers are absent in local development. Keep production strict;
  // an explicit opt-in is available for local development only.
  const localBypass = process.env.NODE_ENV !== 'production' && process.env.ALLOW_LOCAL_LOCATION_BYPASS === 'true'
  const allowed = localBypass || (country === ALLOWED_COUNTRY && !!region && ALLOWED_REGIONS.has(region))

  return {
    country,
    region,
    regionName: region && region in ALLOWED_REGION_NAMES ? ALLOWED_REGION_NAMES[region as keyof typeof ALLOWED_REGION_NAMES] : null,
    allowed,
  }
}


export function locationMessage(location: PullLocation) {
  if (!location.country) return 'Siyarwa Pull could not verify your current location.'
  return 'Siyarwa Pull is currently available only in Abuja/FCT, Kano, Kaduna, Zamfara, Katsina, and Sokoto, Nigeria.'
}
