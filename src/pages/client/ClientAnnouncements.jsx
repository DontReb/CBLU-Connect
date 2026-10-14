import { useEffect, useState } from 'react';

// Every announcement from the bank, newest first (the Overview shows only
// the latest three). Read-only for clients; admins post them on their own
// Announcements page.

const NEW_FOR_DAYS = 7;

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

function isNew(value) {
  return Date.now() - new Date(value).getTime() < NEW_FOR_DAYS * 24 * 60 * 60 * 1000;
}

export default function ClientAnnouncements() {
  const [state, setState] = useState({ status: 'loading', announcements: [] });

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/announcements', { credentials: 'include' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!ignore) setState({ status: 'ready', announcements: data.announcements });
      } catch {
        if (!ignore) setState({ status: 'error', announcements: [] });
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const { status, announcements } = state;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Announcements</h1>
      <p className="mt-1 text-sm text-ink-soft">News and reminders from Cooperative Bank of La Union.</p>

      {status === 'loading' && <p className="mt-6 text-sm text-ink-soft">Loading announcements…</p>}

      {status === 'error' && (
        <p className="mt-6 rounded-2xl border border-line bg-panel p-5 text-sm text-red-700">
          Couldn't load announcements. Try refreshing the page.
        </p>
      )}

      {status === 'ready' && announcements.length === 0 && (
        <p className="mt-6 rounded-2xl border border-line bg-panel p-5 text-sm text-ink-soft">
          No announcements yet. New ones from the bank will appear here.
        </p>
      )}

      {status === 'ready' && announcements.length > 0 && (
        <ul className="mt-6 space-y-4">
          {announcements.map((announcement) => (
            <li key={announcement.id}>
              <article className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                  <time dateTime={announcement.createdAt}>{formatDate(announcement.createdAt)}</time>
                  {announcement.authorName && <span>· {announcement.authorName}</span>}
                  {isNew(announcement.createdAt) && (
                    <span className="rounded-full bg-highlight/50 px-2 py-0.5 font-medium text-ink">New</span>
                  )}
                </div>
                <h2 className="mt-1.5 text-lg font-semibold text-ink">{announcement.title}</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-ink">{announcement.body}</p>
                {announcement.updatedAt &&
                  new Date(announcement.updatedAt) - new Date(announcement.createdAt) > 60 * 1000 && (
                    <p className="mt-2 text-xs text-ink-soft">Edited {formatDate(announcement.updatedAt)}</p>
                  )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
