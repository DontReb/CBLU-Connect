import { Link } from 'react-router-dom';
import { MOCK_CLIENT } from '../../lib/mockClient';
import { useChecklist } from '../../lib/checklistContext';

const STATUS_STYLES = {
  valid: 'bg-accent-light/50 text-accent-dark',
  invalid: 'bg-red-100 text-red-700',
  pending: 'bg-line/60 text-ink-soft',
  processing: 'bg-highlight/40 text-ink',
};

const STATUS_LABELS = {
  valid: 'Valid',
  invalid: 'Needs attention',
  pending: 'Not submitted',
  processing: 'Checking…',
};

export default function ClientOverview() {
  const { checklist } = useChecklist();
  const completed = checklist.items.filter((item) => item.status === 'valid').length;
  const total = checklist.items.length;
  const firstName = MOCK_CLIENT.fullName.split(' ')[0];

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
            style={{ width: `${(completed / total) * 100}%` }}
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