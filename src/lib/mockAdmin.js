// Placeholder data for the admin dashboard — mirrors what endpoints like
// GET /api/admin/clients, GET /api/admin/checklist-items, and
// GET /api/admin/reviews will eventually return. Swap for real fetches once
// the backend is wired up.

export const MOCK_ADMIN = {
  fullName: 'Grace Fernandez',
  email: 'grace.fernandez@cblu.example',
  department: 'Client Onboarding',
};

export const MOCK_CLIENTS = [
  {
    id: 'c1',
    fullName: 'Maria Santos',
    email: 'maria.santos@example.com',
    branch: 'CBLU Main Branch — Dagupan',
    verificationStatus: 'pending',
    checklistProgress: '1 of 3',
  },
  {
    id: 'c2',
    fullName: 'Jerome dela Cruz',
    email: 'jerome.delacruz@example.com',
    branch: 'CBLU Bugallon Branch',
    verificationStatus: 'verified',
    checklistProgress: '3 of 3',
  },
  {
    id: 'c3',
    fullName: 'Ana Bautista',
    email: 'ana.bautista@example.com',
    branch: 'CBLU Main Branch — Dagupan',
    verificationStatus: 'unverified',
    checklistProgress: '0 of 3',
  },
  {
    id: 'c4',
    fullName: 'Ramon Villanueva',
    email: 'ramon.villanueva@example.com',
    branch: 'CBLU San Fabian Branch',
    verificationStatus: 'pending',
    checklistProgress: '2 of 3',
  },
];

// Item *definitions* — separate from any one client's submission status,
// which lives on document_uploads instead. This is what admins edit.
export const MOCK_CHECKLIST_NAME = 'New Savings Account';

export const MOCK_CHECKLIST_ITEMS = [
  {
    id: 1,
    label: 'Valid Government ID',
    description: 'A government-issued ID with photo and full name — UMID, passport, or driver\u2019s license.',
    isRequired: true,
    requiredKeywords: ['republic of the philippines'],
  },
  {
    id: 2,
    label: 'Proof of Billing',
    description: 'A utility bill or statement no older than 3 months showing the client\u2019s current address.',
    isRequired: true,
    requiredKeywords: ['billing statement', 'due date'],
  },
  {
    id: 3,
    label: 'Signature Specimen Card',
    description: 'A signed specimen card matching the signature the client will use on their account.',
    isRequired: true,
    requiredKeywords: ['specimen signature'],
  },
];

// Document uploads awaiting or already given a human sign-off — mirrors
// document_uploads + document_ocr_results + document_validations joined
// together, which is roughly what a real review-queue endpoint would return.
export const MOCK_REVIEWS = [
  {
    id: 'r1',
    clientName: 'Maria Santos',
    itemLabel: 'Proof of Billing',
    fileName: 'billing-statement.jpg',
    ocrConfidence: 78,
    isValid: false,
    notes: 'Missing expected terms: due date',
    reviewedBy: null,
  },
  {
    id: 'r2',
    clientName: 'Ramon Villanueva',
    itemLabel: 'Valid Government ID',
    fileName: 'umid-front.jpg',
    ocrConfidence: 91,
    isValid: true,
    notes: 'All required terms were found in the document.',
    reviewedBy: null,
  },
  {
    id: 'r3',
    clientName: 'Ana Bautista',
    itemLabel: 'Signature Specimen Card',
    fileName: 'signature-card.png',
    ocrConfidence: 54,
    isValid: false,
    notes: 'Missing expected terms: specimen signature',
    reviewedBy: null,
  },
  {
    id: 'r4',
    clientName: 'Jerome dela Cruz',
    itemLabel: 'Proof of Billing',
    fileName: 'meralco-bill.pdf',
    ocrConfidence: 88,
    isValid: true,
    notes: 'All required terms were found in the document.',
    reviewedBy: 'Grace Fernandez',
  },
];