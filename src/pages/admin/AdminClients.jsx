import { useAdminData } from '../../lib/adminDataContext';

const STATUS_STYLES = {
  verified: 'bg-accent-light/50 text-accent-dark',
  pending: 'bg-highlight/40 text-ink',
  unverified: 'bg-line/60 text-ink-soft',
};

export default function AdminClients() {
  const { clients, clientsStatus } = useAdminData();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Clients</h1>
      <p className="mt-1 text-sm text-ink-soft">Everyone currently working through a requirement checklist.</p>

      {clientsStatus === 'error' && (
        <p className="mt-6 rounded-2xl border border-line bg-panel p-5 text-sm text-red-700">
          Couldn't load clients. Try refreshing the page.
        </p>
      )}

      {clientsStatus === 'loading' && (
        <p className="mt-6 text-sm text-ink-soft">Loading clients…</p>
      )}

      {clientsStatus === 'ready' && clients.length === 0 && (
        <p className="mt-6 text-sm text-ink-soft">No clients yet.</p>
      )}

      {clientsStatus === 'ready' && clients.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-panel shadow-sm">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink-soft">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Branch</th>
                <th className="px-5 py-3 font-medium">Checklist</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-ink">{client.fullName}</p>
                    <p className="text-xs text-ink-soft">{client.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{client.branch}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{client.checklistProgress}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[client.verificationStatus]}`}
                    >
                      {client.verificationStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}