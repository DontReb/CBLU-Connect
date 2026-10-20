import { useCallback, useEffect, useMemo, useState } from 'react';
import { PrivacyContext } from './privacyContext';

// The client's privacy consents (see shared/privacy.js): loaded once for the
// whole client dashboard, and changed through setConsent(). Each consent is
// { given, at, version, current }; `current` means agreed to the notice
// version in force now.

async function fetchConsents() {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  const data = await res.json();
  if (!res.ok || !data.privacy) throw new Error();
  return data.privacy.consents;
}

export default function PrivacyProvider({ children }) {
  const [consents, setConsents] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let ignore = false;
    fetchConsents()
      .then((loaded) => {
        if (ignore) return;
        setConsents(loaded);
        setStatus('ready');
      })
      .catch(() => {
        if (!ignore) setStatus('error');
      });
    return () => {
      ignore = true;
    };
  }, []);

  // For a "Try again" button after a failed load.
  const reload = useCallback(async () => {
    setStatus('loading');
    try {
      setConsents(await fetchConsents());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  // Agree (given = true) or withdraw (given = false). Throws with a
  // readable message if it couldn't be saved.
  const setConsent = useCallback(async (purpose, given) => {
    const res = await fetch('/api/auth/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ purpose, given }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Couldn't save your choice. Please try again.");
    setConsents(data.privacy.consents);
    return data.privacy.consents;
  }, []);

  const value = useMemo(() => ({ consents, status, reload, setConsent }), [consents, status, reload, setConsent]);

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}
