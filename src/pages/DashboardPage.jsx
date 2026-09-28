import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/cblu-logo.png';

function Card({ title, value, detail }) {
  return <div className="rounded-3xl border border-line bg-panel p-5 shadow-sm"><p className="text-sm text-ink-soft">{title}</p><p className="mt-2 text-3xl font-semibold text-ink">{value}</p>{detail && <p className="mt-1 text-xs text-ink-soft">{detail}</p>}</div>;
}

function ClientDashboard({ data, refresh }) {
  const [uploading, setUploading] = useState(null);
  const [results, setResults] = useState({});
  async function upload(item, file) {
    if (!file) return;
    setUploading(item.id);
    const form = new FormData();
    form.append('checklistItemId', item.id);
    form.append('document', file);
    try {
      const response = await fetch('/api/documents/upload', { method: 'POST', body: form });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Upload failed');
      setResults((prev) => ({ ...prev, [item.id]: json }));
      await refresh();
    } catch (error) {
      setResults((prev) => ({ ...prev, [item.id]: { error: error.message } }));
    } finally { setUploading(null); }
  }

  const checklist = data.checklists?.[0];
  return <div className="space-y-6">
    <div><h2 className="font-display text-2xl text-ink">Document checklist</h2><p className="text-sm text-ink-soft">{checklist?.description || 'Upload the documents required for your application.'}</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      {(checklist?.items || []).map((item) => {
        const result = results[item.id];
        return <div key={item.id} className="rounded-2xl border border-line bg-panel p-5">
          <div className="flex items-start justify-between gap-4"><div><h3 className="font-medium text-ink">{item.label}</h3><p className="mt-1 text-sm text-ink-soft">{item.description}</p></div>{item.required && <span className="rounded-full bg-accent-light px-2.5 py-1 text-xs text-accent-dark">Required</span>}</div>
          <label className="mt-4 block cursor-pointer rounded-xl border border-dashed border-line px-4 py-4 text-center text-sm text-ink-soft hover:bg-paper">
            {uploading === item.id ? 'Checking document…' : 'Choose document'}
            <input type="file" accept="image/*,.pdf" className="sr-only" disabled={uploading === item.id} onChange={(e) => upload(item, e.target.files?.[0])} />
          </label>
          {result && <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${result.error || !result.isValid ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{result.error || (result.isValid ? `Validated — OCR confidence ${Math.round(result.ocrConfidence || 0)}%` : result.notes || 'Document needs review.')}</p>}
        </div>;
      })}
    </div>
    {data.uploads?.length > 0 && <div><h2 className="mb-3 font-display text-2xl text-ink">Recent uploads</h2><div className="overflow-x-auto rounded-2xl border border-line bg-panel"><table className="w-full text-left text-sm"><thead className="bg-paper text-ink-soft"><tr><th className="px-4 py-3">Document</th><th className="px-4 py-3">Requirement</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Confidence</th></tr></thead><tbody>{data.uploads.map((u) => <tr key={u.id} className="border-t border-line"><td className="px-4 py-3">{u.file_name}</td><td className="px-4 py-3">{u.checklist_item}</td><td className="px-4 py-3">{u.is_valid ? 'Valid' : 'Needs review'}</td><td className="px-4 py-3">{u.confidence_score ? `${Math.round(u.confidence_score)}%` : '—'}</td></tr>)}</tbody></table></div></div>}
  </div>;
}

function StaffDashboard({ role, data, refresh }) {
  const [sessions, setSessions] = useState([]);
  useEffect(() => { if (role !== 'client') fetch('/api/chat/sessions').then((r) => r.ok ? r.json() : { sessions: [] }).then((j) => setSessions(j.sessions || [])); }, [role, data]);
  async function updateSession(sessionId, status) {
    await fetch('/api/chat/sessions', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sessionId, status }) });
    await refresh();
  }
  return <div className="space-y-6">
    <div><h2 className="font-display text-2xl text-ink">{role === 'admin' ? 'Administration' : 'Agent workspace'}</h2><p className="text-sm text-ink-soft">Role-based access is active for this account.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Object.entries(data.metrics || {}).map(([key,value]) => <Card key={key} title={key.replace(/[A-Z]/g, (m) => ` ${m}`)} value={value} />)}
    </div>
    {role === 'agent' && <section><h3 className="mb-3 font-display text-xl text-ink">Chat queue</h3><div className="space-y-3">{sessions.length ? sessions.map((s) => <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-4"><div><p className="font-medium text-ink">{s.client_name}</p><p className="text-sm text-ink-soft">{s.client_email} · {s.message_count} messages</p></div><button className="rounded-full bg-ink px-4 py-2 text-sm text-white" onClick={() => updateSession(s.id, 'with_agent')}>{s.status === 'escalated' ? 'Take chat' : 'Assigned'}</button></div>) : <p className="rounded-2xl border border-line bg-panel p-5 text-sm text-ink-soft">No escalated conversations.</p>}</div></section>}
  </div>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const me = await fetch('/api/auth/me');
    if (!me.ok) { navigate('/login', { replace: true }); return; }
    const meData = await me.json();
    setUser(meData.user);
    const dashboard = await fetch('/api/dashboard/summary');
    const json = await dashboard.json();
    if (!dashboard.ok) throw new Error(json.error || 'Unable to load dashboard');
    setData(json);
  }

  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    navigate('/login', { replace: true });
  }

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!user || !data) return <div className="flex min-h-screen items-center justify-center bg-paper text-ink-soft">Loading dashboard…</div>;

  return <div className="min-h-screen bg-paper">
    <header className="border-b border-line bg-panel"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><Link to="/" className="flex items-center gap-2.5"><img src={logo} className="h-9 w-9 rounded-full object-contain" alt="CBLU" /><span className="font-display text-lg font-semibold text-ink">CBLU Connect</span></Link><div className="flex items-center gap-4"><div className="hidden text-right sm:block"><p className="text-sm font-medium text-ink">{user.full_name}</p><p className="text-xs uppercase tracking-wide text-ink-soft">{user.role}</p></div><button onClick={logout} className="rounded-full border border-line px-4 py-2 text-sm text-ink hover:bg-paper">Log out</button></div></div></header>
    <main className="mx-auto max-w-7xl px-5 py-8"><div className="mb-8"><p className="text-sm text-ink-soft">Dashboard</p><h1 className="font-display text-4xl text-ink">Welcome, {user.full_name}</h1></div>
      {user.role === 'client' ? <ClientDashboard data={data} refresh={load} /> : <StaffDashboard role={user.role} data={data} refresh={load} />}
    </main>
  </div>;
}
