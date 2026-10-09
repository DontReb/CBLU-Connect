import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useChecklist } from '../../lib/checklistContext';
import { useAuth } from '../../lib/authContext';

const ID_LABELS = { philsys: 'PhilSys ID', drivers_license: "Driver's License", passport: 'Passport' };

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

// Where the client's loan application stands, from the same endpoint the
// Loan Application page uses. Shows a short placeholder while loading.
function ApplicationCard() {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/forms/application', { credentials: 'include' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!ignore) setState({ status: 'ready', data });
      } catch {
        if (!ignore) setState({ status: 'error' });
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  let summary = 'Loading…';
  let action = 'Open the application';
  if (state.status === 'error') summary = "Couldn't load your application right now.";
  if (state.status === 'ready') {
    const { fields, values, submission } = state.data;
    const required = fields.filter((field) => field.isRequired);
    const filled = required.filter((field) => (values[field.fieldKey]?.value ?? '').trim()).length;
    if (!submission) {
      summary = 'Not started. Scan a valid ID to fill in your details, then complete the rest.';
      action = 'Start your application';
    } else if (filled < required.length) {
      summary = `${filled} of ${required.length} required fields filled in.`;
      action = 'Continue your application';
    } else {
      summary = 'All required fields are filled in. Print it, sign it, and bring it to the bank.';
      action = 'Review your application';
    }
    if (submission?.lastIdType) summary += ` Details filled from your ${ID_LABELS[submission.lastIdType] ?? 'ID'}.`;
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">Your loan application</h2>
      <p className="mt-1 text-sm text-ink-soft">{summary}</p>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
        <Link to="/dashboard/client/loan-application" className="text-accent-dark hover:underline">
          {action} →
        </Link>
        {state.status === 'ready' && state.data.submission && (
          <Link to="/print/loan-application" className="text-accent-dark hover:underline">
            Print form →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function ClientOverview() {
  const { checklist, status } = useChecklist();
  const { user } = useAuth();
  const ready = checklist.items.filter((item) => item.checked).length;
  const total = checklist.items.length;
  const firstName = user.fullName.split(' ')[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">Here's where your loan application stands.</p>
      </div>

      <AnnouncementsCard />

      <ApplicationCard />

      <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Requirements</h2>
          {status === 'ready' && (
            <span className="text-sm text-ink-soft">
              {ready} of {total} ready
            </span>
          )}
        </div>
        {status === 'loading' && <p className="text-sm text-ink-soft">Loading your requirements…</p>}
        {status === 'error' && (
          <p className="text-sm text-red-700">Couldn't load your requirements. Try refreshing the page.</p>
        )}
        {status === 'ready' && (
          <>
            <div className="mb-5 h-2 overflow-hidden rounded-full bg-paper">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${total === 0 ? 0 : (ready / total) * 100}%` }}
              />
            </div>
            <ul className="space-y-2">
              {checklist.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 text-sm">
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                      item.checked ? 'border-accent-dark bg-accent-dark text-white' : 'border-line'
                    }`}
                  >
                    {item.checked ? '✓' : ''}
                  </span>
                  <span className={item.checked ? 'text-ink-soft' : 'text-ink'}>
                    {item.label}
                    <span className="sr-only">{item.checked ? ' (ready)' : ' (not yet)'}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <Link
          to="/dashboard/client/requirements"
          className="mt-5 inline-flex text-sm font-medium text-accent-dark hover:underline"
        >
          Tick what you have →
        </Link>
      </div>
    </div>
  );
}
