import { Fragment, useState } from 'react';
import { useAdminData } from '../../lib/adminDataContext';
import { ID_TYPE_LABELS, applicationStage, documentsReady } from '../../lib/applicationStatus';

const STAGE_STYLES = {
  not_started: 'bg-line/60 text-ink-soft',
  in_progress: 'bg-highlight/40 text-ink',
  complete: 'bg-accent-light/50 text-accent-dark',
};

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

// The requirements one client has ticked, shown under their row.
function ClientDetail({ detail }) {
  if (detail.status === 'loading') return <p className="text-sm text-ink-soft">Loading…</p>;
  if (detail.status === 'error') return <p className="text-sm text-red-700">Couldn't load this client's checklist.</p>;
  const { items } = detail.client;
  if (items.length === 0) return <p className="text-sm text-ink-soft">The checklist has no items yet.</p>;
  return (
    <div>
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
  );
}

export default function AdminClients() {
  const { clients, clientsStatus, loadClientDetail } = useAdminData();
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});

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
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Clients</h1>
      <p className="mt-1 text-sm text-ink-soft">
        How far each client is with their loan application and the documents they need to bring.
      </p>

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
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-panel shadow-sm">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink-soft">
                <th className="px-5 py-3 font-medium">Client</th>
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
                          {isOpen ? 'Hide' : 'Checklist'}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-line bg-paper/50">
                        <td colSpan={4} className="px-5 pb-4 pt-1">
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
