import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import logo from '../assets/cblu-logo.png';
import { useAuth } from '../lib/authContext';

const DASHBOARD_PATH_BY_ROLE = {
  admin: '/dashboard/admin',
  client: '/dashboard/client',
  agent: '/dashboard/agent',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter both your email and password.');
      return;
    }
    setError('');
    setStatus('submitting');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        // 429 = too many wrong passwords; logging in is paused for a while.
        if (res.status === 429) setPassword('');
        setStatus('idle');
        return;
      }

      login(data.user);
      // If RequireRole sent them here from a specific dashboard URL, return
      // them there; otherwise go to the dashboard that matches their role.
      const redirectTo = location.state?.from?.pathname ?? DASHBOARD_PATH_BY_ROLE[data.user.role] ?? '/';
      navigate(redirectTo, { replace: true });
    } catch {
      setError('Could not reach the server. Please try again.');
      setStatus('idle');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6 py-16">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <img
            src={logo}
            alt="Cooperative Bank of La Union"
            className="h-10 w-10 rounded-full object-contain"
          />
          <span className="font-display text-xl font-semibold text-ink">CBLU</span>
        </Link>

        <div className="rounded-3xl border border-line bg-panel p-8 shadow-sm">
          <h1 className="mb-1 font-display text-2xl font-medium text-ink">Log in</h1>
          <p className="mb-6 text-sm text-ink-soft">Access your CBLU account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-full border border-line px-4 py-2.5 text-sm text-ink"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-full border border-line py-2.5 pl-4 pr-12 text-sm text-ink"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label="Show password"
                  aria-pressed={showPassword}
                  aria-controls="password"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-1.5 my-auto flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5 hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
                    <circle cx="12" cy="12" r="3" />
                    {showPassword && <path d="M4 4l16 16" />}
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? 'Checking…' : 'Log in'}
            </Button>
          </form>
        </div>

        <p className="mt-6 flex justify-center gap-5 text-sm text-ink-soft">
          <Link to="/" className="hover:text-accent-dark">
            ← Back to home
          </Link>
          <Link to="/privacy" className="hover:text-accent-dark">
            Privacy Notice
          </Link>
        </p>
      </div>
    </div>
  );
}