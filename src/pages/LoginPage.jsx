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
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-full border border-line px-4 py-2.5 text-sm text-ink"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

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

        <p className="mt-6 text-center text-sm text-ink-soft">
          <Link to="/" className="hover:text-accent-dark">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}