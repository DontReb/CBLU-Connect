import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // loading (checking for an existing session) | authenticated | anonymous
  const [status, setStatus] = useState('loading');

  // On first load, ask the server whether the session cookie (if any) is
  // still valid — this is what keeps someone logged in across a page
  // refresh. `ignore` guards against setting state from a response that
  // comes back after the component's already gone (the canonical pattern
  // for data-fetching effects — see react.dev/learn/you-might-not-need-an-effect).
  useEffect(() => {
    let ignore = false;

    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (ignore) return;
        if (!res.ok) {
          setUser(null);
          setStatus('anonymous');
          return;
        }
        const data = await res.json();
        if (ignore) return;
        setUser(data.user);
        setStatus('authenticated');
      } catch {
        if (!ignore) {
          setUser(null);
          setStatus('anonymous');
        }
      }
    }

    checkSession();
    return () => {
      ignore = true;
    };
  }, []);

  // Exposed separately so something other than the mount check (e.g. after
  // an action that might change the session) can re-verify on demand.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        setUser(null);
        setStatus('anonymous');
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setStatus('authenticated');
    } catch {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  // Called by LoginPage with the user object /api/auth/login already
  // returned, so we don't need a second round trip just to know who logged in.
  const login = useCallback((loggedInUser) => {
    setUser(loggedInUser);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout, refresh }),
    [user, status, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}