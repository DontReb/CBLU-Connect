import Button from '../../components/ui/Button';
import { useAdminData } from '../../lib/adminDataContext';
import { MOCK_ADMIN } from '../../lib/mockAdmin';

export default function AdminReviews() {
  const { reviews, reviewDocument } = useAdminData();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Document reviews</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Automated OCR results, ready for a human sign-off before they're final.
      </p>

      <div className="mt-6 space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-medium text-ink">{review.itemLabel}</h3>
                <p className="text-sm text-ink-soft">
                  {review.clientName} · {review.fileName}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  review.isValid ? 'bg-accent-light/50 text-accent-dark' : 'bg-red-100 text-red-700'
                }`}
              >
                {review.isValid ? 'Auto: Valid' : 'Auto: Invalid'}
              </span>
            </div>

            <p className="mt-2 text-sm text-ink-soft">{review.notes}</p>
            <p className="mt-1 text-xs text-ink-soft">OCR confidence: {review.ocrConfidence}%</p>

            {review.reviewedBy ? (
              <p className="mt-3 text-sm text-ink-soft">Reviewed by {review.reviewedBy}</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => reviewDocument(review.id, { isValid: true, reviewerName: MOCK_ADMIN.fullName })}
                  className="px-4 py-2 text-sm"
                >
                  Confirm valid
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => reviewDocument(review.id, { isValid: false, reviewerName: MOCK_ADMIN.fullName })}
                  className="px-4 py-2 text-sm"
                >
                  Mark invalid
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}