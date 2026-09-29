import { Link } from 'react-router-dom';
import { MOCK_CLIENTS, MOCK_CHECKLIST_NAME } from '../../lib/mockAdmin';
import { useAdminData } from '../../lib/adminDataContext';

function StatCard({ label, value, to }) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-line bg-panel p-5 shadow-sm transition-colors hover:border-accent/40"
    >
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-3xl font-medium text-ink">{value}</p>
    </Link>
  );
}

export default function AdminOverview() {
  const { checklistItems, reviews } = useAdminData();
  const pendingReviews = reviews.filter((review) => !review.reviewedBy).length;
  const verifiedClients = MOCK_CLIENTS.filter((client) => client.verificationStatus === 'verified').length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Admin overview</h1>
        <p className="mt-1 text-sm text-ink-soft">
          A snapshot of {MOCK_CHECKLIST_NAME.toLowerCase()} applications across all branches.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total clients" value={MOCK_CLIENTS.length} to="/dashboard/admin/clients" />
        <StatCard label="Verified clients" value={verifiedClients} to="/dashboard/admin/clients" />
        <StatCard label="Checklist items" value={checklistItems.length} to="/dashboard/admin/checklists" />
        <StatCard label="Pending reviews" value={pendingReviews} to="/dashboard/admin/reviews" />
      </div>
    </div>
  );
}