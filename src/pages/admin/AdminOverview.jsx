import { Link } from 'react-router-dom';
import { useAdminData } from '../../lib/adminDataContext';
import { applicationStage, documentsReady } from '../../lib/applicationStatus';

function StatCard({ label, value, note, to }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-line bg-panel p-5 shadow-sm transition-colors hover:border-accent/40"
    >
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-3xl font-medium text-ink">{value}</p>
      {note && <p className="mt-1 text-xs text-ink-soft">{note}</p>}
    </Link>
  );
}

export default function AdminOverview() {
  const { clients, clientsStatus, checklist, checklistItems, checklistStatus } = useAdminData();
  const ready = clientsStatus === 'ready';
  const started = clients.filter((client) => client.application).length;
  const complete = clients.filter((client) => applicationStage(client.application).key === 'complete').length;
  const docsReady = clients.filter((client) => documentsReady(client.checklist)).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Admin overview</h1>
        <p className="mt-1 text-sm text-ink-soft">Loan applications across all branches.</p>
      </div>

      {clientsStatus === 'error' && (
        <p className="rounded-2xl border border-line bg-panel p-5 text-sm text-red-700">
          Couldn't load clients. Try refreshing the page.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clients" value={ready ? clients.length : '—'} to="/dashboard/admin/clients" />
        <StatCard
          label="Applications started"
          value={ready ? started : '—'}
          note="Saved or scanned an ID"
          to="/dashboard/admin/clients"
        />
        <StatCard
          label="Forms complete"
          value={ready ? complete : '—'}
          note="Every required field filled"
          to="/dashboard/admin/clients"
        />
        <StatCard
          label="Documents ready"
          value={ready ? docsReady : '—'}
          note="Ticked every required document"
          to="/dashboard/admin/clients"
        />
      </div>

      <Link
        to="/dashboard/admin/requirements"
        className="block rounded-2xl border border-line bg-panel p-5 shadow-sm transition-colors hover:border-accent/40"
      >
        <p className="text-sm text-ink-soft">Requirements checklist</p>
        <p className="mt-1 font-medium text-ink">
          {checklistStatus === 'ready'
            ? `${checklist?.name ?? 'No active checklist'} — ${checklistItems.length} ${checklistItems.length === 1 ? 'document' : 'documents'}`
            : '—'}
        </p>
        <p className="mt-1 text-xs text-ink-soft">What clients see, tick and print with their application.</p>
      </Link>
    </div>
  );
}
