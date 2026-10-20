
import { useState } from 'react';
import './AuthPanel.css';

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>

      <div className="auth-input-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder="Enter your password"
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={minLength}
          required
        />

        <button
          type="button"
          className="auth-eye"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

export default function AuthPanel({
  isRegister,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onSubmit,
  loading,
  error,
  success,
  onToggle,
}) {
  const showMatch = isRegister && confirmPassword.length > 0;
  const passwordsMatch = password === confirmPassword;

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <a className="auth-brand" href="#home">
          <span className="auth-brand-icon">V</span>
          <span>VELoop <span className="auth-brand-light">Rewards</span></span>
        </a>

        <div className="auth-aside-copy">
          <span className="auth-eyebrow">WELCOME TO VELOOP</span>

          <div className="auth-hero-visual" aria-hidden="true">
            <div className="auth-orbit auth-orbit-one" />
            <div className="auth-orbit auth-orbit-two" />
            <div className="auth-hero-token">V</div>
            <span className="auth-float-token auth-float-one">V</span>
            <span className="auth-float-token auth-float-two">✦</span>
          </div>

          <h1>
            Rewards that
            <br />
            <span>move with you.</span>
          </h1>

          <p>
            Turn everyday activity into meaningful rewards.
            Simple, secure, and made for you.
          </p>

          <ul className="auth-perks">
            <li><span>✦</span> Earn rewards through simple actions</li>
            <li><span>↗</span> Track your rewards in one place</li>
            <li><span>◇</span> Your account, protected and secure</li>
          </ul>
        </div>

        <span className="auth-aside-foot">
          © 2026 VELoop Rewards
        </span>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <span className="auth-brand-icon">V</span>
            <span>VELoop Rewards</span>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button
              type="button"
              role="tab"
              aria-selected={!isRegister}
              className={!isRegister ? 'is-active' : ''}
              onClick={() => isRegister && onToggle()}
            >
              Login
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              className={isRegister ? 'is-active' : ''}
              onClick={() => !isRegister && onToggle()}
            >
              Register
            </button>
          </div>

          <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>

          <p className="auth-sub">
            {isRegister
              ? 'Create your account and get started with VELoop.'
              : 'Login to access your account and continue your rewards journey.'}
          </p>

          {success && !isRegister && (
            <div className="auth-alert auth-alert-success" role="status">
              {success}
            </div>
          )}

          {error && (
            <div className="auth-alert auth-alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="auth-form">
            {isRegister && (
              <div className="auth-field">
                <label htmlFor="auth-name">Full name</label>
                <input
                  id="auth-name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <PasswordField
              id="auth-password"
              label="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? 8 : undefined}
            />

            {isRegister && (
              <>
                <PasswordField
                  id="auth-confirm"
                  label="Confirm password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />

                {showMatch && (
                  <small className={`auth-match ${passwordsMatch ? 'ok' : 'bad'}`}>
                    {passwordsMatch
                      ? '✓ Passwords match'
                      : 'Passwords do not match'}
                  </small>
                )}
              </>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading || (isRegister && password !== confirmPassword)}
            >
              {loading
                ? isRegister ? 'Creating account...' : 'Logging in...'
                : isRegister ? 'Create Account' : 'Login'}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister
              ? 'Already have an account?'
              : "Don't have an account?"}{' '}
            <button type="button" onClick={onToggle}>
              {isRegister ? 'Login' : 'Register'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
