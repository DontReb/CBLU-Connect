import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_CLIENT } from '../../lib/mockClient';
import { useChecklist } from '../../lib/checklistContext';
import { useAuth } from '../../lib/authContext';

const STATUS_STYLES = {
  valid: 'bg-accent-light/50 text-accent-dark',
  invalid: 'bg-red-100 text-red-700',
  pending: 'bg-line/60 text-ink-soft',
  processing: 'bg-highlight/40 text-ink',
  error: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  valid: 'Valid',
  invalid: 'Needs attention',
  pending: 'Not submitted',
  processing: 'Checking…',
  error: 'Upload failed',
};

// Latest announcements from the bank. Renders nothing while loading, on an
// error, or when there are none — announcements are a nice-to-have here
// and should never block or clutter the rest of the overview.
function AnnouncementsCard() {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function loadAnnouncements() {
      try {
        const res = await fetch('/api/announcements', { credentials: 'include' });
        if (!res.ok || ignore) return;
        const data = await res.json();
        if (!ignore) setAnnouncements(data.announcements.slice(0, 3));
      } catch {
        // Leave it empty — the card just won't show.
      }
    }

    loadAnnouncements();
    return () => {
      ignore = true;
    };
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-ink">Announcements</h2>
      <ul className="space-y-4">
        {announcements.map((announcement) => (
          <li key={announcement.id} className="border-l-2 border-accent pl-4">
            <p className="text-xs text-ink-soft">
              {new Date(announcement.createdAt).toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <h3 className="font-medium text-ink">{announcement.title}</h3>
            <p className="mt-0.5 whitespace-pre-line text-sm text-ink-soft">{announcement.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ClientOverview() {
  const { checklist, status } = useChecklist();
  const { user } = useAuth();
  const completed = checklist.items.filter((item) => item.status === 'valid').length;
  const total = checklist.items.length;
  // Real name from the session; the verification status card below is
  // still MOCK_CLIENT until the client profile endpoint is wired up.
  const firstName = user.fullName.split(' ')[0];

  if (status === 'loading') {
    return <p className="mx-auto max-w-3xl text-sm text-ink-soft">Loading your checklist…</p>;
  }

  if (status === 'error') {
    return (
      <p className="mx-auto max-w-3xl rounded-2xl border border-line bg-panel p-5 text-sm text-red-700">
        Couldn't load your checklist. Try refreshing the page.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Here's where things stand with your {checklist.name.toLowerCase()} application.
        </p>
      </div>

      <AnnouncementsCard />

      <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{checklist.name}</h2>
          <span className="text-sm text-ink-soft">
            {completed} of {total} complete
          </span>
        </div>
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-paper">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${total === 0 ? 0 : (completed / total) * 100}%` }}
          />
        </div>
        <ul className="space-y-2.5">
          {checklist.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-line px-4 py-3"
            >
              <span className="text-sm text-ink">{item.label}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[item.status]}`}>
                {STATUS_LABELS[item.status]}
              </span>
            </li>
          ))}
        </ul>
        <Link
          to="/dashboard/client/documents"
          className="mt-5 inline-flex text-sm font-medium text-accent-dark hover:underline"
        >
          Go to your checklist →
        </Link>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-ink">Account verification</h2>
        <p className="text-sm text-ink-soft">
          Your account is currently <span className="font-medium text-ink">{MOCK_CLIENT.verificationStatus}</span>.
          This updates automatically once every required document above is marked valid.
        </p>
      </div>
    </div>
  );
}