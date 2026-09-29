import { MOCK_CLIENT } from '../../lib/mockClient';

const FIELDS = [
  { label: 'Full name', value: MOCK_CLIENT.fullName },
  { label: 'Email', value: MOCK_CLIENT.email },
  { label: 'Phone number', value: MOCK_CLIENT.phoneNumber },
  { label: 'Account number', value: MOCK_CLIENT.accountNumber },
  { label: 'Branch', value: MOCK_CLIENT.branch },
  { label: 'Verification status', value: MOCK_CLIENT.verificationStatus },
];

export default function ClientProfile() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Profile</h1>
      <p className="mt-1 text-sm text-ink-soft">Placeholder data until this reads from your account.</p>
      <dl className="mt-6 divide-y divide-line rounded-2xl border border-line bg-panel">
        {FIELDS.map((field) => (
          <div key={field.label} className="flex items-center justify-between px-6 py-4">
            <dt className="text-sm text-ink-soft">{field.label}</dt>
            <dd className="text-sm font-medium capitalize text-ink">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}