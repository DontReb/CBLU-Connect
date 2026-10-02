// Clients and checklist items now come from real endpoints
// (GET /api/admin/clients, GET /api/admin/checklist-items) via
// AdminDataProvider. What's left here is still mock:
// - MOCK_CHECKLIST_NAME: a display label, not fetched data
// - MOCK_REVIEWS: the document-review queue isn't wired up yet — a later step

export const MOCK_CHECKLIST_NAME = 'New Savings Account';

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