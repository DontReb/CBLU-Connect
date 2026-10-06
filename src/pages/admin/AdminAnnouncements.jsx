import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';

const INPUT_CLASS =
  'w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none';

const EMPTY_FORM = { title: '', body: '' };

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function sendJson(url, method, payload) {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: payload ? { 'Content-Type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

function AnnouncementItem({ announcement, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function startEditing() {
    setDraft({ title: announcement.title, body: announcement.body });
    setError('');
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!draft.title.trim() || !draft.body.trim()) return;
    setBusy(true);
    setError('');
    try {
      const data = await sendJson(`/api/announcements?id=${announcement.id}`, 'PUT', {
        title: draft.title.trim(),
        body: draft.body.trim(),
      });
      onSaved(data.announcement);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${announcement.title}"? Clients will no longer see it. This can't be undone.`)) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await sendJson(`/api/announcements?id=${announcement.id}`, 'DELETE');
      onDeleted(announcement.id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <li className="rounded-2xl border border-accent bg-panel p-5 shadow-sm">
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink" htmlFor={`edit-title-${announcement.id}`}>
              Title
            </label>
            <input
              id={`edit-title-${announcement.id}`}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              maxLength={200}
              required
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink" htmlFor={`edit-body-${announcement.id}`}>
              Message
            </label>
            <textarea
              id={`edit-body-${announcement.id}`}
              rows={4}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              required
              className={`${INPUT_CLASS} resize-y`}
            />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy} className="px-4 py-2 text-sm">
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={busy}
              className="px-4 py-2 text-sm"
            >
              Cancel
            </Button>
          </div>
        </form>
      </li>
    );
  }

  const wasEdited = announcement.updatedAt && announcement.updatedAt !== announcement.createdAt;

  return (
    <li className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium text-ink">{announcement.title}</h3>
          <p className="mt-0.5 text-xs text-ink-soft">
            {formatDate(announcement.createdAt)}
            {announcement.authorName && ` · ${announcement.authorName}`}
            {wasEdited && ' · edited'}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="ghost" onClick={startEditing} disabled={busy} className="px-3.5 py-1.5 text-xs">
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={busy}
            className="px-3.5 py-1.5 text-xs text-red-700 hover:border-red-700"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm text-ink">{announcement.body}</p>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </li>
  );
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [form, setForm] = useState(EMPTY_FORM);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadAnnouncements() {
      try {
        const res = await fetch('/api/announcements', { credentials: 'include' });
        if (ignore) return;
        if (!res.ok) {
          setStatus('error');
          return;
        }
        const data = await res.json();
        if (ignore) return;
        setAnnouncements(data.announcements);
        setStatus('ready');
      } catch {
        if (!ignore) setStatus('error');
      }
    }

    loadAnnouncements();
    return () => {
      ignore = true;
    };
  }, []);

  async function handlePost(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setPosting(true);
    setPostError('');
    try {
      const data = await sendJson('/api/announcements', 'POST', {
        title: form.title.trim(),
        body: form.body.trim(),
      });
      setAnnouncements((prev) => [data.announcement, ...prev]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setPostError(err.message);
    } finally {
      setPosting(false);
    }
  }

  function handleSaved(updated) {
    setAnnouncements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  function handleDeleted(id) {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Announcements</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Post updates for clients — they appear on every client's Overview page.
      </p>

      <form onSubmit={handlePost} className="mt-6 space-y-3 rounded-2xl border border-line bg-panel p-5 shadow-sm">
        <h2 className="font-medium text-ink">New announcement</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink" htmlFor="announcement-title">
            Title
          </label>
          <input
            id="announcement-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            maxLength={200}
            placeholder="e.g. Branch closed on November 1"
            required
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink" htmlFor="announcement-body">
            Message
          </label>
          <textarea
            id="announcement-body"
            rows={4}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            required
            className={`${INPUT_CLASS} resize-y`}
          />
        </div>
        {postError && <p className="text-sm text-red-700">{postError}</p>}
        <Button type="submit" disabled={posting} className="px-4 py-2 text-sm">
          {posting ? 'Posting…' : 'Post announcement'}
        </Button>
      </form>

      {status === 'loading' && <p className="mt-6 text-sm text-ink-soft">Loading announcements…</p>}

      {status === 'error' && (
        <p className="mt-6 rounded-2xl border border-line bg-panel p-5 text-sm text-red-700">
          Couldn't load announcements. Try refreshing the page.
        </p>
      )}

      {status === 'ready' && announcements.length === 0 && (
        <p className="mt-6 text-sm text-ink-soft">No announcements yet — post the first one above.</p>
      )}

      {status === 'ready' && announcements.length > 0 && (
        <ul className="mt-6 space-y-3">
          {announcements.map((announcement) => (
            <AnnouncementItem
              key={announcement.id}
              announcement={announcement}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
