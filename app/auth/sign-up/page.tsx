'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const COLLAGE_IMAGES = ['/collage-1.jpg', '/collage-4.jpg', '/collage-7.jpg']

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showRepeat, setShowRepeat] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (password !== repeatPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const result: { message?: string; error?: string } = await response.json()

      if (!response.ok) {
        throw new Error(
          result.message ||
            (result.error === 'LOCATION_RESTRICTED'
              ? 'Siyarwa Pull is not currently available in your location.'
              : 'Unable to create your account.'),
        )
      }

      router.push(`/auth/sign-up-success?email=${encodeURIComponent(email.trim())}`)
    } catch (signupError: unknown) {
      setError(
        signupError instanceof Error
          ? signupError.message
          : 'Unable to create your account. Please try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const EyeOpen = () => (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )

  const EyeOff = () => (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        .pull-signup-root {
          position: relative;
          min-height: 100dvh;
          background: #ffffff;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          font-family: 'Nunito', sans-serif;
          padding: 40px 24px 32px;
          overflow: hidden;
        }
        .pull-signup-collage {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .pull-signup-collage-card {
          position: absolute;
          border-radius: 18px;
          object-fit: cover;
          opacity: 0.07;
          filter: grayscale(60%);
        }
        .pull-signup-collage-card--1 {
          top: -40px;
          left: -30px;
          width: 220px;
          height: 260px;
          transform: rotate(-10deg);
        }
        .pull-signup-collage-card--2 {
          top: 8%;
          right: -50px;
          width: 200px;
          height: 240px;
          transform: rotate(12deg);
        }
        .pull-signup-collage-card--3 {
          bottom: -50px;
          left: 22%;
          width: 240px;
          height: 220px;
          transform: rotate(-6deg);
        }
        .pull-signup-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .pull-signup-logo-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
        }
        .pull-signup-icon,
        .pull-signup-icon img {
          width: 60px;
          height: 60px;
        }
        .pull-signup-icon img {
          display: block;
          object-fit: contain;
        }
        .pull-signup-tagline {
          margin: 0;
          font-size: 13.5px;
          color: #9ca3af;
          font-weight: 500;
        }
        .pull-signup-welcome {
          text-align: center;
          margin-bottom: 26px;
        }
        .pull-signup-title {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          color: #111111;
          letter-spacing: -0.3px;
        }
        .pull-signup-subtitle {
          margin: 4px 0 0;
          font-size: 13.5px;
          color: #9ca3af;
          font-weight: 500;
        }
        .pull-signup-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .pull-signup-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }
        .pull-signup-label {
          font-size: 13px;
          font-weight: 700;
          color: #374151;
        }
        .pull-signup-input-wrap {
          position: relative;
          width: 100%;
        }
        .pull-signup-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #c4c9d4;
          display: flex;
          align-items: center;
          pointer-events: none;
        }
        .pull-signup-input {
          width: 100%;
          height: 52px;
          border: 1.5px solid #e5e7eb;
          border-radius: 14px;
          background: #f9fafb;
          padding: 0 44px 0 42px;
          font-size: 14px;
          font-family: 'Nunito', sans-serif;
          font-weight: 500;
          color: #111111;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .pull-signup-input::placeholder { color: #b5bbc6; }
        .pull-signup-input:focus {
          border-color: #111111;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(17,17,17,0.08);
        }
        .pull-signup-eye {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #b5bbc6;
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.15s;
        }
        .pull-signup-eye:hover,
        .pull-signup-eye:focus-visible { color: #111111; }
        .pull-signup-error {
          font-size: 12.5px;
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 10px 14px;
          font-weight: 600;
        }
        .pull-signup-submit {
          width: 100%;
          height: 52px;
          background: #111111;
          color: #ffffff;
          font-size: 15px;
          font-weight: 800;
          font-family: 'Nunito', sans-serif;
          border: none;
          border-radius: 40px;
          cursor: pointer;
          letter-spacing: 0.3px;
          margin-top: 4px;
          transition: background 0.2s, transform 0.1s;
        }
        .pull-signup-submit:hover:not(:disabled) { background: #000000; }
        .pull-signup-submit:active:not(:disabled) { transform: scale(0.98); }
        .pull-signup-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .pull-signup-footer {
          font-size: 13.5px;
          color: #9ca3af;
          font-weight: 600;
          margin-top: 20px;
          text-align: center;
        }
        .pull-signup-footer a {
          color: #111111;
          text-decoration: none;
          font-weight: 800;
        }
        .pull-signup-footer a:hover { opacity: 0.75; }
      `}</style>

      <main className="pull-signup-root">
        <div className="pull-signup-collage" aria-hidden="true">
          {COLLAGE_IMAGES.map((src, index) => (
            <img
              key={src}
              src={src}
              alt=""
              className={`pull-signup-collage-card pull-signup-collage-card--${index + 1}`}
            />
          ))}
        </div>

        <div className="pull-signup-container">
          <div className="pull-signup-logo-wrap">
            <div className="pull-signup-icon">
              <img src="/pull-icon-maskable-512.png" alt="Siyarwa Pull" />
            </div>
            <p className="pull-signup-tagline">build your identity, shape your world.</p>
          </div>

          <div className="pull-signup-welcome">
            <h1 className="pull-signup-title">create account</h1>
            <p className="pull-signup-subtitle">join Siyarwa Pull and start building</p>
          </div>

          <form className="pull-signup-form" onSubmit={handleSignUp}>
            <div className="pull-signup-field">
              <label className="pull-signup-label" htmlFor="email">email</label>
              <div className="pull-signup-input-wrap">
                <span className="pull-signup-input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="email"
                  className="pull-signup-input"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div className="pull-signup-field">
              <label className="pull-signup-label" htmlFor="password">password</label>
              <div className="pull-signup-input-wrap">
                <span className="pull-signup-input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  className="pull-signup-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="create a password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="pull-signup-eye"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <div className="pull-signup-field">
              <label className="pull-signup-label" htmlFor="repeat-password">confirm password</label>
              <div className="pull-signup-input-wrap">
                <span className="pull-signup-input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="repeat-password"
                  className="pull-signup-input"
                  type={showRepeat ? 'text' : 'password'}
                  placeholder="repeat your password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={repeatPassword}
                  onChange={(event) => setRepeatPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="pull-signup-eye"
                  aria-label={showRepeat ? 'Hide confirmation password' : 'Show confirmation password'}
                  onClick={() => setShowRepeat((visible) => !visible)}
                >
                  {showRepeat ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            {error && (
              <div className="pull-signup-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="pull-signup-submit" disabled={isLoading}>
              {isLoading ? 'creating account...' : 'create account'}
            </button>
          </form>

          <p className="pull-signup-footer">
            already have an account?{' '}
            <Link href="/auth/login">sign in</Link>
          </p>
        </div>
      </main>
    </>
  )
}
