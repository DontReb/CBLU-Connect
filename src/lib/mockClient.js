// Placeholder client-side data — mirrors the shape the real dashboard will
// pull from endpoints like GET /api/clients/me and GET /api/checklists/mine
// once the backend is wired up. Swap these for real fetches at that point;
// every page that imports them should keep working the same way.

export const MOCK_CLIENT = {
  fullName: 'Maria Santos',
  email: 'maria.santos@example.com',
  phoneNumber: '+63 917 555 0142',
  accountNumber: '2201-0043128',
  branch: 'CBLU Main Branch — La Union',
  verificationStatus: 'pending', // unverified | pending | verified
};

export const MOCK_CHECKLIST = {
  name: 'New Savings Account',
  items: [
    { id: 1, label: 'Valid Government ID', status: 'valid' }, // uploaded, passed validation
    { id: 2, label: 'Proof of Billing', status: 'invalid' }, // uploaded, failed validation
    { id: 3, label: 'Signature Specimen Card', status: 'pending' }, // not yet uploaded
  ],
};