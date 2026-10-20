'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const COLLAGE_IMAGES = ['/collage-2.jpg', '/collage-5.jpg', '/collage-8.jpg']
const RESEND_COOLDOWN = 30

export default function SignUpSuccess() {
  return (
    <Suspense fallback={null}>
      <VerifyCode />
    </Suspense>
  )
}

function VerifyCode() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const email = searchParams.get('email') || ''

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const code = digits.join('')

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '')
    if (!clean) {
      const next = [...digits]
      next[index] = ''
      setDigits(next)
      return
    }
    // Handle pasting a full code into one box
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split('')
      const next = [...digits]
      chars.forEach((c, i) => {
        if (index + i < 6) next[index + i] = c
      })
      setDigits(next)
      const lastFilled = Math.min(index + chars.length, 5)
      inputRefs.current[lastFilled]?.focus()
      return
    }
    const next = [...digits]
    next[index] = clean
    setDigits(next)
    if (index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    if (code.length !== 6) return
    setVerifying(true)
    setError(null)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      })
      if (error) throw error
      setVerified(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code')
      setDigits(Array(6).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError(null)
    setResendMessage(null)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) throw error
      setResendMessage('New code sent')
      setResendCooldown(RESEND_COOLDOWN)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend code')
    }
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
      `}</style>

      <div className="ff-root">
        <div className="ff-faded-collage">
          {COLLAGE_IMAGES.map((src, i) => (
            <img key={src} src={src} alt="" className={`ff-faded-card ff-faded-card--${i + 1}`} />
          ))}
        </div>

        <div className="ff-container">
          {!verified ? (
            <>
              <div className="ff-icon-badge">
                <Mail size={30} />
              </div>

              <h1 className="ff-heading">Check your email</h1>
              <p className="ff-subtext">
                Enter the 6-digit code we sent to<br />
                <strong>{email || 'your email'}</strong>
              </p>

              <div className="ff-code-row" onPaste={(e) => {
                e.preventDefault()
                handleDigitChange(0, e.clipboardData.getData('text'))
              }}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el }}
                    className="ff-code-box"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {error && <p className="ff-error">{error}</p>}

              <button
                className="ff-btn-primary"
                disabled={code.length !== 6 || verifying}
                onClick={handleVerify}
              >
                {verifying ? 'Verifying...' : 'Verify email'}
              </button>

              <p className="ff-resend">
                Didn&apos;t get a code?{' '}
                {resendCooldown > 0 ? (
                  <span className="ff-resend-cooldown">Resend in {resendCooldown}s</span>
                ) : (
                  <button className="ff-resend-link" onClick={handleResend}>Resend</button>
                )}
              </p>
              {resendMessage && <p className="ff-resend-confirm">{resendMessage}</p>}
            </>
          ) : (
            <>
              <div className="ff-icon-badge ff-icon-badge--success">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h1 className="ff-heading">Email verified</h1>
              <p className="ff-subtext">You&apos;re all set — let&apos;s get your Face set up.</p>

              <button className="ff-btn-primary" onClick={() => router.push('/onboarding/profile')}>
  Set up my profile
  <ArrowRight size={18} />
</button>
            </>
          )}

          <p className="ff-footer">
            Wrong email?{' '}
            <Link href="/auth/sign-up">Start over</Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        .ff-root {
          position: relative;
          min-height: 100dvh;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Nunito', sans-serif;
          padding: 20px 24px 16px;
          overflow: hidden;
        }

        .ff-faded-collage {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .ff-faded-card {
          position: absolute;
          border-radius: 18px;
          object-fit: cover;
          opacity: 0.08;
          filter: grayscale(60%);
        }

        .ff-faded-card--1 { top: -40px; left: -30px; width: 220px; height: 260px; transform: rotate(-10deg); }
        .ff-faded-card--2 { top: 10%; right: -50px; width: 200px; height: 240px; transform: rotate(12deg); }
        .ff-faded-card--3 { bottom: -50px; left: 20%; width: 240px; height: 220px; transform: rotate(-6deg); }

        .ff-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transform: scale(0.85);
  transform-origin: top center;
        }

        .ff-icon-badge {
          width: 64px;
          height: 64px;
          border-radius: 9999px;
          background: #111111;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .ff-icon-badge--success {
          background: #16a34a;
        }

        .ff-heading {
          font-size: 28px;
          font-weight: 900;
          color: #111111;
          letter-spacing: -0.6px;
          margin-bottom: 10px;
        }

        .ff-subtext {
          font-size: 14.5px;
          font-weight: 600;
          color: #6b7280;
          line-height: 1.5;
          margin-bottom: 28px;
        }

        .ff-subtext strong {
          color: #111111;
        }

        .ff-code-row {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .ff-code-box {
          width: 46px;
          height: 56px;
          text-align: center;
          font-size: 24px;
          font-weight: 800;
          color: #111111;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-family: 'Nunito', sans-serif;
        }

        .ff-code-box:focus {
          outline: none;
          border-color: #111111;
        }

        .ff-error {
          font-size: 13px;
          font-weight: 700;
          color: #dc2626;
          margin-bottom: 16px;
        }

        .ff-btn-primary {
          width: 100%;
          padding: 15px 0;
          background: #111111;
          color: #ffffff;
          font-size: 16px;
          font-weight: 800;
          font-family: 'Nunito', sans-serif;
          border: none;
          border-radius: 40px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          margin-bottom: 20px;
        }

        .ff-btn-primary:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .ff-btn-primary:not(:disabled):active { transform: scale(0.97); }

        .ff-resend {
          font-size: 13.5px;
          font-weight: 600;
          color: #6b7280;
        }

        .ff-resend-link {
          background: none;
          border: none;
          padding: 0;
          color: #111111;
          font-weight: 800;
          font-family: 'Nunito', sans-serif;
          cursor: pointer;
          font-size: 13.5px;
        }

        .ff-resend-cooldown {
          color: #9ca3af;
          font-weight: 700;
        }

        .ff-resend-confirm {
          font-size: 13px;
          font-weight: 700;
          color: #16a34a;
          margin-top: 6px;
        }

        .ff-footer {
          font-size: 13.5px;
          font-weight: 600;
          color: #6b7280;
          margin-top: 24px;
        }

        .ff-footer a {
          color: #111111;
          font-weight: 800;
          text-decoration: none;
        }
      `}</style>
    </>
  )
}
