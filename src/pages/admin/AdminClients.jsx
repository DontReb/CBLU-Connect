import { Fragment, useState } from 'react';
import { useAdminData } from '../../lib/adminDataContext';
import Button from '../../components/ui/Button';
import AddClientForm from './AddClientForm';
import { ID_TYPE_LABELS, IDENTITY_REASONS, applicationStage, documentsReady, identityStage } from '../../lib/applicationStatus';

const STAGE_STYLES = {
  not_started: 'bg-line/60 text-ink-soft',
  in_progress: 'bg-highlight/40 text-ink',
  complete: 'bg-accent-light/50 text-accent-dark',
};

const IDENTITY_STYLES = {
  verified: 'bg-accent-light/50 text-accent-dark',
  failed: 'bg-highlight/40 text-ink',
  locked: 'bg-red-100 text-red-800',
  none: 'bg-line/60 text-ink-soft',
};

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

// One client's face checks: results and scores only — no pictures are kept.
function IdentityChecks({ checks }) {
  if (checks.length === 0) return <p className="text-sm text-ink-soft">No face checks yet.</p>;
  return (
    <ul className="space-y-1 text-sm">
      {checks.map((check) => (
        <li key={check.at} className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-ink-soft">{formatDateTime(check.at)}</span>
          <span className={check.passed ? 'font-medium text-accent-dark' : 'font-medium text-red-700'}>
            {check.passed ? 'Passed' : 'Failed'}
          </span>
          <span className="text-ink">
            {check.passed ? ID_TYPE_LABELS[check.idType] ?? '' : IDENTITY_REASONS[check.reason] ?? check.reason}
          </span>
          <span className="text-xs text-ink-soft">
            match {check.matchScore?.toFixed(2) ?? '—'} · real face {check.realFaceScore?.toFixed(2) ?? '—'} · flashes{' '}
            {check.flashMatches ?? '—'}/{check.flashTotal ?? '—'} · {((check.processingMs ?? 0) / 1000).toFixed(1)} s
          </span>
        </li>
      ))}
    </ul>
  );
}

// The requirements one client has ticked and their face checks, shown under their row.
function ClientDetail({ detail }) {
  if (detail.status === 'loading') return <p className="text-sm text-ink-soft">Loading…</p>;
  if (detail.status === 'error') return <p className="text-sm text-red-700">Couldn't load this client's details.</p>;
  const { items, identityChecks } = detail.client;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Face checks</h3>
        <IdentityChecks checks={identityChecks ?? []} />
      </div>
      <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Requirements</h3>
      {items.length === 0 && <p className="text-sm text-ink-soft">The checklist has no items yet.</p>}
      <p className="mb-2 text-xs text-ink-soft">
        Ticked by the client — documents they say they have ready. Nothing is uploaded; check the
        originals when they visit.
      </p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                item.checked ? 'border-accent-dark bg-accent-dark text-white' : 'border-line bg-panel'
              }`}
            >
              {item.checked ? '✓' : ''}
            </span>
            <span className={item.checked ? 'text-ink' : 'text-ink-soft'}>
              {item.label}
              <span className="sr-only">{item.checked ? ' (ready)' : ' (not yet)'}</span>
              {item.isRequired && !item.checked && <span className="ml-1 text-xs text-red-700">required</span>}
            </span>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}

export default function AdminClients() {
  const { clients, clientsStatus, loadClientDetail } = useAdminData();
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});
  const [adding, setAdding] = useState(false);

  async function toggle(id) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    setDetails((prev) => ({ ...prev, [id]: { status: 'loading' } }));
    try {
      const client = await loadClientDetail(id);
      setDetails((prev) => ({ ...prev, [id]: { status: 'ready', client } }));
    } catch {
      setDetails((prev) => ({ ...prev, [id]: { status: 'error' } }));
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Clients</h1>
          <p className="mt-1 text-sm text-ink-soft">
            How far each client is with their face check, loan application and the documents they need to
            bring.
          </p>
        </div>
        {!adding && (
          <Button type="button" onClick={() => setAdding(true)} className="shrink-0 px-5 py-2.5 text-sm">
            Add client
          </Button>
        )}
      </div>

      {adding && (
        <div className="mt-6">
          <AddClientForm onClose={() => setAdding(false)} />
        </div>
      )}

      {clientsStatus === 'error' && (
        <p className="mt-6 rounded-2xl border border-line bg-panel p-5 text-sm text-red-700">
          Couldn't load clients. Try refreshing the page.
        </p>
      )}

      {clientsStatus === 'loading' && <p className="mt-6 text-sm text-ink-soft">Loading clients…</p>}

      {clientsStatus === 'ready' && clients.length === 0 && (
        <p className="mt-6 text-sm text-ink-soft">No clients yet.</p>
      )}

      {clientsStatus === 'ready' && clients.length > 0 && (
        <div className="relative mt-6 overflow-x-auto rounded-2xl border border-line bg-panel shadow-sm">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink-soft">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Face check</th>
                <th className="px-5 py-3 font-medium">Loan application</th>
                <th className="px-5 py-3 font-medium">Documents ready</th>
                <th className="px-5 py-3 font-medium">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const stage = applicationStage(client.application);
                const identity = identityStage(client.identity);
                const isOpen = openId === client.id;
                return (
                  <Fragment key={client.id}>
                    <tr className={`border-b border-line ${isOpen ? 'bg-paper/50' : ''}`}>
                      <td className="px-5 py-3.5 align-top">
                        <p className="font-medium text-ink">{client.fullName}</p>
                        <p className="text-xs text-ink-soft">{client.email}</p>
                        {client.branch && <p className="text-xs text-ink-soft">{client.branch}</p>}
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${IDENTITY_STYLES[identity.key]}`}>
                          {identity.label}
                        </span>
                        {client.identity?.verifiedAt && (
                          <p className="mt-1 text-xs text-ink-soft">{formatDate(client.identity.verifiedAt)}</p>
                        )}
                        {client.identity?.locked && (
                          <p className="mt-1 text-xs text-ink-soft">Verify in person at the branch</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STAGE_STYLES[stage.key]}`}>
                          {stage.label}
                        </span>
                        {client.application && (
                          <p className="mt-1 text-xs text-ink-soft">
                            {client.application.lastIdType
                              ? `Filled from ${ID_TYPE_LABELS[client.application.lastIdType] ?? 'an ID'} · `
                              : ''}
                            updated {formatDate(client.application.updatedAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <p className="text-ink">
                          {client.checklist.checked} of {client.checklist.total}
                        </p>
                        <p className={`text-xs ${documentsReady(client.checklist) ? 'text-accent-dark' : 'text-ink-soft'}`}>
                          {documentsReady(client.checklist)
                            ? 'All required ready'
                            : `${client.checklist.requiredMissing} required left`}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-right align-top">
                        <button
                          type="button"
                          onClick={() => toggle(client.id)}
                          aria-expanded={isOpen}
                          className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-ink"
                        >
                          {isOpen ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-line bg-paper/50">
                        <td colSpan={5} className="px-5 pb-4 pt-1">
                          <ClientDetail detail={details[client.id] ?? { status: 'loading' }} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
