import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Paystack server helpers. SERVER ONLY — uses the secret key.
 * Amounts are always integer kobo.
 */

const BASE = 'https://api.paystack.co'

export class PaystackError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'PaystackError'
    this.status = status
  }
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set')
  return key
}

async function paystack<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  let json: { status?: boolean; message?: string; data?: T } | null = null
  try {
    json = await res.json()
  } catch {
    /* non-JSON response */
  }
  if (!res.ok || !json?.status) {
    throw new PaystackError(json?.message ?? `Paystack request failed (${res.status})`, res.status)
  }
  return json.data as T
}

/** Constant-time check of Paystack's x-paystack-signature header (HMAC-SHA512 of the RAW body). */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false
  const expected = Buffer.from(createHmac('sha512', secretKey()).update(rawBody).digest('hex'), 'utf8')
  const given = Buffer.from(signature.trim().toLowerCase(), 'utf8')
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export type PaystackBank = { name: string; code: string; slug: string }

export async function listBanks(): Promise<PaystackBank[]> {
  const data = await paystack<PaystackBank[]>('/bank?country=nigeria&perPage=200&use_cursor=false')
  return data.map((b) => ({ name: b.name, code: b.code, slug: b.slug }))
}

export async function resolveAccount(accountNumber: string, bankCode: string) {
  const qs = new URLSearchParams({ account_number: accountNumber, bank_code: bankCode })
  return paystack<{ account_number: string; account_name: string }>(`/bank/resolve?${qs}`)
}

export async function createSubaccount(input: {
  businessName: string
  bankCode: string
  accountNumber: string
  percentageCharge: number
  description?: string
}) {
  return paystack<{ subaccount_code: string }>('/subaccount', {
    method: 'POST',
    body: JSON.stringify({
      business_name: input.businessName,
      settlement_bank: input.bankCode,
      account_number: input.accountNumber,
      percentage_charge: input.percentageCharge,
      description: input.description,
    }),
  })
}

export async function initializeTransaction(input: {
  email: string
  amountKobo: number
  reference: string
  callbackUrl: string
  subaccount: string
  transactionChargeKobo: number
  metadata: Record<string, unknown>
}) {
  return paystack<{ authorization_url: string; access_code: string; reference: string }>(
    '/transaction/initialize',
    {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        amount: input.amountKobo,
        currency: 'NGN',
        reference: input.reference,
        callback_url: input.callbackUrl,
        subaccount: input.subaccount,
        // Flat platform commission kept by the main account; the rest settles to the seller.
        transaction_charge: input.transactionChargeKobo,
        // Platform bears Paystack's processing fee (Paystack default). Set to 'subaccount' to pass it to sellers.
        bearer: process.env.PAYSTACK_FEE_BEARER === 'subaccount' ? 'subaccount' : 'account',
        metadata: input.metadata,
      }),
    },
  )
}

export type PaystackVerifyData = {
  status: string
  reference: string
  amount: number
  currency: string
}

export async function verifyTransaction(reference: string) {
  return paystack<PaystackVerifyData>(`/transaction/verify/${encodeURIComponent(reference)}`)
}
